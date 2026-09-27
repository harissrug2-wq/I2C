import { decimal, decimalMoney, decimalNumber, decimalSum, decimalWholeMoney } from './decimalMath.js';

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
      riskAdjustedAmount: decimalMoney(decimal(invoice.balanceDue || 0).times(probability)),
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
  const recurringDailyOutflow = baselineOtherOutflows60d > 0 ? decimalNumber(decimal(baselineOtherOutflows60d).div(60)) : 0;
  const baselineDailyInflow = baselineOtherInflows60d > 0 ? decimalNumber(decimal(baselineOtherInflows60d).div(60)) : 0;

  let runningCash = decimal(cashBalance || 0);
  let invoiceInflows = decimal(0);
  let baselineInflows = decimal(0);
  let billOutflows = decimal(0);
  let recurringOutflows = decimal(0);
  const points = [];

  let lowPoint = {
    cash: decimalWholeMoney(runningCash),
    date: asOfDate,
    day: dayLabel(asOfDate),
    daysOut: 0,
  };

  for (let day = 0; day <= horizonDays; day += 1) {
    const date = addDays(asOfDate, day);
    const invoiceInflow = decimalSum(
      scheduledInvoices
        .filter(invoice => invoice.expectedPayDate === date)
        .map(invoice => invoice.riskAdjustedAmount)
    );
    const billOutflow = decimalSum(
      scheduledBills
        .filter(bill => bill.projectedPayDate === date)
        .map(bill => bill.balanceDue || 0)
    );

    const otherInflow = decimal(baselineDailyInflow);
    const recurringOutflow = decimal(recurringDailyOutflow);
    const totalInflow = invoiceInflow.plus(otherInflow);
    const totalOutflow = billOutflow.plus(recurringOutflow);

    runningCash = runningCash.plus(totalInflow).minus(totalOutflow);
    invoiceInflows = invoiceInflows.plus(invoiceInflow);
    baselineInflows = baselineInflows.plus(otherInflow);
    billOutflows = billOutflows.plus(billOutflow);
    recurringOutflows = recurringOutflows.plus(recurringOutflow);

    const timingUncertainty = decimalSum(
      scheduledInvoices
        .filter(invoice => Math.abs(diffDays(invoice.expectedPayDate, date)) <= 7)
        .map(invoice => decimal(invoice.balanceDue || 0)
          .times(decimal(invoice.customerStdDevDaysLate || 0).div(30))
          .times(confidenceFactor))
    );
    const horizonWidening = decimal(1).plus(decimal(day).div(Math.max(1, horizonDays)).times(0.25));
    const confidenceWidth = timingUncertainty.times(horizonWidening);

    const cash = decimalWholeMoney(runningCash);
    const point = {
      date,
      day: dayLabel(date),
      daysOut: day,
      cash,
      bandLow: decimalWholeMoney(runningCash.minus(confidenceWidth)),
      bandHigh: decimalWholeMoney(runningCash.plus(confidenceWidth)),
      expectedInflow: decimalWholeMoney(totalInflow),
      expectedOutflow: decimalWholeMoney(totalOutflow),
      invoiceInflow: decimalWholeMoney(invoiceInflow),
      baselineInflow: decimalWholeMoney(otherInflow),
      billOutflow: decimalWholeMoney(billOutflow),
      recurringOutflow: decimalWholeMoney(recurringOutflow),
    };
    points.push(point);

    if (cash < lowPoint.cash) {
      lowPoint = { cash, date, day: point.day, daysOut: day };
    }
  }

  const totalInflows = invoiceInflows.plus(baselineInflows);
  const totalOutflows = billOutflows.plus(recurringOutflows);
  const endingCash = points.at(-1)?.cash ?? decimalWholeMoney(cashBalance);
  const actual60Inflows = Number(metrics.actualInflows60d || 0);
  const actual60Outflows = Number(metrics.actualOutflows60d || 0);
  const rawBurnRate = decimal(actual60Outflows).minus(actual60Inflows).div(60);
  const burnRateDaily = rawBurnRate.isPositive() ? rawBurnRate : decimal(0);
  const runwayDays = burnRateDaily.isPositive() ? decimal(cashBalance || 0).div(burnRateDaily).floor().toNumber() : 9999;
  const coverageRatio = totalOutflows.isPositive()
    ? decimalNumber(decimal(cashBalance || 0).plus(totalInflows).div(totalOutflows))
    : 99;
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
    invoiceInflows: decimalWholeMoney(invoiceInflows),
    baselineInflows: decimalWholeMoney(baselineInflows),
    inflow30d: decimalWholeMoney(totalInflows),
    billOutflows: decimalWholeMoney(billOutflows),
    recurringOutflows: decimalWholeMoney(recurringOutflows),
    outflow30d: decimalWholeMoney(totalOutflows),
    netMovement: decimalWholeMoney(totalInflows.minus(totalOutflows)),
    coverageRatio: round2(coverageRatio),
    burnRateDaily: decimalWholeMoney(burnRateDaily),
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
