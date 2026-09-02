/**
 * Module 2 — Receivables engine.
 *
 * Source hierarchy:
 * 1) DECISION SYSTEMS DESIGN / All Calculations for Development for rule/formula structure.
 * 2) Calculation Visuals workbook for executable reference-fixture outputs.
 *
 * PayScore caveat:
 * The full seven-component transformations are explicitly delegated to the unavailable
 * i2C Intelligence Specification. For the current manual-data build we therefore use
 * the simplified avg-days-late band mapping supplied in Calculation Visuals and expose
 * the model as provisional.
 */

const clamp = (n, min, max) => Math.max(min, Math.min(max, Number(n || 0)));
const round1 = n => Math.round(Number(n || 0) * 10) / 10;
const round2 = n => Math.round(Number(n || 0) * 100) / 100;
const money = n => Math.round(Number(n || 0));

export const RECEIVABLES_MODEL_VERSION = 'module2-receivables-2026-08';

export const RECEIVABLES_CONFIG = Object.freeze({
  payScore: {
    model: 'avg-days-late-reference',
    provisional: true,
    bands: [
      { maxExclusive: 0, score: 15, label: 'Excellent', riskTier: 'LOW' },
      { maxInclusive: 5, score: 25, label: 'Good', riskTier: 'LOW' },
      { maxInclusive: 15, score: 45, label: 'Fair', riskTier: 'MEDIUM' },
      { maxInclusive: 30, score: 60, label: 'Concerning', riskTier: 'HIGH' },
      { score: 78, label: 'Critical', riskTier: 'CRITICAL' },
    ],
  },
  collectionPriority: {
    p1Min: 85,
    p2Min: 65,
    p3Min: 40,
  },
  ecl: {
    // Formal Decision Systems Design v1 schedule.
    pd: {
      Current: 0.01,
      '1-30': 0.03,
      '31-60': 0.08,
      '61-90': 0.22,
      '91-120': 0.45,
      '120+': 0.68,
    },
    lowRiskPayScoreMax: 30,
    lowRiskMultiplier: 0.5,
    highRiskPayScoreMin: 80,
    highRiskMultiplier: 1.5,
    lgd: 0.85,
  },
});

export const AR_AGING_BUCKETS = Object.freeze(['Current', '1-30', '31-60', '61-90', '91-120', '120+']);

export function receivablesAgingBucket(daysOverdue) {
  const days = Math.max(0, Number(daysOverdue || 0));
  if (days <= 0) return 'Current';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  if (days <= 120) return '91-120';
  return '120+';
}

export function referencePayScore(avgDaysLate, historyCount = 0) {
  const avg = Number(avgDaysLate || 0);
  const count = Number(historyCount || 0);
  if (count <= 0) {
    return {
      score: 25,
      label: 'Cold start',
      riskTier: 'LOW',
      provisional: true,
      confidence: 25,
      basis: 'No payment history — neutral cold-start score',
    };
  }

  let band;
  if (avg < 0) band = RECEIVABLES_CONFIG.payScore.bands[0];
  else if (avg <= 5) band = RECEIVABLES_CONFIG.payScore.bands[1];
  else if (avg <= 15) band = RECEIVABLES_CONFIG.payScore.bands[2];
  else if (avg <= 30) band = RECEIVABLES_CONFIG.payScore.bands[3];
  else band = RECEIVABLES_CONFIG.payScore.bands[4];

  // Confidence grows with payment observations but is capped because this is not
  // the final seven-component Intelligence Specification model.
  const confidence = clamp(45 + count * 8, 45, 77);
  return {
    score: band.score,
    label: band.label,
    riskTier: band.riskTier,
    provisional: true,
    confidence,
    basis: `Average payment lateness ${round1(avg)} days across ${count} payment${count === 1 ? '' : 's'}`,
  };
}

function median(values) {
  const nums = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!nums.length) return 0;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function emptyBuckets() {
  return Object.fromEntries(AR_AGING_BUCKETS.map(bucket => [bucket, 0]));
}

function paymentHistoryRisk(avgDaysLate) {
  return clamp((Math.max(0, Number(avgDaysLate || 0)) / 30) * 15, 0, 15);
}

function priorityForCustomer(customer, invoiceMedian) {
  // The design specifies the component names and bucket thresholds, but not all
  // calibrated component weights. These transparent normalisations are therefore
  // explicitly provisional and used only to rank the queue, not to redefine COL rules.
  const ageRisk = clamp((Number(customer.maxDaysOverdue || 0) / 90) * 30, 0, 30);
  const amountRisk = invoiceMedian > 0 ? clamp((Number(customer.balance || 0) / invoiceMedian) * 7.5, 0, 15) : 0;
  const customerRisk = clamp(Number(customer.payScore || 0) * 0.35, 0, 35);
  const historyRisk = paymentHistoryRisk(customer.avgDaysLate);
  const disputeRisk = customer.hasDispute ? 5 : 0;
  const priorityScore = Math.round(clamp(ageRisk + amountRisk + customerRisk + historyRisk + disputeRisk, 0, 100));

  const p = RECEIVABLES_CONFIG.collectionPriority;
  let priorityTier = 'P4';
  let action = 'Automated reminder';
  if (priorityScore > p.p1Min) {
    priorityTier = 'P1';
    action = 'Owner-level call today';
  } else if (priorityScore > p.p2Min) {
    priorityTier = 'P2';
    action = 'Formal outreach within 72 hours';
  } else if (priorityScore > p.p3Min) {
    priorityTier = 'P3';
    action = 'Standard reminder cycle';
  }

  return {
    priorityScore,
    priorityTier,
    action,
    priorityFactors: [
      { name: 'Age risk', value: round1(ageRisk) },
      { name: 'Amount risk', value: round1(amountRisk) },
      { name: 'PayScore risk', value: round1(customerRisk) },
      { name: 'Payment history risk', value: round1(historyRisk) },
      { name: 'Dispute risk', value: round1(disputeRisk) },
    ],
    priorityModelProvisional: true,
  };
}

function eclForInvoice(invoice, payScore, lgd) {
  const bucket = receivablesAgingBucket(invoice.daysOverdue);
  const basePD = Number(RECEIVABLES_CONFIG.ecl.pd[bucket] || 0);
  let multiplier = 1;
  if (Number(payScore) < RECEIVABLES_CONFIG.ecl.lowRiskPayScoreMax) multiplier = RECEIVABLES_CONFIG.ecl.lowRiskMultiplier;
  else if (Number(payScore) > RECEIVABLES_CONFIG.ecl.highRiskPayScoreMin) multiplier = RECEIVABLES_CONFIG.ecl.highRiskMultiplier;
  const adjustedPD = clamp(basePD * multiplier, 0, 1);
  const ecl = Number(invoice.balanceDue || 0) * adjustedPD * lgd;
  return {
    ...invoice,
    agingBucket: bucket,
    basePD,
    payScoreMultiplier: multiplier,
    adjustedPD,
    lgd,
    ecl: round2(ecl),
  };
}

export function computeReceivablesModule(customers, invoices, thresholds = {}) {
  const openInvoices = invoices.filter(inv => Number(inv.balanceDue || 0) > 0);
  const totalARExact = openInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue || 0), 0);
  const invoiceMedian = median(openInvoices.map(inv => Number(inv.balanceDue || 0)));
  const lgd = Number(thresholds.lgd_default ?? RECEIVABLES_CONFIG.ecl.lgd);

  const customerScoreMap = new Map();
  const customerRows = customers.map(customer => {
    const pay = customer.riskScoreOverride != null
      ? {
          score: clamp(customer.riskScoreOverride, 0, 100),
          label: 'Workspace override',
          riskTier: customer.riskScoreOverride > 80 ? 'CRITICAL' : customer.riskScoreOverride >= 60 ? 'HIGH' : customer.riskScoreOverride >= 30 ? 'MEDIUM' : 'LOW',
          provisional: false,
          confidence: 95,
          basis: 'Workspace risk score override',
        }
      : referencePayScore(customer.avgDaysLate, customer.paymentHistoryCount);

    const open = openInvoices.filter(inv => inv.customerId === customer.id);
    const buckets = emptyBuckets();
    open.forEach(inv => { buckets[receivablesAgingBucket(inv.daysOverdue)] += Number(inv.balanceDue || 0); });
    const utilization = Number(customer.creditLimit || 0) > 0 ? Number(customer.balance || 0) / Number(customer.creditLimit) : null;
    const row = {
      ...customer,
      payScore: pay.score,
      riskScore: pay.score,
      payScoreLabel: pay.label,
      payScoreRiskTier: pay.riskTier,
      payScoreConfidence: pay.confidence,
      payScoreProvisional: pay.provisional,
      payScoreBasis: pay.basis,
      agingBuckets: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, money(v)])),
      openInvoiceCount: open.length,
      creditUtilization: utilization == null ? null : round1(utilization * 100),
    };
    customerScoreMap.set(customer.id, row);
    return row;
  });

  const eclInvoices = openInvoices.map(inv => {
    const customer = customerScoreMap.get(inv.customerId);
    return eclForInvoice(inv, customer?.payScore ?? 25, lgd);
  });

  const eclByCustomer = new Map();
  eclInvoices.forEach(inv => eclByCustomer.set(inv.customerId, (eclByCustomer.get(inv.customerId) || 0) + inv.ecl));

  const customersWithECL = customerRows.map(customer => {
    const creditLimit = Number(customer.creditLimit || 0);
    const avgMonthly = Number(customer.avgMonthly || 0);
    const maxMonthly = Number(customer.maxMonthly || 0);
    const riskAdj = customer.payScore < 30 ? 1.2 : customer.payScore > 80 ? 0.4 : customer.payScore > 60 ? 0.7 : 1;
    const avgBased = avgMonthly > 0 ? avgMonthly * 2.5 : creditLimit;
    const maxBased = maxMonthly > 0 ? maxMonthly * 1.3 : creditLimit;
    const baseLimit = Math.min(avgBased || creditLimit, maxBased || creditLimit);
    const recommendedLimit = Math.max(0, Math.round((baseLimit * riskAdj) / 1000) * 1000);
    const priority = priorityForCustomer(customer, invoiceMedian);
    return {
      ...customer,
      ecl: round2(eclByCustomer.get(customer.id) || 0),
      recommendedLimit,
      isCreditBreached: customer.creditUtilization != null && customer.creditUtilization > 100,
      ...priority,
    };
  });

  const customerMap = new Map(customersWithECL.map(c => [c.id, c]));
  const detailedInvoices = eclInvoices.map(inv => ({
    ...inv,
    payScore: customerMap.get(inv.customerId)?.payScore ?? 25,
    payScoreRiskTier: customerMap.get(inv.customerId)?.payScoreRiskTier ?? 'LOW',
  }));

  const totals = emptyBuckets();
  detailedInvoices.forEach(inv => { totals[inv.agingBucket] += Number(inv.balanceDue || 0); });
  const agingTotal = Object.values(totals).reduce((sum, n) => sum + n, 0);
  const totalECL = detailedInvoices.reduce((sum, inv) => sum + Number(inv.ecl || 0), 0);

  const collectionQueue = [...customersWithECL]
    .filter(c => Number(c.balance || 0) > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore || b.pastDue - a.pastDue || b.balance - a.balance);

  const highestECLInvoice = [...detailedInvoices].sort((a, b) => b.ecl - a.ecl)[0] || null;
  const highestRiskCustomer = [...customersWithECL].sort((a, b) => b.payScore - a.payScore || b.avgDaysLate - a.avgDaysLate)[0] || null;
  const lowestRiskCustomer = [...customersWithECL].sort((a, b) => a.payScore - b.payScore || a.avgDaysLate - b.avgDaysLate)[0] || null;

  return {
    version: RECEIVABLES_MODEL_VERSION,
    totalAR: money(totalARExact),
    openInvoiceCount: openInvoices.length,
    invoiceMedian: money(invoiceMedian),
    aging: {
      buckets: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, money(v)])),
      total: money(agingTotal),
      reconciliationDelta: round2(totalARExact - agingTotal),
      reconciled: Math.abs(totalARExact - agingTotal) < 0.01,
    },
    customers: customersWithECL,
    invoices: detailedInvoices,
    collectionQueue,
    totalECL: round2(totalECL),
    collectibleAR: round2(Math.max(0, totalARExact - totalECL)),
    moneyAtRisk: money(detailedInvoices.filter(i => i.payScore >= 60 || i.daysOverdue > 60).reduce((s, i) => s + Number(i.balanceDue || 0), 0)),
    highestECLInvoice,
    highestRiskCustomer,
    lowestRiskCustomer,
    payScoreModel: {
      status: customersWithECL.some(c => c.payScoreProvisional) ? 'provisional' : 'final',
      method: 'Simplified avg-days-late bands from Calculation Visuals workbook',
      missingSpecification: 'i2C Intelligence Specification',
      sourceConflict: 'A supplied deep-dive reference demonstrates a different seven-component score than the all-customer reference workbook; the current model therefore remains explicitly provisional.',
    },
    priorityModel: {
      status: 'provisional',
      reason: 'Collection Priority Score component names and buckets are specified, but calibrated component weights are not supplied.',
    },
    eclModel: {
      status: 'design-v1',
      pdSchedule: { ...RECEIVABLES_CONFIG.ecl.pd },
      lgd,
      payScoreMultipliers: `<${RECEIVABLES_CONFIG.ecl.lowRiskPayScoreMax}: ×${RECEIVABLES_CONFIG.ecl.lowRiskMultiplier}; >${RECEIVABLES_CONFIG.ecl.highRiskPayScoreMin}: ×${RECEIVABLES_CONFIG.ecl.highRiskMultiplier}`,
    },
  };
}

function receivableAdvisory({ id, entityId = null, priority, finding, reason, risk, recommendedAction, contributors = [], confidence = 65 }) {
  return {
    id,
    entityId,
    system: 'Receivables',
    domain: 'Receivables',
    priority,
    finding,
    reason,
    risk,
    recommendedAction,
    contributors: contributors.filter(Boolean).slice(0, 5),
    confidence: clamp(confidence, 25, 95),
  };
}

export function evaluateReceivablesRules(receivables) {
  const out = [];
  const invoiceMedian = Number(receivables?.invoiceMedian || 0);
  for (const c of receivables?.customers || []) {
    const util = Number(c.creditUtilization || 0);
    const confidence = Number(c.payScoreConfidence || 55);
    if (util > 100) {
      out.push(receivableAdvisory({ id:'CRD-001', entityId:c.id, priority:'CRITICAL', finding:`${c.name} is above its credit limit at ${round1(util)}% utilization.`, reason:`Open AR is ${money(c.balance).toLocaleString()} against a ${money(c.creditLimit).toLocaleString()} limit.`, risk:'Additional orders increase unsecured exposure beyond the approved policy.', recommendedAction:'Halt new credit orders and review the limit within 24 hours.', contributors:[`Utilization ${round1(util)}%`,`Open AR $${money(c.balance).toLocaleString()}`,`Limit $${money(c.creditLimit).toLocaleString()}`,`PayScore ${c.payScore}`], confidence }));
    } else if (util >= 80) {
      out.push(receivableAdvisory({ id:'CRD-002', entityId:c.id, priority:'HIGH', finding:`${c.name} is approaching its credit limit at ${round1(util)}% utilization.`, reason:`Open AR is ${money(c.balance).toLocaleString()} against a ${money(c.creditLimit).toLocaleString()} limit.`, risk:'The next material order could push the customer into a credit-policy breach.', recommendedAction:'Warn the owner before approving the next material credit order.', contributors:[`Utilization ${round1(util)}%`,`Open AR $${money(c.balance).toLocaleString()}`,`PayScore ${c.payScore}`], confidence }));
    } else if (util >= 60 && c.payScore > 60) {
      out.push(receivableAdvisory({ id:'CRD-003', entityId:c.id, priority:'MEDIUM', finding:`${c.name} combines ${round1(util)}% credit utilization with PayScore ${c.payScore}.`, reason:'Material credit usage overlaps with elevated payment risk.', risk:'Exposure can become difficult to unwind if aging continues to deteriorate.', recommendedAction:'Review the credit limit downward before extending more terms.', contributors:[`Utilization ${round1(util)}%`,`PayScore ${c.payScore}`,`Avg late ${c.avgDaysLate} days`,`Open AR $${money(c.balance).toLocaleString()}`], confidence }));
    }
    if (Number(c.creditLimit || 0) <= 0 && Number(c.balance || 0) > invoiceMedian * 2 && invoiceMedian > 0) {
      out.push(receivableAdvisory({ id:'CRD-004', entityId:c.id, priority:'MEDIUM', finding:`${c.name} has material AR exposure but no credit limit.`, reason:`Open AR of $${money(c.balance).toLocaleString()} exceeds 2× the workspace median open invoice.`, risk:'There is no explicit credit-policy ceiling on further exposure.', recommendedAction:'Set a formal credit limit before the next material order.', contributors:[`Open AR $${money(c.balance).toLocaleString()}`,`Median invoice $${money(invoiceMedian).toLocaleString()}`], confidence }));
    }
  }

  for (const inv of receivables?.invoices || []) {
    if (Number(inv.daysOverdue || 0) > 120 && Number(inv.payScore || 0) > 70) {
      out.push(receivableAdvisory({ id:'BAD-002', entityId:inv.invoiceNo, priority:'CRITICAL', finding:`${inv.invoiceNo} is over 120 days overdue with PayScore ${inv.payScore}.`, reason:`The calculated ECL is $${money(inv.ecl).toLocaleString()} on a $${money(inv.balanceDue).toLocaleString()} balance.`, risk:'The balance has a high probability of loss and should not remain under-provisioned.', recommendedAction:'Review for full reserve minus expected recovery.', contributors:[`${inv.daysOverdue} days overdue`,`PayScore ${inv.payScore}`,`ECL $${money(inv.ecl).toLocaleString()}`,`Adjusted PD ${round1(inv.adjustedPD*100)}%`], confidence:70 }));
    } else if (Number(inv.daysOverdue || 0) > 90) {
      out.push(receivableAdvisory({ id:'BAD-001', entityId:inv.invoiceNo, priority:'HIGH', finding:`${inv.invoiceNo} is more than 90 days overdue.`, reason:`The calculated ECL is $${money(inv.ecl).toLocaleString()} on a $${money(inv.balanceDue).toLocaleString()} balance.`, risk:'Aging materially increases expected credit loss and reserve requirements.', recommendedAction:'Flag the invoice for ECL review and collection escalation.', contributors:[`${inv.daysOverdue} days overdue`,`ECL $${money(inv.ecl).toLocaleString()}`,`Adjusted PD ${round1(inv.adjustedPD*100)}%`], confidence:70 }));
    }
  }

  const rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  return out.sort((a,b)=>(rank[b.priority]||0)-(rank[a.priority]||0)||b.confidence-a.confidence);
}
