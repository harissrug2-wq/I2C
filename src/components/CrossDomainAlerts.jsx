import React from 'react';
import { Network, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function CrossDomainAlerts({onOpenActionModal}){
  const { advisories } = useData();
  const cards = advisories.filter(a => a.domain === 'Concentration').slice(0,3);
  if (!cards.length) return null;
  return <section className="mt-8">
    <header className="mb-4">
      <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2"><Network className="size-5 text-[#0d9488]"/>Concentration alerts</h2>
      <p className="mt-1 text-xs sm:text-sm text-muted-foreground">Customer and vendor concentration findings from the active workspace. Chained multi-domain recommendations are handled in Cross Domain Intelligence.</p>
    </header>
    <div className="grid gap-4 xl:grid-cols-3">
      {cards.map(c=><article key={`${c.id}-${c.entityId||'workspace'}`} className="rounded-xl bg-card p-5 border border-border border-l-4 border-l-[#0d9488]">
        <div className="flex justify-between gap-3"><span className="rounded-full bg-[#701a75]/10 px-2.5 py-1 text-[11px] font-semibold text-[#701a75]">{c.id}</span><span className="text-[10px] font-semibold text-[#16a34a]">{c.confidence}% confidence</span></div>
        <h3 className="mt-3 text-base font-semibold">{c.finding}</h3>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{c.reason}</p>
        <div className="mt-3 rounded-lg bg-surface p-3 text-xs"><strong className="text-[#0d9488] block mb-1">Recommended action</strong>{c.recommendedAction}</div>
        <button onClick={()=>onOpenActionModal({title:c.id,type:c.id,details:c.finding})} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#0d9488] px-3 py-1.5 text-xs font-semibold text-white"><CheckCircle2 className="size-3.5"/>View details <ArrowUpRight className="size-3"/></button>
      </article>)}
    </div>
  </section>;
}
