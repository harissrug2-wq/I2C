import assert from 'node:assert/strict';
import { buildEngineInputs } from '../src/domain/dataAdapters.js';
import { DEFAULT_THRESHOLDS, computeSystem1, computeSystem2, computeSystem3, computeSystem4, computeSystem5, evaluateRules } from '../src/utils/decisionSystems.js';
import { loadReferenceWorkspace } from './referenceWorkspace.mjs';

const workspace = loadReferenceWorkspace();
const e=buildEngineInputs(workspace);
const s1=computeSystem1(e.cashBalance,e.invoices,e.products,e.bills,e.metrics,DEFAULT_THRESHOLDS);
const s2=computeSystem2(e.products,DEFAULT_THRESHOLDS);
const s4=computeSystem4(e.customers,e.invoices,e.bills,e.vendors,DEFAULT_THRESHOLDS);
const payScoreByCustomer=new Map(s4.collectionQueue.map(c=>[c.id,c.payScore]));
const cashInvoices=e.invoices.map(i=>({...i,riskScore:payScoreByCustomer.get(i.customerId)??i.riskScore}));
const s3=computeSystem3(e.cashBalance,cashInvoices,e.bills,e.metrics,e.asOfDate,DEFAULT_THRESHOLDS);
const s5=computeSystem5(e.products,e.customers,e.vendors,DEFAULT_THRESHOLDS);
const advisories=evaluateRules(s1,s2,s3,s4,s5,DEFAULT_THRESHOLDS);

assert.equal(s1.periodDays,90);
assert.equal(s1.baselineReady,false,'Cold-start data must not invent six-month WCM history');
assert.equal(s3.horizonDays,30,'Phase 1 cash forecast must be 30 days');
assert.equal(s3.points.length,31,'30-day daily forecast includes day 0');
assert.equal(s4.payScoreModel.status,'provisional','PayScore remains provisional until Intelligence Specification is supplied');
assert(advisories.every(a=>a.confidence>=25&&a.confidence<=95));
assert(advisories.every(a=>a.finding&&a.reason&&a.risk&&a.recommendedAction&&a.priority));
assert(advisories.every(a=>Array.isArray(a.contributors)&&a.contributors.length>=1&&a.contributors.length<=5));
assert(!advisories.some(a=>['AP-001','MAR-001','MAR-002','BAD-XD-001'].includes(a.id)),'Phase 2 rules must not enter Phase 1 feed');

console.log('✓ Phase 1 reference engine smoke passed');
console.log(JSON.stringify({ccc:s1.ccc,dio:s1.dio,dso:s1.dso,dpo:s1.dpo,forecastLow:s3.lowPointCash,forecastPoints:s3.points.length,payScoreModel:s4.payScoreModel.status,activeRuleIds:[...new Set(advisories.map(a=>a.id))]},null,2));
