import assert from 'node:assert/strict';
import { createEmptyWorkspaceData } from '../src/data/emptyWorkspace.js';
import { buildEngineInputs } from '../src/domain/dataAdapters.js';
import { importCsvFiles } from '../src/domain/csvImport.js';
import { computeReceivablesModule } from '../src/domain/receivables.js';
import { computeSystem1, computeSystem2, DEFAULT_THRESHOLDS } from '../src/utils/decisionSystems.js';

const workspace={
  customers:[
    {id:'CUS-001',name:'Blue Ridge Plumbing Co.',contact:'Tom Reynolds',terms:'Net 30',credit_limit:50000},
    {id:'CUS-002',name:'Summit Hardware Supply',contact:'Sarah Chen',terms:'Net 30',credit_limit:40000},
  ],
  suppliers:[],
  products:[
    {sku:'PEX-100',name:'PEX Tubing 100ft Roll',category:'Plumbing',wac:45,sell_price:80,on_hand:150},
    {sku:'CU-050',name:'Copper Coupling 1/2" (Pack 25)',category:'Plumbing',wac:22,sell_price:50,on_hand:100},
    {sku:'BV-100',name:'Brass Ball Valve 1"',category:'Plumbing',wac:15,sell_price:30,on_hand:200},
    {sku:'PVC-200',name:'PVC Pipe 2" × 10ft',category:'Plumbing',wac:12,sell_price:25,on_hand:250},
    {sku:'SC-500',name:'Sealant Cartridge 500ml',category:'Plumbing',wac:6,sell_price:15,on_hand:400},
  ],
  invoices:[
    {invoice_no:'INV-1001',customer_id:'CUS-001',invoice_date:'2026-02-15',due_date:'2026-03-17',total:6600,status:'OPEN'},
    {invoice_no:'INV-1002',customer_id:'CUS-001',invoice_date:'2026-06-15',due_date:'2026-07-15',total:9400,status:'OPEN'},
    {invoice_no:'INV-1003',customer_id:'CUS-001',invoice_date:'2026-07-20',due_date:'2026-08-19',total:3900,status:'CURRENT'},
    {invoice_no:'INV-1004',customer_id:'CUS-002',invoice_date:'2026-05-10',due_date:'2026-06-09',total:5750,balance_due:5750,status:'PAID',paid_date:'2026-06-05'},
    {invoice_no:'INV-1005',customer_id:'CUS-002',invoice_date:'2026-06-20',due_date:'2026-07-20',total:8200,balance_due:8200,status:'PAID',paid_date:'2026-07-18'},
    {invoice_no:'INV-1006',customer_id:'CUS-002',invoice_date:'2026-08-05',due_date:'2026-09-04',total:5950,status:'CURRENT'},
  ],
  invoiceLines:[], bills:[], paymentsMade:[], bankAccounts:[],
  paymentsReceived:[
    {receipt_no:'RCP-001',customer_id:'CUS-002',payment_date:'2026-06-05',method:'ACH',amount:5750,applied_to:[{invoice_no:'INV-1004',amount:5750}]},
    {receipt_no:'RCP-002',customer_id:'CUS-002',payment_date:'2026-07-18',method:'ACH',amount:8200,applied_to:[{invoice_no:'INV-1005',amount:8200}]},
  ],
  companyMetrics:{as_of_date:'2026-08-15'},
};

const e=buildEngineInputs(workspace);
const s1=computeSystem1(e.cashBalance,e.invoices,e.products,e.bills,e.metrics,DEFAULT_THRESHOLDS);
const ar=computeReceivablesModule(e.customers,e.invoices,DEFAULT_THRESHOLDS);
const inv=computeSystem2(e.products,DEFAULT_THRESHOLDS);
assert.equal(s1.totalAR,25850);
assert.equal(s1.openInvoiceCount,4);
assert.equal(e.invoices.find(i=>i.invoiceNo==='INV-1004').balanceDue,0);
assert.equal(e.invoices.find(i=>i.invoiceNo==='INV-1005').balanceDue,0);
assert.deepEqual(ar.aging.buckets,{Current:9850,'1-30':0,'31-60':9400,'61-90':0,'91-120':0,'120+':6600});
assert.equal(ar.totalECL,4087.86);
assert.equal(ar.customers.find(c=>c.id==='CUS-002').payScore,15);
assert.equal(ar.customers.find(c=>c.id==='CUS-001').payScore,85);
assert.equal(inv.totalValue,17350);

const empty=createEmptyWorkspaceData();
const crm=await importCsvFiles([{name:'hubspot-crm-exports-all-contacts-2026-05-14.csv',text:'Record ID,First Name,Last Name,Email,Phone,Unused CRM Field\n123,Ana,Smith,ana@example.com,,keep me\n124,Bob,Jones,bob@example.com,555-0102,extra\n'}],empty);
assert.equal(crm.ok,true);
assert.equal(crm.workspace.customers.length,2);
assert.equal(crm.workspace.customers[0].id,'123');
assert.equal(crm.workspace.customers[0].name,'Ana Smith');
assert.equal(crm.workspace.customers[0].unused_crm_field,'keep me');

const withCustomer={...createEmptyWorkspaceData(),customers:[{id:'CUS-001',name:'Example Customer'}]};
const invoicesCsv=await importCsvFiles([{name:'ar-export.csv',text:'Invoice Number,Customer ID,Invoice Date,Due Date,Amount,Status,Extra Column\nEXT-1,CUS-001,8/1/2026,8/31/2026,100,PAID,x\nEXT-2,CUS-001,8/2/2026,9/1/2026,200,OPEN,y\nEXT-3,,8/3/2026,,300,OPEN,z\n'}],withCustomer);
assert.equal(invoicesCsv.ok,true);
assert.equal(invoicesCsv.workspace.invoices.length,3);
const importedEngine=buildEngineInputs(invoicesCsv.workspace);
assert.equal(importedEngine.invoices.find(i=>i.invoiceNo==='EXT-1').balanceDue,0);
assert.equal(importedEngine.invoices.find(i=>i.invoiceNo==='EXT-2').balanceDue,200);
assert.ok(invoicesCsv.warnings.length>0);

console.log('✓ Small workbook rules + flexible CSV tests passed');
console.log(JSON.stringify({ar:s1.totalAR,aging:ar.aging.buckets,ecl:ar.totalECL,payScores:Object.fromEntries(ar.customers.map(c=>[c.name,c.payScore])),inventory:inv.totalValue,flexibleCsvWarnings:invoicesCsv.warnings.length},null,2));
