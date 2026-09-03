import crossDomainConfig from '../config/crossDomainRuleConfig.json' with { type: 'json' };

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value || 0)));
const round1 = value => Math.round(Number(value || 0) * 10) / 10;
const round2 = value => Math.round(Number(value || 0) * 100) / 100;
const money = value => Math.round(Number(value || 0));

function median(values) {
  const nums = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!nums.length) return 0;
  const middle = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[middle] : (nums[middle - 1] + nums[middle]) / 2;
}

function collectionProbability(payScore) {
  const score = Number(payScore || 0);
  if (score < 30) return 0.95;
  if (score <= 60) return 0.80;
  if (score <= 80) return 0.55;
  return 0.25;
}

function advisory({ id, entityId = null, priority, finding, reason, risk, recommendedAction, contributors = [], confidence = 65, domains = [] }) {
  return {
    id,
    entityId,
    system: 'Cross Domain Intelligence',
    domain: 'Cross Domain',
    domains,
    priority,
    finding,
    reason,
    risk,
    recommendedAction,
    contributors: contributors.filter(Boolean).slice(0, 5),
    confidence: clamp(Math.round(confidence), 25, 95),
  };
}

function lineRevenue(line) {
  const explicit = Number(line?.line_total);
  if (Number.isFinite(explicit) && explicit !== 0) return explicit;
  return Number(line?.qty || 0) * Number(line?.unit_price || 0);
}

function lineUnitCost(line, sku) {
  const explicit = Number(line?.unit_cost);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return Number(sku?.wac || 0);
}

function ruleStatus(id, status, reason, data = {}) {
  const config = crossDomainConfig.rules[id] || {};
  return {
    id,
    severity: config.severity || 'MEDIUM',
    status,
    reason,
    ...data,
  };
}

function prioritySort(items) {
  const rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  return [...items].sort((a, b) => (rank[b.priority] || 0) - (rank[a.priority] || 0) || b.confidence - a.confidence);
}

export function computeCrossDomainIntelligence({ workspace = {}, sys1 = {}, sys2 = {}, sys3 = {}, sys4 = {}, thresholds = {} } = {}) {
  const rules = crossDomainConfig.rules;
  const invoiceLines = Array.isArray(workspace.invoiceLines) ? workspace.invoiceLines : [];
  const rawInvoices = Array.isArray(workspace.invoices) ? workspace.invoices : [];
  const receivables = sys4.receivables || sys4 || {};
  const openInvoices = Array.isArray(receivables.invoices) ? receivables.invoices : [];
  const customers = Array.isArray(receivables.customers) ? receivables.customers : [];
  const badDebtCandidates = Array.isArray(receivables.badDebtCandidates) ? receivables.badDebtCandidates : [];
  const payables = sys4.payables || {};
  const discountOpportunities = Array.isArray(payables.discountOpportunities)
    ? payables.discountOpportunities
    : (Array.isArray(sys4.discountOpportunities) ? sys4.discountOpportunities : []);
  const skus = Array.isArray(sys2.skus) ? sys2.skus : [];

  const rawInvoiceByNo = new Map(rawInvoices.map(invoice => [invoice.invoice_no, invoice]));
  const openInvoiceByNo = new Map(openInvoices.map(invoice => [invoice.invoiceNo || invoice.id, invoice]));
  const customerById = new Map(customers.map(customer => [customer.id, customer]));
  const skuById = new Map(skus.map(sku => [sku.sku, sku]));
  const linesByInvoice = new Map();
  for (const line of invoiceLines) {
    const key = line.invoice_no;
    if (!key) continue;
    if (!linesByInvoice.has(key)) linesByInvoice.set(key, []);
    linesByInvoice.get(key).push(line);
  }

  const advisories = [];
  const statuses = [];

  // Inventory + AR exposure by overdue customer.
  const overdueInventoryByCustomer = new Map();
  for (const invoice of openInvoices) {
    if (Number(invoice.daysOverdue || 0) <= 0) continue;
    const invoiceNo = invoice.invoiceNo || invoice.id;
    const outstandingShare = Number(invoice.amount || 0) > 0
      ? clamp(Number(invoice.balanceDue || 0) / Number(invoice.amount), 0, 1)
      : 1;
    for (const line of linesByInvoice.get(invoiceNo) || []) {
      const sku = skuById.get(line.sku);
      if (!sku || sku.category === 'Non-stock') continue;
      const value = Math.max(0, Number(line.qty || 0)) * Number(sku.wac || 0) * outstandingShare;
      if (value <= 0) continue;
      const current = overdueInventoryByCustomer.get(invoice.customerId) || { value: 0, invoiceNos: new Set(), skus: new Set() };
      current.value += value;
      current.invoiceNos.add(invoiceNo);
      current.skus.add(line.sku);
      overdueInventoryByCustomer.set(invoice.customerId, current);
    }
  }

  const invoiceMedian = Number(receivables.invoiceMedian || 0);
  const hostageMultiplier = Number(thresholds.xd_inventory_hostage_multiplier ?? rules['INV-XD-001'].inventoryHostageMultiplier);
  const hostageThreshold = invoiceMedian * hostageMultiplier;
  const hasInventoryArJoin = invoiceLines.length > 0 && skus.length > 0 && openInvoices.length > 0;
  statuses.push(ruleStatus(
    'INV-XD-001',
    hasInventoryArJoin && invoiceMedian > 0 ? 'operational' : 'waiting-data',
    hasInventoryArJoin && invoiceMedian > 0
      ? `Uses overdue invoice lines, SKU WAC and ${hostageMultiplier}× workspace median invoice.`
      : 'Needs invoice lines, inventory WAC and open-invoice history.',
  ));
  if (hasInventoryArJoin && invoiceMedian > 0) {
    for (const [customerId, exposure] of overdueInventoryByCustomer) {
      if (exposure.value <= hostageThreshold) continue;
      const customer = customerById.get(customerId) || { name: customerId };
      advisories.push(advisory({
        id: 'INV-XD-001',
        entityId: customerId,
        priority: 'CRITICAL',
        domains: ['Inventory', 'Receivables'],
        finding: `${customer.name} has $${money(exposure.value).toLocaleString()} of inventory cost tied to overdue invoices.`,
        reason: `The exposure exceeds ${hostageMultiplier}× the workspace median open invoice ($${money(invoiceMedian).toLocaleString()}).`,
        risk: 'More shipments can increase both physical-inventory exposure and unpaid receivables to the same customer.',
        recommendedAction: 'Halt further credit shipments to this customer until collection progress is confirmed.',
        contributors: [
          `Inventory exposure $${money(exposure.value).toLocaleString()}`,
          `Median invoice $${money(invoiceMedian).toLocaleString()}`,
          `${exposure.invoiceNos.size} overdue invoice${exposure.invoiceNos.size === 1 ? '' : 's'}`,
          `${exposure.skus.size} stocked SKU${exposure.skus.size === 1 ? '' : 's'}`,
          `PayScore ${round1(customer.payScore || 0)}`,
        ],
        confidence: 90,
      }));
    }
  }

  // SKU concentration in high-risk customers.
  const highRiskScoreMin = Number(rules['INV-XD-002'].highRiskScoreMin);
  const riskyShareMin = Number(thresholds.xd_risky_sku_customer_share ?? rules['INV-XD-002'].riskyCustomerShareMin);
  const skuSales = new Map();
  for (const line of invoiceLines) {
    const rawInvoice = rawInvoiceByNo.get(line.invoice_no);
    if (!rawInvoice || !line.sku) continue;
    const customer = customerById.get(rawInvoice.customer_id);
    const revenue = Math.max(0, lineRevenue(line));
    if (revenue <= 0) continue;
    const current = skuSales.get(line.sku) || { total: 0, risky: 0, riskyCustomers: new Set(), customers: new Set() };
    current.total += revenue;
    current.customers.add(rawInvoice.customer_id);
    if (Number(customer?.payScore || 0) > highRiskScoreMin) {
      current.risky += revenue;
      current.riskyCustomers.add(rawInvoice.customer_id);
    }
    skuSales.set(line.sku, current);
  }
  const hasRiskySkuJoin = invoiceLines.length > 0 && customers.length > 0;
  statuses.push(ruleStatus(
    'INV-XD-002',
    hasRiskySkuJoin ? 'operational' : 'waiting-data',
    hasRiskySkuJoin
      ? `Flags SKUs when more than ${round1(riskyShareMin * 100)}% of observed sales are to customers with PayScore above ${highRiskScoreMin}.`
      : 'Needs invoice-line customer/SKU history and customer PayScores.',
  ));
  if (hasRiskySkuJoin) {
    for (const [skuId, sales] of skuSales) {
      if (sales.total <= 0) continue;
      const riskyShare = sales.risky / sales.total;
      if (riskyShare <= riskyShareMin) continue;
      const sku = skuById.get(skuId) || { name: skuId };
      advisories.push(advisory({
        id: 'INV-XD-002',
        entityId: skuId,
        priority: 'MEDIUM',
        domains: ['Inventory', 'Receivables'],
        finding: `${skuId} has ${round1(riskyShare * 100)}% of observed sales tied to high-risk customers.`,
        reason: `${sales.riskyCustomers.size} high-risk customer${sales.riskyCustomers.size === 1 ? '' : 's'} account for $${money(sales.risky).toLocaleString()} of $${money(sales.total).toLocaleString()} observed SKU sales.`,
        risk: 'Demand concentration can turn customer credit deterioration into inventory and revenue risk for this SKU.',
        recommendedAction: 'Diversify the customer base for this SKU and avoid building stock solely around high-risk accounts.',
        contributors: [
          `High-risk sales share ${round1(riskyShare * 100)}%`,
          `Observed SKU sales $${money(sales.total).toLocaleString()}`,
          `${sales.riskyCustomers.size} high-risk customer${sales.riskyCustomers.size === 1 ? '' : 's'}`,
          `Threshold ${round1(riskyShareMin * 100)}%`,
        ],
        confidence: clamp(55 + Math.min(30, sales.customers.size * 8), 25, 90),
      }));
    }
  }

  // Customer true-margin approximation from the source formula using available line cost + carry cost.
  const customerEconomics = new Map();
  for (const line of invoiceLines) {
    const rawInvoice = rawInvoiceByNo.get(line.invoice_no);
    if (!rawInvoice) continue;
    const sku = skuById.get(line.sku);
    const revenue = Math.max(0, lineRevenue(line));
    if (revenue <= 0) continue;
    const qty = Math.max(0, Number(line.qty || 0));
    const cogs = qty * lineUnitCost(line, sku);
    const current = customerEconomics.get(rawInvoice.customer_id) || { revenue: 0, cogs: 0 };
    current.revenue += revenue;
    current.cogs += cogs;
    customerEconomics.set(rawInvoice.customer_id, current);
  }
  const costOfCapital = Number(thresholds.cost_of_capital ?? 0.12);
  const customerTrueMargins = [];
  for (const [customerId, economics] of customerEconomics) {
    const customer = customerById.get(customerId) || {};
    const carryDays = Math.max(0, Number(customer.avgDaysLate || 0) + Number(customer.termsDays || 0));
    const carryCost = Number(customer.balance || 0) * (carryDays / 365) * costOfCapital;
    const trueMargin = economics.revenue - economics.cogs - carryCost;
    const trueMarginPercent = economics.revenue > 0 ? trueMargin / economics.revenue : 0;
    customerTrueMargins.push({ customerId, ...economics, carryCost, trueMargin, trueMarginPercent });
  }
  const medianTrueMargin = median(customerTrueMargins.map(row => row.trueMarginPercent));
  const trueMarginByCustomer = new Map(customerTrueMargins.map(row => [row.customerId, row]));
  const writeoffCustomerIds = new Set(badDebtCandidates.map(invoice => invoice.customerId));
  const writeoffInventoryMin = Number(thresholds.xd_writeoff_inventory_min ?? rules['BAD-XD-001'].inventoryRecoveryMin);

  statuses.push(ruleStatus(
    'BAD-XD-001',
    badDebtCandidates.length > 0 && hasInventoryArJoin ? 'operational' : 'waiting-data',
    badDebtCandidates.length > 0 && hasInventoryArJoin
      ? `Uses >120-day bad-debt candidates and a $${money(writeoffInventoryMin).toLocaleString()} recoverable-inventory floor.`
      : 'Needs a bad-debt/write-off candidate plus invoice-line inventory exposure.',
  ));
  if (badDebtCandidates.length > 0 && hasInventoryArJoin) {
    for (const customerId of writeoffCustomerIds) {
      const exposure = overdueInventoryByCustomer.get(customerId);
      if (!exposure || exposure.value <= writeoffInventoryMin) continue;
      const customer = customerById.get(customerId) || { name: customerId };
      const debt = badDebtCandidates.filter(invoice => invoice.customerId === customerId).reduce((sum, invoice) => sum + Number(invoice.balanceDue || 0), 0);
      advisories.push(advisory({
        id: 'BAD-XD-001',
        entityId: customerId,
        priority: 'HIGH',
        domains: ['Bad Debt', 'Inventory'],
        finding: `${customer.name} is a write-off candidate with $${money(exposure.value).toLocaleString()} of tracked inventory cost tied to unpaid invoices.`,
        reason: `The account has $${money(debt).toLocaleString()} in >120-day balances and inventory exposure above the $${money(writeoffInventoryMin).toLocaleString()} recovery threshold.`,
        risk: 'Processing a financial write-off before a physical recovery attempt can leave recoverable assets at the customer site.',
        recommendedAction: 'Attempt recovery or return of identifiable inventory before finalizing the financial write-off.',
        contributors: [
          `Bad-debt balance $${money(debt).toLocaleString()}`,
          `Tracked inventory $${money(exposure.value).toLocaleString()}`,
          `${exposure.skus.size} SKU${exposure.skus.size === 1 ? '' : 's'}`,
          `${exposure.invoiceNos.size} overdue invoice${exposure.invoiceNos.size === 1 ? '' : 's'}`,
        ],
        confidence: 82,
      }));
    }
  }

  const hasTrueMarginData = customerTrueMargins.length >= 2 && customerTrueMargins.some(row => row.revenue > 0);
  statuses.push(ruleStatus(
    'BAD-XD-002',
    badDebtCandidates.length > 0 && hasTrueMarginData ? 'operational' : 'waiting-data',
    badDebtCandidates.length > 0 && hasTrueMarginData
      ? 'Compares the write-off customer product-mix true margin with the workspace median using available invoice-line cost and cash-carry inputs.'
      : 'Needs a bad-debt/write-off candidate and customer product-mix revenue/cost data.',
  ));
  if (badDebtCandidates.length > 0 && hasTrueMarginData) {
    for (const customerId of writeoffCustomerIds) {
      const economics = trueMarginByCustomer.get(customerId);
      if (!economics || economics.trueMarginPercent <= medianTrueMargin) continue;
      const customer = customerById.get(customerId) || { name: customerId };
      advisories.push(advisory({
        id: 'BAD-XD-002',
        entityId: customerId,
        priority: 'MEDIUM',
        domains: ['Bad Debt', 'Margin'],
        finding: `${customer.name} is a write-off candidate but its observed product mix remains above the workspace median true margin.`,
        reason: `Estimated true margin is ${round1(economics.trueMarginPercent * 100)}% versus workspace median ${round1(medianTrueMargin * 100)}%.`,
        risk: 'A pure write-off decision can destroy future relationship value from a historically profitable customer.',
        recommendedAction: 'Attempt a settlement or structured repayment before fully exiting the customer relationship.',
        contributors: [
          `True margin ${round1(economics.trueMarginPercent * 100)}%`,
          `Workspace median ${round1(medianTrueMargin * 100)}%`,
          `Observed revenue $${money(economics.revenue).toLocaleString()}`,
          `Cash carry cost $${money(economics.carryCost).toLocaleString()}`,
        ],
        confidence: 70,
      }));
    }
  }

  statuses.push(ruleStatus('BAD-XD-003', 'waiting-external-data', 'Peer bad-debt median is not available until peer benchmarks activate.'));
  statuses.push(ruleStatus('BAD-XD-004', 'waiting-history', 'Needs written-off-customer SKU history plus fastest-growing segment history.'));

  // AR + AP chained discount opportunity.
  const coverageMultiplier = Number(thresholds.coverage_multiplier ?? 1.2);
  const cashTight = Number(sys3.cashToday || 0) + Number(sys3.inflow30d || 0)
    < Number(sys3.outflow30d || 0) * coverageMultiplier;
  const collectibleInvoices = openInvoices.map(invoice => {
    const customer = customerById.get(invoice.customerId) || {};
    const probability = collectionProbability(customer.payScore ?? invoice.payScore ?? 25);
    return {
      ...invoice,
      collectionProbability: probability,
      expectedCollectable: Number(invoice.balanceDue || 0) * probability,
    };
  }).sort((a, b) => b.expectedCollectable - a.expectedCollectable);
  const totalCollectableAR = collectibleInvoices.reduce((sum, invoice) => sum + invoice.expectedCollectable, 0);
  const aprQualifiedDiscounts = discountOpportunities.filter(bill => Number(bill.discountSavings ?? bill.savings ?? 0) > 0 && bill.aprQualified !== false);
  const hasChainInputs = openInvoices.length > 0 && discountOpportunities.length > 0 && Number(sys3.outflow30d || 0) > 0;
  statuses.push(ruleStatus(
    'AR-AP-XD-001',
    hasChainInputs ? 'operational' : 'waiting-data',
    hasChainInputs
      ? 'Uses the same 30-day cash-tight coverage gate as AP-004, APR-qualified discounts and risk-weighted collectible AR.'
      : 'Needs open AR, an early-pay discount and a 30-day cash forecast.',
    { cashTight },
  ));
  if (cashTight && aprQualifiedDiscounts.length > 0 && totalCollectableAR > 0) {
    for (const bill of aprQualifiedDiscounts) {
      const billAmount = Number(bill.balanceDue || 0);
      if (billAmount <= 0 || totalCollectableAR <= billAmount) continue;
      const candidate = collectibleInvoices.find(invoice => invoice.expectedCollectable >= billAmount) || collectibleInvoices[0];
      const savings = Number(bill.discountSavings ?? bill.savings ?? 0);
      const customer = candidate ? customerById.get(candidate.customerId) : null;
      advisories.push(advisory({
        id: 'AR-AP-XD-001',
        entityId: bill.billNo || bill.id,
        priority: 'HIGH',
        domains: ['Cash', 'Receivables', 'Payables'],
        finding: `Cash coverage is tight while ${bill.billNo || bill.id} has an early-pay discount worth $${money(savings).toLocaleString()}.`,
        reason: `Risk-weighted collectible AR is about $${money(totalCollectableAR).toLocaleString()}, above the $${money(billAmount).toLocaleString()} bill amount.`,
        risk: 'Without a coordinated collection action, the business can miss a high-return vendor discount because of timing rather than economics.',
        recommendedAction: candidate
          ? `Accelerate collection of ${candidate.invoiceNo || candidate.id}${customer?.name ? ` from ${customer.name}` : ''}, then use proceeds to fund ${bill.billNo || bill.id} within the discount window.`
          : `Accelerate collectible AR, then use proceeds to fund ${bill.billNo || bill.id} within the discount window.`,
        contributors: [
          `Discount savings $${money(savings).toLocaleString()}`,
          `Discount APR ${round1(Number(bill.discountAPRPercent || Number(bill.discountAPR || 0) * 100))}%`,
          `Bill amount $${money(billAmount).toLocaleString()}`,
          `Collectible AR $${money(totalCollectableAR).toLocaleString()}`,
          candidate ? `${candidate.invoiceNo || candidate.id} expected collectable $${money(candidate.expectedCollectable).toLocaleString()}` : null,
        ],
        confidence: clamp(Math.min(Number(sys3.forecastConfidence || 65), 90), 25, 90),
      }));
    }
  }

  // Working-capital financing-gap rule only activates when the source-required
  // annual purchases and monthly-profit history exist. No synthetic fallback.
  const annualPurchases = Number(workspace.companyMetrics?.annual_purchases || 0);
  const profitHistoryRaw = workspace.companyMetrics?.monthly_profit_history;
  const monthlyProfitHistory = Array.isArray(profitHistoryRaw)
    ? profitHistoryRaw.map(value => Number(typeof value === 'object' ? value.profit : value)).filter(Number.isFinite)
    : [];
  const customerPayDays = customers.map(customer => Number(customer.avgDaysToPay || 0)).filter(value => value > 0);
  const supplierTerms = (payables.suppliers || sys4.vendors || []).map(vendor => Number(vendor.netDays || 0)).filter(value => value > 0);
  const hasGapInputs = annualPurchases > 0 && monthlyProfitHistory.length > 0 && customerPayDays.length > 0 && supplierTerms.length > 0;
  let wcGapDays = null;
  let wcGapCost = null;
  let medianMonthlyProfit = null;
  if (hasGapInputs) {
    const avgCustomerDaysToPay = customerPayDays.reduce((sum, value) => sum + value, 0) / customerPayDays.length;
    const avgSupplierTerms = supplierTerms.reduce((sum, value) => sum + value, 0) / supplierTerms.length;
    wcGapDays = avgCustomerDaysToPay - avgSupplierTerms;
    wcGapCost = Math.max(0, wcGapDays) / 365 * annualPurchases * costOfCapital;
    medianMonthlyProfit = median(monthlyProfitHistory);
    const gapThreshold = Number(rules['AR-AP-XD-002'].wcGapDaysMin);
    if (wcGapDays > gapThreshold && wcGapCost > medianMonthlyProfit) {
      advisories.push(advisory({
        id: 'AR-AP-XD-002',
        entityId: 'workspace',
        priority: 'HIGH',
        domains: ['Receivables', 'Payables', 'Working Capital'],
        finding: `The financing gap is ${round1(wcGapDays)} days with an estimated annual carrying cost of $${money(wcGapCost).toLocaleString()}.`,
        reason: `The gap exceeds ${gapThreshold} days and its annual cost is above the workspace median monthly profit of $${money(medianMonthlyProfit).toLocaleString()}.`,
        risk: 'The business is structurally paying suppliers well before customer cash arrives, consuming working capital even when sales are healthy.',
        recommendedAction: 'Target both sides: shorten customer payment time and negotiate longer supplier terms.',
        contributors: [
          `Gap ${round1(wcGapDays)} days`,
          `Annual purchases $${money(annualPurchases).toLocaleString()}`,
          `Gap cost $${money(wcGapCost).toLocaleString()}`,
          `Median monthly profit $${money(medianMonthlyProfit).toLocaleString()}`,
          `Cost of capital ${round1(costOfCapital * 100)}%`,
        ],
        confidence: 80,
      }));
    }
  }
  statuses.push(ruleStatus(
    'AR-AP-XD-002',
    hasGapInputs ? 'operational' : 'waiting-data',
    hasGapInputs
      ? 'Uses customer payment days, supplier terms, annual purchases and monthly profit history.'
      : 'Needs annual_purchases, monthly_profit_history, customer payment history and supplier terms.',
    { wcGapDays: wcGapDays == null ? null : round1(wcGapDays), wcGapCost: wcGapCost == null ? null : round2(wcGapCost) },
  ));

  statuses.push(ruleStatus('AR-AP-XD-003', 'waiting-calibration', 'The source defines “high-margin slow-paying customer” but does not provide a calibrated high-margin cutoff.'));

  const uniqueSignals = [];
  const seen = new Set();
  for (const item of prioritySort(advisories)) {
    const key = `${item.id}:${item.entityId || 'workspace'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueSignals.push(item);
  }

  const statusCounts = statuses.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});

  return {
    modelVersion: crossDomainConfig.version,
    advisories: uniqueSignals,
    rules: statuses,
    totalRuleCount: Object.keys(rules).length,
    operationalRuleCount: statuses.filter(row => row.status === 'operational').length,
    waitingRuleCount: statuses.filter(row => row.status !== 'operational').length,
    activeSignalCount: uniqueSignals.length,
    statusCounts,
    metrics: {
      inventoryHostageThreshold: money(hostageThreshold),
      highRiskSkuShareThreshold: round1(riskyShareMin * 100),
      writeoffInventoryRecoveryFloor: money(writeoffInventoryMin),
      totalCollectableAR: money(totalCollectableAR),
      cashTight,
      medianTrueMarginPercent: round1(medianTrueMargin * 100),
      wcGapDays: wcGapDays == null ? null : round1(wcGapDays),
      wcGapCost: wcGapCost == null ? null : money(wcGapCost),
      annualPurchases: annualPurchases || null,
      medianMonthlyProfit: medianMonthlyProfit == null ? null : money(medianMonthlyProfit),
      workingCapital: Number(sys1.workingCapital || 0),
    },
  };
}

export { crossDomainConfig as CROSS_DOMAIN_CONFIG };
