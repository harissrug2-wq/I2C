const DAY_MS = 86400000;

export function parseTermsDays(value, fallback = 30) {
  const text = String(value || '');
  const matches = [...text.matchAll(/(?:Net\s*)?(\d+)/gi)].map(m => Number(m[1]));
  return matches.length ? matches[matches.length - 1] : fallback;
}

export function daysBetween(a, b) {
  if (!a || !b) return 0;
  const start = new Date(`${a}T00:00:00`);
  const end = new Date(`${b}T00:00:00`);
  return Math.round((end - start) / DAY_MS);
}

export function daysOverdue(dueDate, asOfDate) {
  return Math.max(0, daysBetween(dueDate, asOfDate));
}

export function agingBucket(days) {
  if (days <= 0) return 'Current';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  if (days <= 120) return '91-120';
  return '120+';
}

function invoicePaymentsForCustomer(customerId, workspace) {
  const invoiceByNo = new Map(workspace.invoices.map(i => [i.invoice_no, i]));
  const rows = [];
  workspace.paymentsReceived
    .filter(p => p.customer_id === customerId)
    .forEach(payment => {
      (payment.applied_to || []).forEach(allocation => {
        const invoice = invoiceByNo.get(allocation.invoice_no);
        if (!invoice) return;
        rows.push({ payment, allocation, invoice });
      });
    });
  return rows;
}

function customerPaymentStats(customerId, workspace) {
  const rows = invoicePaymentsForCustomer(customerId, workspace);
  if (!rows.length) return { avgDaysLate: 0, avgDaysToPay: parseTermsDays(workspace.customers.find(c => c.id === customerId)?.terms), stdDevDaysLate: 0, historyCount: 0 };

  const lateDays = rows.map(({ payment, invoice }) => daysBetween(invoice.due_date, payment.payment_date));
  const payDays = rows.map(({ payment, invoice }) => Math.max(0, daysBetween(invoice.invoice_date, payment.payment_date)));
  const avgDaysLate = lateDays.reduce((s, n) => s + n, 0) / lateDays.length;
  const avgDaysToPay = payDays.reduce((s, n) => s + n, 0) / payDays.length;

  const variance = lateDays.length > 1
    ? lateDays.reduce((sum, n) => sum + Math.pow(n - avgDaysLate, 2), 0) / (lateDays.length - 1)
    : 0;

  return {
    avgDaysLate: Math.round(avgDaysLate * 10) / 10,
    avgDaysToPay: Math.round(avgDaysToPay),
    stdDevDaysLate: Math.round(Math.sqrt(variance) * 10) / 10,
    historyCount: rows.length,
  };
}


function supplierPaymentStats(supplierId, workspace) {
  const billByNo = new Map(workspace.bills.map(b => [b.bill_no, b]));
  const supplier = workspace.suppliers.find(s => s.id === supplierId);
  const rows = workspace.paymentsMade
    .filter(payment => payment.supplier_id === supplierId)
    .map(payment => ({ payment, bill: billByNo.get(payment.applied_to_bill) }))
    .filter(row => row.bill);

  if (!rows.length) {
    return {
      avgDaysLate: 0, paymentHistoryCount: 0, latePaymentCount: 0, onTimeRate: null,
      discountsTakenCount: 0, discountsMissedCount: 0, discountCaptured: 0, discountForgone: 0,
    };
  }

  const lateDays = rows.map(({ payment, bill }) => daysBetween(bill.due_date, payment.payment_date));
  const latePaymentCount = lateDays.filter(days => days > 0).length;
  const avgDaysLate = lateDays.reduce((sum, days) => sum + days, 0) / lateDays.length;
  const discountPct = Number(supplier?.discount_pct || 0);
  let discountsTakenCount = 0;
  let discountsMissedCount = 0;
  let discountCaptured = 0;
  let discountForgone = 0;

  rows.forEach(({ payment, bill }) => {
    const taken = Number(payment.discount_taken || 0);
    if (taken > 0) {
      discountsTakenCount += 1;
      discountCaptured += taken;
    } else if (discountPct > 0) {
      discountsMissedCount += 1;
      discountForgone += Number(bill.total || 0) * discountPct / 100;
    }
  });

  return {
    avgDaysLate: Math.round(avgDaysLate * 10) / 10,
    paymentHistoryCount: rows.length,
    latePaymentCount,
    onTimeRate: Math.round(((rows.length - latePaymentCount) / rows.length) * 1000) / 10,
    discountsTakenCount,
    discountsMissedCount,
    discountCaptured: Math.round(discountCaptured),
    discountForgone: Math.round(discountForgone),
  };
}

function monthlyInvoiceStats(customerId, invoices) {
  const monthly = {};
  invoices.filter(i => i.customer_id === customerId).forEach(i => {
    const month = String(i.invoice_date || '').slice(0, 7);
    if (!month) return;
    monthly[month] = (monthly[month] || 0) + Number(i.total || 0);
  });
  const values = Object.values(monthly);
  if (!values.length) return { avgMonthly: 0, maxMonthly: 0 };
  return {
    avgMonthly: Math.round(values.reduce((s, n) => s + n, 0) / values.length),
    maxMonthly: Math.round(Math.max(...values)),
  };
}

function deliveredInventoryByCustomer(workspace) {
  const openInvoices = new Map(workspace.invoices.filter(i => Number(i.balance_due) > 0).map(i => [i.invoice_no, i]));
  const products = new Map(workspace.products.map(p => [p.sku, p]));
  const totals = {};
  for (const line of workspace.invoiceLines || []) {
    const invoice = openInvoices.get(line.invoice_no);
    const product = products.get(line.sku);
    if (!invoice || !product || product.category === 'Non-stock') continue;
    const outstandingShare = invoice.total > 0 ? Math.min(1, Number(invoice.balance_due) / Number(invoice.total)) : 1;
    const cost = Math.max(0, Number(line.qty || 0)) * Number(product.wac || 0) * outstandingShare;
    totals[invoice.customer_id] = (totals[invoice.customer_id] || 0) + cost;
  }
  return totals;
}

export function buildEngineInputs(workspace) {
  const asOfDate = workspace.companyMetrics?.as_of_date || '2026-08-15';
  const customerById = new Map(workspace.customers.map(c => [c.id, c]));
  const supplierById = new Map(workspace.suppliers.map(s => [s.id, s]));
  const receiptAllocations = {};
  workspace.paymentsReceived.forEach(p => (p.applied_to || []).forEach(a => { receiptAllocations[a.invoice_no] = (receiptAllocations[a.invoice_no] || 0) + Number(a.amount || 0); }));
  const paymentAllocations = {};
  workspace.paymentsMade.forEach(p => { paymentAllocations[p.applied_to_bill] = (paymentAllocations[p.applied_to_bill] || 0) + Number(p.amount_paid || 0) + Number(p.discount_taken || 0); });
  const invoiceBalance = i => receiptAllocations[i.invoice_no] != null ? Math.max(0, Number(i.total || 0) - receiptAllocations[i.invoice_no]) : Number(i.balance_due || 0);
  const billBalance = b => paymentAllocations[b.bill_no] != null ? Math.max(0, Number(b.total || 0) - paymentAllocations[b.bill_no]) : Number(b.balance_due || 0);
  const delivered = deliveredInventoryByCustomer({...workspace, invoices: workspace.invoices.map(i => ({...i, balance_due: invoiceBalance(i)}))});

  const customers = workspace.customers.map(c => {
    const open = workspace.invoices.map(i=>({...i,_balance:invoiceBalance(i)})).filter(i => i.customer_id === c.id && i._balance > 0);
    const balance = open.reduce((s, i) => s + i._balance, 0);
    const pastDue = open.filter(i => daysOverdue(i.due_date, asOfDate) > 0).reduce((s, i) => s + i._balance, 0);
    const pay = customerPaymentStats(c.id, workspace);
    const monthly = monthlyInvoiceStats(c.id, workspace.invoices);
    return {
      id: c.id,
      name: c.name,
      contact: c.contact,
      email: c.email,
      phone: c.phone,
      category: c.category,
      balance: Math.round(balance),
      pastDue: Math.round(pastDue),
      termsDays: parseTermsDays(c.terms),
      avgDaysLate: pay.avgDaysLate,
      avgDaysToPay: pay.avgDaysToPay,
      stdDevDaysLate: pay.stdDevDaysLate,
      paymentHistoryCount: pay.historyCount,
      maxDaysOverdue: open.length ? Math.max(...open.map(i => daysOverdue(i.due_date, asOfDate))) : 0,
      hasDispute: open.some(i => String(i.status || '').toLowerCase().includes('disput')),
      asOfDate,
      maxMonthly: monthly.maxMonthly,
      avgMonthly: monthly.avgMonthly,
      creditLimit: Number(c.credit_limit || 0),
      brokenPromises: Number(c.broken_promises || 0),
      preferredChannel: c.preferred_channel || 'email',
      promisedPaymentDate: c.promised_payment_date || null,
      daysSincePreferredChannelContact: c.days_since_preferred_channel_contact == null ? null : Number(c.days_since_preferred_channel_contact),
      riskScoreOverride: c.risk_score_override == null ? null : Number(c.risk_score_override),
      inventoryDeliveredValue: Math.round(delivered[c.id] || 0),
      isClassA: monthly.avgMonthly >= 50000,
    };
  });

  const riskByCustomer = new Map(customers.map(c => [c.id, c.riskScoreOverride ?? 25]));
  const customerStatsById = new Map(customers.map(c => [c.id, c]));
  const invoices = workspace.invoices.map(i => ({
    id: i.invoice_no,
    invoiceNo: i.invoice_no,
    customerId: i.customer_id,
    customerName: customerById.get(i.customer_id)?.name || i.customer_id,
    invoiceDate: i.invoice_date,
    dueDate: i.due_date,
    terms: i.terms,
    amount: Number(i.total || 0),
    balanceDue: invoiceBalance(i),
    status: invoiceBalance(i) === 0 ? 'paid' : invoiceBalance(i) < Number(i.total || 0) ? 'partial' : (i.status || 'open'),
    paidDate: i.paid_date,
    daysOverdue: invoiceBalance(i) > 0 ? daysOverdue(i.due_date, asOfDate) : 0,
    riskScore: riskByCustomer.get(i.customer_id) ?? 25,
    customerAvgDaysLate: customerStatsById.get(i.customer_id)?.avgDaysLate || 0,
    customerStdDevDaysLate: customerStatsById.get(i.customer_id)?.stdDevDaysLate || 0,
  }));

  const products = workspace.products.map(p => ({
    sku: p.sku,
    name: p.name,
    category: p.category,
    supplierId: p.supplier_id,
    vendorName: supplierById.get(p.supplier_id)?.name || p.supplier_id,
    onHand: Number(p.on_hand || 0),
    wac: Number(p.wac || 0),
    sellPrice: Number(p.sell_price || p.wac || 0),
    sales60d: Number(p.sales_60d || 0),
    annualSales: Number(p.annual_sales || 0),
    leadTimeDays: Number(p.lead_time_days || supplierById.get(p.supplier_id)?.lead_time_days || 0),
    leadTimeStdDev: Number(p.lead_time_stddev || 0),
    daysQuiet: Number(p.days_quiet || 0),
    manualReorderPoint: Number(p.reorder_point || 0),
    manualSafetyStock: Number(p.safety_stock || 0),
    warehouse: p.warehouse,
  }));

  const bills = workspace.bills.map(b => {
    const supplier = supplierById.get(b.supplier_id);
    return {
      id: b.bill_no,
      billNo: b.bill_no,
      supplierId: b.supplier_id,
      vendorName: supplier?.name || b.supplier_id,
      billDate: b.bill_date,
      dueDate: b.due_date,
      terms: b.terms || supplier?.terms || 'Net 30',
      amount: Number(b.total || 0),
      balanceDue: billBalance(b),
      status: billBalance(b) === 0 ? 'paid' : billBalance(b) < Number(b.total || 0) ? 'partial' : (b.status || 'open'),
      discountAvailable: Number(b.discount_available || 0),
      discountPercent: Number(supplier?.discount_pct || 0),
      discountDays: Number(supplier?.discount_days || 0),
      netDays: Number(supplier?.net_days || parseTermsDays(b.terms)),
      daysOverdue: billBalance(b) > 0 ? daysOverdue(b.due_date, asOfDate) : 0,
      asOfDate,
    };
  });

  const openPurchaseBySupplier = {};
  const allPurchaseBySupplier = {};
  bills.forEach(b => {
    openPurchaseBySupplier[b.supplierId] = (openPurchaseBySupplier[b.supplierId] || 0) + (b.balanceDue > 0 ? b.balanceDue : 0);
    allPurchaseBySupplier[b.supplierId] = (allPurchaseBySupplier[b.supplierId] || 0) + b.amount;
  });
  const totalPurchases = Object.values(allPurchaseBySupplier).reduce((s, n) => s + n, 0) || 1;
  const vendors = workspace.suppliers.map(s => {
    const paymentStats = supplierPaymentStats(s.id, workspace);
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      category: s.category,
      apBalance: Math.round(openPurchaseBySupplier[s.id] || 0),
      terms: s.terms,
      leadTimeDays: Number(s.lead_time_days || 0),
      leadTimePromised: Number(s.lead_time_days || 0),
      cogsShare: (allPurchaseBySupplier[s.id] || 0) / totalPurchases,
      hasEarlyPay: bills.some(b => b.supplierId === s.id && b.balanceDue > 0 && b.discountAvailable > 0),
      netDays: Number(s.net_days || parseTermsDays(s.terms)),
      relationshipRating: s.relationship_rating || null,
      allowsExtension: s.allows_extension == null ? null : Boolean(s.allows_extension),
      singleSourceForClassA: s.single_source_for_class_a == null ? null : Boolean(s.single_source_for_class_a),
      ...paymentStats,
    };
  });

  const cashBalance = workspace.bankAccounts.reduce((s, a) => s + Number(a.balance || 0), 0);
  return {
    asOfDate,
    cashBalance: Math.round(cashBalance * 100) / 100,
    customers,
    invoices,
    products,
    bills,
    vendors,
    metrics: (() => {
      const withinDays = (date, days) => date && daysBetween(date, asOfDate) >= 0 && daysBetween(date, asOfDate) <= days;
      const purchases90 = workspace.bills.filter(b => withinDays(b.bill_date, 90)).reduce((s, b) => s + Number(b.total || 0), 0);
      const revenue90Observed = workspace.invoices.filter(i => withinDays(i.invoice_date, 90)).reduce((s, i) => s + Number(i.total || 0), 0);
      const actualInflows60d = workspace.paymentsReceived.filter(p => withinDays(p.payment_date, 60)).reduce((s, p) => s + Number(p.amount || 0), 0);
      const actualOutflows60d = workspace.paymentsMade.filter(p => withinDays(p.payment_date, 60)).reduce((s, p) => s + Number(p.amount_paid || 0), 0);
      const revenue30d = Number(workspace.companyMetrics?.revenue_last_30_days || 0);
      const cogs30d = Number(workspace.companyMetrics?.cogs_last_30_days || 0);
      return {
        periodDays: 90,
        periodSource: '90d purchases + observed/annualised company metrics',
        revenuePeriod: revenue90Observed > 0 ? revenue90Observed : revenue30d * 3,
        cogsPeriod: cogs30d * 3,
        purchasesPeriod: purchases90,
        revenue30d, cogs30d,
        operatingExpenses30d: Number(workspace.companyMetrics?.operating_expenses_last_30_days || 0),
        otherExpenses30d: Number(workspace.companyMetrics?.other_expenses_last_30_days || 0),
        otherCurrentLiabilities: Number(workspace.companyMetrics?.other_current_liabilities || 0),
        actualInflows60d, actualOutflows60d,
        monthlyPayroll: workspace.companyMetrics?.monthly_payroll == null ? null : Number(workspace.companyMetrics.monthly_payroll),
        wcmHistory: Array.isArray(workspace.companyMetrics?.wcm_history) ? workspace.companyMetrics.wcm_history : [],
      };
    })()
  };
}
