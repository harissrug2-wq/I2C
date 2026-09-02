import fs from 'node:fs';

const fixtureUrl = name => new URL(`./fixtures/reference/${name}`, import.meta.url);
export const readReferenceJson = name => JSON.parse(fs.readFileSync(fixtureUrl(name), 'utf8'));

export function loadReferenceWorkspace() {
  return {
    customers: readReferenceJson('customers.json'),
    suppliers: readReferenceJson('suppliers.json'),
    invoices: readReferenceJson('invoices.json'),
    invoiceLines: readReferenceJson('invoice_lines.json'),
    bills: readReferenceJson('bills.json'),
    paymentsReceived: readReferenceJson('payments_received.json'),
    paymentsMade: readReferenceJson('payments_made.json'),
    products: readReferenceJson('products.json'),
    bankAccounts: readReferenceJson('bank_accounts.json'),
    companyMetrics: readReferenceJson('company_metrics.json'),
  };
}
