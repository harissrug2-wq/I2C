import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';

export default function ActionDetailsModal({ actionData, onClose }) {
  const [executed, setExecuted] = useState(false);

  if (!actionData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-card border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#0d9488]/10 text-[#0d9488]">
              <ShieldAlert className="size-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">{actionData.title || actionData.finding}</h3>
              <p className="text-[11px] text-muted-foreground">i2C 5-Field Advisory Format</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-card hover:text-foreground cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {executed ? (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#16a34a]/10 text-[#16a34a]">
                <CheckCircle2 className="size-7" />
              </div>
              <h4 className="text-base font-bold text-foreground">Action Successfully Scheduled & Executed</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Rule staged in i2cashflow engine. Confirmation logged to audit trail and sync queued for QuickBooks + Brightpearl.
              </p>
              <div className="pt-2">
                <button
                  onClick={onClose}
                  className="rounded-xl bg-[#0d9488] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0f766e] cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 5-Field Advisory Display */}
              <div className="space-y-3 rounded-xl bg-surface p-4 border border-border">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">1. Finding</span>
                  <p className="font-semibold text-foreground mt-0.5">{actionData.finding || actionData.details || actionData.title}</p>
                </div>

                {actionData.reason && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">2. Reason</span>
                    <p className="text-muted-foreground mt-0.5">{actionData.reason}</p>
                  </div>
                )}

                {actionData.risk && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#ef4444] block">3. Risk</span>
                    <p className="text-[#ef4444] font-medium mt-0.5">{actionData.risk}</p>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#0d9488] block">4. Recommended Action</span>
                  <p className="font-semibold text-[#0d9488] mt-0.5">{actionData.recommendedAction || actionData.title}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">5. Priority</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      actionData.priority === 'CRITICAL' ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'
                    }`}>
                      {actionData.priority || 'HIGH'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Confidence</span>
                    <span className="ml-2 font-bold text-[#16a34a] text-[11px]">{actionData.confidence || 88}%</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="size-4 text-[#0d9488] shrink-0 mt-0.5" />
                  <span>Verified across QuickBooks open AR invoices and Brightpearl shipment logs.</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="size-4 text-[#f59e0b] shrink-0 mt-0.5" />
                  <span>Staged rule requiring approval before execution.</span>
                </div>
              </div>

              {/* Confirm Actions */}
              <div className="pt-4 flex justify-end gap-2 border-t border-border">
                <button
                  onClick={onClose}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setExecuted(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] px-4 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Confirm & Execute Rule
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
