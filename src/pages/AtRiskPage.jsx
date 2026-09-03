import React from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function AtRiskPage({ onOpenActionModal }) {
  const { sys4 } = useData();
  const atRiskAccounts = sys4.collectionQueue.filter(c => c.payScore >= 60 || c.maxDaysOverdue > 60).slice(0, 4);

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">RECEIVABLES</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2"><ShieldAlert className="size-6 text-[#ef4444]" /> Money at Risk (${(sys4.moneyAtRisk / 1000).toFixed(0)}K)</h1>
        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">Receivable risk only: payment behaviour, aging and ECL. Inventory-linked recovery signals are handled in Cross Domain Intelligence.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {atRiskAccounts.map(item => (
          <div key={item.id} className="card-surface p-5 border-l-4 border-l-[#ef4444] space-y-3">
            <div className="flex justify-between items-start gap-3">
              <div><span className="text-[10px] font-bold uppercase tracking-wider text-[#ef4444] bg-[#ef4444]/10 px-2 py-0.5 rounded-full">{item.payScoreRiskTier} risk</span><h3 className="text-base font-bold text-foreground mt-2">{item.name}</h3></div>
              <span className="text-lg font-bold text-[#ef4444]">${item.pastDue.toLocaleString()}</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1"><p>Open AR: <strong className="text-foreground">${item.balance.toLocaleString()}</strong></p><p>Expected credit loss: <strong className="text-foreground">${Math.round(item.ecl).toLocaleString()}</strong></p><p>Oldest overdue: <strong className="text-foreground">{item.maxDaysOverdue} days</strong></p><p>PayScore: <strong className="text-foreground">{item.payScore}/100</strong></p></div>
            <p className="text-xs bg-surface p-2.5 rounded-lg border border-border leading-relaxed text-foreground">{item.payScoreBasis}</p>
            <button onClick={() => onOpenActionModal({ title: item.action, details: `${item.name} · ECL $${Math.round(item.ecl).toLocaleString()}`, reason: item.payScoreBasis, risk: `$${item.pastDue.toLocaleString()} past due`, priority: item.priorityTier, confidence: item.payScoreConfidence })} className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"><CheckCircle2 className="size-3.5" />{item.action}</button>
          </div>
        ))}
      </div>

      <div className="card-surface overflow-x-auto">
        <div className="p-4 border-b border-border"><h2 className="text-sm font-bold text-foreground">Highest ECL invoices</h2><p className="text-xs text-muted-foreground">Per-invoice reserve using Decision Systems Design v1 PD/LGD.</p></div>
        <table className="w-full min-w-[760px] text-xs"><thead className="bg-surface text-muted-foreground uppercase"><tr><th className="p-3 text-left">Invoice</th><th className="p-3 text-left">Customer</th><th className="p-3 text-right">Balance</th><th className="p-3 text-right">Age</th><th className="p-3 text-right">Adjusted PD</th><th className="p-3 text-right">ECL</th></tr></thead><tbody className="divide-y divide-border">{[...sys4.invoices].sort((a,b)=>b.ecl-a.ecl).slice(0,8).map(inv=><tr key={inv.invoiceNo}><td className="p-3 font-semibold text-foreground">{inv.invoiceNo}</td><td className="p-3 text-muted-foreground">{inv.customerName}</td><td className="p-3 text-right">${inv.balanceDue.toLocaleString()}</td><td className="p-3 text-right">{inv.daysOverdue}d</td><td className="p-3 text-right">{(inv.adjustedPD*100).toFixed(1)}%</td><td className="p-3 text-right font-bold text-[#ef4444]">${Math.round(inv.ecl).toLocaleString()}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}
