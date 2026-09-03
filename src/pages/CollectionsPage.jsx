import React from 'react';
import { ListOrdered, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';

const tierClass = tier => tier === 'P1' ? 'bg-[#ef4444]/10 text-[#ef4444]' : tier === 'P2' ? 'bg-[#f59e0b]/10 text-[#b45309]' : tier === 'P3' ? 'bg-[#0d9488]/10 text-[#0d9488]' : 'bg-surface text-muted-foreground';

export default function CollectionsPage({ onOpenActionModal }) {
  const { sys4 } = useData();
  const queue = sys4.invoiceCollectionQueue || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">RECEIVABLES</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <ListOrdered className="size-6 text-[#0d9488]" /> Collections Priority Queue
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">Open invoices ranked by aging, amount exposure, customer PayScore, payment history and disputes.</p>
        </div>
      </div>

      <div className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-4 text-xs text-foreground flex gap-3">
        <AlertTriangle className="size-4 shrink-0 text-[#f59e0b]" />
        <div><strong>Priority score calibration is provisional.</strong> The source defines the score components and P1/P2/P3 thresholds, while the latest test workbook also gives the expected invoice-level chase order. The queue keeps both inputs explainable.</div>
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-xs">
          <thead className="bg-surface border-b border-border text-muted-foreground uppercase font-semibold">
            <tr>
              <th className="p-3.5">Rank</th><th className="p-3.5">Invoice</th><th className="p-3.5">Customer</th><th className="p-3.5">Open Balance</th><th className="p-3.5">Aging</th><th className="p-3.5">PayScore</th><th className="p-3.5">Priority</th><th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {queue.map((item, idx) => (
              <tr key={item.invoiceNo || item.id} className="hover:bg-surface/50 transition-colors align-top">
                <td className="p-3.5 font-bold text-[#0d9488]">#{idx + 1}</td>
                <td className="p-3.5"><p className="font-bold text-foreground">{item.invoiceNo}</p><p className="mt-1 text-[10px] text-muted-foreground">Due {item.dueDate || '—'}</p></td>
                <td className="p-3.5"><p className="font-bold text-foreground">{item.customerName}</p><p className="mt-1 text-[10px] text-muted-foreground">{item.customerId}</p></td>
                <td className="p-3.5 font-semibold text-foreground">${Number(item.balanceDue || 0).toLocaleString()}</td>
                <td className="p-3.5"><span className={Number(item.daysOverdue || 0) > 0 ? 'font-semibold text-[#ef4444]' : 'font-semibold text-[#0d9488]'}>{Number(item.daysOverdue || 0) > 0 ? `${item.daysOverdue} days late` : 'Not yet due'}</span><p className="mt-1 text-[10px] text-muted-foreground">{item.agingBucket}</p></td>
                <td className="p-3.5"><span className="font-bold text-foreground">{item.payScore}</span></td>
                <td className="p-3.5"><span className={`inline-flex rounded-full px-2 py-0.5 font-bold ${tierClass(item.priorityTier)}`}>{item.priorityTier} · {item.priorityScore}</span><p className="mt-1 max-w-[250px] text-[10px] leading-relaxed text-muted-foreground">{item.priorityFactors?.map(f => `${f.name} ${f.value}`).join(' · ')}</p></td>
                <td className="p-3.5 text-right"><button onClick={() => onOpenActionModal({ title: item.action, details: `${item.invoiceNo} · ${item.customerName} · Open balance $${Number(item.balanceDue || 0).toLocaleString()} · PayScore ${item.payScore}`, reason: `${item.daysOverdue || 0} days overdue; aging bucket ${item.agingBucket}`, risk: `Open exposure $${Number(item.balanceDue || 0).toLocaleString()}`, priority: item.priorityTier, confidence: 75 })} className="inline-flex rounded-lg bg-[#0d9488] px-3 py-1.5 font-semibold text-white hover:bg-[#0f766e] cursor-pointer">{item.action}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
