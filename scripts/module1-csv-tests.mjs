import assert from 'node:assert/strict';
import { importCsvFiles, parseCsv, workspaceToCsv } from '../src/domain/csvImport.js';
import { buildEngineInputs } from '../src/domain/dataAdapters.js';
import { loadReferenceWorkspace } from './referenceWorkspace.mjs';

const workspace = loadReferenceWorkspace();

const parsed=parseCsv('id,name\r\nCUS-X,"Acme, Inc."\r\n');
assert.equal(parsed.rows[0].name,'Acme, Inc.','quoted CSV fields must parse');

const datasets=['customers','suppliers','invoices','invoiceLines','bills','paymentsReceived','paymentsMade','products','bankAccounts','companyMetrics'];
const filename={customers:'customers.csv',suppliers:'suppliers.csv',invoices:'invoices.csv',invoiceLines:'invoice_lines.csv',bills:'bills.csv',paymentsReceived:'payments_received.csv',paymentsMade:'payments_made.csv',products:'products.csv',bankAccounts:'bank_accounts.csv',companyMetrics:'company_metrics.csv'};
const files=datasets.map(dataset=>({name:filename[dataset],text:workspaceToCsv(dataset,workspace)}));
const result=await importCsvFiles(files,workspace);
assert.equal(result.ok,true,`reference bundle must import: ${result.errors?.join('; ')}`);
assert.equal(result.workspace.importMeta.completeBundle,true,'full operational bundle should be marked complete');

const engine=buildEngineInputs(result.workspace);
assert.equal(engine.cashBalance,1284900,'cash reconciliation must survive CSV round-trip');
assert.equal(engine.invoices.filter(i=>i.balanceDue>0).reduce((s,i)=>s+i.balanceDue,0),744790,'AR reconciliation must survive CSV round-trip');
assert.equal(engine.bills.filter(b=>b.balanceDue>0).reduce((s,b)=>s+b.balanceDue,0),715300,'AP reconciliation must survive CSV round-trip');

const bad=await importCsvFiles([{name:'invoices.csv',text:'invoice_no,customer_id,invoice_date,due_date,total,balance_due\nINV-X,MISSING,2026-08-01,2026-08-31,100,100\n'}],workspace);
assert.equal(bad.ok,true,'missing customer FK must not reject a best-effort manual CSV import');
assert.ok(bad.warnings.some(e=>e.includes('missing customer')),'missing customer warning should be explicit');
assert.equal(bad.workspace.invoices.some(i=>i.invoice_no==='INV-X'),true,'available invoice values should still be imported');

console.log('✓ Module 1 CSV import tests passed');
