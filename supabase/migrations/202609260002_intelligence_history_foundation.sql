-- i2cashflow Audit + Historical Intelligence Foundation
-- Reproduces the Supabase schema already applied to production.

create extension if not exists pgcrypto;

create or replace function public.set_i2c_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.rule_overrides (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  rule_id text not null,
  entity_type text null check (entity_type is null or entity_type in ('customer','sku','vendor','invoice','bill')),
  entity_id text null,
  threshold_key text null,
  threshold_value jsonb null,
  suppressed boolean not null default false,
  override_reason text not null default '',
  created_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists rule_overrides_scope_unique
on public.rule_overrides (
  workspace_id,
  rule_id,
  coalesce(entity_type, ''),
  coalesce(entity_id, ''),
  coalesce(threshold_key, '')
);

create index if not exists rule_overrides_workspace_idx on public.rule_overrides(workspace_id);
create index if not exists rule_overrides_rule_idx on public.rule_overrides(workspace_id, rule_id);

drop trigger if exists rule_overrides_set_updated_at on public.rule_overrides;
create trigger rule_overrides_set_updated_at
before update on public.rule_overrides
for each row execute function public.set_i2c_updated_at();

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid null references auth.users(id) on delete set null,
  event_type text not null,
  rule_id text null,
  entity_type text null,
  entity_id text null,
  field_name text null,
  old_value jsonb null,
  new_value jsonb null,
  reason text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_workspace_created_idx on public.audit_log(workspace_id, created_at desc);
create index if not exists audit_log_rule_idx on public.audit_log(workspace_id, rule_id, created_at desc);
create index if not exists audit_log_event_idx on public.audit_log(workspace_id, event_type, created_at desc);

create table if not exists public.predictions_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  rule_id text not null,
  entity_id text null,
  system_name text null,
  domain text null,
  priority text not null check (priority in ('CRITICAL','HIGH','MEDIUM','LOW')),
  confidence integer not null default 25 check (confidence between 25 and 95),
  finding text not null default '',
  reason text not null default '',
  risk text not null default '',
  recommended_action text not null default '',
  contributors jsonb not null default '[]'::jsonb,
  input_snapshot jsonb not null default '{}'::jsonb,
  config_snapshot jsonb not null default '{}'::jsonb,
  calculation_version text null,
  fingerprint text not null,
  fired_at timestamptz not null default now()
);

create unique index if not exists predictions_log_fingerprint_unique
on public.predictions_log(workspace_id, fingerprint);

create index if not exists predictions_log_workspace_time_idx on public.predictions_log(workspace_id, fired_at desc);
create index if not exists predictions_log_rule_time_idx on public.predictions_log(workspace_id, rule_id, fired_at desc);
create index if not exists predictions_log_entity_idx on public.predictions_log(workspace_id, entity_id, fired_at desc);

create table if not exists public.metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  snapshot_type text not null,
  snapshot_date date not null,
  as_of_date date null,
  metrics jsonb not null default '{}'::jsonb,
  source text not null default 'decision-engine',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists metric_snapshots_unique
on public.metric_snapshots(workspace_id, snapshot_type, snapshot_date);

create index if not exists metric_snapshots_workspace_date_idx
on public.metric_snapshots(workspace_id, snapshot_date desc);

drop trigger if exists metric_snapshots_set_updated_at on public.metric_snapshots;
create trigger metric_snapshots_set_updated_at
before update on public.metric_snapshots
for each row execute function public.set_i2c_updated_at();

create table if not exists public.recommendation_outcomes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  prediction_id uuid null references public.predictions_log(id) on delete set null,
  rule_id text not null,
  entity_id text null,
  action_status text not null default 'pending'
    check (action_status in ('pending','accepted','dismissed','completed','expired')),
  action_taken text null,
  baseline_metrics jsonb not null default '{}'::jsonb,
  outcome_metrics jsonb not null default '{}'::jsonb,
  outcome_notes text not null default '',
  acted_at timestamptz null,
  evaluated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recommendation_outcomes_workspace_idx
on public.recommendation_outcomes(workspace_id, created_at desc);

drop trigger if exists recommendation_outcomes_set_updated_at on public.recommendation_outcomes;
create trigger recommendation_outcomes_set_updated_at
before update on public.recommendation_outcomes
for each row execute function public.set_i2c_updated_at();

alter table public.rule_overrides enable row level security;
alter table public.audit_log enable row level security;
alter table public.predictions_log enable row level security;
alter table public.metric_snapshots enable row level security;
alter table public.recommendation_outcomes enable row level security;

revoke all on public.rule_overrides from anon;
revoke all on public.audit_log from anon;
revoke all on public.predictions_log from anon;
revoke all on public.metric_snapshots from anon;
revoke all on public.recommendation_outcomes from anon;

grant select, insert, update, delete on public.rule_overrides to authenticated;
grant select, insert on public.audit_log to authenticated;
grant select, insert on public.predictions_log to authenticated;
grant select, insert, update on public.metric_snapshots to authenticated;
grant select, insert, update on public.recommendation_outcomes to authenticated;

drop policy if exists "rule_overrides_select_own" on public.rule_overrides;
create policy "rule_overrides_select_own" on public.rule_overrides
for select to authenticated using (owner_id = auth.uid());

drop policy if exists "rule_overrides_insert_own" on public.rule_overrides;
create policy "rule_overrides_insert_own" on public.rule_overrides
for insert to authenticated with check (
  owner_id = auth.uid()
  and exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
);

drop policy if exists "rule_overrides_update_own" on public.rule_overrides;
create policy "rule_overrides_update_own" on public.rule_overrides
for update to authenticated using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
);

drop policy if exists "rule_overrides_delete_own" on public.rule_overrides;
create policy "rule_overrides_delete_own" on public.rule_overrides
for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "audit_log_select_own" on public.audit_log;
create policy "audit_log_select_own" on public.audit_log
for select to authenticated using (owner_id = auth.uid());

drop policy if exists "audit_log_insert_own" on public.audit_log;
create policy "audit_log_insert_own" on public.audit_log
for insert to authenticated with check (
  owner_id = auth.uid()
  and actor_user_id = auth.uid()
  and exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
);

drop policy if exists "predictions_log_select_own" on public.predictions_log;
create policy "predictions_log_select_own" on public.predictions_log
for select to authenticated using (owner_id = auth.uid());

drop policy if exists "predictions_log_insert_own" on public.predictions_log;
create policy "predictions_log_insert_own" on public.predictions_log
for insert to authenticated with check (
  owner_id = auth.uid()
  and exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
);

drop policy if exists "metric_snapshots_select_own" on public.metric_snapshots;
create policy "metric_snapshots_select_own" on public.metric_snapshots
for select to authenticated using (owner_id = auth.uid());

drop policy if exists "metric_snapshots_insert_own" on public.metric_snapshots;
create policy "metric_snapshots_insert_own" on public.metric_snapshots
for insert to authenticated with check (
  owner_id = auth.uid()
  and exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
);

drop policy if exists "metric_snapshots_update_own" on public.metric_snapshots;
create policy "metric_snapshots_update_own" on public.metric_snapshots
for update to authenticated using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
);

drop policy if exists "recommendation_outcomes_select_own" on public.recommendation_outcomes;
create policy "recommendation_outcomes_select_own" on public.recommendation_outcomes
for select to authenticated using (owner_id = auth.uid());

drop policy if exists "recommendation_outcomes_insert_own" on public.recommendation_outcomes;
create policy "recommendation_outcomes_insert_own" on public.recommendation_outcomes
for insert to authenticated with check (
  owner_id = auth.uid()
  and exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
);

drop policy if exists "recommendation_outcomes_update_own" on public.recommendation_outcomes;
create policy "recommendation_outcomes_update_own" on public.recommendation_outcomes
for update to authenticated using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid())
);
