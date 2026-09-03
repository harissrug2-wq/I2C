import assert from 'node:assert/strict';
import { buildEngineInputs } from '../src/domain/dataAdapters.js';
import { computeSystem4, DEFAULT_THRESHOLDS } from '../src/utils/decisionSystems.js';
import { computeReceivablesModule, evaluateReceivablesRules, referencePayScore } from '../src/domain/receivables.js';
import { loadReferenceWorkspace } from './referenceWorkspace.mjs';

const workspace = loadReferenceWorkspace();
const e=buildEngineInputs(workspace);
const r=computeReceivablesModule(e.customers,e.invoices,DEFAULT_THRESHOLDS);
const s4=computeSystem4(e.customers,e.invoices,e.bills,e.vendors,DEFAULT_THRESHOLDS);

// Calculation Visuals workbook — exact AR-aging reference.
assert.equal(r.totalAR,744790);
assert.equal(r.openInvoiceCount,17);
assert.deepEqual(r.aging.buckets,{Current:192090,'1-30':139310,'31-60':307990,'61-90':105400,'91-120':0,'120+':0});
assert.equal(r.aging.total,744790);
assert.equal(r.aging.reconciliationDelta,0);
assert.equal(r.aging.reconciled,true);

// Calculation Visuals simplified PayScore band formula.
assert.equal(referencePayScore(-1.7,3).score,15);
assert.equal(referencePayScore(0.3,3).score,25);
assert.equal(referencePayScore(6,3).score,45);
assert.equal(referencePayScore(12.3,3).score,45);
assert.equal(referencePayScore(18.3,3).score,60);
assert.equal(referencePayScore(22,3).score,60);
assert.equal(referencePayScore(45.8,4).score,78);
const expectedScores={
  'Northgate Supply Co.':78,
  'Harbor Industrial Group':60,
  'Vertex Plumbing Wholesale':45,
  'Cedar Mill HVAC':45,
  'Brightline Electric':15,
  'Granite State Fasteners':25,
  'Sunrise Pool Supply':60,
  'Atlas Roofing Distributors':45,
};
for(const c of r.customers) assert.equal(c.payScore,expectedScores[c.name],`${c.name} PayScore`);
assert.equal(r.highestRiskCustomer.name,'Northgate Supply Co.');
assert.equal(r.lowestRiskCustomer.name,'Brightline Electric');

// Latest Expected Results workbook ECL rules + 85% LGD.
assert.equal(r.eclModel.status,'latest-test-workbook');
assert.equal(r.totalECL,37168.16);
assert.equal(r.highestECLInvoice.invoiceNo,'INV-4438');
assert.equal(r.highestECLInvoice.ecl,13875.4);
const northgate4412=r.invoices.find(i=>i.invoiceNo==='INV-4412');
assert.equal(northgate4412.agingBucket,'61-90');
assert.equal(northgate4412.adjustedPD,0.22);
assert.equal(northgate4412.ecl,5834.4);

// Collection queue remains explainable and deterministic.
assert.equal(r.collectionQueue[0].name,'Northgate Supply Co.');
assert.equal(r.collectionQueue[0].priorityTier,'P2');
assert(r.collectionQueue.every(c=>Array.isArray(c.priorityFactors)&&c.priorityFactors.length===5));
assert.equal(r.priorityModel.status,'provisional');
assert.equal(r.payScoreModel.status,'provisional');

// Compatibility shape used by the existing app remains intact.
assert.equal(s4.totalAR,744790);
assert.equal(s4.collectionQueue.length,8);
assert.equal(s4.creditManagement.length,8);
assert.equal(s4.eclInvoices.length,17);

// Module 2 credit/bad-debt rules.
const sample={
  invoiceMedian:10000,
  customers:[
    {id:'A',name:'Breach Co',creditUtilization:110,balance:110000,creditLimit:100000,payScore:70,payScoreConfidence:70,avgDaysLate:20},
    {id:'B',name:'Near Co',creditUtilization:85,balance:85000,creditLimit:100000,payScore:50,payScoreConfidence:70,avgDaysLate:10},
    {id:'C',name:'Risk Co',creditUtilization:70,balance:70000,creditLimit:100000,payScore:78,payScoreConfidence:70,avgDaysLate:40},
    {id:'D',name:'No Limit',creditUtilization:null,balance:25000,creditLimit:0,payScore:45,payScoreConfidence:60,avgDaysLate:8},
  ],
  invoices:[
    {invoiceNo:'INV-X1',daysOverdue:100,payScore:50,ecl:500,balanceDue:5000,adjustedPD:.45},
    {invoiceNo:'INV-X2',daysOverdue:130,payScore:78,ecl:900,balanceDue:5000,adjustedPD:.68},
  ],
};
const ids=evaluateReceivablesRules(sample).map(a=>a.id);
for(const id of ['CRD-001','CRD-002','CRD-003','CRD-004','BAD-001','BAD-002']) assert(ids.includes(id),`${id} did not fire`);

console.log('✓ Module 2 receivables tests passed');
console.log(JSON.stringify({
  totalAR:r.totalAR,
  aging:r.aging.buckets,
  totalECL:r.totalECL,
  highestECL:[r.highestECLInvoice.invoiceNo,r.highestECLInvoice.ecl],
  highestPayScore:[r.highestRiskCustomer.name,r.highestRiskCustomer.payScore],
  lowestPayScore:[r.lowestRiskCustomer.name,r.lowestRiskCustomer.payScore],
  queue:r.collectionQueue.map(c=>[c.name,c.payScore,c.priorityTier,c.priorityScore]),
},null,2));
