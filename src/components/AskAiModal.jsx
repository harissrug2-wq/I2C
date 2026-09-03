import React, { useState } from 'react';
import { Sparkles, X, Send, Bot } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function AskAiModal({ isOpen, onClose }) {
  const { user, cashBalance, sys1, sys2, sys4, sys5 } = useData();
  const [input,setInput]=useState('');
  const [messages,setMessages]=useState([{sender:'ai',text:'I can explain the numbers in the active workspace. Ask about cash, AR risk, AP discounts, inventory, or margin.'}]);
  if(!isOpen) return null;
  const quickPrompts=['Who should I collect from first?','What discounts are available?','How much dead stock do I have?','What is driving my cash conversion cycle?'];
  const handleSend=(queryText)=>{
    const text=(queryText||input).trim(); if(!text)return; setMessages(p=>[...p,{sender:'user',text}]);setInput('');
    const lower=text.toLowerCase(); let reply;
    const top=sys4.collectionQueue[0]; const discount=[...sys4.discountOpportunities].sort((a,b)=>b.savings-a.savings)[0]; const dead=sys2.skus.filter(s=>s.status==='Dead Stock').sort((a,b)=>b.inventoryValue-a.inventoryValue)[0]; const margin=[...sys5.trueMarginSkus].sort((a,b)=>b.marginErosionPts-a.marginErosionPts)[0];
    if(lower.includes('collect')||lower.includes('risk')||lower.includes('customer')) reply=top?`${top.name} is the highest collection priority: $${top.balance.toLocaleString()} open, $${top.pastDue.toLocaleString()} past due, PayScore ${top.riskScore}, priority ${top.priorityTier}.`:'There are no customer balances to prioritize.';
    else if(lower.includes('discount')||lower.includes('payable')) reply=discount?`Open early-pay discounts total $${sys4.totalDiscountSavings.toLocaleString()}. The largest is ${discount.vendorName}: $${discount.savings.toLocaleString()} on ${discount.billNo}.`:'There are no open early-pay discounts in the current dataset.';
    else if(lower.includes('inventory')||lower.includes('stock')||lower.includes('sku')) reply=`Inventory is $${sys2.totalValue.toLocaleString()} across ${sys2.stockSkuCount} stock SKUs. Dead stock is $${sys2.deadStockValue.toLocaleString()}${dead?`, led by ${dead.name} at $${dead.inventoryValue.toLocaleString()}`:''}.`;
    else if(lower.includes('margin')) reply=margin?`${margin.name} shows ${margin.grossMarginPercent}% gross margin and ${margin.trueMarginPercent}% after cash carrying cost, an erosion of ${margin.marginErosionPts} points.`:'There is not enough product pricing data to calculate margin.';
    else if(lower.includes('ccc')||lower.includes('conversion')) reply=`CCC is ${sys1.ccc} days: DIO ${sys1.dio} + DSO ${sys1.dso} - DPO ${sys1.dpo}.`;
    else reply=`Current workspace: cash $${cashBalance.toLocaleString()}, open AR $${sys1.totalAR.toLocaleString()}, open AP $${sys1.totalAP.toLocaleString()}, inventory $${sys2.totalValue.toLocaleString()}, ECL $${sys4.totalECL.toLocaleString()}.`;
    setMessages(p=>[...p,{sender:'ai',text:reply}]);
  };
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs"><div className="flex h-full w-full max-w-lg flex-col bg-card border-l border-border shadow-2xl">
    <div className="flex items-center justify-between border-b border-border bg-[#701a75] p-4 text-white"><div className="flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-lg bg-white/10"><Sparkles className="size-4"/></div><div><h3 className="font-bold">Ask i2C Advisor</h3><p className="text-[11px] text-white/80">Answers from the active dataset</p></div></div><button onClick={onClose}><X className="size-5"/></button></div>
    <div className="flex-1 overflow-y-auto p-4 space-y-4">{messages.map((m,i)=><div key={i} className={`flex gap-3 ${m.sender==='user'?'justify-end':''}`}>{m.sender==='ai'&&<div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#701a75] text-white"><Bot className="size-4"/></div>}<div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${m.sender==='user'?'bg-[#0d9488] text-white':'bg-surface ring-1 ring-border'}`}>{m.text}</div>{m.sender==='user'&&<div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#bef264] text-[#112723] text-[10px] font-bold">{(user?.name||'DM').split(' ').map(x=>x[0]).join('').slice(0,2)}</div>}</div>)}</div>
    <div className="px-4 py-2 border-t border-border/50 bg-surface/50"><div className="flex flex-wrap gap-1.5">{quickPrompts.map(p=><button key={p} onClick={()=>handleSend(p)} className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] hover:bg-[#0d9488] hover:text-white">{p}</button>)}</div></div>
    <form onSubmit={e=>{e.preventDefault();handleSend();}} className="p-4 border-t border-border flex gap-2"><input value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about the workspace..." className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-xs focus:outline-none"/><button className="flex size-9 items-center justify-center rounded-full bg-[#701a75] text-white"><Send className="size-4"/></button></form>
  </div></div>;
}
