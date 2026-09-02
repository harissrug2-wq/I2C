-- i2cashflow account authentication + isolated workspace storage
-- Every auth user owns exactly one workspace. RLS prevents cross-account access.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  company_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null default 'My Workspace',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_state (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  thresholds jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint workspace_state_owner_workspace_unique unique (owner_id, workspace_id)
);

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_state enable row level security;

revoke all on public.profiles from anon;
revoke all on public.workspaces from anon;
revoke all on public.workspace_state from anon;

grant select, update on public.profiles to authenticated;
grant select on public.workspaces to authenticated;
grant select, update on public.workspace_state to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "workspaces_select_own" on public.workspaces;
create policy "workspaces_select_own"
on public.workspaces for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "workspace_state_select_own" on public.workspace_state;
create policy "workspace_state_select_own"
on public.workspace_state for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "workspace_state_update_own" on public.workspace_state;
create policy "workspace_state_update_own"
on public.workspace_state for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create or replace function public.initial_workspace_payload()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'customers', '[]'::jsonb,
    'suppliers', '[]'::jsonb,
    'invoices', '[]'::jsonb,
    'invoiceLines', '[]'::jsonb,
    'bills', '[]'::jsonb,
    'paymentsReceived', '[]'::jsonb,
    'paymentsMade', '[]'::jsonb,
    'products', '[]'::jsonb,
    'bankAccounts', '[]'::jsonb,
    'companyMetrics', jsonb_build_object(
      'as_of_date', to_char(current_date, 'YYYY-MM-DD'),
      'revenue_last_30_days', 0,
      'cogs_last_30_days', 0,
      'operating_expenses_last_30_days', 0,
      'other_expenses_last_30_days', 0,
      'other_current_liabilities', 0,
      'forecast_baseline_other_outflows_60d', 0,
      'forecast_baseline_other_inflows_60d', 0,
      'monthly_payroll', 0,
      'wcm_history', '[]'::jsonb
    )
  );
$$;

create or replace function public.handle_new_i2c_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
  display_name text;
  company_name_value text;
begin
  display_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  company_name_value := coalesce(new.raw_user_meta_data ->> 'company_name', '');

  insert into public.profiles (id, full_name, company_name)
  values (new.id, display_name, company_name_value)
  on conflict (id) do update
    set full_name = excluded.full_name,
        company_name = excluded.company_name,
        updated_at = now();

  insert into public.workspaces (owner_id, name)
  values (new.id, coalesce(nullif(company_name_value, ''), 'My Workspace'))
  on conflict (owner_id) do update
    set name = excluded.name,
        updated_at = now()
  returning id into new_workspace_id;

  insert into public.workspace_state (workspace_id, owner_id, data, thresholds)
  values (new_workspace_id, new.id, public.initial_workspace_payload(), '{}'::jsonb)
  on conflict (owner_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_i2c_user() from public;
revoke all on function public.initial_workspace_payload() from public;
grant execute on function public.initial_workspace_payload() to authenticated;

drop trigger if exists on_auth_user_created_i2c on auth.users;
create trigger on_auth_user_created_i2c
after insert on auth.users
for each row execute function public.handle_new_i2c_user();
