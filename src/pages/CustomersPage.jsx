import React, { useMemo, useState } from 'react';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useData } from '../context/DataContext';

const money = value => `$${Math.round(Number(value || 0)).toLocaleString()}`;

export default function CustomersPage() {
  const { sys4 } = useData();
  const [expandedId, setExpandedId] = useState(null);
  const invoiceByCustomer = useMemo(() => {
    const map = new Map();
    (sys4.invoices || []).forEach(inv => {
      if (!map.has(inv.customerId)) map.set(inv.customerId, []);
      map.get(inv.customerId).push(inv);
    });
    return map;
  }, [sys4.invoices]);

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">RECEIVABLES</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2"><Users className="size-6 text-[#0d9488]" /> Customer Accounts ({sys4.creditManagement.length})</h1>
        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">Customer-level AR, aging, payment history, PayScore, credit utilization and invoice ECL drill-down.</p>
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="bg-surface border-b border-border text-muted-foreground uppercase font-semibold"><tr><th className="p-3.5">Customer</th><th className="p-3.5">Open AR</th><th className="p-3.5">Past Due</th><th className="p-3.5">Credit Util.</th><th className="p-3.5">Avg Late</th><th className="p-3.5">PayScore</th><th className="p-3.5">ECL</th><th className="p-3.5"></th></tr></thead>
          <tbody className="divide-y divide-border">
            {sys4.creditManagement.map(c => {
              const expanded = expandedId === c.id;
              const invoices = invoiceByCustomer.get(c.id) || [];
              return <React.Fragment key={c.id}>
                <tr className="hover:bg-surface/50 transition-colors">
                  <td className="p-3.5"><p className="font-bold text-foreground">{c.name}</p><p className="text-[10px] text-muted-foreground">{c.openInvoiceCount} open invoice{c.openInvoiceCount === 1 ? '' : 's'}</p></td>
                  <td className="p-3.5 font-semibold text-foreground">{money(c.balance)}</td>
                  <td className="p-3.5 font-semibold text-[#ef4444]">{money(c.pastDue)}</td>
                  <td className="p-3.5"><span className="font-semibold text-foreground">{c.creditUtilization == null ? '—' : `${c.creditUtilization}%`}</span><p className="text-[10px] text-muted-foreground">Limit {money(c.creditLimit)} · Rec {money(c.recommendedLimit)}</p></td>
                  <td className="p-3.5 text-foreground">{c.avgDaysLate}d <p className="text-[10px] text-muted-foreground">{c.paymentHistoryCount} payments</p></td>
                  <td className="p-3.5"><span className={`inline-flex rounded-full px-2 py-0.5 font-bold text-[10px] ${c.payScoreRiskTier === 'CRITICAL' ? 'bg-[#ef4444]/10 text-[#ef4444]' : c.payScoreRiskTier === 'HIGH' ? 'bg-[#f59e0b]/10 text-[#b45309]' : c.payScoreRiskTier === 'MEDIUM' ? 'bg-[#0d9488]/10 text-[#0d9488]' : 'bg-[#16a34a]/10 text-[#16a34a]'}`}>{c.payScore} · {c.payScoreRiskTier}</span><p className="mt-1 text-[10px] text-muted-foreground">{c.payScoreConfidence}% confidence</p></td>
                  <td className="p-3.5 font-bold text-foreground">{money(c.ecl)}</td>
                  <td className="p-3.5 text-right"><button onClick={() => setExpandedId(expanded ? null : c.id)} className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 font-semibold text-foreground hover:bg-surface cursor-pointer">Details {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}</button></td>
                </tr>
                {expanded && <tr><td colSpan="8" className="bg-surface/40 p-4"><CustomerDetail customer={c} invoices={invoices} /></td></tr>}
              </React.Fragment>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomerDetail({ customer, invoices }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card p-4"><h3 className="text-sm font-bold text-foreground">PayScore basis</h3><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{customer.payScoreBasis}</p><p className="mt-2 text-[10px] font-semibold text-[#f59e0b]">Provisional until the full Intelligence Specification is available.</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><h3 className="text-sm font-bold text-foreground">Aging by bucket</h3><div className="mt-3 grid grid-cols-2 gap-2">{Object.entries(customer.agingBuckets).map(([bucket, value]) => <div key={bucket} className="rounded-lg bg-surface p-2"><p className="text-[10px] text-muted-foreground">{bucket}</p><p className="text-xs font-bold text-foreground">{money(value)}</p></div>)}</div></div>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-x-auto"><table className="w-full min-w-[650px] text-xs"><thead className="bg-surface text-muted-foreground uppercase"><tr><th className="p-3 text-left">Invoice</th><th className="p-3 text-right">Balance</th><th className="p-3 text-right">Days overdue</th><th className="p-3 text-left">Bucket</th><th className="p-3 text-right">PD</th><th className="p-3 text-right">ECL</th></tr></thead><tbody className="divide-y divide-border">{invoices.sort((a,b)=>b.daysOverdue-a.daysOverdue).map(inv => <tr key={inv.invoiceNo}><td className="p-3 font-semibold text-foreground">{inv.invoiceNo}</td><td className="p-3 text-right">{money(inv.balanceDue)}</td><td className="p-3 text-right">{inv.daysOverdue}</td><td className="p-3 text-muted-foreground">{inv.agingBucket}</td><td className="p-3 text-right">{(inv.adjustedPD * 100).toFixed(1)}%</td><td className="p-3 text-right font-bold text-[#ef4444]">{money(inv.ecl)}</td></tr>)}</tbody></table></div>
    </div>
  );
}
