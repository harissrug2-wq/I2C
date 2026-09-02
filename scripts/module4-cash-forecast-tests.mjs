import fs from 'node:fs';
import assert from 'node:assert/strict';
import { buildEngineInputs } from '../src/domain/dataAdapters.js';
import { computeCashForecastModule, collectionProbability } from '../src/domain/cashForecast.js';
import { computeSystem4, DEFAULT_THRESHOLDS, evaluateRules, computeSystem1, computeSystem2, computeSystem5 } from '../src/utils/decisionSystems.js';

const read = name => JSON.parse(fs.readFileSync(new URL(`../src/data/seed/${name}`, import.meta.url), 'utf8'));
const workspace = {
  customers: read('customers.json'),
  suppliers: read('suppliers.json'),
  invoices: read('invoices.json'),
  invoiceLines: read('invoice_lines.json'),
  bills: read('bills.json'),
  paymentsReceived: read('payments_received.json'),
  paymentsMade: read('payments_made.json'),
  products: read('products.json'),
  bankAccounts: read('bank_accounts.json'),
  companyMetrics: read('company_metrics.json'),
};

const engine = buildEngineInputs(workspace);
const sys4 = computeSystem4(engine.customers, engine.invoices, engine.bills, engine.vendors, DEFAULT_THRESHOLDS);
const payScoreByCustomer = new Map(sys4.collectionQueue.map(customer => [customer.id, customer.payScore]));
const cashInvoices = engine.invoices.map(invoice => ({
  ...invoice,
  riskScore: payScoreByCustomer.get(invoice.customerId) ?? invoice.riskScore,
}));
const cash = computeCashForecastModule(engine.cashBalance, cashInvoices, engine.bills, engine.metrics, engine.asOfDate, DEFAULT_THRESHOLDS, 30);

assert.equal(cash.horizonDays, 30, 'Cash Forecasting must expose a 30-day daily operating horizon');
assert.equal(cash.points.length, 31, 'Day 0 through day 30 must produce 31 daily points');
assert.equal(cash.cashToday, 1284900, 'Starting cash must reconcile to bank balances');
assert.equal(cash.inputCoverage.openInvoices, 17, 'All open invoices must enter forecast scheduling');
assert.equal(cash.inputCoverage.openBills, 12, 'All open bills must enter forecast scheduling');
assert.equal(cash.recurringDailyOutflow, 2000, '120k 60-day baseline outflow should contribute 2k/day recurring commitments');
assert.equal(cash.baselineDailyInflow, 1500, '90k 60-day baseline inflow should contribute 1.5k/day');
assert.equal(collectionProbability(20), 0.95);
assert.equal(collectionProbability(45), 0.80);
assert.equal(collectionProbability(70), 0.55);
assert.equal(collectionProbability(90), 0.25);

const pointInflows = cash.points.reduce((sum, point) => sum + point.expectedInflow, 0);
const pointOutflows = cash.points.reduce((sum, point) => sum + point.expectedOutflow, 0);
assert(Math.abs(pointInflows - cash.inflow30d) <= cash.points.length, 'Daily inflows must reconcile to forecast inflow total');
assert(Math.abs(pointOutflows - cash.outflow30d) <= cash.points.length, 'Daily outflows must reconcile to forecast outflow total');
assert(Math.abs((cash.cashToday + cash.inflow30d - cash.outflow30d) - cash.endingCash) <= 2, 'Ending cash must reconcile to starting cash + inflows - outflows');
assert(cash.lowPointCash <= cash.cashToday, 'Low point cannot exceed starting cash when it is defined as the minimum');
assert(cash.forecastConfidence >= 25 && cash.forecastConfidence <= 95, 'Forecast confidence must use the product confidence range');
assert(Array.isArray(cash.topInflows) && Array.isArray(cash.topOutflows));
assert(cash.scheduledInvoices.every(invoice => invoice.collectionProbability >= 0.25 && invoice.collectionProbability <= 0.95));

const s1 = computeSystem1(engine.cashBalance, engine.invoices, engine.products, engine.bills, engine.metrics, DEFAULT_THRESHOLDS);
const s2 = computeSystem2(engine.products, DEFAULT_THRESHOLDS);
const s5 = computeSystem5(engine.products, engine.customers, engine.vendors, DEFAULT_THRESHOLDS);
const rules = evaluateRules(s1, s2, cash, sys4, s5, DEFAULT_THRESHOLDS);
assert(rules.filter(rule => rule.domain === 'Cash').every(rule => ['CASH-001','CASH-004','CASH-010','CASH-011','CASH-012','CASH-020','CASH-021'].includes(rule.id)), 'Cash feed should only contain supported forecast/runway/coverage rules');

console.log('✓ Module 4 cash forecasting tests passed');
console.log(JSON.stringify({
  cashToday: cash.cashToday,
  inflow30d: cash.inflow30d,
  invoiceInflows: cash.invoiceInflows,
  baselineInflows: cash.baselineInflows,
  outflow30d: cash.outflow30d,
  billOutflows: cash.billOutflows,
  recurringOutflows: cash.recurringOutflows,
  endingCash: cash.endingCash,
  lowPointCash: cash.lowPointCash,
  lowPointDay: cash.lowPointDay,
  coverageRatio: cash.coverageRatio,
  runwayDays: cash.runwayDays,
  forecastConfidence: cash.forecastConfidence,
  cashRuleIds: [...new Set(rules.filter(rule => rule.domain === 'Cash').map(rule => rule.id))],
}, null, 2));
