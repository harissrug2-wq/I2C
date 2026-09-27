export const INTELLIGENCE_HISTORY_VERSION = 'history-foundation-2026-09';

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortValue(value[key])]));
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return null;
  return value;
}

export function stableStringify(value) {
  return JSON.stringify(sortValue(value));
}

function hash32(text, seed = 0x811c9dc5) {
  let hash = seed >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function deterministicFingerprint(value) {
  const text = typeof value === 'string' ? value : stableStringify(value);
  return hash32(text) + hash32([...text].reverse().join(''), 0x9e3779b9);
}

function dateOnly(value) {
  const text = String(value || '');
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : new Date().toISOString().slice(0, 10);
}

function compactMetrics(computedData = {}) {
  const { sys1 = {}, sys2 = {}, sys3 = {}, sys4 = {}, sys5 = {}, crossDomain = {} } = computedData;
  const receivables = sys4.receivables || sys4 || {};
  const payables = sys4.payables || {};
  return {
    workingCapital: {
      totalAR: sys1.totalAR,
      totalAP: sys1.totalAP,
      inventoryValue: sys1.inventoryValue,
      dio: sys1.dio,
      dso: sys1.dso,
      dpo: sys1.dpo,
      ccc: sys1.ccc,
      currentRatio: sys1.currentRatio,
      quickRatio: sys1.quickRatio,
      workingCapital: sys1.workingCapital,
      wcRevenueRatio: sys1.wcRevenueRatio,
    },
    inventory: {
      totalValue: sys2.totalValue,
      stockSkuCount: sys2.stockSkuCount,
      deadStockValue: sys2.deadStockValue,
      overstockedValue: sys2.overstockedValue,
      reorderAlertCount: sys2.reorderAlertCount,
      abcSummary: sys2.abcSummary,
    },
    cash: {
      horizonDays: sys3.horizonDays,
      cashToday: sys3.cashToday,
      endingCash: sys3.endingCash,
      lowPointCash: sys3.lowPointCash,
      lowPointDate: sys3.lowPointDate,
      inflow30d: sys3.inflow30d,
      outflow30d: sys3.outflow30d,
      coverageRatio: sys3.coverageRatio,
      runwayDays: sys3.runwayDays,
      forecastConfidence: sys3.forecastConfidence,
    },
    receivables: {
      totalAR: receivables.totalAR,
      totalECL: receivables.totalECL,
      collectibleAR: receivables.collectibleAR,
      moneyAtRisk: receivables.moneyAtRisk,
      aging: receivables.aging,
      payScoreModel: receivables.payScoreModel,
    },
    payables: {
      totalAP: payables.totalAP,
      pastDueAmount: payables.pastDueAmount,
      aging: payables.aging,
      discountSavings: payables.totalDiscountSavings,
    },
    concentration: {
      top1CustomerShare: sys5.top1CustShare,
      top3CustomerShare: sys5.top3CustShare,
      top1VendorShare: sys5.top1VendorShare,
      top3VendorShare: sys5.top3VendorShare,
    },
    crossDomain: {
      summary: crossDomain.summary || null,
      statuses: crossDomain.statuses || [],
    },
  };
}

export function buildPredictionRows({ ownerId, workspaceId, advisories = [], thresholds = {}, asOfDate, computedData = {} } = {}) {
  if (!ownerId || !workspaceId) return [];
  const date = dateOnly(asOfDate);
  const sharedMetrics = compactMetrics(computedData);

  return advisories
    .filter(item => item?.id)
    .map(item => {
      const priority = String(item.priority || 'LOW').toUpperCase();
      const row = {
        workspace_id: workspaceId,
        owner_id: ownerId,
        rule_id: String(item.id),
        entity_id: item.entityId == null ? null : String(item.entityId),
        system_name: item.system || null,
        domain: item.domain || null,
        priority: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(priority) ? priority : 'LOW',
        confidence: Math.max(25, Math.min(95, Math.round(Number(item.confidence || 25)))),
        finding: item.finding || item.title || '',
        reason: item.reason || '',
        risk: item.risk || '',
        recommended_action: item.recommendedAction || item.action || '',
        contributors: Array.isArray(item.contributors) ? item.contributors : [],
        input_snapshot: {
          asOfDate: date,
          entityId: item.entityId ?? null,
          metrics: sharedMetrics,
        },
        config_snapshot: thresholds,
        calculation_version: INTELLIGENCE_HISTORY_VERSION,
      };

      return {
        ...row,
        fingerprint: deterministicFingerprint({
          date,
          ruleId: row.rule_id,
          entityId: row.entity_id,
          priority: row.priority,
          finding: row.finding,
          reason: row.reason,
          risk: row.risk,
          recommendedAction: row.recommended_action,
          contributors: row.contributors,
          config: thresholds,
          metrics: sharedMetrics,
          version: INTELLIGENCE_HISTORY_VERSION,
        }),
      };
    });
}

export function buildMetricSnapshots({ ownerId, workspaceId, asOfDate, computedData = {} } = {}) {
  if (!ownerId || !workspaceId) return [];
  const date = dateOnly(asOfDate);
  const month = `${date.slice(0, 7)}-01`;
  const metrics = compactMetrics(computedData);

  return [
    {
      workspace_id: workspaceId,
      owner_id: ownerId,
      snapshot_type: 'daily_metrics',
      snapshot_date: date,
      as_of_date: date,
      metrics,
      source: 'decision-engine',
    },
    {
      workspace_id: workspaceId,
      owner_id: ownerId,
      snapshot_type: 'monthly_ccc',
      snapshot_date: month,
      as_of_date: date,
      metrics: metrics.workingCapital,
      source: 'decision-engine',
    },
    {
      workspace_id: workspaceId,
      owner_id: ownerId,
      snapshot_type: 'cash_forecast_30d',
      snapshot_date: date,
      as_of_date: date,
      metrics: metrics.cash,
      source: 'decision-engine',
    },
  ];
}
