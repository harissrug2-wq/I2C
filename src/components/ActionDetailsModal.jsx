import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldAlert, ArrowRight } from 'lucide-react';

export default function ActionDetailsModal({ actionData, onClose }) {
  const [executed, setExecuted] = useState(false);

  if (!actionData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-card border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#0d9488]/10 text-[#0d9488]">
              <ShieldAlert className="size-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">{actionData.title}</h3>
              <p className="text-[11px] text-muted-foreground">Action recommendation overview</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-card hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {executed ? (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#16a34a]/10 text-[#16a34a]">
                <CheckCircle2 className="size-7" />
              </div>
              <h4 className="text-base font-bold text-foreground">Action Successfully Scheduled</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Rule staged in i2cashflow sandbox. Notification sent to accounting & Brightpearl inventory management.
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
              <div className="rounded-xl bg-surface p-4 border border-border">
                <p className="text-xs font-semibold text-foreground">Target Focus:</p>
                <p className="mt-1 text-xs text-muted-foreground">{actionData.details || actionData.title}</p>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-[#16a34a] shrink-0 mt-0.5" />
                  <span>Verified across QuickBooks open AR invoices and Brightpearl shipment logs.</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="size-4 text-[#f59e0b] shrink-0 mt-0.5" />
                  <span>Staged rule requiring Dana Mercer approval before execution.</span>
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
