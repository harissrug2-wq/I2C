import React from 'react';
import { Network, Sparkles } from 'lucide-react';
import CrossDomainAlerts from '../components/CrossDomainAlerts';
import { useData } from '../context/DataContext';

export default function InsightsPage({ onOpenActionModal }) {
  const { crossDomain } = useData();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">INTELLIGENCE</p>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            <Network className="size-6 text-[#0d9488]" /> Cross-Domain Insights
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            Coordinated working-capital intelligence across receivables, payables, inventory and cash. Missing peer data, history or calibrated thresholds remain visibly deferred instead of being guessed.
          </p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-[#701a75]/10 px-3 py-1.5 text-xs font-semibold text-[#701a75]">
          <Sparkles className="size-3.5" /> {crossDomain?.activeSignalCount || 0} active signal{crossDomain?.activeSignalCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Source rules tracked" value={crossDomain?.totalRuleCount || 0} />
        <Metric label="Operational now" value={crossDomain?.operationalRuleCount || 0} />
        <Metric label="Waiting for inputs" value={crossDomain?.waitingRuleCount || 0} />
      </div>

      <CrossDomainAlerts onOpenActionModal={onOpenActionModal} showReadiness />
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="card-surface p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold text-foreground">{value}</p></div>;
}
