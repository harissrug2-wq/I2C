-- Server-only provider connection storage for i2cashflow live integrations.
-- OAuth/API secrets are AES-GCM encrypted by the Vercel server before insertion.
-- No browser role receives table privileges.

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('quickbooks','brightpearl')),
  status text not null default 'connected',
  secret_blob text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider)
);

create index if not exists integration_connections_owner_idx
  on public.integration_connections(owner_id);

alter table public.integration_connections enable row level security;

revoke all on public.integration_connections from anon;
revoke all on public.integration_connections from authenticated;

-- Intentionally no browser RLS policies.
-- The service_role used only by Vercel serverless functions bypasses RLS.
