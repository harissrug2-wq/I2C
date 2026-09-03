const DAY_MS = 86400000;

const money = value => Math.round(Number(value || 0));
const round1 = value => Math.round(Number(value || 0) * 10) / 10;
const round2 = value => Math.round(Number(value || 0) * 100) / 100;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function parseDate(value) {
  return value ? new Date(`${value}T00:00:00Z`) : null;
}

function addDays(value, days) {
  const date = parseDate(value);
  if (!date) return value;
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function diffDays(a, b) {
  const start = parseDate(a);
  const end = parseDate(b);
  if (!start || !end) return 0;
  return Math.round((end - start) / DAY_MS);
}

function dayLabel(value) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : value;
}

export function collectionProbability(riskScore) {
  const score = Number(riskScore || 0);
  if (score < 30) return 0.95;
  if (score <= 60) return 0.80;
  if (score <= 80) return 0.55;
  return 0.25;
}

function confidenceFromInputs({ invoices, bills, actualInflows60d, actualOutflows60d, recurringCommitments, hasPaymentVariation }) {
  const checks = [
    invoices.length > 0,
    bills.length > 0,
    Number.isFinite(actualInflows60d),
    Number.isFinite(actualOutflows60d),
    recurringCommitments > 0,
    hasPaymentVariation,
  ];
  const available = checks.filter(Boolean).length;
  return clamp(Math.round(25 + (70 * available / checks.length)), 25, 95);
}

/**
 * Cash Forecasting engine.
 *
 * The product path currently exposes the source-design 30-day operating view.
 * The design document defines a rolling daily forecast, risk-weighted invoice
 * inflows, bill/recurring outflows, confidence bands, runway and coverage.
 */
export function computeCashForecastModule(
  cashBalance,
  invoiceList,
  billList,
  metrics,
  asOfDate,
  thresholds = {},
  horizonDays = 30,
) {
  const openInvoices = invoiceList.filter(invoice => Number(invoice.balanceDue || 0) > 0);
  const openBills = billList.filter(bill => Number(bill.balanceDue || 0) > 0);
  const confidenceFactor = Number(thresholds.forecast_confidence_factor || 0.15);

  const scheduledInvoices = openInvoices.map(invoice => {
    const baselineLateDays = Math.max(0, Number(invoice.customerAvgDaysLate || 0));
    const rawExpectedPayDate = addDays(invoice.dueDate, baselineLateDays);
    const expectedPayDate = diffDays(asOfDate, rawExpectedPayDate) < 0 ? asOfDate : rawExpectedPayDate;
    const probability = collectionProbability(invoice.riskScore);
    return {
      ...invoice,
      expectedPayDate,
      baselineLateDays,
      collectionProbability: probability,
      riskAdjustedAmount: round2(Number(invoice.balanceDue || 0) * probability),
    };
  });

  const scheduledBills = openBills.map(bill => ({
    ...bill,
    projectedPayDate: diffDays(asOfDate, bill.dueDate) < 0 ? asOfDate : bill.dueDate,
  }));

  // Manual/core data includes a 60-day baseline for non-bill cash movements.
  // Treat outflows as recurring commitments and inflows as explicit baseline
  // inflows, evenly distributed because no individual dates are supplied.
  const baselineOtherOutflows60d = Number(metrics.forecastBaselineOtherOutflows60d || 0);
  const baselineOtherInflows60d = Number(metrics.forecastBaselineOtherInflows60d || 0);
  const recurringDailyOutflow = baselineOtherOutflows60d > 0 ? baselineOtherOutflows60d / 60 : 0;
  const baselineDailyInflow = baselineOtherInflows60d > 0 ? baselineOtherInflows60d / 60 : 0;

  let runningCash = Number(cashBalance || 0);
  let invoiceInflows = 0;
  let baselineInflows = 0;
  let billOutflows = 0;
  let recurringOutflows = 0;
  const points = [];

  let lowPoint = {
    cash: money(runningCash),
    date: asOfDate,
    day: dayLabel(asOfDate),
    daysOut: 0,
  };

  for (let day = 0; day <= horizonDays; day += 1) {
    const date = addDays(asOfDate, day);
    const invoiceInflow = scheduledInvoices
      .filter(invoice => invoice.expectedPayDate === date)
      .reduce((sum, invoice) => sum + invoice.riskAdjustedAmount, 0);
    const billOutflow = scheduledBills
      .filter(bill => bill.projectedPayDate === date)
      .reduce((sum, bill) => sum + Number(bill.balanceDue || 0), 0);

    const otherInflow = baselineDailyInflow;
    const recurringOutflow = recurringDailyOutflow;
    const totalInflow = invoiceInflow + otherInflow;
    const totalOutflow = billOutflow + recurringOutflow;

    runningCash += totalInflow - totalOutflow;
    invoiceInflows += invoiceInflow;
    baselineInflows += otherInflow;
    billOutflows += billOutflow;
    recurringOutflows += recurringOutflow;

    const timingUncertainty = scheduledInvoices
      .filter(invoice => Math.abs(diffDays(invoice.expectedPayDate, date)) <= 7)
      .reduce((sum, invoice) => {
        const stddev = Number(invoice.customerStdDevDaysLate || 0);
        return sum + Number(invoice.balanceDue || 0) * (stddev / 30) * confidenceFactor;
      }, 0);
    const horizonWidening = 1 + (day / Math.max(1, horizonDays)) * 0.25;
    const confidenceWidth = timingUncertainty * horizonWidening;

    const cash = money(runningCash);
    const point = {
      date,
      day: dayLabel(date),
      daysOut: day,
      cash,
      bandLow: money(runningCash - confidenceWidth),
      bandHigh: money(runningCash + confidenceWidth),
      expectedInflow: money(totalInflow),
      expectedOutflow: money(totalOutflow),
      invoiceInflow: money(invoiceInflow),
      baselineInflow: money(otherInflow),
      billOutflow: money(billOutflow),
      recurringOutflow: money(recurringOutflow),
    };
    points.push(point);

    if (cash < lowPoint.cash) {
      lowPoint = { cash, date, day: point.day, daysOut: day };
    }
  }

  const totalInflows = invoiceInflows + baselineInflows;
  const totalOutflows = billOutflows + recurringOutflows;
  const endingCash = points.at(-1)?.cash ?? money(cashBalance);
  const actual60Inflows = Number(metrics.actualInflows60d || 0);
  const actual60Outflows = Number(metrics.actualOutflows60d || 0);
  const rawBurnRate = (actual60Outflows - actual60Inflows) / 60;
  const burnRateDaily = rawBurnRate > 0 ? rawBurnRate : 0;
  const runwayDays = burnRateDaily > 0 ? Math.floor(Number(cashBalance || 0) / burnRateDaily) : 9999;
  const coverageRatio = totalOutflows > 0 ? (Number(cashBalance || 0) + totalInflows) / totalOutflows : 99;
  const operatingFloor = Number(thresholds.operating_cash_floor || 0);
  const floorGap = Math.max(0, operatingFloor - lowPoint.cash);
  const firstNegative = points.find(point => point.cash < 0) || null;
  const firstDownsideNegative = points.find(point => point.bandLow < 0) || null;

  const horizonEndDate = addDays(asOfDate, horizonDays);
  const inHorizon = date => diffDays(asOfDate, date) >= 0 && diffDays(asOfDate, date) <= horizonDays;
  const topInflows = scheduledInvoices
    .filter(invoice => inHorizon(invoice.expectedPayDate))
    .sort((a, b) => b.riskAdjustedAmount - a.riskAdjustedAmount)
    .slice(0, 6);
  const topOutflows = scheduledBills
    .filter(bill => inHorizon(bill.projectedPayDate))
    .sort((a, b) => Number(b.balanceDue || 0) - Number(a.balanceDue || 0))
    .slice(0, 6);

  const forecastConfidence = confidenceFromInputs({
    invoices: scheduledInvoices,
    bills: scheduledBills,
    actualInflows60d: actual60Inflows,
    actualOutflows60d: actual60Outflows,
    recurringCommitments: baselineOtherOutflows60d,
    hasPaymentVariation: scheduledInvoices.some(invoice => Number(invoice.customerStdDevDaysLate || 0) > 0),
  });

  return {
    horizonDays,
    horizonStartDate: asOfDate,
    horizonEndDate,
    cashToday: money(cashBalance),
    endingCash,
    points,
    lowPointCash: lowPoint.cash,
    lowPointDay: lowPoint.day,
    lowPointDate: lowPoint.date,
    lowPointDaysOut: lowPoint.daysOut,
    floorGap: money(floorGap),
    operatingFloor: money(operatingFloor),
    invoiceInflows: money(invoiceInflows),
    baselineInflows: money(baselineInflows),
    inflow30d: money(totalInflows),
    billOutflows: money(billOutflows),
    recurringOutflows: money(recurringOutflows),
    outflow30d: money(totalOutflows),
    netMovement: money(totalInflows - totalOutflows),
    coverageRatio: round2(coverageRatio),
    burnRateDaily: money(burnRateDaily),
    runwayDays,
    runwayLabel: runwayDays >= 9999 ? 'Cash generating / no finite runway' : `${runwayDays} days`,
    firstNegative,
    firstDownsideNegative,
    confidenceLowNegative: Boolean(firstDownsideNegative),
    forecastConfidence,
    monthlyPayroll: metrics.monthlyPayroll == null ? null : money(metrics.monthlyPayroll),
    scheduledInvoices,
    scheduledBills,
    topInflows,
    topOutflows,
    recurringDailyOutflow: round2(recurringDailyOutflow),
    baselineDailyInflow: round2(baselineDailyInflow),
    inputCoverage: {
      openInvoices: scheduledInvoices.length,
      openBills: scheduledBills.length,
      hasRecurringCommitments: baselineOtherOutflows60d > 0,
      hasBaselineOtherInflows: baselineOtherInflows60d > 0,
      hasHistoricalActuals: Number.isFinite(actual60Inflows) && Number.isFinite(actual60Outflows),
    },
  };
}
