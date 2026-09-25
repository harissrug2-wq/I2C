begin;

create table if not exists public.ask_i2c_conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  page_path text not null default '/',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  message_count integer not null default 0
);

create table if not exists public.ask_i2c_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.ask_i2c_conversations(id) on delete cascade,
  request_id uuid,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 12000),
  created_at timestamptz not null default now()
);

create index if not exists ask_i2c_conversations_owner_idx
  on public.ask_i2c_conversations(workspace_id, owner_id, updated_at desc, id desc);

create index if not exists ask_i2c_messages_thread_idx
  on public.ask_i2c_messages(conversation_id, created_at desc, id desc);

create unique index if not exists ask_i2c_messages_request_unique
  on public.ask_i2c_messages(conversation_id, request_id, role)
  where request_id is not null;

alter table public.ask_i2c_conversations enable row level security;
alter table public.ask_i2c_messages enable row level security;

revoke all on public.ask_i2c_conversations from anon, authenticated;
revoke all on public.ask_i2c_messages from anon, authenticated;
grant all on public.ask_i2c_conversations to service_role;
grant all on public.ask_i2c_messages to service_role;

create or replace function public.i2c_ask_save_turn(
  p_workspace_id uuid,
  p_owner_id uuid,
  p_conversation_id uuid,
  p_request_id uuid,
  p_page_path text,
  p_message text,
  p_answer text,
  p_expected_count integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t public.ask_i2c_conversations;
  saved text;
  stamp timestamptz;
begin
  if char_length(p_message) not between 1 and 4000
     or char_length(p_answer) not between 1 and 12000
     or p_request_id is null
     or p_conversation_id is null then
    raise exception 'Invalid chat turn';
  end if;

  if not exists(
    select 1 from public.workspaces
    where id = p_workspace_id and owner_id = p_owner_id
  ) then
    raise exception 'Workspace unavailable';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_conversation_id::text, 0));

  select * into t
  from public.ask_i2c_conversations
  where id = p_conversation_id
  for update;

  if found then
    if t.workspace_id <> p_workspace_id or t.owner_id <> p_owner_id then
      raise exception 'Conversation unavailable';
    end if;

    select content into saved
    from public.ask_i2c_messages
    where conversation_id = t.id
      and request_id = p_request_id
      and role = 'assistant';

    if found then
      if not exists(
        select 1 from public.ask_i2c_messages
        where conversation_id = t.id
          and request_id = p_request_id
          and role = 'user'
          and content = p_message
      ) then
        raise exception 'Request ID already used';
      end if;
      return jsonb_build_object('conversationId', t.id, 'answer', saved, 'messageCount', t.message_count);
    end if;

    if t.message_count <> p_expected_count then
      raise exception 'Conversation changed. Reopen it before sending again.';
    end if;
  else
    if p_expected_count <> 0 then raise exception 'Conversation unavailable'; end if;
    insert into public.ask_i2c_conversations(id,workspace_id,owner_id,title,page_path)
    values(p_conversation_id,p_workspace_id,p_owner_id,left(p_message,80),left(coalesce(p_page_path,'/'),200))
    returning * into t;
  end if;

  stamp = greatest(
    clock_timestamp(),
    coalesce((select max(created_at) + interval '1 millisecond' from public.ask_i2c_messages where conversation_id = t.id), clock_timestamp())
  );

  insert into public.ask_i2c_messages(workspace_id,owner_id,conversation_id,request_id,role,content,created_at)
  values
    (p_workspace_id,p_owner_id,t.id,p_request_id,'user',p_message,stamp),
    (p_workspace_id,p_owner_id,t.id,p_request_id,'assistant',p_answer,stamp + interval '1 millisecond');

  update public.ask_i2c_conversations
  set updated_at = stamp + interval '1 millisecond',
      message_count = message_count + 2
  where id = t.id;

  return jsonb_build_object('conversationId',t.id,'answer',p_answer,'messageCount',t.message_count + 2);
end
$$;

revoke all on function public.i2c_ask_save_turn(uuid,uuid,uuid,uuid,text,text,text,integer)
  from public, anon, authenticated;
grant execute on function public.i2c_ask_save_turn(uuid,uuid,uuid,uuid,text,text,text,integer)
  to service_role;

commit;
