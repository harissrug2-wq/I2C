# i2cashflow — Module 2: Receivables

## Development scope

Module 2 is the AR-side module in the current delivery order:

1. Manual Data Collection Integration (CSV) — Module 1
2. **Receivables — this checkpoint**
3. Payables
4. Cash Forecasting
5. Inventory
6. Cross Domain Intelligence
7. Dynamic Integrations

This checkpoint deliberately keeps supplier/AP intelligence and inventory-AR chaining out of the Receivables UI. Those belong to Modules 3 and 6.

## Source hierarchy and known conflicts

1. `i2C - All Calculations for Development (2).docx` / Decision Systems Design — formal rules, ECL structure, collection/credit definitions.
2. `i2C - Calculation Visuals (1).xlsx` — executable all-customer AR-aging and simplified PayScore reference.
3. `i2c - Individual Customer (Test Data) (1).xlsx` — Northgate worked deep dive.
4. `i2C - Test Data (Manual Calculations) (1).xlsx` — accounting reference where it agrees with the canonical $744,790 open-AR reconciliation.

### PayScore conflict

The full seven-component transformations are not supplied. The formal design delegates them to the separate `i2C Intelligence Specification`.

The available workbooks also contain two Northgate examples:

- Calculation Visuals simplified all-customer model: Northgate avg_days_late 45.75 → PayScore ~78.
- Individual Customer seven-component worked example: Northgate weighted PayScore = 66.2.

For an executable model that works for every supplied customer, Module 2 uses the explicit simplified band formula in Calculation Visuals:

- avg < 0 → 15
- avg 0–5 → 25
- avg 6–15 → 45
- avg 16–30 → 60
- avg > 30 → 78

The UI labels this PayScore model **provisional**. It must be replaced when the final Intelligence Specification is supplied.

### ECL conflict

The Calculation Visuals workbook contains older simplified PD rates (0.5%, 2%, 5%, 15%, 35%, 65%). The formal Decision Systems Design v1 specifies 1%, 3%, 8%, 22%, 45%, 68%, plus PayScore multipliers (<30 ×0.5, >80 ×1.5). Module 2 uses the formal Decision Systems Design v1 schedule and exposes that policy in the UI.

## Implemented

- Dedicated Receivables overview page.
- AR aging across Current, 1–30, 31–60, 61–90, 91–120, and 120+.
- Zero-drift aging reconciliation against total open AR.
- Customer payment-history metrics from actual receipt allocations.
- Source-backed simplified PayScore band model with confidence and explicit provisional status.
- Per-customer open AR, past due, oldest age, credit utilization, ECL, and recommended credit limit.
- Collection queue with explainable five-factor provisional priority score.
- Per-invoice ECL using design-v1 PD/LGD policy.
- Highest-ECL invoice and highest/lowest PayScore customer summaries.
- Customer drill-down with invoice aging and ECL details.
- Receivables-only Money at Risk page; cross-domain physical inventory recovery text removed from this module.
- Credit Management advisories: CRD-001 through CRD-004 where source data supports them.
- Bad-debt aging advisories: BAD-001 and BAD-002 where source data supports them.
- Existing COL rules remain active through the shared rule engine.

## Seed-data reference results

- Total open AR: **$744,790**
- Open invoices: **17**
- Current: **$192,090**
- 1–30: **$139,310**
- 31–60: **$307,990**
- 61–90: **$105,400**
- 91–120: **$0**
- 120+: **$0**
- Aging reconciliation delta: **$0**
- Highest simplified PayScore: **Northgate Supply Co. — 78**
- Lowest simplified PayScore: **Brightline Electric — 15**
- Design-v1 total ECL: **$45,291.77**
- Highest single-invoice ECL: **INV-4438 — $13,875.40**

## Automated gate

Run:

```bash
npm run test:module2
```

The full gate remains:

```bash
npm test
```

Expected:

- `✓ Reconciliation passed`
- `✓ Phase 1 rule tests passed (35 configured rules)`
- `✓ Phase 1 seed engine smoke passed`
- `✓ Module 1 CSV import tests passed`
- `✓ Module 2 receivables tests passed`

## Not yet production-final

- Final seven-component PayScore calibration remains unavailable.
- Collection Priority Score component calibration remains provisional because the source gives the component names/buckets but not every tuned weight.
- Durable audit/predictions persistence is still local-browser only.
- Decimal.js migration remains a production acceptance item.
- Rules needing promise/contact history, reserve-book balance, write-off history, external credit signals, collection-agency state, or historical AR/revenue growth stay dormant until those fields exist.
