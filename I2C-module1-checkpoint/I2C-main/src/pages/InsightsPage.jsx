import React from 'react';
import CrossDomainAlerts from '../components/CrossDomainAlerts';
import { Network, Sparkles } from 'lucide-react';

export default function InsightsPage({ onOpenActionModal }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            INTELLIGENCE
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Network className="size-6 text-[#0d9488]" />
            Cross-Domain Insights
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Multi-domain analytical findings that combine receivables, payables, inventory and cashflow data to uncover hidden working capital leakage.
          </p>
        </div>
        <span className="rounded-full bg-[#701a75]/10 px-3 py-1.5 text-xs font-semibold text-[#701a75] flex items-center gap-1.5">
          <Sparkles className="size-3.5" />
          6 active cross-domain rules
        </span>
      </div>

      <CrossDomainAlerts onOpenActionModal={onOpenActionModal} />
    </div>
  );
}
