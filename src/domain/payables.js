/**
 * Module 3 — Payables engine.
 *
 * Source hierarchy:
 * 1) DECISION SYSTEMS DESIGN / All Calculations for Development for AP formulas and rules.
 * 2) Calculation Visuals + Manual Calculations workbooks for executable reference-fixture outputs.
 *
 * Module boundary:
 * - Owns AP aging, supplier exposure, bill sequencing, early-pay discount visibility,
 *   supplier payment-history signals, and AP-001..AP-004 evaluation.
 * - Does NOT perform AR→AP chained optimization; that remains Module 6 (Cross Domain Intelligence).
 */

const DAY_MS = 86400000;
const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n || 0)));
const round1 = n => Math.round(Number(n || 0) * 10) / 10;
const round2 = n => Math.round(Number(n || 0) * 100) / 100;
const money = n => Math.round(Number(n || 0));

export const PAYABLES_MODEL_VERSION = 'module3-payables-2026-09';

export const AP_AGING_BUCKETS = Object.freeze([
  'Past Due',
  '0-15',
  '16-30',
  '31-60',
  '61+',
]);

export const PAYABLES_CONFIG = Object.freeze({
  discount: {
    costOfCapitalDefault: 0.12,
  },
  priority: {
    dueSoonDays: 7,
    dueTwoWeeksDays: 15,
  },
  rules: {
    'AP-001': { dueWithinDays: null },
    'AP-002': {},
    'AP-003': {},
    'AP-004': { dueWithinDays: 7, extensionDays: 15 },
  },
});

function parseDate(value) {
  return value ? new Date(`${value}T00:00:00Z`) : null;
}

function diffDays(a, b) {
  const start = parseDate(a);
  const end = parseDate(b);
  if (!start || !end) return 0;
  return Math.round((end - start) / DAY_MS);
}

function emptyAging() {
  return Object.fromEntries(AP_AGING_BUCKETS.map(bucket => [bucket, 0]));
}

export function payablesAgingBucket(daysToDue, daysOverdue = 0) {
  const overdue = Number(daysOverdue || 0);
  if (overdue > 0 || Number(daysToDue) < 0) return 'Past Due';
  const days = Math.max(0, Number(daysToDue || 0));
  if (days <= 15) return '0-15';
  if (days <= 30) return '16-30';
  if (days <= 60) return '31-60';
  return '61+';
}

export function discountAPR(discountPercent, discountDays, netDays) {
  const pct = Number(discountPercent || 0);
  const dDays = Number(discountDays || 0);
  const nDays = Number(netDays || 0);
  if (pct <= 0 || pct >= 100 || nDays <= dDays) return 0;
  return (pct / (100 - pct)) * (365 / (nDays - dDays));
}

function supplierForBill(bill, vendorById) {
  return vendorById.get(bill.supplierId) || {
    id: bill.supplierId,
    name: bill.vendorName || bill.supplierId,
  };
}

function operationalPriority(bill) {
  if (Number(bill.daysOverdue || 0) > 0) {
    return {
      priorityTier: 'P1',
      priorityLabel: 'Immediate',
      recommendedAction: 'Resolve past-due bill today',
      priorityReason: `${bill.daysOverdue} day${bill.daysOverdue === 1 ? '' : 's'} past due`,
    };
  }
  if (bill.discountCandidate) {
    return {
      priorityTier: 'P2',
      priorityLabel: 'High',
      recommendedAction: 'Review discount candidate before payment window closes',
      priorityReason: `${bill.discountAPRPercent}% annualized discount return`,
    };
  }
  if (Number(bill.daysToDue || 0) <= PAYABLES_CONFIG.priority.dueSoonDays) {
    return {
      priorityTier: 'P2',
      priorityLabel: 'High',
      recommendedAction: 'Schedule payment this week',
      priorityReason: `Due in ${bill.daysToDue} day${bill.daysToDue === 1 ? '' : 's'}`,
    };
  }
  if (Number(bill.daysToDue || 0) <= PAYABLES_CONFIG.priority.dueTwoWeeksDays) {
    return {
      priorityTier: 'P3',
      priorityLabel: 'Medium',
      recommendedAction: 'Schedule within two weeks',
      priorityReason: `Due in ${bill.daysToDue} days`,
    };
  }
  return {
    priorityTier: 'P4',
    priorityLabel: 'Planned',
    recommendedAction: 'Pay to agreed terms',
    priorityReason: `Due in ${bill.daysToDue} days`,
  };
}

export function computePayablesModule(bills, vendors, cashBalance, thresholds = {}) {
  const openBills = bills.filter(bill => Number(bill.balanceDue || 0) > 0);
  const vendorById = new Map(vendors.map(vendor => [vendor.id, vendor]));
  const asOfDate = openBills.find(bill => bill.asOfDate)?.asOfDate || null;
  const costOfCapital = Number(thresholds.cost_of_capital ?? PAYABLES_CONFIG.discount.costOfCapitalDefault);
  const cash = Number(cashBalance || 0);

  const detailedBills = openBills.map(bill => {
    const vendor = supplierForBill(bill, vendorById);
    const daysToDue = bill.dueDate && (bill.asOfDate || asOfDate)
      ? diffDays(bill.asOfDate || asOfDate, bill.dueDate)
      : 0;
    const bucket = payablesAgingBucket(daysToDue, bill.daysOverdue);

    // `discount_available` is an explicit imported source field in the canonical
    // dataset. We respect that field rather than inferring an offer solely from terms.
    const discountSavings = Number(bill.discountAvailable || 0);
    const derivedPercent = Number(bill.balanceDue || 0) > 0
      ? (discountSavings / Number(bill.balanceDue)) * 100
      : 0;
    const effectiveDiscountPercent = Number(bill.discountPercent || 0) > 0
      ? Number(bill.discountPercent)
      : derivedPercent;
    const apr = discountAPR(effectiveDiscountPercent, bill.discountDays, bill.netDays);
    const aprQualified = discountSavings > 0 && apr > costOfCapital;
    const cashSufficient = cash > Number(bill.balanceDue || 0);
    const discountCandidate = aprQualified && cashSufficient;

    const base = {
      ...bill,
      supplier: vendor,
      daysToDue,
      agingBucket: bucket,
      discountSavings: money(discountSavings),
      effectiveDiscountPercent: round2(effectiveDiscountPercent),
      discountAPR: round4(apr),
      discountAPRPercent: round1(apr * 100),
      aprQualified,
      cashSufficient,
      discountCandidate,
      discountOptimizationStatus: discountCandidate
        ? 'APR-qualified candidate — full forecast-aware optimization deferred'
        : discountSavings > 0
          ? 'Discount visible — does not pass current APR/cash gate'
          : 'No active discount in source data',
    };
    return { ...base, ...operationalPriority(base) };
  });

  const agingBuckets = emptyAging();
  detailedBills.forEach(bill => {
    agingBuckets[bill.agingBucket] += Number(bill.balanceDue || 0);
  });
  const totalAPExact = detailedBills.reduce((sum, bill) => sum + Number(bill.balanceDue || 0), 0);
  const agingTotal = Object.values(agingBuckets).reduce((sum, value) => sum + value, 0);

  const supplierRows = vendors.map(vendor => {
    const vendorBills = detailedBills.filter(bill => bill.supplierId === vendor.id);
    const buckets = emptyAging();
    vendorBills.forEach(bill => { buckets[bill.agingBucket] += Number(bill.balanceDue || 0); });
    return {
      ...vendor,
      openBillCount: vendorBills.length,
      apBalance: money(vendorBills.reduce((sum, bill) => sum + Number(bill.balanceDue || 0), 0)),
      agingBuckets: Object.fromEntries(Object.entries(buckets).map(([key, value]) => [key, money(value)])),
      nextDueDate: [...vendorBills].sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0]?.dueDate || null,
      pastDueAmount: money(buckets['Past Due']),
      discountAvailable: money(vendorBills.reduce((sum, bill) => sum + Number(bill.discountSavings || 0), 0)),
    };
  });

  const priorityRank = { P1: 4, P2: 3, P3: 2, P4: 1 };
  const paymentQueue = [...detailedBills].sort((a, b) =>
    (priorityRank[b.priorityTier] || 0) - (priorityRank[a.priorityTier] || 0)
    || Number(a.daysToDue) - Number(b.daysToDue)
    || Number(b.balanceDue) - Number(a.balanceDue)
  );

  const discountOpportunities = detailedBills
    .filter(bill => Number(bill.discountSavings || 0) > 0)
    .sort((a, b) => Number(b.discountAPR || 0) - Number(a.discountAPR || 0));

  const totalDiscountSavings = discountOpportunities.reduce((sum, bill) => sum + Number(bill.discountSavings || 0), 0);
  const totalDiscountCandidateSavings = discountOpportunities.filter(bill => bill.discountCandidate)
    .reduce((sum, bill) => sum + Number(bill.discountSavings || 0), 0);

  const paymentHistory = supplierRows.reduce((acc, supplier) => {
    acc.paymentCount += Number(supplier.paymentHistoryCount || 0);
    acc.latePaymentCount += Number(supplier.latePaymentCount || 0);
    acc.discountsTakenCount += Number(supplier.discountsTakenCount || 0);
    acc.discountsMissedCount += Number(supplier.discountsMissedCount || 0);
    acc.discountCaptured += Number(supplier.discountCaptured || 0);
    acc.discountForgone += Number(supplier.discountForgone || 0);
    return acc;
  }, {
    paymentCount: 0,
    latePaymentCount: 0,
    discountsTakenCount: 0,
    discountsMissedCount: 0,
    discountCaptured: 0,
    discountForgone: 0,
  });

  const highestExposureSupplier = [...supplierRows].sort((a, b) => b.apBalance - a.apBalance)[0] || null;
  const pastDueBills = detailedBills.filter(bill => bill.agingBucket === 'Past Due');

  return {
    modelVersion: PAYABLES_MODEL_VERSION,
    asOfDate,
    totalAP: money(totalAPExact),
    openBillCount: detailedBills.length,
    bills: detailedBills,
    suppliers: supplierRows,
    paymentQueue,
    aging: {
      buckets: Object.fromEntries(Object.entries(agingBuckets).map(([key, value]) => [key, money(value)])),
      total: money(agingTotal),
      reconciliationDelta: round2(agingTotal - totalAPExact),
      reconciled: Math.abs(agingTotal - totalAPExact) < 0.01,
    },
    pastDueAmount: money(pastDueBills.reduce((sum, bill) => sum + Number(bill.balanceDue || 0), 0)),
    pastDueBillCount: pastDueBills.length,
    dueWithin15Amount: money(agingBuckets['0-15']),
    discountOpportunities,
    totalDiscountSavings: money(totalDiscountSavings),
    totalDiscountCandidateSavings: money(totalDiscountCandidateSavings),
    highestExposureSupplier,
    paymentHistory: {
      ...paymentHistory,
      discountCaptured: money(paymentHistory.discountCaptured),
      discountForgone: money(paymentHistory.discountForgone),
    },
    rulesModel: {
      formalRuleIds: ['AP-001', 'AP-002', 'AP-003', 'AP-004'],
      crossDomainOptimizationDeferred: true,
    },
  };
}

function round4(value) {
  return Math.round(Number(value || 0) * 10000) / 10000;
}

function confidenceFromFields(flags) {
  const available = flags.filter(Boolean).length;
  return clamp(Math.round(35 + (available / flags.length) * 60), 25, 95);
}

function advisory({ id, entityId, priority, finding, reason, risk, recommendedAction, contributors, confidence }) {
  return {
    id,
    entityId,
    system: 'AR + AP (Payables)',
    domain: 'Payables',
    priority,
    finding,
    reason,
    risk,
    recommendedAction,
    contributors: contributors.filter(Boolean).slice(0, 5),
    confidence: clamp(Math.round(confidence), 25, 95),
  };
}

export function evaluatePayablesRules(payables, cashForecast = {}, thresholds = {}, options = {}) {
  const out = [];
  const { includeAP001 = true, includeAP002 = true, includeAP003 = true, includeAP004 = true } = options;
  const bills = payables?.bills || [];
  const suppliers = payables?.suppliers || payables?.vendors || [];
  const supplierById = new Map(suppliers.map(supplier => [supplier.id, supplier]));
  const costOfCapital = Number(thresholds.cost_of_capital ?? PAYABLES_CONFIG.discount.costOfCapitalDefault);
  const coverageMultiplier = Number(thresholds.coverage_multiplier ?? 1.2);
  const cashForecastTight = Number(cashForecast.cashToday || 0) + Number(cashForecast.inflow30d || 0)
    < Number(cashForecast.outflow30d || 0) * coverageMultiplier;

  for (const bill of bills) {
    const supplier = bill.supplier || supplierById.get(bill.supplierId) || {};
    const daysToDue = bill.daysToDue != null
      ? Number(bill.daysToDue)
      : (bill.dueDate && bill.asOfDate ? diffDays(bill.asOfDate, bill.dueDate) : null);
    const overdue = Number(bill.daysOverdue || 0) > 0 || (daysToDue != null && daysToDue < 0);
    const savings = Number(bill.discountSavings ?? bill.discountAvailable ?? 0);
    const apr = bill.discountAPR != null
      ? Number(bill.discountAPR)
      : discountAPR(bill.discountPercent, bill.discountDays, bill.netDays);
    const cashSufficient = bill.cashSufficient != null
      ? Boolean(bill.cashSufficient)
      : Number(payables.cashBalance || cashForecast.cashToday || 0) > Number(bill.balanceDue || 0);

    if (includeAP001 && savings > 0 && apr > costOfCapital && cashSufficient) {
      out.push(advisory({
        id: 'AP-001',
        entityId: bill.billNo,
        priority: 'HIGH',
        finding: `${bill.billNo} has an APR-qualified early-pay discount worth $${money(savings).toLocaleString()}.`,
        reason: `The annualized discount return is ${round1(apr * 100)}%, above the ${(costOfCapital * 100).toFixed(1)}% cost-of-capital threshold, and current cash covers the bill.`,
        risk: 'Missing a high-return discount leaves avoidable margin on the table.',
        recommendedAction: 'Review and capture the discount if the 30-day cash forecast remains positive; full cross-domain optimization is deferred.',
        contributors: [
          `Savings $${money(savings).toLocaleString()}`,
          `Discount APR ${round1(apr * 100)}%`,
          `Bill $${money(bill.balanceDue).toLocaleString()}`,
          'Current cash sufficient',
        ],
        confidence: confidenceFromFields([savings > 0, apr > 0, cashSufficient]),
      }));
    }

    if (includeAP002 && overdue && supplier.singleSourceForClassA === true) {
      out.push(advisory({
        id: 'AP-002',
        entityId: bill.billNo,
        priority: 'CRITICAL',
        finding: `${bill.billNo} is overdue with a supplier explicitly marked single-source for Class A inventory.`,
        reason: `${supplier.name || bill.vendorName} is a critical source and the bill is ${Math.max(1, Number(bill.daysOverdue || Math.abs(daysToDue || 0)))} day(s) overdue.`,
        risk: 'Supplier hold or disruption can affect high-value inventory availability.',
        recommendedAction: 'Pay immediately or resolve the supplier hold risk today.',
        contributors: [
          `Bill ${bill.billNo}`,
          `Vendor ${supplier.name || bill.vendorName}`,
          'Single-source Class A flag',
          `${Math.max(1, Number(bill.daysOverdue || Math.abs(daysToDue || 0)))} days overdue`,
        ],
        confidence: confidenceFromFields([overdue, supplier.singleSourceForClassA === true]),
      }));
    }

    if (includeAP003 && overdue && String(supplier.relationshipRating || '').toLowerCase() === 'strong') {
      out.push(advisory({
        id: 'AP-003',
        entityId: bill.billNo,
        priority: 'MEDIUM',
        finding: `${bill.billNo} is overdue with a strong vendor relationship.`,
        reason: 'The recorded relationship strength supports a limited grace-period response.',
        risk: 'Repeated delay can still weaken otherwise strong supplier terms.',
        recommendedAction: 'Pay within the agreed grace period and record the supplier communication.',
        contributors: [
          `Bill ${bill.billNo}`,
          'Relationship rating strong',
          `${Math.max(1, Number(bill.daysOverdue || Math.abs(daysToDue || 0)))} days overdue`,
        ],
        confidence: confidenceFromFields([overdue, supplier.relationshipRating]),
      }));
    }

    if (includeAP004
      && daysToDue != null
      && daysToDue >= 0
      && daysToDue <= PAYABLES_CONFIG.rules['AP-004'].dueWithinDays
      && cashForecastTight
      && supplier.allowsExtension === true) {
      out.push(advisory({
        id: 'AP-004',
        entityId: bill.billNo,
        priority: 'MEDIUM',
        finding: `${bill.billNo} is due within ${PAYABLES_CONFIG.rules['AP-004'].dueWithinDays} days while cash coverage is tight.`,
        reason: `${supplier.name || bill.vendorName} explicitly allows an extension.`,
        risk: 'Paying on the original date can worsen the near-term cash position.',
        recommendedAction: `Request a ${PAYABLES_CONFIG.rules['AP-004'].extensionDays}-day extension.`,
        contributors: [
          `Due in ${daysToDue} days`,
          '30-day cash coverage tight',
          'Vendor extension allowed',
        ],
        confidence: confidenceFromFields([daysToDue != null, cashForecastTight, supplier.allowsExtension === true]),
      }));
    }
  }

  const rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  return out.sort((a, b) => (rank[b.priority] || 0) - (rank[a.priority] || 0) || b.confidence - a.confidence);
}
