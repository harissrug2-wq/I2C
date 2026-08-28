/**
 * i2cashflow decision engine.
 * All outputs are derived from the workspace dataset. No KPI values are hardcoded.
 */

export const DEFAULT_THRESHOLDS = {
  cost_of_capital: 0.12,
  target_ccc: 45,
  operating_cash_floor: 250000,
  service_level_z: 1.65,
  holding_cost_percent: 0.20,
  ordering_cost_per_order: 150,
  lgd_default: 0.85,
  stagnant_days: 180,
  cost_per_chase_hour: 45,
  peer_median_ccc: 45,
  peer_median_cash_days: 30,
  peer_median_turnover: 6.0,
  peer_median_margin: 0.26,
};

const DAY_MS = 86400000;
const round1 = n => Math.round(n * 10) / 10;
const round2 = n => Math.round(n * 100) / 100;
const money = n => Math.round(n || 0);

function dateDiffDays(a, b) {
  return Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / DAY_MS);
}

export function computeSystem1(cash, invoiceList, productList, billList, metrics, thresholds) {
  const openInvoices = invoiceList.filter(i => i.balanceDue > 0);
  const openBills = billList.filter(b => b.balanceDue > 0);
  const totalAR = openInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
  const totalAP = openBills.reduce((sum, b) => sum + b.balanceDue, 0);
  const inventoryValue = productList.reduce((sum, p) => sum + (p.onHand * p.wac), 0);

  const revenue30d = Number(metrics.revenue30d || 0);
  const cogs30d = Number(metrics.cogs30d || 0);
  const otherCurrentLiabilities = Number(metrics.otherCurrentLiabilities || 0);

  const dio = cogs30d > 0 ? (inventoryValue / cogs30d) * 30 : 0;
  const dso = revenue30d > 0 ? (totalAR / revenue30d) * 30 : 0;
  const dpo = cogs30d > 0 ? (totalAP / cogs30d) * 30 : 0;
  const ccc = dio + dso - dpo;

  const currentAssets = cash + totalAR + inventoryValue;
  const currentLiabilities = totalAP + otherCurrentLiabilities;
  const workingCapital = currentAssets - currentLiabilities;
  const annualizedRevenue = revenue30d * 12;
  const wcRevenueRatio = annualizedRevenue > 0 ? workingCapital / annualizedRevenue : 0;
  const wcTurnover = workingCapital > 0 ? annualizedRevenue / workingCapital : 0;
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 99;
  const quickRatio = currentLiabilities > 0 ? (cash + totalAR) / currentLiabilities : 99;
  const cashFreed = ccc > thresholds.target_ccc && annualizedRevenue > 0
    ? ((ccc - thresholds.target_ccc) / 365) * annualizedRevenue
    : 0;

  return {
    totalAR: money(totalAR),
    totalAP: money(totalAP),
    openInvoiceCount: openInvoices.length,
    openBillCount: openBills.length,
    inventoryValue: money(inventoryValue),
    dio: round1(dio),
    dso: round1(dso),
    dpo: round1(dpo),
    ccc: round1(ccc),
    currentAssets: money(currentAssets),
    currentLiabilities: money(currentLiabilities),
    otherCurrentLiabilities: money(otherCurrentLiabilities),
    workingCapital: money(workingCapital),
    annualizedRevenue: money(annualizedRevenue),
    wcRevenueRatio: Math.round(wcRevenueRatio * 1000) / 1000,
    wcTurnover: round1(wcTurnover),
    currentRatio: round2(currentRatio),
    quickRatio: round2(quickRatio),
    cashFreed: money(cashFreed),
  };
}

export function computeSystem2(productList, thresholds) {
  const stockProducts = productList.filter(p => p.category !== 'Non-stock');
  const sortedByRev = [...stockProducts].map(p => ({
    ...p,
    annualRev: p.annualSales * p.sellPrice,
  })).sort((a, b) => b.annualRev - a.annualRev);

  const totalAnnRev = sortedByRev.reduce((sum, p) => sum + p.annualRev, 0);
  let accumulated = 0;
  const abcMap = {};
  sortedByRev.forEach(p => {
    accumulated += p.annualRev;
    const share = accumulated / (totalAnnRev || 1);
    abcMap[p.sku] = share <= 0.8 ? 'A' : share <= 0.95 ? 'B' : 'C';
  });

  const processedSKUs = productList.map(p => {
    const velocityDaily = p.sales60d / 60;
    const velocityWeekly = velocityDaily * 7;
    const daysOfStock = velocityDaily > 0 ? p.onHand / velocityDaily : (p.onHand > 0 ? 9999 : 0);
    const safetyStock = velocityDaily > 0
      ? Math.ceil(velocityDaily * (p.leadTimeStdDev || 0) * thresholds.service_level_z)
      : Number(p.manualSafetyStock || 0);
    const reorderPoint = velocityDaily > 0
      ? Math.ceil((velocityDaily * p.leadTimeDays) + safetyStock)
      : Number(p.manualReorderPoint || 0);
    const turnoverAnnual = p.onHand > 0 ? p.annualSales / p.onHand : 0;
    const H = p.wac * thresholds.holding_cost_percent;
    const eoq = H > 0 && p.annualSales > 0
      ? Math.round(Math.sqrt((2 * p.annualSales * thresholds.ordering_cost_per_order) / H))
      : 0;

    let status = 'Healthy';
    if (p.category === 'Non-stock') status = 'Non-stock';
    else if (p.daysQuiet >= thresholds.stagnant_days) status = 'Dead Stock';
    else if (daysOfStock > 180) status = 'Overstocked';

    return {
      ...p,
      velocityDaily: round1(velocityDaily),
      velocityWeekly: round1(velocityWeekly),
      daysOfStock: Math.round(daysOfStock),
      safetyStock,
      reorderPoint,
      turnoverAnnual: round1(turnoverAnnual),
      abcClass: abcMap[p.sku] || 'C',
      eoq,
      status,
      stockoutDays: Math.max(0, Math.round(daysOfStock)),
      inventoryValue: money(p.onHand * p.wac),
    };
  });

  const inventorySKUs = processedSKUs.filter(p => p.status !== 'Non-stock');
  const healthyValue = inventorySKUs.filter(p => p.status === 'Healthy').reduce((s, p) => s + p.inventoryValue, 0);
  const overstockedValue = inventorySKUs.filter(p => p.status === 'Overstocked').reduce((s, p) => s + p.inventoryValue, 0);
  const deadStockValue = inventorySKUs.filter(p => p.status === 'Dead Stock').reduce((s, p) => s + p.inventoryValue, 0);
  const totalValue = inventorySKUs.reduce((s, p) => s + p.inventoryValue, 0);

  return {
    skus: processedSKUs,
    stockSkuCount: inventorySKUs.length,
    totalValue,
    healthyValue,
    overstockedValue,
    deadStockValue,
    healthyPercent: Math.round((healthyValue / (totalValue || 1)) * 100),
    overstockedPercent: Math.round((overstockedValue / (totalValue || 1)) * 100),
    deadStockPercent: Math.round((deadStockValue / (totalValue || 1)) * 100),
  };
}

export function computeSystem3(cashBalance, invoiceList, billList, metrics, asOfDate, thresholds) {
  const openInvoices = invoiceList.filter(i => i.balanceDue > 0);
  const openBills = billList.filter(b => b.balanceDue > 0);
  const getColProb = score => score < 30 ? 0.95 : score <= 60 ? 0.80 : score <= 80 ? 0.55 : 0.25;

  const baseDate = new Date(`${asOfDate}T00:00:00`);
  let runningCash = cashBalance;
  const points = [];
  let lowPoint = { cash: cashBalance, dayStr: baseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), daysOut: 0 };

  for (let i = 0; i <= 90; i += 3) {
    const curDate = new Date(baseDate);
    curDate.setDate(baseDate.getDate() + i);
    const curIso = curDate.toISOString().slice(0, 10);
    const dayStr = curDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const inflows = openInvoices.filter(inv => Math.abs(dateDiffDays(curIso, inv.dueDate)) <= 3)
      .reduce((sum, inv) => sum + inv.balanceDue * getColProb(inv.riskScore), 0);
    const outflows = openBills.filter(b => Math.abs(dateDiffDays(curIso, b.dueDate)) <= 3)
      .reduce((sum, b) => sum + b.balanceDue, 0);

    if (i > 0) runningCash += (inflows * 0.75) - (outflows * 0.75);
    const bandWidth = Math.round(Math.max(25000, Math.abs(runningCash) * 0.05 + i * 500));
    const cashVal = Math.round(runningCash);
    if (cashVal < lowPoint.cash) lowPoint = { cash: cashVal, dayStr, daysOut: i };
    points.push({ day: dayStr, cash: cashVal, bandLow: cashVal - bandWidth, bandHigh: cashVal + bandWidth });
  }

  const last60Outflows = openBills.reduce((s, b) => s + b.balanceDue, 0) + Number(metrics.baselineOtherOutflows60d || 0);
  const last60Inflows = openInvoices.filter(i => i.daysOverdue === 0).reduce((s, i) => s + i.balanceDue, 0) + Number(metrics.baselineOtherInflows60d || 0);
  const netBurn60 = last60Outflows - last60Inflows;
  const burnRateDaily = netBurn60 > 0 ? netBurn60 / 60 : 0;
  const runwayDays = burnRateDaily > 0 ? Math.round(cashBalance / burnRateDaily) : 999;
  const floorGap = Math.max(0, thresholds.operating_cash_floor - lowPoint.cash);

  return {
    cashToday: money(cashBalance), points,
    lowPointCash: lowPoint.cash, lowPointDay: lowPoint.dayStr, lowPointDaysOut: lowPoint.daysOut,
    floorGap: money(floorGap), burnRateDaily: money(burnRateDaily), runwayDays,
  };
}

export function computeSystem4(customersList, invoiceList, billList, vendorList, thresholds) {
  const openInvoices = invoiceList.filter(i => i.balanceDue > 0);
  const openBills = billList.filter(b => b.balanceDue > 0);
  const getPD = days => days <= 0 ? 0.005 : days <= 30 ? 0.02 : days <= 60 ? 0.05 : days <= 90 ? 0.15 : days <= 120 ? 0.35 : 0.65;

  let totalECL = 0;
  const eclInvoices = openInvoices.map(inv => {
    const pd = getPD(inv.daysOverdue);
    const ecl = inv.balanceDue * pd * thresholds.lgd_default;
    totalECL += ecl;
    return { ...inv, pd: round1(pd * 100), ecl: money(ecl) };
  });
  const totalAR = openInvoices.reduce((s, i) => s + i.balanceDue, 0);
  const collectibleAR = Math.max(0, totalAR - totalECL);
  const moneyAtRisk = openInvoices.filter(i => i.riskScore > 60 || i.daysOverdue > 60).reduce((s, i) => s + i.balanceDue, 0);

  const collectionQueue = customersList.map(c => {
    const ageRisk = Math.max(0, c.avgDaysLate / 30) * 20;
    const amountRisk = Math.min(25, c.balance / 15000);
    const historyRisk = c.brokenPromises * 8;
    const priorityScore = Math.min(100, Math.round(c.riskScore * 0.65 + ageRisk + amountRisk + historyRisk));
    let priorityTier = 'P4'; let action = 'Automated Reminder';
    if (priorityScore > 75) { priorityTier = 'P1 (Urgent)'; action = 'Owner-Level Call Today'; }
    else if (priorityScore > 55) { priorityTier = 'P2 (High)'; action = 'Formal Demand / Phone Follow-up'; }
    else if (priorityScore > 35) { priorityTier = 'P3 (Monitor)'; action = 'Schedule Payment Check'; }
    return { ...c, priorityScore, priorityTier, action };
  }).sort((a, b) => b.priorityScore - a.priorityScore);

  const creditManagement = customersList.map(c => {
    const riskAdj = c.riskScore < 30 ? 1.2 : c.riskScore > 70 ? 0.65 : c.riskScore > 45 ? 0.85 : 1.0;
    const recLimit = Math.min(c.avgMonthly * 2.5 || c.creditLimit, c.maxMonthly * 1.3 || c.creditLimit) * riskAdj;
    const utilization = c.creditLimit > 0 ? (c.balance / c.creditLimit) * 100 : 0;
    return { ...c, recommendedLimit: Math.max(0, Math.round(recLimit / 1000) * 1000), utilization: Math.round(utilization), isBreached: utilization > 100 };
  });

  const discountOpportunities = openBills.filter(b => b.discountAvailable > 0).map(b => {
    const discountAPR = b.discountPercent > 0 && b.netDays > b.discountDays
      ? (b.discountPercent / (100 - b.discountPercent)) * (365 / (b.netDays - b.discountDays))
      : 0;
    return { ...b, discountAPRPercent: round1(discountAPR * 100), savings: money(b.discountAvailable), isProfitableToTake: discountAPR > thresholds.cost_of_capital };
  });
  const totalDiscountSavings = discountOpportunities.reduce((s, d) => s + d.savings, 0);

  const avgCustDaysToPay = customersList.reduce((s, c) => s + c.avgDaysToPay, 0) / (customersList.length || 1);
  const avgSupplierTerms = vendorList.reduce((s, v) => s + (v.netDays || 30), 0) / (vendorList.length || 1);
  const wcGapDays = Math.round(avgCustDaysToPay - avgSupplierTerms);
  const annualPurchases = openBills.reduce((s, b) => s + b.balanceDue, 0) * 12;
  const wcGapCost = Math.max(0, (wcGapDays / 365) * annualPurchases * thresholds.cost_of_capital);

  return {
    totalAR: money(totalAR), totalECL: money(totalECL), collectibleAR: money(collectibleAR), moneyAtRisk: money(moneyAtRisk),
    eclInvoices, collectionQueue, creditManagement, discountOpportunities,
    totalDiscountSavings: money(totalDiscountSavings), wcGapDays, wcGapCost: money(wcGapCost),
  };
}

export function computeSystem5(productList, customersList, vendorList, thresholds) {
  const avgCustPayDays = customersList.reduce((s, c) => s + c.avgDaysToPay, 0) / (customersList.length || 1);
  const trueMarginSkus = productList.filter(p => p.category !== 'Non-stock').map(p => {
    const sellPrice = Number(p.sellPrice || 0);
    const grossMarginPercent = sellPrice > 0 ? (sellPrice - p.wac) / sellPrice : 0;
    const cashCarryCost = (sellPrice * avgCustPayDays / 365) * thresholds.cost_of_capital;
    const trueMarginDollar = (sellPrice - p.wac) - cashCarryCost;
    const trueMarginPercent = sellPrice > 0 ? trueMarginDollar / sellPrice : 0;
    return {
      ...p,
      inventoryValue: money(p.onHand * p.wac),
      grossMarginPercent: round1(grossMarginPercent * 100), cashCarryCost: round2(cashCarryCost),
      trueMarginPercent: round1(trueMarginPercent * 100), marginErosionPts: round1((grossMarginPercent - trueMarginPercent) * 100),
    };
  });

  const totalRev = customersList.reduce((s, c) => s + c.avgMonthly, 0) || 1;
  const sortedCust = [...customersList].sort((a, b) => b.avgMonthly - a.avgMonthly);
  const top1CustShare = Math.round(((sortedCust[0]?.avgMonthly || 0) / totalRev) * 100);
  const top3CustShare = Math.round((sortedCust.slice(0, 3).reduce((s, c) => s + c.avgMonthly, 0) / totalRev) * 100);
  const sortedVendors = [...vendorList].sort((a, b) => b.cogsShare - a.cogsShare);
  const top1VendorShare = Math.round((sortedVendors[0]?.cogsShare || 0) * 100);
  return { trueMarginSkus, top1CustShare, top3CustShare, top1VendorShare, isVendorConcentrated: top1VendorShare > 35, isCustomerConcentrated: top3CustShare > 60 };
}

export function evaluateRules(sys1, sys2, sys3, sys4, sys5, thresholds) {
  const advisories = [];
  if (sys1.ccc > thresholds.target_ccc) advisories.push({ id:'WCM-001', system:'Overall WCM', priority:'HIGH', finding:`Cash conversion cycle is ${sys1.ccc} days versus the ${thresholds.target_ccc}-day target.`, reason:'Inventory and receivables remain funded longer than supplier terms.', risk:`Approximately $${sys1.cashFreed.toLocaleString()} could be released if the target cycle is reached.`, recommendedAction:'Prioritize overdue AR and high-days-of-stock inventory before adding working capital.', confidence:90, domain:'WCM' });

  const dead = sys2.skus.filter(s => s.status === 'Dead Stock');
  if (dead.length) advisories.push({ id:'INV-010', system:'Inventory Controls', priority:'HIGH', finding:`Detected $${sys2.deadStockValue.toLocaleString()} in dead stock across ${dead.length} SKUs.`, reason:`Each flagged SKU has been quiet for at least ${thresholds.stagnant_days} days.`, risk:'Working capital is trapped in inventory that is not turning.', recommendedAction:'Review liquidation, return-to-vendor, or controlled discount options for the flagged SKUs.', confidence:91, domain:'Inventory' });

  if (sys3.lowPointCash < thresholds.operating_cash_floor) advisories.push({ id:'CASH-001', system:'Cash Controls', priority:'CRITICAL', finding:`Projected cash low point reaches $${sys3.lowPointCash.toLocaleString()} on ${sys3.lowPointDay}.`, reason:'Risk-adjusted invoice collections and scheduled open bills overlap inside the forecast window.', risk:`The projected low point is $${sys3.floorGap.toLocaleString()} below the configured operating cash floor.`, recommendedAction:'Reschedule non-critical payables and accelerate the highest-probability collections.', confidence:84, domain:'Cash' });

  const p1 = sys4.collectionQueue.find(c => c.priorityTier.startsWith('P1')) || sys4.collectionQueue.find(c => c.pastDue > 0);
  if (p1) advisories.push({ id:'COL-001', system:'AR + AP (Collections)', priority:p1.priorityTier.startsWith('P1')?'CRITICAL':'HIGH', finding:`${p1.name} has $${p1.pastDue.toLocaleString()} past due with PayScore ${p1.riskScore}.`, reason:`Average payment timing is ${p1.avgDaysToPay} days with ${p1.avgDaysLate} average days late.`, risk:`$${p1.balance.toLocaleString()} remains outstanding on the account.`, recommendedAction:p1.action, confidence:89, domain:'Receivables' });

  const hostage = sys4.collectionQueue.find(c => c.inventoryDeliveredValue > 2000 && c.pastDue > 0);
  if (hostage) advisories.push({ id:'BAD-XD-001', system:'Cross-Domain (AR × Inventory)', priority:'HIGH', finding:`${hostage.name} has $${hostage.balance.toLocaleString()} outstanding and about $${hostage.inventoryDeliveredValue.toLocaleString()} of delivered inventory cost linked to open invoice detail.`, reason:'Invoice-line and inventory-cost data overlap with an overdue customer balance.', risk:'A financial write-off could ignore recoverable physical value.', recommendedAction:'Review delivered goods and return rights before any write-off decision.', confidence:72, domain:'Cross-Domain' });

  if (sys4.discountOpportunities.length) {
    const top = [...sys4.discountOpportunities].sort((a,b)=>b.savings-a.savings)[0];
    advisories.push({ id:'AP-001', system:'AR + AP (Payables)', priority:'HIGH', finding:`${top.vendorName} has a $${top.savings.toLocaleString()} open early-pay discount opportunity.`, reason:`The implied discount APR is ${top.discountAPRPercent}% versus a ${Math.round(thresholds.cost_of_capital*100)}% cost of capital.`, risk:'Missing the discount window gives up available margin.', recommendedAction:`Review ${top.billNo} before the discount window closes.`, confidence:94, domain:'Payables' });
  }

  const eroded = [...sys5.trueMarginSkus].sort((a,b)=>b.marginErosionPts-a.marginErosionPts)[0];
  if (eroded && eroded.marginErosionPts > 0) advisories.push({ id:'MAR-002', system:'Margin Intelligence', priority:'MEDIUM', finding:`${eroded.name} moves from ${eroded.grossMarginPercent}% gross margin to ${eroded.trueMarginPercent}% after cash carrying cost.`, reason:'Customer payment timing creates a measurable financing cost.', risk:`Margin erosion is ${eroded.marginErosionPts} points on this SKU.`, recommendedAction:'Review price and credit terms for customers buying this SKU.', confidence:88, domain:'Margins' });

  return advisories;
}
