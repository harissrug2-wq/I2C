import React from 'react';
import { PlugZap, Database, CircleOff } from 'lucide-react';
export default function ConnectionsPage(){
 const sources=[
  {name:'Manual Data Workspace',type:'Active data source',status:'Active',details:'Customers, invoices, suppliers, bills, payments, products, bank balances and calculation inputs are entered locally.'},
  {name:'QuickBooks Online',type:'Accounting integration',status:'Not connected',details:'Future integration placeholder. The current project does not fetch QuickBooks data.'},
  {name:'Brightpearl ERP',type:'Inventory integration',status:'Not connected',details:'Future integration placeholder. The current project does not fetch Brightpearl data.'},
 ];
 return <div className="space-y-6"><div><p className="mb-1 text-xs font-semibold tracking-[.16em] text-muted-foreground uppercase">DATA</p><h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><PlugZap className="size-6 text-[#0d9488]"/>Connections</h1><p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">The repaired project operates fully in manual-data mode. External integrations can be added later without changing the calculation layer.</p></div><div className="grid gap-4 md:grid-cols-3">{sources.map(s=><div key={s.name} className="card-surface p-5"><div className="flex justify-between"><div className="flex size-10 items-center justify-center rounded-xl bg-[#0d9488]/10 text-[#0d9488]">{s.status==='Active'?<Database className="size-5"/>:<CircleOff className="size-5"/>}</div><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${s.status==='Active'?'bg-green-50 text-green-700':'bg-surface text-muted-foreground'}`}>{s.status}</span></div><h3 className="mt-4 font-bold">{s.name}</h3><p className="text-[11px] text-muted-foreground mt-1">{s.type}</p><p className="text-xs text-muted-foreground mt-3 leading-relaxed">{s.details}</p></div>)}</div></div>;
}
