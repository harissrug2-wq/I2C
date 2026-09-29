import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applyProviderSync, normalizeProviderPayload } from '../src/domain/integrations.js';

const payload = {
  customers:[
    { id:'C-1', name:'Acme', credit_limit:'1,250.50' },
  ],
  invoices:[
    { invoice_no:'INV-1', customer_id:'C-1', invoice_date:'2026-09-01', due_date:'2026-09-30', total:'1000', balance_due:'250', status:'open' },
  ],
  paymentsReceived:[
    { receipt_no:'R-1', customer_id:'C-1', payment_date:'2026-09-20', amount:'750', invoice_no:'INV-1', applied_amount:'750' },
  ],
  bankAccounts:[
    { account_id:'BANK-1', name:'Operating', type:'checking', balance:'5000.25' },
  ],
  companyMetrics:{
    as_of_date:'2026-09-28',
    revenue_last_30_days:'25000.75',
  },
};

const normalized = normalizeProviderPayload('google_sheets', payload, { syncedAt:'2026-09-28T00:00:00.000Z' });
assert.equal(normalized.providerId, 'google_sheets');
assert.equal(normalized.datasets.customers[0].credit_limit, 1250.5);
assert.equal(normalized.datasets.invoices[0].balance_due, 250);
assert.equal(normalized.datasets.bankAccounts[0].balance, 5000.25);
assert.equal(normalized.datasets.companyMetrics.revenue_last_30_days, 25000.75);
assert.deepEqual(normalized.datasets.paymentsReceived[0].applied_to, [{ invoice_no:'INV-1', amount:750 }]);
assert.equal(normalized.datasets.customers[0]._source_provider, 'google_sheets');

const workspace = {
  customers:[
    { id:'M-1', name:'Manual customer' },
    { id:'C-1', name:'Old Google row', _source_provider:'google_sheets' },
  ],
  suppliers:[], invoices:[], invoiceLines:[], bills:[], paymentsReceived:[], paymentsMade:[], products:[], bankAccounts:[],
  companyMetrics:{},
};
const applied = applyProviderSync(workspace, 'google_sheets', payload, { syncedAt:'2026-09-28T00:00:00.000Z' });
assert(applied.workspace.customers.some(row => row.id === 'M-1'), 'Manual rows must survive Google sync');
assert.equal(applied.workspace.customers.find(row => row.id === 'C-1')?.name, 'Acme');
assert.equal(applied.workspace.integrations.providers.google_sheets.status, 'synced');

const server = fs.readFileSync(new URL('../api/_lib/googleSheetsServer.js', import.meta.url), 'utf8');
const connections = fs.readFileSync(new URL('../src/pages/ConnectionsPage.jsx', import.meta.url), 'utf8');
const integrationApi = fs.readFileSync(new URL('../src/domain/integrationApi.js', import.meta.url), 'utf8');
const consolidatedRoute = fs.readFileSync(new URL('../api/integrations/google-sheets.js', import.meta.url), 'utf8');
assert(server.includes('spreadsheets.readonly'), 'Google Sheets scope must remain read-only');
assert(server.includes('drive.metadata.readonly'), 'Spreadsheet discovery must remain metadata-only');
assert(server.includes("access_type: 'offline'"), 'Google OAuth must request offline access for refresh tokens');
assert(server.includes('ensureGoogleSheetsToken'), 'Refresh-token path must remain available');
assert(connections.includes('GoogleSheetsConfigurator'), 'Connections page must expose spreadsheet mapping UI');
assert(integrationApi.includes("/api/integrations/google-sheets?action=connect"), 'Google Sheets connect must use the consolidated serverless route');
assert(integrationApi.includes("/api/integrations/google-sheets?action=sync"), 'Google Sheets sync must use the consolidated serverless route');
assert(consolidatedRoute.includes("action === 'files'"), 'Consolidated route must support spreadsheet discovery');
assert(consolidatedRoute.includes("action === 'inspect'"), 'Consolidated route must support workbook inspection');
assert(consolidatedRoute.includes("action === 'configure'"), 'Consolidated route must support mapping persistence');

console.log('✓ Dynamic Google Sheets integration tests passed');
console.log(JSON.stringify({
  datasets:normalized.presentDatasets,
  paymentAllocation:normalized.datasets.paymentsReceived[0].applied_to[0],
  manualRowPreserved:true,
  readOnlyScopes:true,
  consolidatedServerlessRoute:true,
}, null, 2));
