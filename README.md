# i2cashflow Dashboard

The deployable Vite application lives directly at the repository root.

## Current development modules

1. Manual Data Collection Integration (CSV) — implemented
2. Receivables — implemented checkpoint
3. Payables — next
4. Cash Forecasting
5. Inventory
6. Cross Domain Intelligence
7. Dynamic Integrations (QuickBooks, etc.)

## Local development

Requires Node.js 22.

```bash
npm ci
npm test
npm run dev
```

The development server defaults to `http://localhost:3000` and will select another port if 3000 is already occupied.

## Production build

```bash
npm ci
npm test
npm run build
```

Vercel can deploy this repository with the **Root Directory left blank / repository root**. The included `vercel.json` builds with `npm run build` and serves the Vite SPA from `dist`.

## Current verified seed reconciliation

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

`npm test` runs:

- reconciliation
- Phase 1 rule tests
- Phase 1 engine smoke test
- Module 1 CSV import tests
- Module 2 Receivables tests

## Data and persistence

The current manual workspace persists in browser `localStorage`. QuickBooks and other live integrations are deferred to Module 7. Do not commit `.env.local`, `.vercel`, `node_modules`, or `dist`.

## Receivables note

The supplied source material does not include the complete universal seven-component PayScore transformation specification. The current all-customer PayScore model remains explicitly provisional until that specification is available.
