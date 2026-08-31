# i2cashflow — Phase 1 Decision Systems checkpoint

Source basis: `DECISION SYSTEMS DESIGN` (August 2026), Phase 1 breadth-shallow scope.

## Implemented in this checkpoint

- Phase 1 JSON rule configuration with 35 scoped rule IDs.
- System 1: 90-day CCC structure, liquidity ratios, own-history rules gated until six months of history exists.
- System 2: velocity, safety stock, reorder point, ABC, reorder alerts, dead-stock alerts, overstock alerts.
- System 3: daily 30-day cash forecast, risk-weighted invoice inflows, scheduled bill outflows, payment-timing confidence band, runway and coverage rules.
- System 4: seven-component weighted PayScore architecture, collection queue, ECL using design PD/LGD structure, Phase 1 collection rules, basic AP prioritisation.
- System 5 Phase 1: vendor and customer concentration calculations and rules.
- Unified advisory objects now include Finding, Reason, Risk, Recommended Action, Priority, 25–95 confidence, and 1–5 contributing factors.
- Phase 2 advisory rules (cross-domain chaining, margin intelligence, early-pay optimisation) removed from the Phase 1 unified feed.
- Reorder page now ranks actual stockout/reorder risk instead of taking the first two SKUs.
- Forecast UI is limited to the Phase 1 30-day horizon; 60/90-day controls are visibly deferred to Phase 2.
- Misleading hard-coded cross-domain cards replaced with real Phase 1 concentration advisories.
- Automated tests:
  - Existing dataset reconciliation.
  - Trigger tests for all 35 Phase 1 configured rule IDs.
  - Advisory shape, confidence range, and contributor tests.
  - Seed-data engine smoke test.

## Deliberately not marked complete

1. **PayScore final calibration** — the Decision Systems document supplies approximate weights but explicitly says full component definitions are in the separate `i2C Intelligence Specification`. The app now labels derived PayScores provisional unless a workspace override is supplied.
2. **Decimal.js acceptance criterion** — calculations were structurally corrected, but this checkpoint has not yet migrated every arithmetic path to Decimal.js because the dependency was not available in the execution environment. This remains required before production sign-off.
3. **Durable configuration + audit backend** — current workspace data/threshold persistence remains browser localStorage. Production acceptance requires persistent workspace configuration, audit_log, predictions_log, and replayability.
4. **Missing source data** — rules requiring promise dates, preferred-channel contact history, AR/revenue growth history, vendor relationship rating, vendor extension permission, monthly payroll, and YoY concentration history correctly remain dormant when those fields are unavailable.
5. **WCM baseline rules** — the current seed data has no six-month WCM history, so own-baseline alerts correctly remain inactive rather than inventing history.
6. **Full dependency/build verification** — engine tests pass under Node 22. A clean `npm ci && npm run build` should be run in the normal development environment before deployment.

## Test command

```bash
npm test
```

Expected gates:

- `✓ Reconciliation passed`
- `✓ Phase 1 rule tests passed (35 configured rules)`
- `✓ Phase 1 seed engine smoke passed`
