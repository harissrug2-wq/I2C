import React from 'react';
import { ShieldAlert, ArrowUpRight, WalletCards, ReceiptText, Percent, Gauge } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function KpiMetricsGrid({ onOpenActionModal }) {
  const { sys1, sys4, cashBalance, customers, metrics } = useData();
  const atRiskAccounts=sys4.collectionQueue.filter(c=>c.riskScore>60||c.pastDue>0).length;
  const grossMargin=metrics.revenue30d>0?((metrics.revenue30d-metrics.cogs30d)/metrics.revenue30d)*100:0;
  const cards=[
    {label:'Cash position',value:`$${cashBalance.toLocaleString()}`,sub:`Quick ratio ${sys1.quickRatio}`,icon:WalletCards},
    {label:'Total AR',value:`$${sys4.totalAR.toLocaleString()}`,sub:`${customers.length} accounts · ${sys1.openInvoiceCount} open invoices`,icon:ReceiptText},
    {label:'Money at risk',value:`$${sys4.moneyAtRisk.toLocaleString()}`,sub:`${atRiskAccounts} accounts flagged · ECL $${sys4.totalECL.toLocaleString()}`,icon:ShieldAlert,warning:true,click:true},
    {label:'Gross margin',value:`${grossMargin.toFixed(1)}%`,sub:`CCC ${sys1.ccc} days · target 45`,icon:Percent},
  ];
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(c=>{const Icon=c.icon;return <article key={c.label} onClick={c.click?()=>onOpenActionModal({title:'Money at Risk Protection',type:'at-risk',amount:c.value,details:`${atRiskAccounts} customer accounts are currently flagged by aging and PayScore.`}):undefined} className={`card-surface p-5 transition-colors ${c.click?'cursor-pointer hover:bg-surface/80 border-l-4 border-l-[#d97706]':''}`}><p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"><Icon className={`size-3.5 ${c.warning?'text-[#d97706]':'text-[#0d9488]'}`}/>{c.label}</p><p className={`mt-2 text-2xl sm:text-3xl font-bold ${c.warning?'text-[#d97706]':'text-foreground'}`}>{c.value}</p><p className="mt-1 text-xs text-muted-foreground">{c.sub}</p>{c.click&&<p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0d9488]">Review accounts <ArrowUpRight className="size-3.5"/></p>}</article>})}</div>;
}
