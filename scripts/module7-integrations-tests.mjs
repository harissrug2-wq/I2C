import assert from 'node:assert/strict';
import { createEmptyWorkspaceData } from '../src/data/emptyWorkspace.js';
import { buildEngineInputs } from '../src/domain/dataAdapters.js';
import {
  applyProviderSync,
  disconnectProvider,
  getIntegrationSummary,
  normalizeProviderPayload,
} from '../src/domain/integrations.js';

const base = createEmptyWorkspaceData();
base.customers.push({ id:'MANUAL-1', name:'Manual Customer', terms:'Net 30' });

const qbPayload = {
  customers: [
    { Id:'QB-C1', DisplayName:'North Star Supply', PrimaryEmailAddr:{ Address:'ar@northstar.test' }, SalesTermRef:{ name:'Net 30' } },
  ],
  vendors: [
    { Id:'QB-V1', DisplayName:'Acme Vendor', TermRef:{ name:'Net 30' } },
  ],
  invoices: [
    {
      Id:'QB-I1',
      DocNumber:'INV-QB-OPEN',
      CustomerRef:{ value:'QB-C1' },
      TxnDate:'2026-08-01',
      DueDate:'2026-08-31',
      TotalAmt:1000,
      Balance:1000,
      Line:[
        { Id:'1', Amount:1000, SalesItemLineDetail:{ ItemRef:{ value:'BP-100' }, Qty:10, UnitPrice:100 } },
      ],
    },
    {
      Id:'QB-I2',
      DocNumber:'INV-QB-PAID',
      CustomerRef:{ value:'QB-C1' },
      TxnDate:'2026-07-01',
      DueDate:'2026-07-31',
      TotalAmt:500,
      Balance:0,
    },
  ],
  bills: [
    {
      Id:'QB-B1',
      DocNumber:'BILL-QB-1',
      VendorRef:{ value:'QB-V1' },
      TxnDate:'2026-08-05',
      DueDate:'2026-09-04',
      TotalAmt:400,
      Balance:400,
    },
  ],
  accounts: [
    { Id:'QB-A1', Name:'Operating Checking', AcctType:'Bank', AcctSubType:'Checking', CurrentBalance:2500 },
    { Id:'QB-A2', Name:'Revenue', AcctType:'Income', CurrentBalance:999999 },
  ],
  metrics: {
    as_of_date:'2026-08-15',
    revenue_last_30_days:1500,
    cogs_last_30_days:600,
  },
};

const normalizedQb = normalizeProviderPayload('quickbooks', qbPayload, { syncedAt:'2026-09-04T00:00:00.000Z' });
assert.equal(normalizedQb.counts.customers, 1);
assert.equal(normalizedQb.counts.invoices, 2);
assert.equal(normalizedQb.counts.invoiceLines, 1);
assert.equal(normalizedQb.counts.bankAccounts, 1, 'non-cash QBO accounts must not enter cash position');

const qbSync = applyProviderSync(base, 'quickbooks', qbPayload, { syncedAt:'2026-09-04T00:00:00.000Z' });
assert.equal(qbSync.workspace.customers.some(c=>c.id==='MANUAL-1'), true, 'manual data must remain intact');
assert.equal(qbSync.workspace.integrations.providers.quickbooks.status, 'synced');
assert.equal(qbSync.workspace.integrations.providers.quickbooks.secretsStoredInWorkspace, false);

let engine = buildEngineInputs(qbSync.workspace);
assert.equal(engine.cashBalance, 2500);
assert.equal(engine.invoices.find(i=>i.invoiceNo==='INV-QB-OPEN')?.balanceDue, 1000);
assert.equal(engine.invoices.find(i=>i.invoiceNo==='INV-QB-PAID')?.balanceDue, 0, 'paid QBO invoice must never remain in AR');
assert.equal(engine.invoices.filter(i=>i.balanceDue>0).reduce((sum,i)=>sum+i.balanceDue,0), 1000);

const brightpearlPayload = {
  products: [
    { productId:'BP-ID-100', sku:'BP-100', name:'Copper Adapter', weightedAverageCost:20, sellPrice:100 },
    { productId:'BP-ID-200', sku:'BP-200', name:'PEX Coil', weightedAverageCost:30, sellPrice:60 },
  ],
  inventory: [
    { productId:'BP-ID-100', sku:'BP-100', onHand:20 },
    { productId:'BP-ID-200', sku:'BP-200', onHand:10 },
  ],
};

const bpSync = applyProviderSync(qbSync.workspace, 'brightpearl', brightpearlPayload, { syncedAt:'2026-09-04T00:05:00.000Z' });
engine = buildEngineInputs(bpSync.workspace);
assert.equal(engine.products.length, 2);
assert.equal(engine.products.reduce((sum,p)=>sum+p.onHand*p.wac,0), 700, 'Brightpearl inventory must feed the existing inventory engine unchanged');

const summary = getIntegrationSummary(bpSync.workspace);
assert.equal(summary.find(p=>p.id==='manual')?.status, 'active');
assert.equal(summary.find(p=>p.id==='quickbooks')?.status, 'synced');
assert.equal(summary.find(p=>p.id==='brightpearl')?.status, 'synced');
assert.equal(summary.find(p=>p.id==='quickbooks')?.secretsStoredInWorkspace, false);

// A second invoice sync is authoritative for QuickBooks-owned invoice rows, but
// manual/other-provider records remain. This prevents stale provider data.
const qbSecond = applyProviderSync(bpSync.workspace, 'quickbooks', {
  invoices: [
    {
      Id:'QB-I1',
      DocNumber:'INV-QB-OPEN',
      CustomerRef:{ value:'QB-C1' },
      TxnDate:'2026-08-01',
      DueDate:'2026-08-31',
      TotalAmt:1000,
      Balance:600,
    },
  ],
}, { syncedAt:'2026-09-04T01:00:00.000Z' });

engine = buildEngineInputs(qbSecond.workspace);
assert.equal(engine.invoices.find(i=>i.invoiceNo==='INV-QB-OPEN')?.balanceDue, 600);
assert.equal(engine.invoices.some(i=>i.invoiceNo==='INV-QB-PAID'), false, 'stale provider-owned invoice must be removed when invoice dataset is resynced');
assert.equal(qbSecond.workspace.products.length, 2, 'QBO invoice-only sync must not touch Brightpearl products');
assert.equal(qbSecond.workspace.customers.some(c=>c.id==='MANUAL-1'), true);

const disconnected = disconnectProvider(qbSecond.workspace, 'quickbooks', {
  removeSyncedData:true,
  disconnectedAt:'2026-09-04T02:00:00.000Z',
});
assert.equal(disconnected.customers.some(c=>c.id==='MANUAL-1'), true);
assert.equal(disconnected.customers.some(c=>c._source_provider==='quickbooks'), false);
assert.equal(disconnected.invoices.some(i=>i._source_provider==='quickbooks'), false);
assert.equal(disconnected.products.length, 2, 'disconnecting QuickBooks must not remove Brightpearl data');
assert.equal(disconnected.integrations.providers.quickbooks.status, 'not_connected');

console.log('✓ Dynamic integrations foundation tests passed');
console.log(JSON.stringify({
  quickBooksDatasets: normalizedQb.presentDatasets,
  quickBooksWarnings: normalizedQb.warnings.length,
  cash: 2500,
  openArAfterFirstSync: 1000,
  inventoryValue: 700,
  providers: getIntegrationSummary(bpSync.workspace).map(p=>[p.id,p.status,p.totalRecords]),
}, null, 2));
