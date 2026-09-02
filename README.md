# i2cashflow Dashboard

The deployable Vite application lives directly at the repository root.

## Development path

1. Manual Data Collection Integration (CSV) — implemented
2. Receivables — implemented
3. Payables — implemented
4. Cash Forecasting — implemented
5. Inventory — implemented
6. Cross Domain Intelligence — next
7. Dynamic Integrations (QuickBooks, etc.) — planned

These numbers are development sequencing only and are not displayed in the product UI.

## Local development

Requires Node.js 22.

```bash
npm ci
npm test
npm run dev
```

## Production build

```bash
npm ci
npm test
npm run build
```

Vercel deploys from the repository root. The included `vercel.json` builds with `npm run build` and serves the Vite SPA from `dist`.

## Workspace data

The product now starts with an **empty workspace**. No demo customers, invoices, bills, products, suppliers, payments, bank balances or company metrics are bundled into the browser application.

Users populate the workspace by:

- CSV import
- manual data entry
- JSON import/export
- future live integrations

Manual workspace data persists in browser `localStorage`.

## Reference fixtures

Automated calculation tests still require deterministic source examples. Those reference datasets live under `scripts/fixtures/reference/` and are test-only; they are not imported by the Vite application or used to initialize a user workspace.

The reference reconciliation remains:

| KPI | Value |
|---|---:|
| Cash | $1,284,900 |
| Open AR | $744,790 |
| Open AP | $715,300 |
| Inventory | $2,090,000 |
| Current ratio | 5.03 |
| Quick ratio | 2.48 |
| DIO | 98 days |
| DSO | 54.9 days |
| DPO | 56 days |
| CCC | 96.8 days |

## Automated checks

`npm test` runs reconciliation, rule/engine checks, CSV import tests, and dedicated Receivables, Payables, Cash Forecasting and Inventory tests. It also verifies that the runtime source contains no bundled demo workspace data.

## Scope notes

- PayScore remains explicitly provisional until the complete universal seven-component transformation specification is supplied.
- Inventory currently implements reorder rules, dead/stagnant stock detection and basic ABC classification. Seasonal logic and EOQ are not exposed in the current operating scope.
- Cross-domain chaining is intentionally deferred to the next development step.

## Authentication and isolated workspaces

The dashboard uses Supabase email/password authentication. Operational data is no longer stored in browser localStorage. Each authenticated user owns one workspace row, and `workspace_state` is protected with Postgres Row Level Security (`owner_id = auth.uid()`).

### Required environment variables

Copy `.env.example` to `.env.local` and set:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Apply `supabase/migrations/202609030001_auth_isolated_workspaces.sql` to the Supabase project before testing sign-up. The migration creates the profile/workspace tables, RLS policies, and a signup trigger that provisions an empty workspace for every new account.

For Vercel, add the same two variables in Project Settings → Environment Variables and redeploy. Add the production domain and local development URL to the Supabase Auth URL configuration so confirmation redirects are accepted.
