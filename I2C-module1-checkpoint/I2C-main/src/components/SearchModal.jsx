import React, { useMemo, useState } from 'react';
import { Search, X, Users, Building2, Package, ArrowUpRight } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function SearchModal({ isOpen, onClose, onSelectResult }) {
  const [searchTerm, setSearchTerm] = useState('');
  const { customers, vendors, sys2 } = useData();
  const database = useMemo(() => [
    ...customers.map(c=>({type:'Customer',name:c.name,info:`$${c.balance.toLocaleString()} open AR · PayScore ${c.riskScore}`,category:'Receivables'})),
    ...vendors.map(v=>({type:'Supplier',name:v.name,info:`$${v.apBalance.toLocaleString()} open AP · ${v.terms}`,category:'Payables'})),
    ...sys2.skus.filter(p=>p.status!=='Non-stock').map(p=>({type:'SKU',name:p.name,info:`${p.sku} · $${p.inventoryValue.toLocaleString()} · ${p.status}`,category:'Inventory'})),
  ],[customers,vendors,sys2]);
  if (!isOpen) return null;
  const q=searchTerm.toLowerCase();
  const filteredResults=database.filter(item=>!q||`${item.name} ${item.info} ${item.type}`.toLowerCase().includes(q)).slice(0,30);
  return <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-xs">
    <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-card border border-border shadow-2xl">
      <div className="flex items-center border-b border-border px-4 py-3"><Search className="size-5 text-muted-foreground mr-3"/><input autoFocus value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Type customer name, supplier, or SKU..." className="flex-1 bg-transparent text-sm focus:outline-none"/><button onClick={onClose} className="p-1"><X className="size-5"/></button></div>
      <div className="max-h-96 overflow-y-auto p-3 space-y-1">{filteredResults.length===0?<div className="py-8 text-center text-xs text-muted-foreground">No results found.</div>:filteredResults.map((item,index)=>{const Icon=item.type==='Customer'?Users:item.type==='Supplier'?Building2:Package;return <div key={`${item.type}-${item.name}-${index}`} onClick={()=>{onSelectResult(item);onClose();}} className="flex items-center justify-between rounded-xl p-3 hover:bg-surface cursor-pointer group"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-lg bg-surface text-[#0d9488]"><Icon className="size-4"/></div><div><p className="text-xs font-semibold">{item.name} <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-muted-foreground border border-border">{item.type}</span></p><p className="text-[11px] text-muted-foreground">{item.info}</p></div></div><ArrowUpRight className="size-4 text-muted-foreground"/></div>})}</div>
      <div className="border-t border-border bg-surface px-4 py-2.5 text-[11px] text-muted-foreground">Searches the active manual workspace dataset.</div>
    </div>
  </div>;
}
