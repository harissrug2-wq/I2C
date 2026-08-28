import React from 'react';
import { X, Sliders, RefreshCw, Check, ShieldCheck } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function SettingsModal({ isOpen, onClose }) {
  const { thresholds, updateThreshold, resetThresholds, cashBalance, updateCashBalance } = useData();

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
              Every formula across all 5 Decision Systems updates in real time as you adjust workspace parameters below. Threshold overrides persist without code redeploys.
            </p>
          </div>

          {/* Section 1: Financial & Capital Parameters */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              Financial & Capital Parameters (System 1, 3, 5)
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
                <p className="mt-1 text-[11px] text-muted-foreground">Triggers CASH-001 gap alerts if projected cash drops below.</p>
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
                <p className="mt-1 text-[11px] text-muted-foreground">Used for True Margin cash carrying cost & early-pay APR evaluation.</p>
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

          {/* Section 2: Inventory Parameters */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
              Inventory & Replenishment Controls (System 2)
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-semibold mb-1">Target Service Level</label>
                <select
                  value={thresholds.service_level_z}
                  onChange={(e) => updateThreshold('service_level_z', e.target.value)}
                  className="w-full rounded-lg bg-surface px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488]"
                >
                  <option value={1.28}>90% Service Level (z = 1.28)</option>
                  <option value={1.65}>95% Service Level (z = 1.65)</option>
                  <option value={2.05}>98% Service Level (z = 2.05)</option>
                </select>
                <p className="mt-1 text-[11px] text-muted-foreground">Determines SKU Safety Stock buffer requirement.</p>
              </div>

              <div>
                <label className="block font-semibold mb-1">Stagnant Inventory Threshold (Days)</label>
                <input
                  type="number"
                  value={thresholds.stagnant_days}
                  onChange={(e) => updateThreshold('stagnant_days', e.target.value)}
                  className="w-full rounded-lg bg-surface px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488]"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">Days of quiet sales before SKU is classified as Dead Stock.</p>
              </div>

              <div>
                <label className="block font-semibold mb-1">Inventory Carrying Cost (%)</label>
                <input
                  type="number"
                  step="1"
                  value={Math.round(thresholds.holding_cost_percent * 100)}
                  onChange={(e) => updateThreshold('holding_cost_percent', Number(e.target.value) / 100)}
                  className="w-full rounded-lg bg-surface px-3 py-2 border border-border text-foreground focus:outline-none focus:border-[#0d9488]"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">Annual holding cost rate used in EOQ optimization.</p>
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
                <p className="mt-1 text-[11px] text-muted-foreground">Default LGD for Expected Credit Loss provisioning (System 4).</p>
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
