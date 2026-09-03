/**
 * Dynamic Integrations foundation.
 *
 * Design goal:
 * External providers normalize into the same canonical workspace datasets used
 * by Manual CSV. Calculation engines never branch on provider.
 *
 * Secrets/tokens are intentionally NOT stored here. Live OAuth/API exchange
 * belongs on a server-side endpoint in the next integration step.
 */

export const INTEGRATION_MODEL_VERSION = 'dynamic-integrations-foundation-2026-09';

export const CANONICAL_DATASETS = Object.freeze([
  'customers',
  'suppliers',
  'invoices',
  'invoiceLines',
  'bills',
  'paymentsReceived',
  'paymentsMade',
  'products',
  'bankAccounts',
]);

export const INTEGRATION_PROVIDERS = Object.freeze({
  manual: {
    id: 'manual',
    name: 'Manual Data Workspace',
    category: 'Manual / CSV',
    authMode: 'none',
    serverOnlySecrets: false,
    datasets: [...CANONICAL_DATASETS, 'companyMetrics'],
    description: 'Manual entry and flexible CSV remain the fallback and testing source.',
  },
  quickbooks: {
    id: 'quickbooks',
    name: 'QuickBooks Online',
    category: 'Accounting',
    authMode: 'oauth2-server',
    serverOnlySecrets: true,
    datasets: [
      'customers',
      'suppliers',
      'invoices',
      'invoiceLines',
      'bills',
      'paymentsReceived',
      'paymentsMade',
      'bankAccounts',
      'companyMetrics',
    ],
    description: 'Accounting source for AR, AP, payments, cash accounts and finance inputs.',
  },
  brightpearl: {
    id: 'brightpearl',
    name: 'Brightpearl ERP',
    category: 'Inventory / ERP',
    authMode: 'api-server',
    serverOnlySecrets: true,
    datasets: ['products', 'suppliers', 'invoiceLines'],
    description: 'Inventory source for SKU master, on-hand stock, cost and related item data.',
  },
});

const DATASET_KEYS = Object.freeze({
  customers: row => row?.id,
  suppliers: row => row?.id,
  invoices: row => row?.invoice_no,
  invoiceLines: row => `${row?.invoice_no ?? ''}::${row?.line_no ?? ''}`,
  bills: row => row?.bill_no,
  paymentsReceived: row => row?.receipt_no,
  paymentsMade: row => row?.payment_no,
  products: row => row?.sku,
  bankAccounts: row => row?.account_id,
});

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);
const clone = value => {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

function get(obj, path) {
  if (!obj || path == null) return undefined;
  if (hasOwn(obj, path)) return obj[path];
  return String(path).split('.').reduce((value, part) => value == null ? undefined : value[part], obj);
}

function first(obj, paths, fallback = null) {
  for (const path of paths) {
    const value = get(obj, path);
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return fallback;
}

function text(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function number(value, fallback = null) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  const n = Number(String(value).replace(/[$,%]/g, '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : fallback;
}

function isoDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toISOString().slice(0, 10);
}

function normalizedStatus(total, balance, sourceStatus) {
  const t = Math.max(0, Number(total || 0));
  const b = Math.max(0, Number(balance ?? t));
  const raw = text(sourceStatus).toLowerCase();
  if (['paid', 'fully paid', 'closed', 'settled', 'void', 'voided', 'cancelled', 'canceled'].includes(raw)) return raw;
  if (b <= 0 && t > 0) return 'paid';
  if (b > 0 && b < t) return 'partial';
  return raw || 'open';
}

function sourceMeta(providerId, externalId, syncedAt) {
  return {
    _source_provider: providerId,
    _source_external_id: text(externalId),
    _synced_at: syncedAt,
  };
}

function normalizeAppliedTo(lines = [], txnType = 'Invoice') {
  const allocations = [];
  for (const line of Array.isArray(lines) ? lines : []) {
    const linked = Array.isArray(line?.LinkedTxn) ? line.LinkedTxn : [];
    for (const txn of linked) {
      if (txnType && text(txn?.TxnType).toLowerCase() !== txnType.toLowerCase()) continue;
      const invoiceNo = first(txn, ['TxnId', 'DocNumber', 'invoice_no']);
      if (!invoiceNo) continue;
      allocations.push({
        invoice_no: text(invoiceNo),
        amount: number(line?.Amount, 0) || 0,
      });
    }
  }
  return allocations;
}

function normalizeQuickBooks(payload, syncedAt) {
  const warnings = [];
  const datasets = {};
  const presentDatasets = new Set();

  const customersSource = Array.isArray(payload?.customers) ? payload.customers : [];
  if (hasOwn(payload, 'customers')) {
    presentDatasets.add('customers');
    datasets.customers = customersSource.map((row, idx) => {
      const id = first(row, ['Id', 'id', 'CustomerId', 'customer_id']);
      if (!id) {
        warnings.push(`QuickBooks customer row ${idx + 1} skipped: missing ID.`);
        return null;
      }
      return {
        id: text(id),
        name: text(first(row, ['DisplayName', 'CompanyName', 'FullyQualifiedName', 'name'], id)),
        contact: text(first(row, ['PrimaryContact.DisplayName', 'contact'], '')),
        email: text(first(row, ['PrimaryEmailAddr.Address', 'email'], '')),
        phone: text(first(row, ['PrimaryPhone.FreeFormNumber', 'phone'], '')),
        terms: text(first(row, ['SalesTermRef.name', 'terms'], 'Net 30')),
        credit_limit: number(first(row, ['CreditLimit', 'credit_limit']), null),
        ...sourceMeta('quickbooks', id, syncedAt),
      };
    }).filter(Boolean);
  }

  const suppliersSource = Array.isArray(payload?.vendors)
    ? payload.vendors
    : Array.isArray(payload?.suppliers) ? payload.suppliers : [];
  if (hasOwn(payload, 'vendors') || hasOwn(payload, 'suppliers')) {
    presentDatasets.add('suppliers');
    datasets.suppliers = suppliersSource.map((row, idx) => {
      const id = first(row, ['Id', 'id', 'VendorId', 'supplier_id']);
      if (!id) {
        warnings.push(`QuickBooks vendor row ${idx + 1} skipped: missing ID.`);
        return null;
      }
      return {
        id: text(id),
        name: text(first(row, ['DisplayName', 'CompanyName', 'FullyQualifiedName', 'name'], id)),
        email: text(first(row, ['PrimaryEmailAddr.Address', 'email'], '')),
        phone: text(first(row, ['PrimaryPhone.FreeFormNumber', 'phone'], '')),
        terms: text(first(row, ['TermRef.name', 'SalesTermRef.name', 'terms'], 'Net 30')),
        ...sourceMeta('quickbooks', id, syncedAt),
      };
    }).filter(Boolean);
  }

  const invoicesSource = Array.isArray(payload?.invoices) ? payload.invoices : [];
  if (hasOwn(payload, 'invoices')) {
    presentDatasets.add('invoices');
    datasets.invoices = invoicesSource.map((row, idx) => {
      const externalId = first(row, ['Id', 'id', 'invoice_id']);
      const invoiceNo = first(row, ['DocNumber', 'invoice_no', 'InvoiceNumber', 'Id']);
      if (!invoiceNo) {
        warnings.push(`QuickBooks invoice row ${idx + 1} skipped: missing invoice number/ID.`);
        return null;
      }
      const total = number(first(row, ['TotalAmt', 'total', 'amount']), 0) || 0;
      const balance = number(first(row, ['Balance', 'balance_due', 'balance']), total);
      return {
        invoice_no: text(invoiceNo),
        customer_id: text(first(row, ['CustomerRef.value', 'customer_id', 'CustomerId'], '')),
        invoice_date: isoDate(first(row, ['TxnDate', 'invoice_date', 'date'])),
        due_date: isoDate(first(row, ['DueDate', 'due_date'])),
        total,
        balance_due: Math.max(0, Number(balance ?? total)),
        status: normalizedStatus(total, balance, first(row, ['status', 'Status'])),
        terms: text(first(row, ['SalesTermRef.name', 'terms'], '')),
        ...sourceMeta('quickbooks', externalId || invoiceNo, syncedAt),
      };
    }).filter(Boolean);
  }

  const explicitInvoiceLines = Array.isArray(payload?.invoiceLines) ? payload.invoiceLines : null;
  const invoiceHasEmbeddedLines = invoicesSource.some(invoice => Array.isArray(invoice?.Line));
  if (explicitInvoiceLines || invoiceHasEmbeddedLines) {
    presentDatasets.add('invoiceLines');
    const rows = explicitInvoiceLines || invoicesSource.flatMap(invoice =>
      (Array.isArray(invoice?.Line) ? invoice.Line : []).map((line, index) => ({
        ...line,
        _parent_invoice_no: first(invoice, ['DocNumber', 'invoice_no', 'InvoiceNumber', 'Id']),
        _line_index: index + 1,
      }))
    );
    datasets.invoiceLines = rows.map((row, idx) => {
      const invoiceNo = first(row, ['invoice_no', '_parent_invoice_no', 'InvoiceRef.value']);
      const detail = row?.SalesItemLineDetail || {};
      const sku = first(row, [
        'sku',
        'product_sku',
        'SalesItemLineDetail.ItemRef.value',
        'ItemRef.value',
      ]);
      if (!invoiceNo || !sku) {
        warnings.push(`QuickBooks invoice line ${idx + 1} skipped: missing invoice or item reference.`);
        return null;
      }
      const qty = number(first(row, ['qty', 'quantity', 'SalesItemLineDetail.Qty']), 0) || 0;
      const unitPrice = number(first(row, ['unit_price', 'SalesItemLineDetail.UnitPrice']), null);
      const lineTotal = number(first(row, ['line_total', 'Amount']), unitPrice == null ? 0 : qty * unitPrice) || 0;
      const derivedUnit = unitPrice == null && qty > 0 ? lineTotal / qty : (unitPrice || 0);
      const lineNo = number(first(row, ['line_no', 'Id', '_line_index']), idx + 1) || idx + 1;
      return {
        invoice_no: text(invoiceNo),
        line_no: lineNo,
        sku: text(sku),
        qty,
        unit_price: derivedUnit,
        line_total: lineTotal,
        description: text(first(row, ['Description', 'description'], '')),
        ...sourceMeta('quickbooks', `${invoiceNo}:${lineNo}`, syncedAt),
      };
    }).filter(Boolean);
  }

  const billsSource = Array.isArray(payload?.bills) ? payload.bills : [];
  if (hasOwn(payload, 'bills')) {
    presentDatasets.add('bills');
    datasets.bills = billsSource.map((row, idx) => {
      const externalId = first(row, ['Id', 'id', 'bill_id']);
      const billNo = first(row, ['DocNumber', 'bill_no', 'BillNumber', 'Id']);
      if (!billNo) {
        warnings.push(`QuickBooks bill row ${idx + 1} skipped: missing bill number/ID.`);
        return null;
      }
      const total = number(first(row, ['TotalAmt', 'total', 'amount']), 0) || 0;
      const balance = number(first(row, ['Balance', 'balance_due', 'balance']), total);
      return {
        bill_no: text(billNo),
        supplier_id: text(first(row, ['VendorRef.value', 'supplier_id', 'VendorId'], '')),
        bill_date: isoDate(first(row, ['TxnDate', 'bill_date', 'date'])),
        due_date: isoDate(first(row, ['DueDate', 'due_date'])),
        total,
        balance_due: Math.max(0, Number(balance ?? total)),
        status: normalizedStatus(total, balance, first(row, ['status', 'Status'])),
        terms: text(first(row, ['SalesTermRef.name', 'TermRef.name', 'terms'], '')),
        discount_available: number(first(row, ['discount_available', 'DiscountAvailable']), 0) || 0,
        ...sourceMeta('quickbooks', externalId || billNo, syncedAt),
      };
    }).filter(Boolean);
  }

  const receivedSource = Array.isArray(payload?.paymentsReceived)
    ? payload.paymentsReceived
    : Array.isArray(payload?.payments) ? payload.payments : [];
  if (hasOwn(payload, 'paymentsReceived') || hasOwn(payload, 'payments')) {
    presentDatasets.add('paymentsReceived');
    datasets.paymentsReceived = receivedSource.map((row, idx) => {
      const id = first(row, ['Id', 'receipt_no', 'id']);
      if (!id) {
        warnings.push(`QuickBooks customer payment row ${idx + 1} skipped: missing ID.`);
        return null;
      }
      const applied = Array.isArray(row?.applied_to)
        ? row.applied_to
        : normalizeAppliedTo(row?.Line, 'Invoice');
      return {
        receipt_no: text(first(row, ['receipt_no', 'PaymentRefNum', 'Id'], id)),
        customer_id: text(first(row, ['CustomerRef.value', 'customer_id'], '')),
        payment_date: isoDate(first(row, ['TxnDate', 'payment_date', 'date'])),
        amount: number(first(row, ['TotalAmt', 'amount']), 0) || 0,
        method: text(first(row, ['PaymentMethodRef.name', 'method'], '')),
        applied_to: applied.map(a => ({
          invoice_no: text(a.invoice_no || a.TxnId),
          amount: number(a.amount, 0) || 0,
        })).filter(a => a.invoice_no),
        ...sourceMeta('quickbooks', id, syncedAt),
      };
    }).filter(Boolean);
  }

  const madeSource = Array.isArray(payload?.billPayments)
    ? payload.billPayments
    : Array.isArray(payload?.paymentsMade) ? payload.paymentsMade : [];
  if (hasOwn(payload, 'billPayments') || hasOwn(payload, 'paymentsMade')) {
    presentDatasets.add('paymentsMade');
    datasets.paymentsMade = madeSource.map((row, idx) => {
      const id = first(row, ['Id', 'payment_no', 'id']);
      if (!id) {
        warnings.push(`QuickBooks bill payment row ${idx + 1} skipped: missing ID.`);
        return null;
      }
      const linked = normalizeAppliedTo(row?.Line, 'Bill');
      return {
        payment_no: text(first(row, ['payment_no', 'CheckPayment.CheckNum', 'Id'], id)),
        supplier_id: text(first(row, ['VendorRef.value', 'supplier_id'], '')),
        payment_date: isoDate(first(row, ['TxnDate', 'payment_date', 'date'])),
        amount_paid: number(first(row, ['TotalAmt', 'amount_paid', 'amount']), 0) || 0,
        discount_taken: number(first(row, ['discount_taken', 'DiscountTaken']), 0) || 0,
        applied_to_bill: text(first(row, ['applied_to_bill'], linked[0]?.invoice_no || '')),
        ...sourceMeta('quickbooks', id, syncedAt),
      };
    }).filter(Boolean);
  }

  const accountSource = Array.isArray(payload?.accounts)
    ? payload.accounts
    : Array.isArray(payload?.bankAccounts) ? payload.bankAccounts : [];
  if (hasOwn(payload, 'accounts') || hasOwn(payload, 'bankAccounts')) {
    presentDatasets.add('bankAccounts');
    datasets.bankAccounts = accountSource.map((row, idx) => {
      const id = first(row, ['Id', 'account_id', 'id']);
      if (!id) {
        warnings.push(`QuickBooks account row ${idx + 1} skipped: missing ID.`);
        return null;
      }
      const type = text(first(row, ['AcctType', 'type'], ''));
      const subtype = text(first(row, ['AcctSubType', 'subtype'], ''));
      const normalizedType = `${type} ${subtype}`.toLowerCase();
      const isCashLike = !normalizedType || ['bank', 'checking', 'savings', 'cash'].some(word => normalizedType.includes(word));
      if (!isCashLike) return null;
      return {
        account_id: text(id),
        account_code: text(first(row, ['AcctNum', 'account_code'], '')),
        name: text(first(row, ['Name', 'FullyQualifiedName', 'name'], id)),
        type: subtype || type || 'bank',
        institution: text(first(row, ['institution', 'BankName'], 'QuickBooks Online')),
        balance: number(first(row, ['CurrentBalanceWithSubAccounts', 'CurrentBalance', 'balance']), 0) || 0,
        ...sourceMeta('quickbooks', id, syncedAt),
      };
    }).filter(Boolean);
  }

  if (hasOwn(payload, 'metrics') || hasOwn(payload, 'companyMetrics')) {
    presentDatasets.add('companyMetrics');
    const metrics = payload.metrics || payload.companyMetrics || {};
    datasets.companyMetrics = {
      ...(isoDate(first(metrics, ['as_of_date', 'asOfDate'])) ? { as_of_date: isoDate(first(metrics, ['as_of_date', 'asOfDate'])) } : {}),
      ...(number(first(metrics, ['revenue_last_30_days', 'revenue30d']), null) != null ? { revenue_last_30_days: number(first(metrics, ['revenue_last_30_days', 'revenue30d'])) } : {}),
      ...(number(first(metrics, ['cogs_last_30_days', 'cogs30d']), null) != null ? { cogs_last_30_days: number(first(metrics, ['cogs_last_30_days', 'cogs30d'])) } : {}),
      ...(number(first(metrics, ['operating_expenses_last_30_days', 'operatingExpenses30d']), null) != null ? { operating_expenses_last_30_days: number(first(metrics, ['operating_expenses_last_30_days', 'operatingExpenses30d'])) } : {}),
      ...(number(first(metrics, ['other_expenses_last_30_days', 'otherExpenses30d']), null) != null ? { other_expenses_last_30_days: number(first(metrics, ['other_expenses_last_30_days', 'otherExpenses30d'])) } : {}),
      ...(number(first(metrics, ['other_current_liabilities', 'otherCurrentLiabilities']), null) != null ? { other_current_liabilities: number(first(metrics, ['other_current_liabilities', 'otherCurrentLiabilities'])) } : {}),
      ...(number(first(metrics, ['monthly_payroll', 'monthlyPayroll']), null) != null ? { monthly_payroll: number(first(metrics, ['monthly_payroll', 'monthlyPayroll'])) } : {}),
    };
  }

  return { datasets, presentDatasets: [...presentDatasets], warnings };
}

function mergeBrightpearlInventory(products, inventory) {
  const stockByKey = new Map();
  for (const row of Array.isArray(inventory) ? inventory : []) {
    const key = text(first(row, ['sku', 'SKU', 'productSku', 'productId', 'id']));
    if (key) stockByKey.set(key, row);
  }
  return (Array.isArray(products) ? products : []).map(product => {
    const keys = [
      text(first(product, ['sku', 'SKU', 'productSku'])),
      text(first(product, ['productId', 'id'])),
    ].filter(Boolean);
    const stock = keys.map(k => stockByKey.get(k)).find(Boolean);
    return stock ? { ...product, _inventory: stock } : product;
  });
}

function normalizeBrightpearl(payload, syncedAt) {
  const warnings = [];
  const datasets = {};
  const presentDatasets = new Set();

  const productsSource = Array.isArray(payload?.products) ? payload.products : [];
  const inventorySource = Array.isArray(payload?.inventory) ? payload.inventory : [];
  if (hasOwn(payload, 'products') || hasOwn(payload, 'inventory')) {
    presentDatasets.add('products');
    const source = productsSource.length
      ? mergeBrightpearlInventory(productsSource, inventorySource)
      : inventorySource;
    datasets.products = source.map((row, idx) => {
      const externalId = first(row, ['productId', 'id', 'ID', '_inventory.productId', '_inventory.id']);
      const sku = first(row, ['sku', 'SKU', 'productSku', 'identity.sku', '_inventory.sku', '_inventory.SKU'], externalId);
      if (!sku) {
        warnings.push(`Brightpearl product row ${idx + 1} skipped: missing SKU/product ID.`);
        return null;
      }
      return {
        sku: text(sku),
        name: text(first(row, ['name', 'productName', 'identity.name', 'description'], sku)),
        category: text(first(row, ['category', 'productGroupName'], 'Stock')),
        supplier_id: text(first(row, ['supplierId', 'defaultSupplierId', 'supplier.id'], '')),
        uom: text(first(row, ['uom', 'unitOfMeasure'], '')),
        wac: number(first(row, ['weightedAverageCost', 'wac', 'averageCost', 'costPrice', '_inventory.weightedAverageCost', '_inventory.wac']), 0) || 0,
        on_hand: number(first(row, ['onHand', 'quantityOnHand', 'stockOnHand', 'available', '_inventory.onHand', '_inventory.quantityOnHand', '_inventory.stockOnHand']), 0) || 0,
        average_on_hand: number(first(row, ['averageOnHand', 'average_on_hand']), null),
        sell_price: number(first(row, ['sellPrice', 'price', 'salesPrice']), null),
        sales_60d: number(first(row, ['sales60d', 'sales_60d']), null),
        annual_sales: number(first(row, ['annualSales', 'annual_sales']), null),
        lead_time_days: number(first(row, ['leadTimeDays', 'lead_time_days']), null),
        lead_time_stddev: number(first(row, ['leadTimeStdDev', 'lead_time_stddev']), null),
        reorder_point: number(first(row, ['reorderPoint', 'reorder_point']), null),
        safety_stock: number(first(row, ['safetyStock', 'safety_stock']), null),
        warehouse: text(first(row, ['warehouse', 'warehouseName'], '')),
        ...sourceMeta('brightpearl', externalId || sku, syncedAt),
      };
    }).filter(Boolean);
  }

  const suppliersSource = Array.isArray(payload?.suppliers) ? payload.suppliers : [];
  if (hasOwn(payload, 'suppliers')) {
    presentDatasets.add('suppliers');
    datasets.suppliers = suppliersSource.map((row, idx) => {
      const id = first(row, ['id', 'supplierId', 'contactId']);
      if (!id) {
        warnings.push(`Brightpearl supplier row ${idx + 1} skipped: missing ID.`);
        return null;
      }
      return {
        id: text(id),
        name: text(first(row, ['name', 'companyName', 'displayName'], id)),
        email: text(first(row, ['email', 'primaryEmail'], '')),
        phone: text(first(row, ['phone', 'telephone'], '')),
        terms: text(first(row, ['terms', 'paymentTerms'], '')),
        lead_time_days: number(first(row, ['leadTimeDays', 'lead_time_days']), null),
        ...sourceMeta('brightpearl', id, syncedAt),
      };
    }).filter(Boolean);
  }

  const linesSource = Array.isArray(payload?.invoiceLines) ? payload.invoiceLines : [];
  if (hasOwn(payload, 'invoiceLines')) {
    presentDatasets.add('invoiceLines');
    datasets.invoiceLines = linesSource.map((row, idx) => {
      const invoiceNo = first(row, ['invoice_no', 'invoiceNo', 'orderRef', 'orderId']);
      const sku = first(row, ['sku', 'productSku', 'productId']);
      if (!invoiceNo || !sku) {
        warnings.push(`Brightpearl invoice line ${idx + 1} skipped: missing invoice/order reference or SKU.`);
        return null;
      }
      const qty = number(first(row, ['qty', 'quantity']), 0) || 0;
      const unitPrice = number(first(row, ['unit_price', 'unitPrice', 'price']), 0) || 0;
      const lineNo = number(first(row, ['line_no', 'lineNo', 'id']), idx + 1) || idx + 1;
      return {
        invoice_no: text(invoiceNo),
        line_no: lineNo,
        sku: text(sku),
        qty,
        unit_price: unitPrice,
        line_total: number(first(row, ['line_total', 'lineTotal', 'total']), qty * unitPrice) || 0,
        ...sourceMeta('brightpearl', `${invoiceNo}:${lineNo}`, syncedAt),
      };
    }).filter(Boolean);
  }

  return { datasets, presentDatasets: [...presentDatasets], warnings };
}

export function normalizeProviderPayload(providerId, payload = {}, options = {}) {
  const provider = INTEGRATION_PROVIDERS[providerId];
  if (!provider || providerId === 'manual') {
    if (providerId === 'manual') throw new Error('Manual data does not require provider normalization.');
    throw new Error(`Unknown integration provider: ${providerId}`);
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`${provider.name} payload must be an object.`);
  }
  const syncedAt = options.syncedAt || new Date().toISOString();
  const normalized = providerId === 'quickbooks'
    ? normalizeQuickBooks(payload, syncedAt)
    : normalizeBrightpearl(payload, syncedAt);
  const counts = Object.fromEntries(
    Object.entries(normalized.datasets)
      .filter(([key]) => key !== 'companyMetrics')
      .map(([key, rows]) => [key, Array.isArray(rows) ? rows.length : 0])
  );
  if (normalized.datasets.companyMetrics) counts.companyMetrics = Object.keys(normalized.datasets.companyMetrics).length;
  return {
    providerId,
    providerName: provider.name,
    syncedAt,
    datasets: normalized.datasets,
    presentDatasets: normalized.presentDatasets,
    counts,
    warnings: normalized.warnings,
  };
}

function upsertRows(existingRows, incomingRows, dataset, providerId) {
  const keyFn = DATASET_KEYS[dataset];
  if (!keyFn) return Array.isArray(existingRows) ? existingRows : [];
  // A provider sync is authoritative only for rows previously owned by that provider.
  // Manual/other-provider rows remain unless an incoming row has the same canonical key.
  const baseRows = (Array.isArray(existingRows) ? existingRows : [])
    .filter(row => row?._source_provider !== providerId);
  const map = new Map();
  const order = [];
  for (const row of baseRows) {
    const key = keyFn(row);
    if (!key) continue;
    if (!map.has(key)) order.push(key);
    map.set(key, row);
  }
  for (const row of Array.isArray(incomingRows) ? incomingRows : []) {
    const key = keyFn(row);
    if (!key) continue;
    if (!map.has(key)) order.push(key);
    map.set(key, { ...(map.get(key) || {}), ...row });
  }
  return order.map(key => map.get(key));
}

function baseIntegrationState(workspace = {}) {
  const previous = workspace.integrations && typeof workspace.integrations === 'object'
    ? workspace.integrations
    : {};
  return {
    version: INTEGRATION_MODEL_VERSION,
    providers: {
      manual: {
        status: 'active',
        connectionMode: 'manual',
        ...(previous.providers?.manual || {}),
      },
      ...(previous.providers || {}),
    },
  };
}

export function applyProviderSync(workspace, providerId, payload, options = {}) {
  if (providerId === 'manual') throw new Error('Manual data is already part of the workspace.');
  const normalized = normalizeProviderPayload(providerId, payload, options);
  const next = clone(workspace || {});
  for (const dataset of CANONICAL_DATASETS) {
    if (!Array.isArray(next[dataset])) next[dataset] = [];
  }
  if (!next.companyMetrics || typeof next.companyMetrics !== 'object') next.companyMetrics = {};

  for (const dataset of normalized.presentDatasets) {
    if (dataset === 'companyMetrics') {
      next.companyMetrics = {
        ...next.companyMetrics,
        ...(normalized.datasets.companyMetrics || {}),
      };
      continue;
    }
    if (!CANONICAL_DATASETS.includes(dataset)) continue;
    next[dataset] = upsertRows(next[dataset], normalized.datasets[dataset] || [], dataset, providerId);
  }

  const integrations = baseIntegrationState(next);
  integrations.providers[providerId] = {
    status: 'synced',
    connectionMode: INTEGRATION_PROVIDERS[providerId].authMode,
    lastSyncAt: normalized.syncedAt,
    lastSyncCounts: normalized.counts,
    lastSyncWarnings: normalized.warnings,
    syncedDatasets: normalized.presentDatasets,
    // Do not persist OAuth tokens, API keys, client secrets or refresh tokens here.
    secretsStoredInWorkspace: false,
  };
  next.integrations = integrations;

  return {
    workspace: next,
    ...normalized,
  };
}

export function disconnectProvider(workspace, providerId, options = {}) {
  if (!INTEGRATION_PROVIDERS[providerId] || providerId === 'manual') return clone(workspace || {});
  const next = clone(workspace || {});
  const removeSyncedData = options.removeSyncedData === true;

  if (removeSyncedData) {
    for (const dataset of CANONICAL_DATASETS) {
      next[dataset] = (Array.isArray(next[dataset]) ? next[dataset] : [])
        .filter(row => row?._source_provider !== providerId);
    }
  }

  const integrations = baseIntegrationState(next);
  integrations.providers[providerId] = {
    ...(integrations.providers[providerId] || {}),
    status: 'not_connected',
    disconnectedAt: options.disconnectedAt || new Date().toISOString(),
    secretsStoredInWorkspace: false,
  };
  next.integrations = integrations;
  return next;
}

function datasetCountForProvider(workspace, dataset, providerId) {
  if (dataset === 'companyMetrics') return 0;
  const rows = Array.isArray(workspace?.[dataset]) ? workspace[dataset] : [];
  if (providerId === 'manual') {
    return rows.filter(row => !row?._source_provider || row._source_provider === 'manual').length;
  }
  return rows.filter(row => row?._source_provider === providerId).length;
}

export function getIntegrationSummary(workspace = {}) {
  const integrations = baseIntegrationState(workspace);
  return Object.values(INTEGRATION_PROVIDERS).map(provider => {
    const state = integrations.providers?.[provider.id] || {};
    const datasetCounts = Object.fromEntries(
      provider.datasets
        .filter(dataset => dataset !== 'companyMetrics')
        .map(dataset => [dataset, datasetCountForProvider(workspace, dataset, provider.id)])
    );
    const totalRecords = Object.values(datasetCounts).reduce((sum, count) => sum + Number(count || 0), 0);
    return {
      ...provider,
      status: provider.id === 'manual' ? 'active' : (state.status || 'not_connected'),
      lastSyncAt: state.lastSyncAt || null,
      lastSyncCounts: state.lastSyncCounts || {},
      lastSyncWarnings: state.lastSyncWarnings || [],
      syncedDatasets: state.syncedDatasets || [],
      datasetCounts,
      totalRecords,
      frameworkReady: provider.id === 'manual' || ['quickbooks', 'brightpearl'].includes(provider.id),
      secretsStoredInWorkspace: false,
    };
  });
}
