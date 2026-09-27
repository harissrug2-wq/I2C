import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createEmptyWorkspaceData } from '../data/emptyWorkspace';
import { buildEngineInputs } from '../domain/dataAdapters';
import { DEFAULT_THRESHOLDS, computeSystem1, computeSystem2, computeSystem3, computeSystem4, computeSystem5, evaluateRules } from '../utils/decisionSystems';
import { evaluateReceivablesRules } from '../domain/receivables';
import { computePayablesModule, evaluatePayablesRules } from '../domain/payables';
import { computeCrossDomainIntelligence } from '../domain/crossDomain';
import { applyProviderSync, disconnectProvider, getIntegrationSummary } from '../domain/integrations';
import { loadWorkspaceState, saveWorkspaceState, logAuditEvent, persistPredictionLogs, upsertMetricSnapshots, loadRuleOverrides, saveRuleOverride, deleteRuleOverride } from '../domain/workspaceRepository';
import { buildMetricSnapshots, buildPredictionRows } from '../domain/intelligenceHistory';
import { applyRuleOverrides, buildEffectiveThresholds, normalizeRuleOverride } from '../domain/ruleOverrides';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export function DataProvider({ children }) {
  const { user, authUser, loading: authLoading, signOut, isConfigured } = useAuth();
  const [thresholds, setThresholds] = useState({ ...DEFAULT_THRESHOLDS });
  const [workspaceData, setWorkspaceData] = useState(createEmptyWorkspaceData);
  const [workspaceId, setWorkspaceId] = useState(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [ruleOverrides, setRuleOverrides] = useState([]);
  const [ruleOverrideStatus, setRuleOverrideStatus] = useState('idle');
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef(null);
  const thresholdsRef = useRef(thresholds);
  const thresholdAuditRef = useRef(new Map());
  const historyTimerRef = useRef(null);

  useEffect(() => {
    thresholdsRef.current = thresholds;
  }, [thresholds]);

  useEffect(() => {
    if (authLoading) return;

    if (!authUser?.id) {
      hydratedRef.current = false;
      setWorkspaceId(null);
      setWorkspaceData(createEmptyWorkspaceData());
      setThresholds({ ...DEFAULT_THRESHOLDS });
      setWorkspaceLoading(false);
      setWorkspaceError('');
      setSaveStatus('idle');
      setRuleOverrides([]);
      setRuleOverrideStatus('idle');
      return;
    }

    let cancelled = false;
    hydratedRef.current = false;
    setWorkspaceLoading(true);
    setWorkspaceError('');

    loadWorkspaceState(authUser.id)
      .then(async row => {
        if (cancelled) return;
        const overrides = await loadRuleOverrides({ userId: authUser.id, workspaceId: row.workspace_id });
        if (cancelled) return;
        setWorkspaceId(row.workspace_id);
        setWorkspaceData(row.data && typeof row.data === 'object' ? row.data : createEmptyWorkspaceData());
        setThresholds({ ...DEFAULT_THRESHOLDS, ...(row.thresholds || {}) });
        setRuleOverrides(overrides);
        setRuleOverrideStatus('saved');
        setSaveStatus('saved');
        hydratedRef.current = true;
      })
      .catch(error => {
        if (cancelled) return;
        setWorkspaceError(error?.message || 'Unable to load your workspace.');
      })
      .finally(() => {
        if (!cancelled) setWorkspaceLoading(false);
      });

    return () => { cancelled = true; };
  }, [authUser?.id, authLoading]);

  useEffect(() => {
    if (!hydratedRef.current || !authUser?.id || !workspaceId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveWorkspaceState({
          userId: authUser.id,
          workspaceId,
          data: workspaceData,
          thresholds,
        });
        setSaveStatus('saved');
        setWorkspaceError('');
      } catch (error) {
        setSaveStatus('error');
        setWorkspaceError(error?.message || 'Unable to save workspace changes.');
      }
    }, 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [workspaceData, thresholds, authUser?.id, workspaceId]);

  const engine = useMemo(() => buildEngineInputs(workspaceData), [workspaceData]);
  const effectiveThresholds = useMemo(() => buildEffectiveThresholds(thresholds, ruleOverrides), [thresholds, ruleOverrides]);
  const integrationSummary = useMemo(() => getIntegrationSummary(workspaceData), [workspaceData]);
  const computedData = useMemo(() => {
    const sys1 = computeSystem1(engine.cashBalance, engine.invoices, engine.products, engine.bills, engine.metrics, effectiveThresholds);
    const sys2 = computeSystem2(engine.products, effectiveThresholds);
    const sys4Base = computeSystem4(engine.customers, engine.invoices, engine.bills, engine.vendors, effectiveThresholds);
    const payScoreByCustomer = new Map(sys4Base.collectionQueue.map(c => [c.id, c.payScore]));
    const cashInvoices = engine.invoices.map(i => ({ ...i, riskScore: payScoreByCustomer.get(i.customerId) ?? i.riskScore }));
    const sys3 = computeSystem3(engine.cashBalance, cashInvoices, engine.bills, engine.metrics, engine.asOfDate, effectiveThresholds);
    const payables = computePayablesModule(engine.bills, engine.vendors, engine.cashBalance, effectiveThresholds);
    const sys4 = {
      ...sys4Base,
      payables,
      bills: payables.bills,
      vendors: payables.suppliers,
      discountOpportunities: payables.discountOpportunities.map(d => ({ ...d, savings: d.discountSavings, isProfitableToTake: d.aprQualified })),
      totalDiscountSavings: payables.totalDiscountSavings,
    };
    const sys5 = computeSystem5(engine.products, engine.customers, engine.vendors, effectiveThresholds);
    const crossDomain = computeCrossDomainIntelligence({ workspace: workspaceData, sys1, sys2, sys3, sys4, thresholds: effectiveThresholds });
    const phase1Advisories = evaluateRules(sys1, sys2, sys3, sys4, sys5, effectiveThresholds);
    const receivablesAdvisories = evaluateReceivablesRules(sys4.receivables || sys4);
    const payablesAdvisories = evaluatePayablesRules(payables, sys3, effectiveThresholds, { includeAP002: false, includeAP003: false, includeAP004: false });
    const advisories = applyRuleOverrides([...phase1Advisories, ...receivablesAdvisories, ...payablesAdvisories, ...crossDomain.advisories], ruleOverrides);
    return { sys1, sys2, sys3, sys4, sys5, crossDomain, advisories };
  }, [engine, effectiveThresholds, workspaceData, ruleOverrides]);

  const updateThreshold = (key, value) => {
    const nextValue = Number(value);
    const previousValue = thresholdsRef.current[key];
    thresholdsRef.current = { ...thresholdsRef.current, [key]: nextValue };
    setThresholds(prev => ({ ...prev, [key]: nextValue }));

    if (!hydratedRef.current || !authUser?.id || !workspaceId || Number(previousValue) === nextValue) return;

    const pending = thresholdAuditRef.current.get(key);
    if (pending?.timer) clearTimeout(pending.timer);
    const originalValue = pending ? pending.originalValue : previousValue;

    const timer = setTimeout(async () => {
      try {
        await logAuditEvent({
          userId: authUser.id,
          workspaceId,
          eventType: 'threshold_changed',
          fieldName: key,
          oldValue: originalValue,
          newValue: nextValue,
          reason: 'Workspace threshold updated from Rules & Thresholds settings.',
        });
      } catch (error) {
        console.warn('Unable to write threshold audit event:', error);
      } finally {
        thresholdAuditRef.current.delete(key);
      }
    }, 700);

    thresholdAuditRef.current.set(key, { originalValue, latestValue: nextValue, timer });
  };

  const resetThresholds = () => {
    const previous = thresholdsRef.current;
    const next = { ...DEFAULT_THRESHOLDS };
    thresholdsRef.current = next;
    setThresholds(next);

    if (hydratedRef.current && authUser?.id && workspaceId) {
      logAuditEvent({
        userId: authUser.id,
        workspaceId,
        eventType: 'thresholds_reset',
        oldValue: previous,
        newValue: next,
        reason: 'Workspace thresholds reset to defaults.',
      }).catch(error => console.warn('Unable to write threshold reset audit event:', error));
    }
  };
  const upsertRuleOverride = async input => {
    if (!authUser?.id || !workspaceId) throw new Error('Authenticated workspace is not available.');
    const normalized = normalizeRuleOverride(input);
    if (!normalized.rule_id) throw new Error('Rule ID is required.');

    setRuleOverrideStatus('saving');
    try {
      const saved = await saveRuleOverride({
        userId: authUser.id,
        workspaceId,
        override: { ...normalized, id: input.id || null },
      });

      setRuleOverrides(prev => {
        const exists = prev.some(row => row.id === saved.id);
        return exists ? prev.map(row => row.id === saved.id ? saved : row) : [saved, ...prev];
      });

      await logAuditEvent({
        userId: authUser.id,
        workspaceId,
        eventType: input.id ? 'rule_override_updated' : 'rule_override_created',
        ruleId: saved.rule_id,
        entityType: saved.entity_type,
        entityId: saved.entity_id,
        newValue: {
          threshold_key: saved.threshold_key,
          threshold_value: saved.threshold_value,
          suppressed: saved.suppressed,
        },
        reason: saved.override_reason || 'Rule override changed.',
      });

      setRuleOverrideStatus('saved');
      return saved;
    } catch (error) {
      setRuleOverrideStatus('error');
      throw error;
    }
  };

  const removeRuleOverride = async id => {
    const existing = ruleOverrides.find(row => row.id === id);
    if (!existing || !authUser?.id || !workspaceId) return;

    setRuleOverrideStatus('saving');
    try {
      await deleteRuleOverride({ userId: authUser.id, workspaceId, id });
      setRuleOverrides(prev => prev.filter(row => row.id !== id));

      await logAuditEvent({
        userId: authUser.id,
        workspaceId,
        eventType: 'rule_override_deleted',
        ruleId: existing.rule_id,
        entityType: existing.entity_type,
        entityId: existing.entity_id,
        oldValue: {
          threshold_key: existing.threshold_key,
          threshold_value: existing.threshold_value,
          suppressed: existing.suppressed,
        },
        reason: existing.override_reason || 'Rule override removed.',
      });

      setRuleOverrideStatus('saved');
    } catch (error) {
      setRuleOverrideStatus('error');
      throw error;
    }
  };

  const logoutUser = () => signOut();

  const updateDataset = (key, next) => setWorkspaceData(prev => ({ ...prev, [key]: typeof next === 'function' ? next(prev[key]) : next }));
  const updateCompanyMetrics = patch => setWorkspaceData(prev => ({ ...prev, companyMetrics: { ...prev.companyMetrics, ...patch } }));
  const updateCashBalance = value => setWorkspaceData(prev => {
    const accounts = [...(prev.bankAccounts || [])];
    if (!accounts.length) accounts.push({ account_id: 'BANK-001', account_code: '1000', name: 'Operating Account', type: 'checking', institution: 'Manual', balance: Number(value) });
    else {
      const total = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
      const diff = Number(value) - total;
      accounts[0] = { ...accounts[0], balance: Number(accounts[0].balance || 0) + diff };
    }
    return { ...prev, bankAccounts: accounts };
  });
  const resetWorkspace = () => setWorkspaceData(createEmptyWorkspaceData());
  const replaceWorkspace = data => setWorkspaceData(data);
  const syncIntegrationPayload = (providerId, payload, options = {}) => {
    const result = applyProviderSync(workspaceData, providerId, payload, options);
    setWorkspaceData(result.workspace);
    return result;
  };
  const disconnectIntegration = (providerId, options = {}) => {
    const next = disconnectProvider(workspaceData, providerId, options);
    setWorkspaceData(next);
    return next;
  };
  const hasWorkspaceData = Boolean(
    workspaceData.customers?.length || workspaceData.suppliers?.length || workspaceData.invoices?.length ||
    workspaceData.bills?.length || workspaceData.products?.length || workspaceData.bankAccounts?.length ||
    workspaceData.paymentsReceived?.length || workspaceData.paymentsMade?.length
  );

  useEffect(() => {
    if (!hydratedRef.current || !authUser?.id || !workspaceId || !hasWorkspaceData) return;

    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);

    historyTimerRef.current = setTimeout(async () => {
      try {
        const predictionRows = buildPredictionRows({
          ownerId: authUser.id,
          workspaceId,
          advisories: computedData.advisories,
          thresholds: effectiveThresholds,
          asOfDate: engine.asOfDate,
          computedData,
        });

        const snapshots = buildMetricSnapshots({
          ownerId: authUser.id,
          workspaceId,
          asOfDate: engine.asOfDate,
          computedData,
        });

        await Promise.all([
          persistPredictionLogs({ workspaceId, rows: predictionRows }),
          upsertMetricSnapshots({ snapshots }),
        ]);
      } catch (error) {
        console.warn('Unable to persist intelligence history:', error);
      }
    }, 900);

    return () => {
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    };
  }, [authUser?.id, workspaceId, hasWorkspaceData, engine.asOfDate, computedData, effectiveThresholds]);

  const value = {
    user,
    logoutUser,
    authLoading,
    isAuthConfigured: isConfigured,
    workspaceId,
    workspaceLoading,
    workspaceError,
    saveStatus,
    thresholds,
    effectiveThresholds,
    ruleOverrides,
    ruleOverrideStatus,
    upsertRuleOverride,
    removeRuleOverride,
    updateThreshold,
    resetThresholds,
    workspaceData,
    integrationSummary,
    syncIntegrationPayload,
    disconnectIntegration,
    updateDataset,
    updateCompanyMetrics,
    resetWorkspace,
    replaceWorkspace,
    hasWorkspaceData,
    cashBalance: engine.cashBalance,
    customers: engine.customers,
    invoices: engine.invoices,
    products: engine.products,
    bills: engine.bills,
    vendors: engine.vendors,
    metrics: engine.metrics,
    asOfDate: engine.asOfDate,
    updateCashBalance,
    ...computedData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const c = useContext(DataContext);
  if (!c) throw new Error('useData must be used within DataProvider');
  return c;
}
