import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { importCsvFiles, parseCsv, workspaceToCsv } from '../src/domain/csvImport.js';
import { buildEngineInputs } from '../src/domain/dataAdapters.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJson=name=>JSON.parse(fs.readFileSync(path.join(root,'src/data/seed',name),'utf8'));
const workspace={
  customers:readJson('customers.json'), suppliers:readJson('suppliers.json'), invoices:readJson('invoices.json'), invoiceLines:readJson('invoice_lines.json'),
  bills:readJson('bills.json'), paymentsReceived:readJson('payments_received.json'), paymentsMade:readJson('payments_made.json'), products:readJson('products.json'),
  bankAccounts:readJson('bank_accounts.json'), companyMetrics:readJson('company_metrics.json'),
};

const parsed=parseCsv('id,name\r\nCUS-X,"Acme, Inc."\r\n');
assert.equal(parsed.rows[0].name,'Acme, Inc.','quoted CSV fields must parse');

const datasets=['customers','suppliers','invoices','invoiceLines','bills','paymentsReceived','paymentsMade','products','bankAccounts','companyMetrics'];
const filename={customers:'customers.csv',suppliers:'suppliers.csv',invoices:'invoices.csv',invoiceLines:'invoice_lines.csv',bills:'bills.csv',paymentsReceived:'payments_received.csv',paymentsMade:'payments_made.csv',products:'products.csv',bankAccounts:'bank_accounts.csv',companyMetrics:'company_metrics.csv'};
const files=datasets.map(dataset=>({name:filename[dataset],text:workspaceToCsv(dataset,workspace)}));
const result=await importCsvFiles(files,workspace);
assert.equal(result.ok,true,`seed bundle must import: ${result.errors?.join('; ')}`);
assert.equal(result.workspace.importMeta.completeBundle,true,'full operational bundle should be marked complete');

const engine=buildEngineInputs(result.workspace);
assert.equal(engine.cashBalance,1284900,'cash reconciliation must survive CSV round-trip');
assert.equal(engine.invoices.filter(i=>i.balanceDue>0).reduce((s,i)=>s+i.balanceDue,0),744790,'AR reconciliation must survive CSV round-trip');
assert.equal(engine.bills.filter(b=>b.balanceDue>0).reduce((s,b)=>s+b.balanceDue,0),715300,'AP reconciliation must survive CSV round-trip');

const bad=await importCsvFiles([{name:'invoices.csv',text:'invoice_no,customer_id,invoice_date,due_date,total,balance_due\nINV-X,MISSING,2026-08-01,2026-08-31,100,100\n'}],workspace);
assert.equal(bad.ok,false,'missing customer FK must reject import');
assert.ok(bad.errors.some(e=>e.includes('missing customer')),'missing customer error should be explicit');

console.log('✓ Module 1 CSV import tests passed');
