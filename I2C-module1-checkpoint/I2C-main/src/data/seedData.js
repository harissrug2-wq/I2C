import customers from './seed/customers.json';
import suppliers from './seed/suppliers.json';
import invoices from './seed/invoices.json';
import invoiceLines from './seed/invoice_lines.json';
import bills from './seed/bills.json';
import paymentsReceived from './seed/payments_received.json';
import paymentsMade from './seed/payments_made.json';
import products from './seed/products.json';
import bankAccounts from './seed/bank_accounts.json';
import companyMetrics from './seed/company_metrics.json';

export const INITIAL_WORKSPACE_DATA = {
  customers,
  suppliers,
  invoices,
  invoiceLines,
  bills,
  paymentsReceived,
  paymentsMade,
  products,
  bankAccounts,
  companyMetrics,
};

export function cloneInitialWorkspaceData() {
  return JSON.parse(JSON.stringify(INITIAL_WORKSPACE_DATA));
}
