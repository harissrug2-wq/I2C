-- Allow Google Sheets to use the existing server-only integration connection store.
-- Existing QuickBooks and Brightpearl rows remain valid.

alter table public.integration_connections
  drop constraint if exists integration_connections_provider_check;

alter table public.integration_connections
  add constraint integration_connections_provider_check
  check (provider in ('quickbooks','brightpearl','google_sheets'));
