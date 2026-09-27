import React, { useState } from 'react';
import { X, Sliders, RefreshCw, Check, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function SettingsModal({ isOpen, onClose }) {
  const {
    thresholds, updateThreshold, resetThresholds, cashBalance, updateCashBalance,
    ruleOverrides, ruleOverrideStatus, upsertRuleOverride, removeRuleOverride,
  } = useData();
  const [overrideDraft, setOverrideDraft] = useState({
    rule_id: '',
    entity_type: '',
    entity_id: '',
    threshold_key: '',
    threshold_value: '',
    suppressed: true,
    override_reason: '',
  });
  const [overrideError, setOverrideError] = useState('');

  const saveOverride = async () => {
    setOverrideError('');
    try {
      await upsertRuleOverride({
        ...overrideDraft,
        threshold_value: overrideDraft.threshold_key
          ? Number(overrideDraft.threshold_value)
          : null,
      });
      setOverrideDraft({
        rule_id: '',
        entity_type: '',
        entity_id: '',
        threshold_key: '',
        threshold_value: '',
        suppressed: true,
        override_reason: '',
      });
    } catch (error) {
      setOverrideError(error?.message || 'Unable to save rule override.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="card-surface w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-[#0d9488]/10 p-2 text-[#0d9488]">
              <Sliders className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Workspace Rules & Thresholds Config</h2>
              <p className="text-xs text-muted-foreground">Section 7 JSON Configuration & Override Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-foreground">
          <div className="rounded-xl bg-[#0d9488]/10 p-4 border border-[#0d9488]/20 flex items-start gap-3">
            <ShieldCheck className="size-5 text-[#0d9488] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Calculation parameters update in real time and persist to this authenticated workspace. Threshold changes are written to the workspace audit trail.
            </p>
          </div>

          {/* Section 1: Financial & Capital Parameters */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              Financial & Capital Parameters
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-semibold mb-1">Operating Cash Floor ($)</label>
                <input
                  type="number"
                  step="10000"
                  value={thresholds.operating_cash_floor}
                  onChange={(e) => updateThreshold('operating_cash_floor', e.target.value)}
                  className="w-full rounded-lg bg-surface px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488]"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">Visual operating floor for planning. CASH-001 follows the design spec and fires only when projected cash goes below $0 within 30 days.</p>
              </div>

              <div>
                <label className="block font-semibold mb-1">Annual Cost of Capital (%)</label>
                <input
                  type="number"
                  step="1"
                  value={Math.round(thresholds.cost_of_capital * 100)}
                  onChange={(e) => updateThreshold('cost_of_capital', Number(e.target.value) / 100)}
                  className="w-full rounded-lg bg-surface px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488]"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">Retained for financing and margin calculations. Payables discount visibility is handled separately from chained funding optimisation.</p>
              </div>

              <div>
                <label className="block font-semibold mb-1">Target CCC (Days)</label>
                <input
                  type="number"
                  value={thresholds.target_ccc}
                  onChange={(e) => updateThreshold('target_ccc', e.target.value)}
                  className="w-full rounded-lg bg-surface px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488]"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">Target Cash Conversion Cycle to calculate Cash Freed opportunity.</p>
              </div>

              <div>
                <label className="block font-semibold mb-1">Live Operating Cash Position ($)</label>
                <input
                  type="number"
                  step="50000"
                  value={cashBalance}
                  onChange={(e) => updateCashBalance(e.target.value)}
                  className="w-full rounded-lg bg-surface px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488]"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">Simulate cash injection or withdrawal across all 5 systems.</p>
              </div>
            </div>
          </div>

          {/* Inventory Parameters */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              Inventory & Replenishment Controls
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['service_level_z_a','Class A Service Level',2.05],
                ['service_level_z_b','Class B Service Level',1.65],
                ['service_level_z_c','Class C Service Level',1.28],
              ].map(([key,label,fallback]) => (
                <div key={key}>
                  <label className="block font-semibold mb-1">{label}</label>
                  <select
                    value={thresholds[key] ?? fallback}
                    onChange={(e) => updateThreshold(key, e.target.value)}
                    className="w-full rounded-lg bg-surface px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488]"
                  >
                    <option value={1.28}>90% Service Level (z = 1.28)</option>
                    <option value={1.65}>95% Service Level (z = 1.65)</option>
                    <option value={2.05}>98% Service Level (z = 2.05)</option>
                  </select>
                  <p className="mt-1 text-[11px] text-muted-foreground">Safety-stock target for this ABC class.</p>
                </div>
              ))}

              <div>
                <label className="block font-semibold mb-1">Stagnant Inventory Threshold (Days)</label>
                <input
                  type="number"
                  value={thresholds.stagnant_days}
                  onChange={(e) => updateThreshold('stagnant_days', e.target.value)}
                  className="w-full rounded-lg bg-surface px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488]"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">Days with no sales before a stocked SKU is flagged as stagnant inventory.</p>
              </div>

              <div>
                <label className="block font-semibold mb-1">Bad Debt Loss Given Default (LGD %)</label>
                <input
                  type="number"
                  step="5"
                  value={Math.round(thresholds.lgd_default * 100)}
                  onChange={(e) => updateThreshold('lgd_default', Number(e.target.value) / 100)}
                  className="w-full rounded-lg bg-surface px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488]"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">Default LGD used for Expected Credit Loss provisioning.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              Rule Overrides & Suppression
            </h3>

            <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Create a workspace-wide override or scope it to a customer, SKU, vendor, invoice, or bill. Suppressed rules are removed from the active advisory feed; threshold overrides feed the decision engine before rules are evaluated.
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={overrideDraft.rule_id}
                  onChange={(e) => setOverrideDraft(p => ({ ...p, rule_id: e.target.value }))}
                  placeholder="Rule ID e.g. WCM-010"
                  className="w-full rounded-lg bg-card px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488]"
                />
                <select
                  value={overrideDraft.entity_type}
                  onChange={(e) => setOverrideDraft(p => ({ ...p, entity_type: e.target.value }))}
                  className="w-full rounded-lg bg-card px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488]"
                >
                  <option value="">Workspace-wide</option>
                  <option value="customer">Customer</option>
                  <option value="sku">SKU</option>
                  <option value="vendor">Vendor</option>
                  <option value="invoice">Invoice</option>
                  <option value="bill">Bill</option>
                </select>

                <input
                  value={overrideDraft.entity_id}
                  onChange={(e) => setOverrideDraft(p => ({ ...p, entity_id: e.target.value }))}
                  placeholder="Entity ID (optional)"
                  disabled={!overrideDraft.entity_type}
                  className="w-full rounded-lg bg-card px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488] disabled:opacity-50"
                />
                <input
                  value={overrideDraft.threshold_key}
                  onChange={(e) => setOverrideDraft(p => ({ ...p, threshold_key: e.target.value }))}
                  placeholder="Threshold key (optional)"
                  className="w-full rounded-lg bg-card px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488]"
                />
                <input
                  type="number"
                  value={overrideDraft.threshold_value}
                  onChange={(e) => setOverrideDraft(p => ({ ...p, threshold_value: e.target.value }))}
                  placeholder="Threshold value"
                  disabled={!overrideDraft.threshold_key}
                  className="w-full rounded-lg bg-card px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488] disabled:opacity-50"
                />
                <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={overrideDraft.suppressed}
                    onChange={(e) => setOverrideDraft(p => ({ ...p, suppressed: e.target.checked }))}
                  />
                  Suppress matching rule
                </label>
              </div>

              <input
                value={overrideDraft.override_reason}
                onChange={(e) => setOverrideDraft(p => ({ ...p, override_reason: e.target.value }))}
                placeholder="Reason / approval note"
                className="w-full rounded-lg bg-card px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488]"
              />

              {overrideError && <p className="text-[11px] font-semibold text-red-600">{overrideError}</p>}

              <button
                type="button"
                onClick={saveOverride}
                disabled={!overrideDraft.rule_id.trim() || ruleOverrideStatus === 'saving'}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#701a75] px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Plus className="size-3.5" />
                {ruleOverrideStatus === 'saving' ? 'Saving…' : 'Add Override'}
              </button>
            </div>

            <div className="space-y-2">
              {(ruleOverrides || []).length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-3 py-3 text-[11px] text-muted-foreground">
                  No rule overrides configured for this workspace.
                </div>
              ) : (ruleOverrides || []).map(row => (
                <div key={row.id} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-3 py-3">
                  <div className="min-w-0">
                    <div className="font-bold text-foreground">
                      {row.rule_id}
                      {row.suppressed ? ' · suppressed' : ''}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {row.entity_type ? `${row.entity_type}: ${row.entity_id || 'all'}` : 'Workspace-wide'}
                      {row.threshold_key ? ` · ${row.threshold_key} = ${JSON.stringify(row.threshold_value)}` : ''}
                    </div>
                    {row.override_reason && <div className="mt-1 text-[11px] text-muted-foreground">{row.override_reason}</div>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRuleOverride(row.id)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                    aria-label={`Delete ${row.rule_id} override`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Cross-Domain Intelligence Controls */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              Cross-Domain Intelligence
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-semibold mb-1">Inventory Hostage Threshold (x Median Invoice)</label>
                <input type="number" min="0" step="0.1" value={thresholds.xd_inventory_hostage_multiplier ?? 1.5} onChange={(e) => updateThreshold('xd_inventory_hostage_multiplier', e.target.value)} className="w-full rounded-lg bg-surface px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488]" />
                <p className="mt-1 text-[11px] text-muted-foreground">Overdue-customer inventory exposure above this multiple can trigger an inventory-hostage signal.</p>
              </div>
              <div>
                <label className="block font-semibold mb-1">High-Risk SKU Customer Share (%)</label>
                <input type="number" min="0" max="100" step="1" value={Math.round((thresholds.xd_risky_sku_customer_share ?? 0.60) * 100)} onChange={(e) => updateThreshold('xd_risky_sku_customer_share', Number(e.target.value) / 100)} className="w-full rounded-lg bg-surface px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488]" />
                <p className="mt-1 text-[11px] text-muted-foreground">Observed SKU sales share to customers with PayScore above 60.</p>
              </div>
              <div>
                <label className="block font-semibold mb-1">Write-Off Inventory Recovery Floor ($)</label>
                <input type="number" min="0" step="100" value={thresholds.xd_writeoff_inventory_min ?? 2000} onChange={(e) => updateThreshold('xd_writeoff_inventory_min', e.target.value)} className="w-full rounded-lg bg-surface px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488]" />
                <p className="mt-1 text-[11px] text-muted-foreground">Minimum tracked inventory cost before physical recovery is recommended ahead of a write-off.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-border bg-surface px-6 py-4">
          <button
            onClick={resetThresholds}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
            Reset Defaults
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer shadow-2xs"
          >
            <Check className="size-4" />
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
