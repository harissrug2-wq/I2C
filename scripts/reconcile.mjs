import fs from 'node:fs';
import path from 'node:path';
import { buildEngineInputs } from '../src/domain/dataAdapters.js';
import {
  computeSystem1,
  DEFAULT_THRESHOLDS,
} from '../src/utils/decisionSystems.js';
import { loadReferenceWorkspace } from './referenceWorkspace.mjs';

const referenceWorkspace = loadReferenceWorkspace();
const {
  customers, suppliers, invoices, invoiceLines: lines, bills,
  paymentsReceived: recv, paymentsMade: made, products, bankAccounts: banks, companyMetrics: metrics,
} = referenceWorkspace;

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const approx = (a, b, tolerance = 0.01) =>
  Math.abs(a - b) <= tolerance;

/* -------------------------------------------------------------------------- */
/* Basic data integrity                                                       */
/* -------------------------------------------------------------------------- */

const customerIds = new Set(customers.map((x) => x.id));
const supplierIds = new Set(suppliers.map((x) => x.id));
const invoiceNumbers = new Set(invoices.map((x) => x.invoice_no));
const billNumbers = new Set(bills.map((x) => x.bill_no));
const skus = new Set(products.map((x) => x.sku));

assert(
  customerIds.size === customers.length,
  'Duplicate customer IDs',
);

assert(
  supplierIds.size === suppliers.length,
  'Duplicate supplier IDs',
);

assert(
  skus.size === products.length,
  'Duplicate SKUs',
);

/* -------------------------------------------------------------------------- */
/* Foreign-key checks                                                         */
/* -------------------------------------------------------------------------- */

invoices.forEach((invoice) => {
  assert(
    customerIds.has(invoice.customer_id),
    `Orphan invoice customer ${invoice.invoice_no}`,
  );

  assert(
    /^INV-\d{4}$/.test(invoice.invoice_no),
    `Bad invoice number ${invoice.invoice_no}`,
  );
});

bills.forEach((bill) => {
  assert(
    supplierIds.has(bill.supplier_id),
    `Orphan bill supplier ${bill.bill_no}`,
  );
});

lines.forEach((line) => {
  assert(
    invoiceNumbers.has(line.invoice_no),
    `Orphan invoice line ${line.invoice_no}`,
  );

  assert(
    skus.has(line.sku),
    `Missing SKU ${line.sku}`,
  );
});

recv.forEach((payment) => {
  assert(
    customerIds.has(payment.customer_id),
    `Orphan receipt customer ${payment.receipt_no}`,
  );

  payment.applied_to.forEach((allocation) => {
    assert(
      invoiceNumbers.has(allocation.invoice_no),
      `Orphan receipt invoice ${allocation.invoice_no}`,
    );
  });
});

made.forEach((payment) => {
  assert(
    supplierIds.has(payment.supplier_id),
    `Orphan payment supplier ${payment.payment_no}`,
  );

  assert(
    billNumbers.has(payment.applied_to_bill),
    `Orphan payment bill ${payment.applied_to_bill}`,
  );
});

/* -------------------------------------------------------------------------- */
/* Invoice/payment reconciliation                                             */
/* -------------------------------------------------------------------------- */

const allocations = {};

recv.forEach((payment) => {
  payment.applied_to.forEach((allocation) => {
    allocations[allocation.invoice_no] =
      (allocations[allocation.invoice_no] || 0) + allocation.amount;
  });
});

invoices.forEach((invoice) => {
  const calculatedBalance =
    invoice.total - (allocations[invoice.invoice_no] || 0);

  assert(
    approx(calculatedBalance, invoice.balance_due),
    `Invoice payment mismatch ${invoice.invoice_no}: ${calculatedBalance} != ${invoice.balance_due}`,
  );

  if (invoice.balance_due === 0) {
    assert(
      invoice.status === 'paid',
      `Paid status mismatch ${invoice.invoice_no}`,
    );
  }
});

/* -------------------------------------------------------------------------- */
/* Invoice-line reconciliation                                                */
/* -------------------------------------------------------------------------- */

const lineTotals = {};

lines.forEach((line) => {
  lineTotals[line.invoice_no] =
    (lineTotals[line.invoice_no] || 0) + line.line_total;
});

Object.entries(lineTotals).forEach(([invoiceNo, lineTotal]) => {
  const invoice = invoices.find(
    (item) => item.invoice_no === invoiceNo,
  );

  assert(
    approx(lineTotal, invoice.total),
    `Invoice line mismatch ${invoiceNo}: ${lineTotal} != ${invoice.total}`,
  );
});

/* -------------------------------------------------------------------------- */
/* Canonical reference totals                                                      */
/* -------------------------------------------------------------------------- */

const cash = banks.reduce(
  (sum, account) => sum + account.balance,
  0,
);

const ar = invoices
  .filter((invoice) => invoice.balance_due > 0)
  .reduce((sum, invoice) => sum + invoice.balance_due, 0);

const ap = bills
  .filter((bill) => bill.balance_due > 0)
  .reduce((sum, bill) => sum + bill.balance_due, 0);

const inventory = products.reduce(
  (sum, product) => sum + product.wac * product.on_hand,
  0,
);

const deadStock = products
  .filter((product) => product.days_quiet >= 180)
  .reduce(
    (sum, product) => sum + product.wac * product.on_hand,
    0,
  );

const discounts = bills
  .filter((bill) => bill.balance_due > 0)
  .reduce(
    (sum, bill) => sum + bill.discount_available,
    0,
  );

assert(cash === 1284900, `Cash ${cash}`);
assert(ar === 744790, `AR ${ar}`);

assert(
  invoices.filter((invoice) => invoice.balance_due > 0).length === 17,
  'Open invoice count',
);

assert(ap === 715300, `AP ${ap}`);

assert(
  bills.filter((bill) => bill.balance_due > 0).length === 12,
  'Open bill count',
);

assert(
  products.length === 33,
  `SKU count ${products.length}`,
);

assert(
  approx(inventory, 2090000),
  `Inventory ${inventory}`,
);

assert(
  approx(deadStock, 329360),
  `Dead stock ${deadStock}`,
);

assert(
  discounts === 3653,
  `Discounts ${discounts}`,
);

/* -------------------------------------------------------------------------- */
/* Decision System 1 reconciliation                                           */
/* -------------------------------------------------------------------------- */

/*
 * Important:
 * Reuse the exact same calculation path as the dashboard.
 * This prevents the reconciliation test from maintaining a second,
 * stale CCC implementation.
 */

const workspace = {
  customers,
  suppliers,
  invoices,
  invoiceLines: lines,
  bills,
  paymentsReceived: recv,
  paymentsMade: made,
  products,
  bankAccounts: banks,
  companyMetrics: metrics,
};

const engineInputs = buildEngineInputs(workspace);

const system1 = computeSystem1(
  engineInputs.cashBalance,
  engineInputs.invoices,
  engineInputs.products,
  engineInputs.bills,
  engineInputs.metrics,
  DEFAULT_THRESHOLDS,
);

const {
  currentRatio,
  quickRatio,
  dio,
  dso,
  dpo,
  ccc,
} = system1;

assert(
  currentRatio === 5.03,
  `Current ratio ${currentRatio}`,
);

assert(
  quickRatio === 2.48,
  `Quick ratio ${quickRatio}`,
);

assert(
  dio === 98,
  `DIO ${dio}`,
);

assert(
  dso === 54.9,
  `DSO ${dso}`,
);

assert(
  dpo === 56,
  `DPO ${dpo}`,
);

assert(
  ccc === 96.8,
  `CCC ${ccc}`,
);

/* -------------------------------------------------------------------------- */
/* Legacy test-data cleanup                                                   */
/* -------------------------------------------------------------------------- */

const forbidden = [
  'Cedar Mountain Plumbing',
  'Anchor Distributors',
  'Sierra Mechanical',
  'Latitude Plumbing',
  'Acme Industrial',
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, {
    withFileTypes: true,
  })) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        ['node_modules', 'dist', '.git'].includes(entry.name)
      ) {
        continue;
      }

      walk(filePath);
      continue;
    }

    if (!/\.(jsx?|json|md)$/.test(entry.name)) {
      continue;
    }

    const text = fs.readFileSync(filePath, 'utf8');

    for (const forbiddenText of forbidden) {
      assert(
        !text.includes(forbiddenText),
        `Forbidden legacy reference ${forbiddenText} in ${filePath}`,
      );
    }
  }
}

walk(path.resolve('src'));

console.log('✓ Reconciliation passed');

console.log(
  JSON.stringify(
    {
      cash,
      ar,
      ap,
      inventory: Math.round(inventory),
      deadStock: Math.round(deadStock),
      discounts,
      currentRatio: Number(currentRatio.toFixed(2)),
      quickRatio: Number(quickRatio.toFixed(2)),
      dio,
      dso,
      dpo,
      ccc,
    },
    null,
    2,
  ),
);