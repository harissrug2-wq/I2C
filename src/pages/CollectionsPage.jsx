import React from 'react';
import { ListOrdered, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';

const tierClass = tier => tier === 'P1' ? 'bg-[#ef4444]/10 text-[#ef4444]' : tier === 'P2' ? 'bg-[#f59e0b]/10 text-[#b45309]' : tier === 'P3' ? 'bg-[#0d9488]/10 text-[#0d9488]' : 'bg-surface text-muted-foreground';

export default function CollectionsPage({ onOpenActionModal }) {
  const { sys4 } = useData();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">RECEIVABLES</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <ListOrdered className="size-6 text-[#0d9488]" /> Collections Priority Queue
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">Ranked from live AR age, amount exposure, PayScore, payment history and disputes.</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-4 text-xs text-foreground flex gap-3">
        <AlertTriangle className="size-4 shrink-0 text-[#f59e0b]" />
        <div><strong>Priority score calibration is provisional.</strong> The source defines the five score components and P1/P2/P3 thresholds, but not every calibrated component weight. The factor breakdown is visible per row so the ranking is explainable.</div>
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="bg-surface border-b border-border text-muted-foreground uppercase font-semibold">
            <tr>
              <th className="p-3.5">Rank</th><th className="p-3.5">Customer</th><th className="p-3.5">Open AR</th><th className="p-3.5">Past Due</th><th className="p-3.5">Avg Late</th><th className="p-3.5">PayScore</th><th className="p-3.5">Priority</th><th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sys4.collectionQueue.map((item, idx) => (
              <tr key={item.id} className="hover:bg-surface/50 transition-colors align-top">
                <td className="p-3.5 font-bold text-[#0d9488]">#{idx + 1}</td>
                <td className="p-3.5"><p className="font-bold text-foreground">{item.name}</p><p className="mt-1 text-[10px] text-muted-foreground">Oldest {item.maxDaysOverdue}d · {item.openInvoiceCount} open invoice{item.openInvoiceCount === 1 ? '' : 's'}</p></td>
                <td className="p-3.5 font-semibold text-foreground">${item.balance.toLocaleString()}</td>
                <td className="p-3.5 font-semibold text-[#ef4444]">${item.pastDue.toLocaleString()}</td>
                <td className="p-3.5 text-foreground">{item.avgDaysLate}d</td>
                <td className="p-3.5"><span className="font-bold text-foreground">{item.payScore}</span><p className="text-[10px] text-muted-foreground">{item.payScoreRiskTier} · {item.payScoreConfidence}% conf.</p></td>
                <td className="p-3.5"><span className={`inline-flex rounded-full px-2 py-0.5 font-bold ${tierClass(item.priorityTier)}`}>{item.priorityTier} · {item.priorityScore}</span><p className="mt-1 max-w-[230px] text-[10px] leading-relaxed text-muted-foreground">{item.priorityFactors.map(f => `${f.name} ${f.value}`).join(' · ')}</p></td>
                <td className="p-3.5 text-right"><button onClick={() => onOpenActionModal({ title: item.action, details: `${item.name} · Open AR $${item.balance.toLocaleString()} · PayScore ${item.payScore} · ${item.maxDaysOverdue} days oldest overdue`, reason: item.payScoreBasis, risk: `Past-due exposure $${item.pastDue.toLocaleString()}`, priority: item.priorityTier, confidence: item.payScoreConfidence })} className="inline-flex rounded-lg bg-[#0d9488] px-3 py-1.5 font-semibold text-white hover:bg-[#0f766e] cursor-pointer">{item.action}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
