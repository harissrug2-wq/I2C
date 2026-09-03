import React from 'react';
import { ArrowUpRight, CheckCircle2, Clock3, Network, ShieldCheck } from 'lucide-react';
import { useData } from '../context/DataContext';

const priorityClass = priority => ({
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
  HIGH: 'bg-amber-50 text-amber-800 border-amber-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
  LOW: 'bg-surface text-muted-foreground border-border',
}[priority] || 'bg-surface text-muted-foreground border-border');

const statusLabel = status => ({
  operational: 'Operational',
  'waiting-data': 'Waiting for data',
  'waiting-external-data': 'Waiting for external data',
  'waiting-history': 'Waiting for history',
  'waiting-calibration': 'Waiting for calibration',
}[status] || status);

export default function CrossDomainAlerts({ onOpenActionModal, showReadiness = false }) {
  const { crossDomain } = useData();
  const cards = crossDomain?.advisories || [];
  const rules = crossDomain?.rules || [];

  if (!cards.length && !showReadiness) return null;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold sm:text-xl">
            <Network className="size-5 text-[#0d9488]" /> Cross-domain signals
          </h2>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground sm:text-sm">
            Findings that only become visible when receivables, payables, inventory and cash data are evaluated together.
          </p>
        </div>
        {crossDomain && (
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
            <span className="rounded-full bg-[#0d9488]/10 px-2.5 py-1 text-[#0d9488]">{crossDomain.activeSignalCount} active signal{crossDomain.activeSignalCount === 1 ? '' : 's'}</span>
            {showReadiness && <span className="rounded-full bg-surface px-2.5 py-1 text-muted-foreground ring-1 ring-border">{crossDomain.totalRuleCount} source rules tracked</span>}
          </div>
        )}
      </header>

      {cards.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {cards.map(card => (
            <article key={`${card.id}-${card.entityId || 'workspace'}`} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#701a75]/10 px-2.5 py-1 text-[11px] font-bold text-[#701a75]">{card.id}</span>
                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${priorityClass(card.priority)}`}>{card.priority}</span>
                </div>
                <span className="text-[10px] font-semibold text-[#16a34a]">{card.confidence}% confidence</span>
              </div>

              {card.domains?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {card.domains.map(domain => <span key={domain} className="rounded-md bg-surface px-2 py-1 text-[10px] font-semibold text-muted-foreground">{domain}</span>)}
                </div>
              )}

              <h3 className="mt-3 text-base font-bold text-foreground">{card.finding}</h3>
              <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                <div className="rounded-lg bg-surface p-3"><strong className="mb-1 block text-foreground">Reason</strong><span className="text-muted-foreground">{card.reason}</span></div>
                <div className="rounded-lg bg-surface p-3"><strong className="mb-1 block text-foreground">Risk</strong><span className="text-muted-foreground">{card.risk}</span></div>
              </div>
              <div className="mt-3 rounded-lg border border-[#0d9488]/20 bg-[#0d9488]/5 p-3 text-xs">
                <strong className="mb-1 block text-[#0d9488]">Recommended action</strong>{card.recommendedAction}
              </div>
              {card.contributors?.length > 0 && <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">{card.contributors.join(' · ')}</p>}
              {onOpenActionModal && (
                <button
                  onClick={() => onOpenActionModal({ title: card.id, type: card.id, details: card.finding, reason: card.reason, risk: card.risk, priority: card.priority, confidence: card.confidence })}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0d9488] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0f766e]"
                >
                  <CheckCircle2 className="size-3.5" /> View details <ArrowUpRight className="size-3" />
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-xs text-emerald-900">
          <div className="flex items-center gap-2 font-bold"><ShieldCheck className="size-4" /> No cross-domain rule is firing on the current workspace.</div>
          <p className="mt-1 text-emerald-800">Rule readiness is shown below so missing data or deferred calibration remains explicit.</p>
        </div>
      )}

      {showReadiness && rules.length > 0 && (
        <div className="card-surface overflow-hidden">
          <div className="border-b border-border p-5">
            <h3 className="text-sm font-bold">Rule readiness</h3>
            <p className="mt-1 text-xs text-muted-foreground">Rules never fabricate missing peer data, history or calibration. They activate only when their required inputs exist.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-surface text-[10px] font-semibold uppercase text-muted-foreground"><tr><th className="p-3.5">Rule</th><th className="p-3.5">Severity</th><th className="p-3.5">Readiness</th><th className="p-3.5">Why</th></tr></thead>
              <tbody className="divide-y divide-border">
                {rules.map(rule => (
                  <tr key={rule.id}>
                    <td className="p-3.5 font-bold text-foreground">{rule.id}</td>
                    <td className="p-3.5"><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${priorityClass(rule.severity)}`}>{rule.severity}</span></td>
                    <td className="p-3.5"><span className="inline-flex items-center gap-1.5 font-semibold text-foreground">{rule.status === 'operational' ? <ShieldCheck className="size-3.5 text-emerald-600" /> : <Clock3 className="size-3.5 text-amber-600" />}{statusLabel(rule.status)}</span></td>
                    <td className="p-3.5 text-muted-foreground">{rule.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
