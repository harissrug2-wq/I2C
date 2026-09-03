import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadReferenceWorkspace } from './referenceWorkspace.mjs';
import { createEmptyWorkspaceData } from '../src/data/emptyWorkspace.js';
import { buildEngineInputs } from '../src/domain/dataAdapters.js';
import { computeSystem1, computeSystem2, computeSystem3, computeSystem4, computeSystem5, evaluateRules, DEFAULT_THRESHOLDS } from '../src/utils/decisionSystems.js';

const reference = loadReferenceWorkspace();
const engine = buildEngineInputs(reference);
const inventory = computeSystem2(engine.products, DEFAULT_THRESHOLDS);

assert.equal(inventory.stockSkuCount, 32, 'Reference fixture should contain 32 stocked SKUs');
assert.equal(inventory.totalValue, 2090000, 'Inventory valuation must reconcile to reference fixture');
assert.equal(inventory.deadStockValue, 329360, 'Stagnant inventory value must reconcile to reference fixture');
assert.deepEqual(inventory.abcSummary.map(row => [row.abcClass, row.skuCount]), [['A',7],['B',9],['C',16]], 'ABC should be rank-based 20/30/50 bands');

const pvc = inventory.skus.find(row => row.sku === 'PVC-200-S40');
assert(pvc, 'Reference SKU must exist');
assert.equal(pvc.velocityDaily, 70, 'Velocity must use trailing 60-day units / 60');
assert.equal(pvc.daysOfStock, 82.6, 'Days of stock must be on-hand / daily velocity');
assert.equal(pvc.abcClass, 'A');
assert.equal(pvc.serviceLevelTarget, '98%', 'Class A should default to the 98% service target');
assert.equal(pvc.safetyStock, 359, 'Class-A safety stock should use z=2.05 with the reference lead-time deviation');
assert.equal(pvc.reorderPoint, 1339, 'Reorder point must equal lead-time demand + safety stock');
assert.equal('eoq' in pvc, false, 'EOQ is not part of the current inventory operating scope');

const synthetic = computeSystem2([
  {sku:'A-FAST',name:'A Fast',category:'Stock',onHand:4,wac:10,sellPrice:100,sales60d:120,annualSales:1000,leadTimeDays:5,leadTimeStdDev:1,daysQuiet:1},
  {sku:'B-1',name:'B1',category:'Stock',onHand:50,wac:10,sellPrice:50,sales60d:60,annualSales:500,leadTimeDays:5,leadTimeStdDev:1,daysQuiet:1},
  {sku:'B-2',name:'B2',category:'Stock',onHand:50,wac:10,sellPrice:40,sales60d:60,annualSales:400,leadTimeDays:5,leadTimeStdDev:1,daysQuiet:1},
  {sku:'C-1',name:'C1',category:'Stock',onHand:50,wac:10,sellPrice:20,sales60d:60,annualSales:200,leadTimeDays:5,leadTimeStdDev:1,daysQuiet:1},
  {sku:'C-2',name:'C2',category:'Stock',onHand:50,wac:10,sellPrice:10,sales60d:60,annualSales:100,leadTimeDays:5,leadTimeStdDev:1,daysQuiet:1},
], DEFAULT_THRESHOLDS);
const fast = synthetic.skus.find(row => row.sku === 'A-FAST');
assert.equal(fast.abcClass, 'A');
assert.equal(fast.stockoutRisk, 'HIGH');
assert(synthetic.reorderCandidates.some(row => row.sku === 'A-FAST'), 'High stockout-risk SKU must enter reorder queue');
assert(fast.minimumReorderUnits > 0, 'Below-reorder-point SKU should expose a minimum replenishment quantity');

const empty = createEmptyWorkspaceData();
for (const key of ['customers','suppliers','invoices','invoiceLines','bills','paymentsReceived','paymentsMade','products','bankAccounts']) {
  assert.deepEqual(empty[key], [], `${key} must start empty`);
}
const emptyEngine = buildEngineInputs(empty);
const s1 = computeSystem1(emptyEngine.cashBalance, emptyEngine.invoices, emptyEngine.products, emptyEngine.bills, emptyEngine.metrics, DEFAULT_THRESHOLDS);
const s2 = computeSystem2(emptyEngine.products, DEFAULT_THRESHOLDS);
const s4 = computeSystem4(emptyEngine.customers, emptyEngine.invoices, emptyEngine.bills, emptyEngine.vendors, DEFAULT_THRESHOLDS);
const s3 = computeSystem3(emptyEngine.cashBalance, emptyEngine.invoices, emptyEngine.bills, emptyEngine.metrics, emptyEngine.asOfDate, DEFAULT_THRESHOLDS);
const s5 = computeSystem5(emptyEngine.products, emptyEngine.customers, emptyEngine.vendors, DEFAULT_THRESHOLDS);
const emptyAdvisories = evaluateRules(s1,s2,s3,s4,s5,DEFAULT_THRESHOLDS);
assert.equal(s2.stockSkuCount, 0);
assert.equal(s2.totalValue, 0);
assert.equal(emptyAdvisories.length, 0, 'Empty workspace must not generate false financial alerts');

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
assert.equal(fs.existsSync(path.join(repoRoot, 'src/data/seed')), false, 'Runtime seed-data directory must not exist');
const runtimeFiles = [];
function collect(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collect(full);
    else if (/\.(js|jsx|json)$/.test(entry.name)) runtimeFiles.push(full);
  }
}
collect(path.join(repoRoot, 'src'));
const runtimeText = runtimeFiles.map(file => fs.readFileSync(file,'utf8')).join('\n');
for (const marker of ['Northgate Supply Co.','Meridian Pipe Works','Dana Mercer','Harbourline Distribution']) {
  assert.equal(runtimeText.includes(marker), false, `Runtime source still contains demo marker: ${marker}`);
}

console.log('✓ Module 5 inventory + clean workspace tests passed');
console.log(JSON.stringify({
  totalInventory: inventory.totalValue,
  stockSkuCount: inventory.stockSkuCount,
  deadStockValue: inventory.deadStockValue,
  abc: inventory.abcSummary.map(row => [row.abcClass,row.skuCount]),
  referenceReorderSignals: inventory.reorderAlertCount,
  emptyWorkspaceAdvisories: emptyAdvisories.length,
}, null, 2));
