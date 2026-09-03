import assert from 'node:assert/strict';
import { computeCrossDomainIntelligence } from '../src/domain/crossDomain.js';

const workspace = {
  companyMetrics: {},
  invoices: [
    { invoice_no:'INV-OLD', customer_id:'C-HIGH', total:12000 },
    { invoice_no:'INV-HIGH-2', customer_id:'C-HIGH', total:10000 },
    { invoice_no:'INV-LOW', customer_id:'C-LOW', total:10000 },
  ],
  invoiceLines: [
    { invoice_no:'INV-OLD', line_no:1, sku:'SKU-A', qty:100, unit_price:80, line_total:8000 },
    { invoice_no:'INV-OLD', line_no:2, sku:'SKU-B', qty:20, unit_price:100, line_total:2000 },
    { invoice_no:'INV-HIGH-2', line_no:1, sku:'SKU-A', qty:100, unit_price:80, line_total:8000 },
    { invoice_no:'INV-LOW', line_no:1, sku:'SKU-A', qty:10, unit_price:80, line_total:800 },
    { invoice_no:'INV-LOW', line_no:2, sku:'SKU-B', qty:90, unit_price:100, line_total:9000 },
  ],
};

const sys1 = { workingCapital: 50000 };
const sys2 = {
  skus: [
    { sku:'SKU-A', name:'High Margin A', category:'Stock', wac:20 },
    { sku:'SKU-B', name:'Low Margin B', category:'Stock', wac:95 },
  ],
};
const customers = [
  { id:'C-HIGH', name:'High Risk Co', payScore:85, avgDaysLate:55, avgDaysToPay:85, termsDays:30, balance:10000 },
  { id:'C-LOW', name:'Low Risk Co', payScore:15, avgDaysLate:0, avgDaysToPay:25, termsDays:30, balance:5000 },
];
const openInvoices = [
  { invoiceNo:'INV-OLD', id:'INV-OLD', customerId:'C-HIGH', customerName:'High Risk Co', amount:12000, balanceDue:10000, daysOverdue:150, payScore:85 },
  { invoiceNo:'INV-LOW', id:'INV-LOW', customerId:'C-LOW', customerName:'Low Risk Co', amount:10000, balanceDue:5000, daysOverdue:0, payScore:15 },
];
const sys3 = { cashToday:1000, inflow30d:1000, outflow30d:10000, forecastConfidence:80 };
const sys4 = {
  receivables: {
    invoiceMedian:2000,
    invoices:openInvoices,
    customers,
    badDebtCandidates:[openInvoices[0]],
  },
  payables: {
    suppliers:[{id:'V1', name:'Vendor One', netDays:30}],
    discountOpportunities:[
      { billNo:'BILL-1', balanceDue:4000, discountSavings:100, discountAPR:0.37, discountAPRPercent:37, aprQualified:true },
    ],
  },
};

const result = computeCrossDomainIntelligence({ workspace, sys1, sys2, sys3, sys4, thresholds:{ cost_of_capital:0.12, coverage_multiplier:1.2 } });
const ids = result.advisories.map(a=>a.id);
for (const id of ['INV-XD-001','INV-XD-002','BAD-XD-001','BAD-XD-002','AR-AP-XD-001']) {
  assert(ids.includes(id), `${id} should fire`);
}
assert.equal(result.rules.find(r=>r.id==='BAD-XD-003').status,'waiting-external-data');
assert.equal(result.rules.find(r=>r.id==='BAD-XD-004').status,'waiting-history');
assert.equal(result.rules.find(r=>r.id==='AR-AP-XD-003').status,'waiting-calibration');
assert.equal(result.metrics.cashTight,true);
assert(result.metrics.totalCollectableAR > 4000);

const suppressed = computeCrossDomainIntelligence({
  workspace, sys1, sys2, sys3, sys4,
  thresholds:{ cost_of_capital:0.12, coverage_multiplier:1.2, xd_inventory_hostage_multiplier:100, xd_risky_sku_customer_share:0.99, xd_writeoff_inventory_min:999999 },
});
assert(!suppressed.advisories.some(a=>a.id==='INV-XD-001'));
assert(!suppressed.advisories.some(a=>a.id==='INV-XD-002'));
assert(!suppressed.advisories.some(a=>a.id==='BAD-XD-001'));

const gapWorkspace = {
  ...workspace,
  companyMetrics: {
    annual_purchases: 2_000_000,
    monthly_profit_history: [8000,10000,12000,9000,11000,10000],
  },
};
const gapResult = computeCrossDomainIntelligence({ workspace:gapWorkspace, sys1, sys2, sys3, sys4, thresholds:{ cost_of_capital:0.12, coverage_multiplier:1.2 } });
assert(gapResult.advisories.some(a=>a.id==='AR-AP-XD-002'),'AR-AP-XD-002 should fire with complete financing-gap inputs');
assert.equal(gapResult.rules.find(r=>r.id==='AR-AP-XD-002').status,'operational');

const empty = computeCrossDomainIntelligence({ workspace:{}, sys1:{}, sys2:{skus:[]}, sys3:{}, sys4:{receivables:{invoices:[],customers:[],badDebtCandidates:[]},payables:{suppliers:[],discountOpportunities:[]}}, thresholds:{} });
assert.equal(empty.advisories.length,0);
assert.equal(empty.totalRuleCount,9);

console.log('✓ Cross-domain intelligence tests passed');
console.log(JSON.stringify({
  fired:ids,
  activeSignals:result.activeSignalCount,
  operationalRules:result.operationalRuleCount,
  waitingRules:result.waitingRuleCount,
  totalCollectableAR:result.metrics.totalCollectableAR,
  gapRule:gapResult.advisories.find(a=>a.id==='AR-AP-XD-002')?.finding,
},null,2));
