import assert from 'node:assert/strict';
import { buildEngineInputs } from '../src/domain/dataAdapters.js';
import { computePayablesModule, discountAPR, evaluatePayablesRules } from '../src/domain/payables.js';
import { DEFAULT_THRESHOLDS } from '../src/utils/decisionSystems.js';
import { loadReferenceWorkspace } from './referenceWorkspace.mjs';

const workspace = loadReferenceWorkspace();

const engine = buildEngineInputs(workspace);
const ap = computePayablesModule(engine.bills, engine.vendors, engine.cashBalance, DEFAULT_THRESHOLDS);

// Calculation Visuals / Manual Calculations — exact canonical AP references.
assert.equal(ap.totalAP, 715300);
assert.equal(ap.openBillCount, 12);
assert.deepEqual(ap.aging.buckets, {
  'Past Due': 14200,
  '0-15': 330550,
  '16-30': 212350,
  '31-60': 158200,
  '61+': 0,
});
assert.equal(ap.aging.total, 715300);
assert.equal(ap.aging.reconciliationDelta, 0);
assert.equal(ap.aging.reconciled, true);
assert.equal(ap.pastDueAmount, 14200);
assert.equal(ap.pastDueBillCount, 1);

const expectedSupplierAP = {
  'Meridian Pipe Works': 214600,
  'Cascade Metals & Alloy': 168200,
  'Polaris Electrical Supply': 97400,
  'Ridgeline Tool Co.': 62800,
  'Halcyon Packaging': 28400,
  'Orchid Valve Import': 143900,
};
for (const supplier of ap.suppliers) {
  assert.equal(supplier.apBalance, expectedSupplierAP[supplier.name], `${supplier.name} AP balance`);
}
assert.equal(ap.highestExposureSupplier.name, 'Meridian Pipe Works');
assert.equal(ap.highestExposureSupplier.apBalance, 214600);

// Canonical reference fixture + Calculations Breakdown active discount reference: 3 bills, $3,653.
assert.equal(ap.discountOpportunities.length, 3);
assert.equal(ap.totalDiscountSavings, 3653);
assert.deepEqual(ap.discountOpportunities.map(b => b.billNo).sort(), ['BILL-8801', 'BILL-8820', 'BILL-8850']);
assert.equal(ap.discountOpportunities.find(b => b.billNo === 'BILL-8801').discountAPRPercent, 37.2);
assert.equal(ap.discountOpportunities.find(b => b.billNo === 'BILL-8850').discountAPRPercent, 24.8);
assert.equal(ap.discountOpportunities.find(b => b.billNo === 'BILL-8820').discountAPRPercent, 12.3);
assert.equal(Math.round(discountAPR(2, 10, 30) * 1000) / 10, 37.2);

// Payment priority is deterministic and keeps the past-due bill at the top.
assert.equal(ap.paymentQueue[0].billNo, 'BILL-8840');
assert.equal(ap.paymentQueue[0].priorityTier, 'P1');
assert.equal(ap.paymentHistory.paymentCount, 14);

// Current source data explicitly lacks supplier relationship / extension / single-source flags.
// The engine must not invent AP-002/AP-003/AP-004 from null metadata.
const canonicalIds = evaluatePayablesRules(ap, { cashToday: 1284900, inflow30d: 0, outflow30d: 0 }, DEFAULT_THRESHOLDS).map(a => a.id);
assert.deepEqual([...new Set(canonicalIds)], ['AP-001']);
assert.equal(canonicalIds.filter(id => id === 'AP-001').length, 3);

// Formal AP rule fixtures.
const ruleFixture = {
  bills: [
    {
      billNo: 'AP1', supplierId: 'V1', vendorName: 'Vendor 1', balanceDue: 1000,
      daysOverdue: 0, daysToDue: 5, discountSavings: 20, discountAPR: 0.30,
      cashSufficient: true, dueDate: '2026-08-20', asOfDate: '2026-08-15',
    },
    {
      billNo: 'AP2', supplierId: 'V2', vendorName: 'Vendor 2', balanceDue: 2000,
      daysOverdue: 2, daysToDue: -2, discountSavings: 0, discountAPR: 0,
    },
    {
      billNo: 'AP3', supplierId: 'V3', vendorName: 'Vendor 3', balanceDue: 3000,
      daysOverdue: 3, daysToDue: -3, discountSavings: 0, discountAPR: 0,
    },
    {
      billNo: 'AP4', supplierId: 'V4', vendorName: 'Vendor 4', balanceDue: 4000,
      daysOverdue: 0, daysToDue: 4, discountSavings: 0, discountAPR: 0,
    },
  ],
  suppliers: [
    { id: 'V1', name: 'Vendor 1' },
    { id: 'V2', name: 'Vendor 2', singleSourceForClassA: true },
    { id: 'V3', name: 'Vendor 3', relationshipRating: 'strong' },
    { id: 'V4', name: 'Vendor 4', allowsExtension: true },
  ],
  cashBalance: 10000,
};
const tightForecast = { cashToday: 100, inflow30d: 100, outflow30d: 500 };
const advisories = evaluatePayablesRules(ruleFixture, tightForecast, DEFAULT_THRESHOLDS);
const ids = advisories.map(a => a.id);
for (const id of ['AP-001', 'AP-002', 'AP-003', 'AP-004']) {
  const hit = advisories.find(a => a.id === id);
  assert(hit, `${id} did not fire`);
  for (const field of ['finding', 'reason', 'risk', 'recommendedAction', 'priority']) {
    assert(hit[field], `${id} missing ${field}`);
  }
  assert(hit.confidence >= 25 && hit.confidence <= 95, `${id} confidence out of range`);
  assert(Array.isArray(hit.contributors) && hit.contributors.length >= 1 && hit.contributors.length <= 5, `${id} contributors invalid`);
}

console.log('✓ Module 3 payables tests passed');
console.log(JSON.stringify({
  totalAP: ap.totalAP,
  aging: ap.aging.buckets,
  discountSavings: ap.totalDiscountSavings,
  discountBills: ap.discountOpportunities.map(b => [b.billNo, b.discountSavings, b.discountAPRPercent]),
  topPriority: [ap.paymentQueue[0].billNo, ap.paymentQueue[0].priorityTier],
  supplierExposure: ap.suppliers.map(s => [s.name, s.apBalance]),
}, null, 2));
