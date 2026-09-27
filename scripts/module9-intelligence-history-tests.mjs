import assert from 'node:assert/strict';
import { buildMetricSnapshots, buildPredictionRows, deterministicFingerprint, stableStringify } from '../src/domain/intelligenceHistory.js';

assert.equal(
  stableStringify({ b: 2, a: { y: 2, x: 1 } }),
  stableStringify({ a: { x: 1, y: 2 }, b: 2 }),
  'stableStringify must ignore object-key order',
);

assert.equal(
  deterministicFingerprint({ a: 1, b: 2 }),
  deterministicFingerprint({ b: 2, a: 1 }),
  'fingerprints must be deterministic',
);

const computedData = {
  sys1: { totalAR: 1000, totalAP: 700, inventoryValue: 500, dio: 20, dso: 30, dpo: 15, ccc: 35, currentRatio: 2, quickRatio: 1.5, workingCapital: 800, wcRevenueRatio: 0.1 },
  sys2: { totalValue: 500, stockSkuCount: 2, deadStockValue: 50, overstockedValue: 0, reorderAlertCount: 1, abcSummary: { A: 1, B: 1, C: 0 } },
  sys3: { horizonDays: 30, cashToday: 2000, endingCash: 2200, lowPointCash: 1900, lowPointDate: '2026-09-20', inflow30d: 1000, outflow30d: 800, coverageRatio: 3.75, runwayDays: 9999, forecastConfidence: 85 },
  sys4: {
    receivables: { totalAR: 1000, totalECL: 50, collectibleAR: 950, moneyAtRisk: 400, aging: { Current: 500, '31-60': 500 }, payScoreModel: 'provisional' },
    payables: { totalAP: 700, pastDueAmount: 100, aging: { 'Past Due': 100 }, totalDiscountSavings: 25 },
  },
  sys5: { top1CustShare: 35, top3CustShare: 60, top1VendorShare: 45, top3VendorShare: 75 },
  crossDomain: { summary: { activeSignals: 2 }, statuses: [{ id: 'INV-XD-001', status: 'active' }] },
};

const advisory = {
  id: 'WCM-010',
  system: 'Overall WCM',
  domain: 'Liquidity',
  priority: 'HIGH',
  confidence: 88,
  finding: 'Current ratio is low.',
  reason: 'Assets are low.',
  risk: 'Liquidity pressure.',
  recommendedAction: 'Protect cash.',
  contributors: ['Current ratio 2'],
};

const rows = buildPredictionRows({
  ownerId: 'owner-1',
  workspaceId: 'workspace-1',
  advisories: [advisory],
  thresholds: { current_ratio_min: 2.5 },
  asOfDate: '2026-09-26',
  computedData,
});

assert.equal(rows.length, 1);
assert.equal(rows[0].rule_id, 'WCM-010');
assert.equal(rows[0].priority, 'HIGH');
assert.equal(rows[0].input_snapshot.asOfDate, '2026-09-26');
assert.ok(rows[0].fingerprint.length >= 16);

const sameRows = buildPredictionRows({
  ownerId: 'owner-1',
  workspaceId: 'workspace-1',
  advisories: [advisory],
  thresholds: { current_ratio_min: 2.5 },
  asOfDate: '2026-09-26',
  computedData,
});
assert.equal(rows[0].fingerprint, sameRows[0].fingerprint);

const changedRows = buildPredictionRows({
  ownerId: 'owner-1',
  workspaceId: 'workspace-1',
  advisories: [advisory],
  thresholds: { current_ratio_min: 3 },
  asOfDate: '2026-09-26',
  computedData,
});
assert.notEqual(rows[0].fingerprint, changedRows[0].fingerprint);

const snapshots = buildMetricSnapshots({
  ownerId: 'owner-1',
  workspaceId: 'workspace-1',
  asOfDate: '2026-09-26',
  computedData,
});

assert.deepEqual(
  snapshots.map(row => row.snapshot_type),
  ['daily_metrics', 'monthly_ccc', 'cash_forecast_30d'],
);
assert.equal(snapshots[0].metrics.workingCapital.ccc, 35);
assert.equal(snapshots[1].snapshot_date, '2026-09-01');
assert.equal(snapshots[2].metrics.cashToday, 2000);

console.log('✓ Audit + historical intelligence foundation tests passed');
console.log(JSON.stringify({
  predictionRows: rows.length,
  fingerprint: rows[0].fingerprint,
  snapshotTypes: snapshots.map(row => row.snapshot_type),
}, null, 2));
