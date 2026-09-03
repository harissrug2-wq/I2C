import phase1Config from '../config/phase1RuleConfig.json' with { type: 'json' };
import { computeReceivablesModule } from '../domain/receivables.js';
import { computeCashForecastModule } from '../domain/cashForecast.js';
import { evaluatePayablesRules } from '../domain/payables.js';

/**
 * i2cashflow Phase 1 decision engine.
 * Source of truth: DECISION SYSTEMS DESIGN (August 2026), Phase 1 scope.
 *
 * Important: the Decision Systems document does not define the full PayScore
 * component transformations. It explicitly delegates them to the separate
 * "i2C Intelligence Specification". This engine therefore exposes PayScore
 * as provisional unless a risk_score_override is supplied by the workspace.
 */

export const PHASE1_CONFIG = phase1Config;
export const PHASE1_RULE_IDS = Object.freeze(Object.keys(phase1Config.rules));

export const DEFAULT_THRESHOLDS = {
  // Global/calculation parameters retained for workspace settings compatibility.
  cost_of_capital: 0.12,
  target_ccc: 45,
  operating_cash_floor: 250000,
  service_level_z: 1.65,
  service_level_z_a: 2.05,
  service_level_z_b: 1.65,
  service_level_z_c: 1.28,
  holding_cost_percent: 0.20,
  ordering_cost_per_order: 150,
  lgd_default: 0.85,
  stagnant_days: phase1Config.rules['INV-011'].stagnantDays,
  cost_per_chase_hour: 45,
  forecast_confidence_factor: 0.15,

  // Cross-domain calibrated defaults. These remain workspace-overridable.
  xd_inventory_hostage_multiplier: 1.5,
  xd_risky_sku_customer_share: 0.60,
  xd_writeoff_inventory_min: 2000,

  // Phase 1 configurable rule thresholds.
  wcm_baseline_multiplier: phase1Config.rules['WCM-001'].baselineMultiplier,
  wcm_mom_deterioration_pct: phase1Config.rules['WCM-004'].momDeteriorationPct,
  current_ratio_min: phase1Config.rules['WCM-010'].currentRatioMin,
  quick_ratio_min: phase1Config.rules['WCM-011'].quickRatioMin,
  wc_revenue_baseline_multiplier: phase1Config.rules['WCM-013'].baselineMultiplier,
  runway_critical_days: phase1Config.rules['CASH-010'].runwayDaysMax,
  runway_high_days: phase1Config.rules['CASH-011'].runwayDaysMax,
  runway_medium_days: phase1Config.rules['CASH-012'].runwayDaysMax,
  coverage_multiplier: phase1Config.rules['CASH-020'].coverageMultiplier,
  payscore_p1: phase1Config.rules['COL-001'].payScoreMin,
  payscore_p2_min: phase1Config.rules['COL-002'].payScoreMin,
  payscore_p2_max: phase1Config.rules['COL-002'].payScoreMax,
  payscore_p3_max: phase1Config.rules['COL-003'].payScoreMax,
  vendor_single_share: phase1Config.rules['VDC-001'].singleVendorShare,
  vendor_top3_share: phase1Config.rules['VDC-002'].top3VendorShare,
  customer_top1_share: phase1Config.rules['CDC-001'].top1CustomerShare,
  customer_top3_share: phase1Config.rules['CDC-002'].top3CustomerShare,
};

const DAY_MS = 86400000;
const money = n => Math.round(Number(n || 0));
const round1 = n => Math.round(Number(n || 0) * 10) / 10;
const round2 = n => Math.round(Number(n || 0) * 100) / 100;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function parseDate(value) {
  return value ? new Date(`${value}T00:00:00Z`) : null;
}

function addDays(value, days) {
  const d = parseDate(value);
  if (!d) return value;
  d.setUTCDate(d.getUTCDate() + Math.round(Number(days || 0)));
  return d.toISOString().slice(0, 10);
}

function diffDays(a, b) {
  const start = parseDate(a), end = parseDate(b);
  if (!start || !end) return 0;
  return Math.round((end - start) / DAY_MS);
}

function median(values) {
  const nums = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!nums.length) return 0;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function confidenceFromAvailability(available, total, maturityBonus = 0) {
  if (!total) return 25;
  return clamp(Math.round(25 + (70 * available / total) + maturityBonus), 25, 95);
}

function advisory({ id, system, domain, priority, finding, reason, risk, recommendedAction, contributors = [], confidence = 25, entityId = null }) {
  return {
    id, system, domain, priority, entityId,
    finding, reason, risk, recommendedAction,
    confidence: clamp(Math.round(confidence), 25, 95),
    contributors: contributors.filter(Boolean).slice(0, 5),
  };
}

function sortAdvisories(items) {
  const rank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  return [...items].sort((a, b) => (rank[b.priority] || 0) - (rank[a.priority] || 0) || b.confidence - a.confidence);
}

export function computeSystem1(cash, invoiceList, productList, billList, metrics, thresholds = DEFAULT_THRESHOLDS) {
  const openInvoices = invoiceList.filter(i => Number(i.balanceDue) > 0);
  const openBills = billList.filter(b => Number(b.balanceDue) > 0);
  const totalAR = openInvoices.reduce((sum, inv) => sum + Number(inv.balanceDue || 0), 0);
  const totalAP = openBills.reduce((sum, b) => sum + Number(b.balanceDue || 0), 0);
  const inventoryValue = productList.reduce((sum, p) => sum + Number(p.onHand || 0) * Number(p.wac || 0), 0);

  // Design default period is 90 days. If true 90-day data is unavailable, the
  // adapter annualises the available 30-day company metrics and marks the source.
  const periodDays = Number(metrics.periodDays || 90);
  const revenuePeriod = Number(metrics.revenuePeriod ?? (Number(metrics.revenue30d || 0) * (periodDays / 30)));
  const cogsPeriod = Number(metrics.cogsPeriod ?? (Number(metrics.cogs30d || 0) * (periodDays / 30)));
  const purchasesPeriod = Number(metrics.purchasesPeriod || 0);
  const otherCurrentLiabilities = Number(metrics.otherCurrentLiabilities || 0);

  const dio = cogsPeriod > 0 ? (inventoryValue / cogsPeriod) * periodDays : 0;
  const dso = revenuePeriod > 0 ? (totalAR / revenuePeriod) * periodDays : 0;
  const dpo = purchasesPeriod > 0 ? (totalAP / purchasesPeriod) * periodDays : 0;
  const ccc = dio + dso - dpo;

  const currentAssets = Number(cash || 0) + totalAR + inventoryValue;
  const currentLiabilities = totalAP + otherCurrentLiabilities;
  const workingCapital = currentAssets - currentLiabilities;
  const annualizedRevenue = revenuePeriod > 0 ? revenuePeriod * (365 / periodDays) : 0;
  const wcRevenueRatio = annualizedRevenue > 0 ? workingCapital / annualizedRevenue : 0;
  const wcTurnover = workingCapital > 0 ? annualizedRevenue / workingCapital : 0;
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : (currentAssets > 0 ? Infinity : 0);
  const quickAssets = Number(cash || 0) + totalAR;
  const quickRatio = currentLiabilities > 0 ? quickAssets / currentLiabilities : (quickAssets > 0 ? Infinity : 0);
  const cashFreed = ccc > Number(thresholds.target_ccc || 0) && annualizedRevenue > 0
    ? ((ccc - Number(thresholds.target_ccc || 0)) / 365) * annualizedRevenue
    : 0;

  const history = Array.isArray(metrics.wcmHistory) ? metrics.wcmHistory : [];
  const cccHistory = history.map(x => Number(x.ccc)).filter(Number.isFinite);
  const wcRatioHistory = history.map(x => Number(x.wcRevenueRatio)).filter(Number.isFinite);
  const baselineReady = cccHistory.length >= 6;

  return {
    totalAR: money(totalAR), totalAP: money(totalAP), openInvoiceCount: openInvoices.length, openBillCount: openBills.length,
    inventoryValue: money(inventoryValue), dio: round1(dio), dso: round1(dso), dpo: round1(dpo), ccc: round1(ccc),
    currentAssets: money(currentAssets), currentLiabilities: money(currentLiabilities), otherCurrentLiabilities: money(otherCurrentLiabilities),
    workingCapital: money(workingCapital), annualizedRevenue: money(annualizedRevenue), wcRevenueRatio: round2(wcRevenueRatio),
    wcTurnover: round1(wcTurnover), currentRatio: Number.isFinite(currentRatio) ? round2(currentRatio) : 99,
    quickRatio: Number.isFinite(quickRatio) ? round2(quickRatio) : 99, cashFreed: money(cashFreed),
    hasLiquidityData: currentAssets > 0 || currentLiabilities > 0,
    periodDays, dataSource: metrics.periodSource || 'workspace',
    history, cccHistory, wcRatioHistory, baselineReady,
    custBaselineCCC: baselineReady ? round1(cccHistory.reduce((s, n) => s + n, 0) / cccHistory.length) : null,
    custBaselineWcRevenueRatio: wcRatioHistory.length >= 6 ? round2(wcRatioHistory.reduce((s, n) => s + n, 0) / wcRatioHistory.length) : null,
  };
}

export function computeSystem2(productList, thresholds = DEFAULT_THRESHOLDS) {
  const products = Array.isArray(productList) ? productList : [];
  const stockProducts = products.filter(p => p.category !== 'Non-stock');

  // Basic ABC for the current operating scope: rank by trailing annual revenue,
  // then split by SKU rank (top ~20%, next ~30%, remaining ~50%). If annual
  // revenue is unavailable, classification remains honest rather than invented.
  const ranked = [...stockProducts]
    .map(p => ({ ...p, annualRevenue: Number(p.annualSales || 0) * Number(p.sellPrice || 0) }))
    .sort((a, b) => b.annualRevenue - a.annualRevenue);
  const hasAbcData = ranked.some(p => p.annualRevenue > 0);
  const abcMap = {};
  ranked.forEach((p, index) => {
    if (!hasAbcData) {
      abcMap[p.sku] = 'Unclassified';
      return;
    }
    const rankShare = index / Math.max(1, ranked.length);
    abcMap[p.sku] = rankShare < 0.20 ? 'A' : rankShare < 0.50 ? 'B' : 'C';
  });

  const inventoryValues = stockProducts.map(p => Number(p.onHand || 0) * Number(p.wac || 0));
  const wkspMedianInventoryValue = median(inventoryValues);
  const stagnantDays = Number(thresholds.stagnant_days ?? phase1Config.rules['INV-011'].stagnantDays);
  const classServiceZ = {
    A: Number(thresholds.service_level_z_a ?? 2.05),
    B: Number(thresholds.service_level_z_b ?? 1.65),
    C: Number(thresholds.service_level_z_c ?? 1.28),
    Unclassified: Number(thresholds.service_level_z ?? 1.65),
  };
  const serviceLevelLabel = { A:'98%', B:'95%', C:'90%', Unclassified:'95%' };

  const processedSKUs = products.map(p => {
    const onHand = Number(p.onHand || 0);
    const wac = Number(p.wac || 0);
    const sales60d = Number(p.sales60d || 0);
    const annualSales = Number(p.annualSales || 0);
    const leadTimeDays = Number(p.leadTimeDays || 0);
    const leadTimeStdDev = Number(p.leadTimeStdDev || 0);
    const abcClass = p.category === 'Non-stock' ? 'N/A' : (abcMap[p.sku] || 'Unclassified');
    const velocityDaily = sales60d / 60;
    const velocityWeekly = velocityDaily * 7;
    const velocityMonthly = velocityDaily * 30;
    const daysOfStockRaw = velocityDaily > 0 ? onHand / velocityDaily : (onHand > 0 ? Infinity : 0);
    const z = classServiceZ[abcClass] ?? Number(thresholds.service_level_z || 1.65);
    const safetyStock = velocityDaily > 0
      ? velocityDaily * leadTimeStdDev * z
      : Number(p.manualSafetyStock || 0);
    const reorderPoint = velocityDaily > 0 && leadTimeDays > 0
      ? velocityDaily * leadTimeDays + safetyStock
      : Number(p.manualReorderPoint || 0);
    const averageOnHandAvailable = Number.isFinite(Number(p.averageOnHand)) && Number(p.averageOnHand) > 0;
    const averageOnHand = averageOnHandAvailable ? Number(p.averageOnHand) : onHand;
    const turnoverAnnual = averageOnHand > 0 ? annualSales / averageOnHand : 0;
    const inventoryValue = onHand * wac;
    const annualRevenue = annualSales * Number(p.sellPrice || 0);

    let stockoutRisk = 'NONE';
    if (velocityDaily > 0 && leadTimeDays > 0) {
      if (daysOfStockRaw < leadTimeDays) stockoutRisk = 'HIGH';
      else if (daysOfStockRaw < leadTimeDays * 1.5) stockoutRisk = 'MEDIUM';
      else if (daysOfStockRaw < leadTimeDays * 2) stockoutRisk = 'LOW';
    }

    const minimumReorderUnits = Math.max(0, Math.ceil(reorderPoint - onHand));
    const stagnant = Number(p.daysQuiet || 0) >= stagnantDays && onHand > 0;
    const overstocked = annualSales > 0 && onHand > annualSales;
    const slowMoving = turnoverAnnual < 2 && abcClass === 'C' && onHand > 0;

    let status = 'Healthy';
    if (p.category === 'Non-stock') status = 'Non-stock';
    else if (stagnant) status = 'Dead Stock';
    else if (overstocked) status = 'Overstocked';
    else if (slowMoving) status = 'Slow Moving';
    else if (stockoutRisk !== 'NONE' || (abcClass === 'A' && onHand < reorderPoint)) status = 'Reorder';

    const completenessFlags = [
      Number.isFinite(onHand),
      wac > 0,
      sales60d >= 0,
      annualSales >= 0,
      leadTimeDays > 0,
      leadTimeStdDev >= 0,
    ];

    return {
      ...p,
      onHand,
      wac,
      sales60d,
      annualSales,
      leadTimeDays,
      leadTimeStdDev,
      velocityDaily: round2(velocityDaily),
      velocityWeekly: round2(velocityWeekly),
      velocityMonthly: round2(velocityMonthly),
      daysOfStock: Number.isFinite(daysOfStockRaw) ? round1(daysOfStockRaw) : 9999,
      daysOfStockInfinite: !Number.isFinite(daysOfStockRaw),
      safetyStock: Math.ceil(safetyStock),
      reorderPoint: Math.ceil(reorderPoint),
      minimumReorderUnits,
      turnoverAnnual: round2(turnoverAnnual),
      averageOnHand: round2(averageOnHand),
      turnoverUsesCurrentOnHandProxy: !averageOnHandAvailable,
      abcClass,
      annualRevenue: money(annualRevenue),
      serviceLevelTarget: serviceLevelLabel[abcClass] || '95%',
      serviceLevelZ: z,
      status,
      stockoutRisk,
      stockoutDays: Number.isFinite(daysOfStockRaw) ? Math.max(0, Math.round(daysOfStockRaw)) : 9999,
      inventoryValue: money(inventoryValue),
      wkspMedianInventoryValue: money(wkspMedianInventoryValue),
      dataConfidence: confidenceFromAvailability(completenessFlags.filter(Boolean).length, completenessFlags.length, averageOnHandAvailable ? 5 : 0),
    };
  });

  const inventorySKUs = processedSKUs.filter(p => p.status !== 'Non-stock');
  const totalValue = inventorySKUs.reduce((s, p) => s + p.inventoryValue, 0);
  const deadStockValue = inventorySKUs.filter(p => p.status === 'Dead Stock').reduce((s, p) => s + p.inventoryValue, 0);
  const overstockedValue = inventorySKUs.filter(p => p.status === 'Overstocked').reduce((s, p) => s + p.inventoryValue, 0);
  const slowMovingValue = inventorySKUs.filter(p => p.status === 'Slow Moving').reduce((s, p) => s + p.inventoryValue, 0);
  const healthyValue = Math.max(0, totalValue - deadStockValue - overstockedValue - slowMovingValue);
  const riskRank = { HIGH:3, MEDIUM:2, LOW:1, NONE:0 };
  const classRank = { A:3, B:2, C:1, Unclassified:0 };
  const reorderCandidates = inventorySKUs
    .filter(p => p.stockoutRisk !== 'NONE' || (p.abcClass === 'A' && p.onHand < p.reorderPoint))
    .sort((a,b) => (riskRank[b.stockoutRisk]-riskRank[a.stockoutRisk]) || (classRank[b.abcClass]-classRank[a.abcClass]) || (a.daysOfStock-b.daysOfStock));
  const deadStockCandidates = inventorySKUs
    .filter(p => p.status === 'Dead Stock' || p.turnoverAnnual < 1)
    .sort((a,b) => b.inventoryValue-a.inventoryValue);
  const slowMovingCandidates = inventorySKUs
    .filter(p => p.status === 'Slow Moving')
    .sort((a,b) => b.inventoryValue-a.inventoryValue);

  const abcSummary = ['A','B','C','Unclassified'].map(abcClass => {
    const rows = inventorySKUs.filter(p => p.abcClass === abcClass);
    return {
      abcClass,
      skuCount: rows.length,
      inventoryValue: rows.reduce((s,p)=>s+p.inventoryValue,0),
      annualRevenue: rows.reduce((s,p)=>s+p.annualRevenue,0),
    };
  }).filter(row => row.skuCount > 0);

  return {
    skus: processedSKUs,
    stockSkuCount: inventorySKUs.length,
    totalUnitsOnHand: inventorySKUs.reduce((sum, p) => sum + Number(p.onHand || 0), 0),
    totalValue,
    healthyValue,
    overstockedValue,
    deadStockValue,
    slowMovingValue,
    healthyPercent: Math.round((healthyValue / (totalValue || 1)) * 100),
    overstockedPercent: Math.round((overstockedValue / (totalValue || 1)) * 100),
    deadStockPercent: Math.round((deadStockValue / (totalValue || 1)) * 100),
    slowMovingPercent: Math.round((slowMovingValue / (totalValue || 1)) * 100),
    wkspMedianInventoryValue: money(wkspMedianInventoryValue),
    reorderCandidates,
    deadStockCandidates,
    slowMovingCandidates,
    reorderAlertCount: reorderCandidates.length,
    abcSummary,
    abcReady: hasAbcData,
  };
}

export function computeSystem3(cashBalance, invoiceList, billList, metrics, asOfDate, thresholds = DEFAULT_THRESHOLDS) {
  return computeCashForecastModule(cashBalance, invoiceList, billList, metrics, asOfDate, thresholds, 30);
}

function provisionalPayScore(customer, customerShare, medianInvoice) {
  if (customer.riskScoreOverride != null) {
    return {
      score: clamp(Number(customer.riskScoreOverride), 0, 100),
      provisional: false,
      components: [{ name: 'Workspace risk override', value: Number(customer.riskScoreOverride), weight: 1 }],
      availableComponents: 7,
    };
  }
  const terms = Math.max(1, Number(customer.termsDays || 30));
  const utilization = Number(customer.creditLimit || 0) > 0 ? Number(customer.balance || 0) / Number(customer.creditLimit) : 0;
  const components = [
    { name: 'Aging', value: clamp((Number(customer.maxDaysOverdue || 0) / 90) * 100, 0, 100), weight: 0.25, available: customer.maxDaysOverdue != null },
    { name: 'Payment behaviour', value: clamp((Math.max(0, Number(customer.avgDaysLate || 0)) / terms) * 100, 0, 100), weight: 0.20, available: customer.paymentHistoryCount > 0 },
    { name: 'Credit exposure', value: clamp(utilization * 100, 0, 100), weight: 0.10, available: Number(customer.creditLimit || 0) > 0 },
    { name: 'Concentration', value: clamp(customerShare * 100, 0, 100), weight: 0.15, available: Number.isFinite(customerShare) },
    { name: 'Dispute', value: customer.hasDispute ? 100 : 0, weight: 0.10, available: customer.hasDispute != null },
    { name: 'Trend', value: 0, weight: 0.10, available: false },
    { name: 'Other / inventory exposure', value: medianInvoice > 0 ? clamp((Number(customer.inventoryDeliveredValue || 0) / medianInvoice) * 50, 0, 100) : 0, weight: 0.10, available: medianInvoice > 0 },
  ];
  const availableWeight = components.filter(c => c.available).reduce((s, c) => s + c.weight, 0);
  const weighted = components.filter(c => c.available).reduce((s, c) => s + c.value * c.weight, 0);
  return {
    score: availableWeight > 0 ? round1(weighted / availableWeight) : 25,
    provisional: true,
    components,
    availableComponents: components.filter(c => c.available).length,
  };
}

export function computeSystem4(customersList, invoiceList, billList, vendorList, thresholds = DEFAULT_THRESHOLDS) {
  const receivables = computeReceivablesModule(customersList, invoiceList, thresholds);
  const openBills = billList.filter(b => Number(b.balanceDue) > 0);

  // Preserve legacy System 4 compatibility while Module 2 owns the AR side.
  // Payables-specific intelligence is deliberately left for Module 3.
  const creditManagement = receivables.customers.map(c => ({
    ...c,
    utilization: c.creditUtilization == null ? 0 : Math.round(c.creditUtilization),
    isBreached: c.isCreditBreached,
  }));

  // Existing AP preview retained so old pages do not break. It is not part of
  // Module 2 completion and no early-pay rule is added to the Module 2 feed.
  const discountOpportunities = openBills.filter(b => Number(b.discountAvailable || 0) > 0).map(b => {
    const discountAPR = Number(b.discountPercent || 0) > 0 && Number(b.netDays) > Number(b.discountDays)
      ? (Number(b.discountPercent) / (100 - Number(b.discountPercent))) * (365 / (Number(b.netDays) - Number(b.discountDays)))
      : 0;
    return { ...b, discountAPRPercent: round1(discountAPR * 100), savings: money(b.discountAvailable), isProfitableToTake: discountAPR > Number(thresholds.cost_of_capital || 0.12) };
  });

  return {
    ...receivables,
    // Compatibility aliases used by existing UI/rules.
    eclInvoices: receivables.invoices.map(i => ({ ...i, pd: round1(i.adjustedPD * 100), ecl: money(i.ecl) })),
    collectionQueue: receivables.collectionQueue,
    creditManagement,
    discountOpportunities,
    totalDiscountSavings: money(discountOpportunities.reduce((s, d) => s + d.savings, 0)),
    bills: openBills,
    vendors: vendorList,
    arGrowth: null,
    revenueGrowth: null,
    receivables,
  };
}

export function computeSystem5(productList, customersList, vendorList, thresholds = DEFAULT_THRESHOLDS) {
  const customerRevenue = customersList.map(c => ({ ...c, trailingRevenue: Number(c.revenueTrailing12m ?? Number(c.avgMonthly || 0) * 12) }));
  const totalRev = customerRevenue.reduce((s, c) => s + c.trailingRevenue, 0) || 1;
  const sortedCust = [...customerRevenue].sort((a, b) => b.trailingRevenue - a.trailingRevenue);
  const top1CustShareRaw = (sortedCust[0]?.trailingRevenue || 0) / totalRev;
  const top3CustShareRaw = sortedCust.slice(0, 3).reduce((s, c) => s + c.trailingRevenue, 0) / totalRev;
  const top10CustShareRaw = sortedCust.slice(0, 10).reduce((s, c) => s + c.trailingRevenue, 0) / totalRev;

  const sortedVendors = [...vendorList].sort((a, b) => Number(b.purchaseShare ?? b.cogsShare ?? 0) - Number(a.purchaseShare ?? a.cogsShare ?? 0));
  const top1VendorShareRaw = Number(sortedVendors[0]?.purchaseShare ?? sortedVendors[0]?.cogsShare ?? 0);
  const top3VendorShareRaw = sortedVendors.slice(0, 3).reduce((s, v) => s + Number(v.purchaseShare ?? v.cogsShare ?? 0), 0);

  // Phase 2 preview retained so existing Margins page does not break. No Phase 1
  // advisory is generated from these values.
  const avgCustPayDays = customersList.reduce((s, c) => s + Number(c.avgDaysToPay || 0), 0) / (customersList.length || 1);
  const trueMarginSkus = productList.filter(p => p.category !== 'Non-stock').map(p => {
    const sellPrice = Number(p.sellPrice || 0), wac = Number(p.wac || 0);
    const grossMarginPercent = sellPrice > 0 ? (sellPrice - wac) / sellPrice : 0;
    const cashCarryCost = (sellPrice * avgCustPayDays / 365) * Number(thresholds.cost_of_capital || 0.12);
    const trueMarginDollar = (sellPrice - wac) - cashCarryCost;
    const trueMarginPercent = sellPrice > 0 ? trueMarginDollar / sellPrice : 0;
    return { ...p, inventoryValue: money(Number(p.onHand || 0) * wac), grossMarginPercent: round1(grossMarginPercent * 100), cashCarryCost: round2(cashCarryCost), trueMarginPercent: round1(trueMarginPercent * 100), marginErosionPts: round1((grossMarginPercent - trueMarginPercent) * 100) };
  });

  return {
    trueMarginSkus,
    top1CustShare: Math.round(top1CustShareRaw * 100), top3CustShare: Math.round(top3CustShareRaw * 100), top10CustShare: Math.round(top10CustShareRaw * 100),
    top1CustShareRaw, top3CustShareRaw, top10CustShareRaw,
    top1VendorShare: Math.round(top1VendorShareRaw * 100), top3VendorShare: Math.round(top3VendorShareRaw * 100),
    top1VendorShareRaw, top3VendorShareRaw,
    topCustomer: sortedCust[0] || null, topVendors: sortedVendors.slice(0, 3),
    isVendorConcentrated: top1VendorShareRaw > Number(thresholds.vendor_single_share ?? 0.50),
    isCustomerConcentrated: top3CustShareRaw > Number(thresholds.customer_top3_share ?? 0.60),
    customerConcentrationYoYIncrease: null,
  };
}

export function evaluateRules(sys1, sys2, sys3, sys4, sys5, thresholds = DEFAULT_THRESHOLDS) {
  const out = [];
  const config = phase1Config.rules;

  // System 1 — Phase 1 excludes peer rules WCM-002/020/021.
  if (sys1.baselineReady && sys1.cccHistory.length >= 3) {
    const recent = [...sys1.cccHistory.slice(-2), sys1.ccc];
    const threshold = Number(sys1.custBaselineCCC) * Number(thresholds.wcm_baseline_multiplier ?? config['WCM-001'].baselineMultiplier);
    if (recent.every(v => v > threshold)) out.push(advisory({ id:'WCM-001', system:'Overall WCM', domain:'WCM', priority:'HIGH', finding:`CCC has remained above the customer baseline threshold for ${recent.length} consecutive periods.`, reason:`Current CCC is ${sys1.ccc} days versus baseline ${sys1.custBaselineCCC} days.`, risk:'Working capital efficiency is deteriorating against the business’s own history.', recommendedAction:'Investigate DIO, DSO and DPO and focus on the component driving the deterioration.', contributors:[`CCC ${sys1.ccc} days`,`Baseline ${sys1.custBaselineCCC} days`,`DIO ${sys1.dio}`,`DSO ${sys1.dso}`,`DPO ${sys1.dpo}`], confidence:confidenceFromAvailability(sys1.cccHistory.length, 12, 10) }));
    if (recent[0] > recent[1] && recent[1] > recent[2]) out.push(advisory({ id:'WCM-003', system:'Overall WCM', domain:'WCM', priority:'LOW', finding:'CCC improved for 3 consecutive periods.', reason:`CCC moved ${recent.map(round1).join(' → ')} days.`, risk:'No immediate deterioration signal; gains can reverse if the underlying drivers are not sustained.', recommendedAction:'Continue current initiatives and track the next monthly snapshot.', contributors:recent.map(v=>`CCC ${round1(v)} days`), confidence:confidenceFromAvailability(sys1.cccHistory.length, 12, 10) }));
    const prior = Number(sys1.cccHistory.at(-1));
    if (prior > 0 && (sys1.ccc - prior) / prior > Number(thresholds.wcm_mom_deterioration_pct ?? config['WCM-004'].momDeteriorationPct)) out.push(advisory({ id:'WCM-004', system:'Overall WCM', domain:'WCM', priority:'CRITICAL', finding:'CCC deteriorated materially month over month.', reason:`CCC moved from ${round1(prior)} to ${sys1.ccc} days.`, risk:'A sudden working-capital deterioration can create a near-term liquidity shock.', recommendedAction:'Run an immediate root-cause review across inventory, collections and supplier terms.', contributors:[`Prior CCC ${round1(prior)}`,`Current CCC ${sys1.ccc}`,`Change ${round1((sys1.ccc-prior)/prior*100)}%`], confidence:confidenceFromAvailability(sys1.cccHistory.length, 12, 10) }));
  }
  if (sys1.hasLiquidityData !== false && sys1.currentRatio < Number(thresholds.current_ratio_min ?? config['WCM-010'].currentRatioMin)) out.push(advisory({ id:'WCM-010', system:'Overall WCM', domain:'Liquidity', priority:'HIGH', finding:`Current ratio is ${sys1.currentRatio}.`, reason:'Current assets are low relative to current liabilities.', risk:'Short-term obligations may exceed the business’s ability to pay.', recommendedAction:'Protect cash, accelerate collections and review near-term liabilities.', contributors:[`Current assets $${sys1.currentAssets.toLocaleString()}`,`Current liabilities $${sys1.currentLiabilities.toLocaleString()}`,`Current ratio ${sys1.currentRatio}`], confidence:88 }));
  if (sys1.hasLiquidityData !== false && sys1.quickRatio < Number(thresholds.quick_ratio_min ?? config['WCM-011'].quickRatioMin)) out.push(advisory({ id:'WCM-011', system:'Overall WCM', domain:'Liquidity', priority:'HIGH', finding:`Quick ratio is ${sys1.quickRatio}.`, reason:'Cash plus receivables are low relative to current liabilities.', risk:'Liquidity may be insufficient if inventory cannot be converted quickly.', recommendedAction:'Increase liquid reserves or reduce near-term liability pressure.', contributors:[`Cash + AR $${(sys1.totalAR + (sys1.currentAssets-sys1.totalAR-sys1.inventoryValue)).toLocaleString()}`,`Current liabilities $${sys1.currentLiabilities.toLocaleString()}`,`Quick ratio ${sys1.quickRatio}`], confidence:88 }));
  if (sys1.hasLiquidityData !== false && sys1.workingCapital < 0) out.push(advisory({ id:'WCM-012', system:'Overall WCM', domain:'Liquidity', priority:'CRITICAL', finding:`Working capital is negative at $${sys1.workingCapital.toLocaleString()}.`, reason:'Current liabilities exceed current assets.', risk:'The business is technically insolvent on a short-term working-capital basis.', recommendedAction:'Escalate immediate liquidity actions and financing review.', contributors:[`Working capital $${sys1.workingCapital.toLocaleString()}`,`Assets $${sys1.currentAssets.toLocaleString()}`,`Liabilities $${sys1.currentLiabilities.toLocaleString()}`], confidence:92 }));
  if (sys1.custBaselineWcRevenueRatio != null && sys1.wcRevenueRatio > sys1.custBaselineWcRevenueRatio * Number(thresholds.wc_revenue_baseline_multiplier ?? config['WCM-013'].baselineMultiplier)) out.push(advisory({ id:'WCM-013', system:'Overall WCM', domain:'WCM', priority:'MEDIUM', finding:'Working capital is high relative to revenue versus the customer baseline.', reason:`WC/Revenue is ${round2(sys1.wcRevenueRatio)} versus baseline ${round2(sys1.custBaselineWcRevenueRatio)}.`, risk:'Cash may be trapped in receivables or inventory instead of funding growth.', recommendedAction:'Identify the working-capital component with excess investment.', contributors:[`WC/Revenue ${round2(sys1.wcRevenueRatio)}`,`Baseline ${round2(sys1.custBaselineWcRevenueRatio)}`,`Working capital $${sys1.workingCapital.toLocaleString()}`], confidence:confidenceFromAvailability(sys1.wcRatioHistory.length, 12, 10) }));

  // System 2 — reorder + dead stock + basic ABC.
  for (const sku of sys2.skus.filter(s => s.category !== 'Non-stock')) {
    const lead = Number(sku.leadTimeDays || 0), dos = Number(sku.daysOfStock || 0);
    let reorderRule = null;
    if (lead > 0 && dos < lead) reorderRule = ['INV-001','CRITICAL','Reorder immediately — stockout imminent'];
    else if (lead > 0 && dos < lead * Number(config['INV-002'].leadTimeMultiplier)) reorderRule = ['INV-002','HIGH','Reorder this week — stockout risk elevated'];
    else if (lead > 0 && dos < lead * Number(config['INV-003'].leadTimeMultiplier)) reorderRule = ['INV-003','MEDIUM','Reorder within 2 weeks — monitor closely'];
    if (reorderRule) out.push(advisory({ id:reorderRule[0], entityId:sku.sku, system:'Inventory Controls', domain:'Inventory', priority:reorderRule[1], finding:`${sku.sku} has ${sku.daysOfStock} days of stock against ${lead} days lead time.`, reason:`Sales velocity is ${sku.velocityDaily} units/day with ${sku.onHand} units on hand.`, risk:'A stockout can interrupt customer fulfilment before replacement inventory arrives.', recommendedAction:reorderRule[2], contributors:[`Days of stock ${sku.daysOfStock}`,`Lead time ${lead}`,`Velocity ${sku.velocityDaily}/day`,`On hand ${sku.onHand}`], confidence:confidenceFromAvailability([sku.sales60d>0,lead>0,sku.onHand>=0,sku.leadTimeStdDev>=0].filter(Boolean).length,4,5) }));
    if (sku.abcClass === 'A' && Number(sku.onHand) < Number(sku.reorderPoint)) out.push(advisory({ id:'INV-004', entityId:sku.sku, system:'Inventory Controls', domain:'Inventory', priority:'HIGH', finding:`Class A SKU ${sku.sku} is below its calculated reorder point.`, reason:`On hand ${sku.onHand} is below reorder point ${sku.reorderPoint}.`, risk:'A stockout on a high-value Class A SKU has disproportionate revenue impact.', recommendedAction:'Escalate replenishment priority for this Class A SKU.', contributors:[`ABC class A`,`On hand ${sku.onHand}`,`Reorder point ${sku.reorderPoint}`], confidence:90 }));
    if (sku.turnoverAnnual < Number(config['INV-010'].turnoverMax) && sku.inventoryValue > sys2.wkspMedianInventoryValue) out.push(advisory({ id:'INV-010', entityId:sku.sku, system:'Inventory Controls', domain:'Inventory', priority:'HIGH', finding:`${sku.sku} is a significant dead-stock candidate.`, reason:`Annual turnover is ${sku.turnoverAnnual}x and inventory value $${sku.inventoryValue.toLocaleString()} exceeds workspace median $${sys2.wkspMedianInventoryValue.toLocaleString()}.`, risk:'Material working capital is trapped in a low-turning SKU.', recommendedAction:'Liquidate, promote or return excess stock where possible.', contributors:[`Turnover ${sku.turnoverAnnual}x`,`Inventory $${sku.inventoryValue.toLocaleString()}`,`Median $${sys2.wkspMedianInventoryValue.toLocaleString()}`], confidence:78 }));
    if (Number(sku.daysQuiet || 0) >= Number(thresholds.stagnant_days ?? config['INV-011'].stagnantDays) && Number(sku.onHand || 0) > 0) out.push(advisory({ id:'INV-011', entityId:sku.sku, system:'Inventory Controls', domain:'Inventory', priority:'HIGH', finding:`${sku.sku} has had no sales for ${sku.daysQuiet} days.`, reason:`${sku.onHand} units remain on hand beyond the stagnant-stock threshold.`, risk:'Inventory may continue consuming cash and carrying cost without demand.', recommendedAction:'Review discontinuation, return-to-vendor or liquidation.', contributors:[`${sku.daysQuiet} quiet days`,`On hand ${sku.onHand}`,`Inventory $${sku.inventoryValue.toLocaleString()}`], confidence:88 }));
    if (sku.turnoverAnnual < Number(config['INV-012'].turnoverMax) && sku.abcClass === 'C') out.push(advisory({ id:'INV-012', entityId:sku.sku, system:'Inventory Controls', domain:'Inventory', priority:'MEDIUM', finding:`Class C SKU ${sku.sku} is slow moving.`, reason:`Annual turnover is ${sku.turnoverAnnual}x, below the configured threshold.`, risk:'Low-value assortment can accumulate carrying cost and operational complexity.', recommendedAction:'Evaluate discontinuation or lower stocking levels.', contributors:[`ABC class C`,`Turnover ${sku.turnoverAnnual}x`,`On hand ${sku.onHand}`], confidence:76 }));
    if (Number(sku.annualSales || 0) > 0 && Number(sku.onHand || 0) > Number(sku.annualSales || 0)) out.push(advisory({ id:'INV-013', entityId:sku.sku, system:'Inventory Controls', domain:'Inventory', priority:'MEDIUM', finding:`${sku.sku} holds more than 12 months of trailing sales.`, reason:`On hand is ${sku.onHand} units versus ${sku.annualSales} trailing annual unit sales.`, risk:'Excess stock ties up working capital and raises obsolescence risk.', recommendedAction:'Use promotion, clearance or purchase reduction to normalize stock.', contributors:[`On hand ${sku.onHand}`,`Annual sales ${sku.annualSales}`,`Inventory $${sku.inventoryValue.toLocaleString()}`], confidence:85 }));
  }

  // System 3 — Phase 1 only: 30-day gap, runway, coverage. Peer CASH-022 deferred.
  const firstNegative = sys3.points.find(p => p.cash < 0);
  if (firstNegative) out.push(advisory({ id:'CASH-001', system:'Cash Controls', domain:'Cash', priority:'CRITICAL', finding:`Projected cash goes negative within ${sys3.horizonDays} days.`, reason:`The first negative point is ${firstNegative.day} at $${firstNegative.cash.toLocaleString()}.`, risk:'The business may be unable to meet scheduled commitments without intervention.', recommendedAction:'Accelerate collections, delay non-critical payables and arrange a backstop.', contributors:[`Cash today $${sys3.cashToday.toLocaleString()}`,`30d inflow $${sys3.inflow30d.toLocaleString()}`,`30d outflow $${sys3.outflow30d.toLocaleString()}`,`Low point $${sys3.lowPointCash.toLocaleString()}`], confidence:sys3.forecastConfidence }));
  if (!firstNegative && sys3.firstDownsideNegative) out.push(advisory({ id:'CASH-004', system:'Cash Controls', domain:'Cash', priority:'MEDIUM', finding:'The downside confidence path goes negative even though the expected cash path remains positive.', reason:`The first downside-negative point is ${sys3.firstDownsideNegative.day} at $${sys3.firstDownsideNegative.bandLow.toLocaleString()}.`, risk:'Payment-timing uncertainty could create a cash gap even when the central forecast remains positive.', recommendedAction:'Build an additional liquidity buffer and prioritize near-term collections.', contributors:[`Expected cash $${sys3.firstDownsideNegative.cash.toLocaleString()}`,`Downside cash $${sys3.firstDownsideNegative.bandLow.toLocaleString()}`,`Forecast confidence ${sys3.forecastConfidence}%`], confidence:sys3.forecastConfidence }));
  if (sys3.burnRateDaily > 0) {
    if (sys3.runwayDays < Number(thresholds.runway_critical_days ?? 30)) out.push(advisory({ id:'CASH-010', system:'Cash Controls', domain:'Cash', priority:'CRITICAL', finding:`Cash runway is ${sys3.runwayDays} days.`, reason:`Current daily burn is approximately $${sys3.burnRateDaily.toLocaleString()}.`, risk:'Liquidity can be exhausted within roughly one month.', recommendedAction:'Take immediate financing or expense-reduction action.', contributors:[`Runway ${sys3.runwayDays} days`,`Daily burn $${sys3.burnRateDaily.toLocaleString()}`,`Cash $${sys3.cashToday.toLocaleString()}`], confidence:85 }));
    else if (sys3.runwayDays < Number(thresholds.runway_high_days ?? 60)) out.push(advisory({ id:'CASH-011', system:'Cash Controls', domain:'Cash', priority:'HIGH', finding:`Cash runway is ${sys3.runwayDays} days.`, reason:`The workspace is consuming cash at approximately $${sys3.burnRateDaily.toLocaleString()} per day.`, risk:'The business has a short financing window.', recommendedAction:'Arrange a credit facility within two weeks.', contributors:[`Runway ${sys3.runwayDays} days`,`Daily burn $${sys3.burnRateDaily.toLocaleString()}`], confidence:85 }));
    else if (sys3.runwayDays < Number(thresholds.runway_medium_days ?? 90)) out.push(advisory({ id:'CASH-012', system:'Cash Controls', domain:'Cash', priority:'MEDIUM', finding:`Cash runway is ${sys3.runwayDays} days.`, reason:'Current burn would consume available cash inside the configured warning horizon.', risk:'Financing conversations may start too late if the burn persists.', recommendedAction:'Begin financing conversations and monitor weekly.', contributors:[`Runway ${sys3.runwayDays} days`,`Daily burn $${sys3.burnRateDaily.toLocaleString()}`], confidence:85 }));
  }
  if (sys3.cashToday + sys3.inflow30d < sys3.outflow30d * Number(thresholds.coverage_multiplier ?? config['CASH-020'].coverageMultiplier)) out.push(advisory({ id:'CASH-020', system:'Cash Controls', domain:'Cash', priority:'HIGH', finding:'30-day cash coverage is tight.', reason:`Cash plus expected 30-day inflow is below ${Number(thresholds.coverage_multiplier ?? 1.2)}× scheduled outflow.`, risk:'The next month may require external financing or payment deferral.', recommendedAction:'Preserve cash and prioritize collections before discretionary outflows.', contributors:[`Cash $${sys3.cashToday.toLocaleString()}`,`30d inflow $${sys3.inflow30d.toLocaleString()}`,`30d outflow $${sys3.outflow30d.toLocaleString()}`], confidence:sys3.forecastConfidence }));
  if (sys3.monthlyPayroll != null && sys3.cashToday < sys3.monthlyPayroll) out.push(advisory({ id:'CASH-021', system:'Cash Controls', domain:'Cash', priority:'CRITICAL', finding:'Cash is below one month of payroll.', reason:`Cash $${sys3.cashToday.toLocaleString()} is below monthly payroll $${sys3.monthlyPayroll.toLocaleString()}.`, risk:'Payroll coverage is at risk.', recommendedAction:'Prioritize immediate cash generation and protect payroll funding.', contributors:[`Cash $${sys3.cashToday.toLocaleString()}`,`Payroll $${sys3.monthlyPayroll.toLocaleString()}`], confidence:93 }));

  // System 4 collections. COL-004/005/006 only evaluate when the required source data exists.
  for (const c of sys4.collectionQueue) {
    const overdue = Number(c.maxDaysOverdue || 0), ps = Number(c.payScore || 0);
    const commonConfidence = confidenceFromAvailability(c.payScoreAvailableComponents || 0, 7, c.payScoreProvisional ? 0 : 10);
    if (ps > Number(thresholds.payscore_p1 ?? config['COL-001'].payScoreMin) && overdue > Number(config['COL-001'].overdueDaysMin)) out.push(advisory({ id:'COL-001', entityId:c.id, system:'AR + AP (Collections)', domain:'Receivables', priority:'CRITICAL', finding:`${c.name} is P1: PayScore ${round1(ps)}, ${overdue} days overdue.`, reason:`$${c.pastDue.toLocaleString()} is past due with elevated payment risk.`, risk:`$${c.balance.toLocaleString()} remains outstanding and collection probability deteriorates with age.`, recommendedAction:'Owner-level call today.', contributors:[`PayScore ${round1(ps)}`,`${overdue} days overdue`,`Past due $${c.pastDue.toLocaleString()}`,`${c.brokenPromises || 0} broken promises`], confidence:commonConfidence }));
    else if (ps >= Number(thresholds.payscore_p2_min ?? 60) && ps <= Number(thresholds.payscore_p2_max ?? 80) && overdue > Number(config['COL-002'].overdueDaysMin)) out.push(advisory({ id:'COL-002', entityId:c.id, system:'AR + AP (Collections)', domain:'Receivables', priority:'HIGH', finding:`${c.name} is P2: PayScore ${round1(ps)}, ${overdue} days overdue.`, reason:'Moderate-to-high payment risk overlaps with material aging.', risk:`$${c.pastDue.toLocaleString()} remains past due.`, recommendedAction:'Formal outreach within 72 hours.', contributors:[`PayScore ${round1(ps)}`,`${overdue} days overdue`,`Past due $${c.pastDue.toLocaleString()}`], confidence:commonConfidence }));
    else if (ps < Number(thresholds.payscore_p3_max ?? 40) && overdue > Number(config['COL-003'].overdueDaysMin)) out.push(advisory({ id:'COL-003', entityId:c.id, system:'AR + AP (Collections)', domain:'Receivables', priority:'MEDIUM', finding:`${c.name} is overdue but remains low PayScore risk.`, reason:`PayScore is ${round1(ps)} despite ${overdue} days overdue.`, risk:'The delay may be temporary, but aging still requires monitoring.', recommendedAction:'Keep the account in the standard collection cycle.', contributors:[`PayScore ${round1(ps)}`,`${overdue} days overdue`,`Past due $${c.pastDue.toLocaleString()}`], confidence:commonConfidence }));
    if (c.promisedPaymentDate && diffDays(c.promisedPaymentDate, c.asOfDate) > Number(config['COL-004'].promisePastDueDays)) out.push(advisory({ id:'COL-004', entityId:c.id, system:'AR + AP (Collections)', domain:'Receivables', priority:'HIGH', finding:`${c.name} missed a promised payment date.`, reason:`The promise is more than ${config['COL-004'].promisePastDueDays} days past due.`, risk:'A broken promise reduces confidence in the next commitment.', recommendedAction:'Escalate the collection and treat the second promise as less reliable.', contributors:[`Promise date ${c.promisedPaymentDate}`,`${c.brokenPromises || 1} broken promises`], confidence:80 }));
    if (c.daysSincePreferredChannelContact != null && c.daysSincePreferredChannelContact > Number(config['COL-006'].channelSilentDays)) out.push(advisory({ id:'COL-006', entityId:c.id, system:'AR + AP (Collections)', domain:'Receivables', priority:'MEDIUM', finding:`${c.name}'s preferred channel has been silent.`, reason:`No response for ${c.daysSincePreferredChannelContact} days.`, risk:'Continuing the same channel can delay collection further.', recommendedAction:'Switch channel: email to call, or call to formal letter.', contributors:[`Silent ${c.daysSincePreferredChannelContact} days`,`Preferred channel ${c.preferredChannel}`], confidence:75 }));
  }
  if (sys4.arGrowth != null && sys4.revenueGrowth != null && sys4.arGrowth > sys4.revenueGrowth + Number(config['COL-005'].growthGapPctPoints)) out.push(advisory({ id:'COL-005', system:'AR + AP (Collections)', domain:'Receivables', priority:'HIGH', finding:'AR is growing materially faster than revenue.', reason:`AR growth ${round1(sys4.arGrowth*100)}% versus revenue growth ${round1(sys4.revenueGrowth*100)}%.`, risk:'Portfolio-level collection performance is deteriorating.', recommendedAction:'Investigate collection process, customer mix and credit policy.', contributors:[`AR growth ${round1(sys4.arGrowth*100)}%`,`Revenue growth ${round1(sys4.revenueGrowth*100)}%`], confidence:85 }));

  // Module 3 owns AP rule evaluation. AP-002/003/004 remain part of the
  // Phase 1 rule registry; AP-001 is exposed by Module 3 as discount visibility
  // without cross-domain chained optimization.
  const payablesForRules = sys4.payables || { bills: sys4.bills || [], suppliers: sys4.vendors || [] };
  out.push(...evaluatePayablesRules(payablesForRules, sys3, thresholds, { includeAP001: false }));

  // System 5 Phase 1 — concentration only.
  if (sys5.top1VendorShareRaw > Number(thresholds.vendor_single_share ?? config['VDC-001'].singleVendorShare)) out.push(advisory({ id:'VDC-001', system:'Others — Vendor Concentration', domain:'Concentration', priority:'HIGH', finding:`Largest vendor represents ${round1(sys5.top1VendorShareRaw*100)}% of purchases.`, reason:'Single-vendor dependence exceeds the configured threshold.', risk:'A supplier disruption could materially affect purchasing continuity.', recommendedAction:'Develop a backup source urgently.', contributors:[`Top vendor ${round1(sys5.top1VendorShareRaw*100)}%`,`Top 3 vendors ${round1(sys5.top3VendorShareRaw*100)}%`], confidence:82 }));
  if (sys5.top3VendorShareRaw > Number(thresholds.vendor_top3_share ?? config['VDC-002'].top3VendorShare)) out.push(advisory({ id:'VDC-002', system:'Others — Vendor Concentration', domain:'Concentration', priority:'MEDIUM', finding:`Top 3 vendors represent ${round1(sys5.top3VendorShareRaw*100)}% of purchases.`, reason:'The vendor base is concentrated beyond the configured threshold.', risk:'Multiple supplier issues could create a material continuity problem.', recommendedAction:'Build a vendor diversification improvement plan.', contributors:[`Top 3 vendors ${round1(sys5.top3VendorShareRaw*100)}%`,`Top vendor ${round1(sys5.top1VendorShareRaw*100)}%`], confidence:82 }));
  if (sys5.top1CustShareRaw > Number(thresholds.customer_top1_share ?? config['CDC-001'].top1CustomerShare)) out.push(advisory({ id:'CDC-001', system:'Others — Customer Concentration', domain:'Concentration', priority:'HIGH', finding:`Largest customer represents ${round1(sys5.top1CustShareRaw*100)}% of revenue.`, reason:'Single-customer revenue concentration exceeds the configured threshold.', risk:'Loss or slowdown of one customer could materially affect cash generation.', recommendedAction:'Prioritize customer diversification.', contributors:[`Top customer ${round1(sys5.top1CustShareRaw*100)}%`,`Top 3 customers ${round1(sys5.top3CustShareRaw*100)}%`], confidence:82 }));
  if (sys5.top3CustShareRaw > Number(thresholds.customer_top3_share ?? config['CDC-002'].top3CustomerShare)) out.push(advisory({ id:'CDC-002', system:'Others — Customer Concentration', domain:'Concentration', priority:'HIGH', finding:`Top 3 customers represent ${round1(sys5.top3CustShareRaw*100)}% of revenue.`, reason:'Customer concentration exceeds the configured threshold.', risk:'A small number of customers drive business-continuity exposure.', recommendedAction:'Build a customer diversification plan and monitor concentration monthly.', contributors:[`Top 3 customers ${round1(sys5.top3CustShareRaw*100)}%`,`Top customer ${round1(sys5.top1CustShareRaw*100)}%`], confidence:82 }));
  if (sys5.customerConcentrationYoYIncrease != null && sys5.customerConcentrationYoYIncrease > Number(config['CDC-003'].yoyIncreasePctPoints)) out.push(advisory({ id:'CDC-003', system:'Others — Customer Concentration', domain:'Concentration', priority:'MEDIUM', finding:'Customer concentration increased materially year over year.', reason:`Increase is ${round1(sys5.customerConcentrationYoYIncrease*100)} percentage points.`, risk:'The revenue base is becoming less diversified.', recommendedAction:'Investigate whether the concentration increase is intentional or drift.', contributors:[`YoY increase ${round1(sys5.customerConcentrationYoYIncrease*100)}pp`], confidence:85 }));

  return sortAdvisories(out);
}
