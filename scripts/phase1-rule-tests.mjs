import assert from 'node:assert/strict';
import { evaluateRules, DEFAULT_THRESHOLDS, PHASE1_RULE_IDS } from '../src/utils/decisionSystems.js';

const base = () => ({
  sys1: { baselineReady:false, cccHistory:[], wcRatioHistory:[], ccc:40, dio:20,dso:20,dpo:0,currentRatio:2,quickRatio:1.5,workingCapital:100,currentAssets:1000,currentLiabilities:500,totalAR:200,inventoryValue:300,wcRevenueRatio:0.1,custBaselineCCC:null,custBaselineWcRevenueRatio:null },
  sys2: { skus:[], wkspMedianInventoryValue:1000 },
  sys3: { points:[{cash:100}],horizonDays:30,cashToday:1000,inflow30d:1000,outflow30d:500,burnRateDaily:0,runwayDays:9999,monthlyPayroll:null,forecastConfidence:90,lowPointCash:100,lowPointDay:'Aug 15' },
  sys4: { collectionQueue:[],bills:[],vendors:[],arGrowth:null,revenueGrowth:null },
  sys5: { top1VendorShareRaw:0,top3VendorShareRaw:0,top1CustShareRaw:0,top3CustShareRaw:0,customerConcentrationYoYIncrease:null },
});
const has=(id, mutate)=>{
  const x=base(); mutate(x);
  const advisories=evaluateRules(x.sys1,x.sys2,x.sys3,x.sys4,x.sys5,DEFAULT_THRESHOLDS);
  const hit=advisories.find(a=>a.id===id);
  assert(hit, `${id} did not fire; got ${advisories.map(a=>a.id).join(', ')}`);
  for (const field of ['finding','reason','risk','recommendedAction','priority']) assert(hit[field], `${id} missing ${field}`);
  assert(hit.confidence>=25 && hit.confidence<=95, `${id} confidence out of range`);
  assert(Array.isArray(hit.contributors) && hit.contributors.length>=1 && hit.contributors.length<=5, `${id} contributors invalid`);
};

has('WCM-001',x=>Object.assign(x.sys1,{baselineReady:true,custBaselineCCC:50,cccHistory:[40,45,48,60,61,62],ccc:63}));
has('WCM-003',x=>Object.assign(x.sys1,{baselineReady:true,custBaselineCCC:100,cccHistory:[80,75,70,65,60,55],ccc:50}));
has('WCM-004',x=>Object.assign(x.sys1,{baselineReady:true,custBaselineCCC:100,cccHistory:[40,40,40,40,40,50],ccc:65}));
has('WCM-010',x=>x.sys1.currentRatio=1.0);
has('WCM-011',x=>x.sys1.quickRatio=0.6);
has('WCM-012',x=>x.sys1.workingCapital=-10);
has('WCM-013',x=>Object.assign(x.sys1,{custBaselineWcRevenueRatio:0.1,wcRatioHistory:[.1,.1,.1,.1,.1,.1],wcRevenueRatio:.2}));

const skuBase={sku:'SKU-1',name:'Widget',category:'Stock',supplierId:'V1',leadTimeDays:10,daysOfStock:30,onHand:100,reorderPoint:50,abcClass:'B',velocityDaily:4,sales60d:240,leadTimeStdDev:2,turnoverAnnual:5,inventoryValue:500,daysQuiet:10,annualSales:500};
has('INV-001',x=>x.sys2.skus=[{...skuBase,daysOfStock:5}]);
has('INV-002',x=>x.sys2.skus=[{...skuBase,daysOfStock:12}]);
has('INV-003',x=>x.sys2.skus=[{...skuBase,daysOfStock:18}]);
has('INV-004',x=>x.sys2.skus=[{...skuBase,abcClass:'A',onHand:20,reorderPoint:50}]);
has('INV-010',x=>{x.sys2.wkspMedianInventoryValue=1000;x.sys2.skus=[{...skuBase,turnoverAnnual:.5,inventoryValue:2000}];});
has('INV-011',x=>x.sys2.skus=[{...skuBase,daysQuiet:181}]);
has('INV-012',x=>x.sys2.skus=[{...skuBase,turnoverAnnual:1.5,abcClass:'C'}]);
has('INV-013',x=>x.sys2.skus=[{...skuBase,onHand:600,annualSales:500}]);

has('CASH-001',x=>x.sys3.points=[{cash:100},{cash:-1,day:'Sep 1'}]);
has('CASH-010',x=>Object.assign(x.sys3,{burnRateDaily:10,runwayDays:20}));
has('CASH-011',x=>Object.assign(x.sys3,{burnRateDaily:10,runwayDays:45}));
has('CASH-012',x=>Object.assign(x.sys3,{burnRateDaily:10,runwayDays:75}));
has('CASH-020',x=>Object.assign(x.sys3,{cashToday:100,inflow30d:100,outflow30d:500}));
has('CASH-021',x=>Object.assign(x.sys3,{cashToday:100,monthlyPayroll:200}));

const cust={id:'C1',name:'Customer',payScore:50,payScoreAvailableComponents:7,payScoreProvisional:false,maxDaysOverdue:0,pastDue:100,balance:100,brokenPromises:0,preferredChannel:'email',asOfDate:'2026-08-15'};
has('COL-001',x=>x.sys4.collectionQueue=[{...cust,payScore:90,maxDaysOverdue:61}]);
has('COL-002',x=>x.sys4.collectionQueue=[{...cust,payScore:70,maxDaysOverdue:31}]);
has('COL-003',x=>x.sys4.collectionQueue=[{...cust,payScore:30,maxDaysOverdue:46}]);
has('COL-004',x=>x.sys4.collectionQueue=[{...cust,promisedPaymentDate:'2026-08-01',brokenPromises:1}]);
has('COL-005',x=>Object.assign(x.sys4,{arGrowth:.30,revenueGrowth:.10}));
has('COL-006',x=>x.sys4.collectionQueue=[{...cust,daysSincePreferredChannelContact:15}]);

has('AP-002',x=>{x.sys2.skus=[{...skuBase,abcClass:'A',supplierId:'V1'}];x.sys4.bills=[{billNo:'B1',supplierId:'V1',vendorName:'Vendor',daysOverdue:1}];x.sys4.vendors=[{id:'V1',singleSourceForClassA:true}];});
has('AP-003',x=>{x.sys4.bills=[{billNo:'B1',supplierId:'V1',vendorName:'Vendor',daysOverdue:1}];x.sys4.vendors=[{id:'V1',relationshipRating:'strong'}];});
has('AP-004',x=>{Object.assign(x.sys3,{cashToday:100,inflow30d:100,outflow30d:500});x.sys4.bills=[{billNo:'B1',supplierId:'V1',vendorName:'Vendor',daysOverdue:0,dueDate:'2026-08-20',asOfDate:'2026-08-15'}];x.sys4.vendors=[{id:'V1',allowsExtension:true}];});

has('VDC-001',x=>x.sys5.top1VendorShareRaw=.51);
has('VDC-002',x=>x.sys5.top3VendorShareRaw=.76);
has('CDC-001',x=>x.sys5.top1CustShareRaw=.31);
has('CDC-002',x=>x.sys5.top3CustShareRaw=.61);
has('CDC-003',x=>x.sys5.customerConcentrationYoYIncrease=.11);

assert.equal(PHASE1_RULE_IDS.length,35,'Expected 35 Phase 1 configured rules');
console.log(`✓ Phase 1 rule tests passed (${PHASE1_RULE_IDS.length} configured rules)`);
