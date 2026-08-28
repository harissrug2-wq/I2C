import React, { useMemo, useRef, useState } from 'react';
import { Database, Download, RotateCcw, Save, Trash2, Upload, Pencil } from 'lucide-react';
import { useData } from '../context/DataContext';

const inputClass='w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-[#0d9488]';
const labelClass='space-y-1 text-[11px] font-semibold text-muted-foreground';
const btn='inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors';

const SCHEMAS={
  customers:{title:'Customers',key:'id',fields:[['id','Customer ID'],['name','Name'],['contact','Contact'],['email','Email'],['phone','Phone'],['terms','Terms'],['credit_limit','Credit Limit','number'],['category','Category'],['broken_promises','Broken Promises','number'],['risk_score_override','Risk Override','number']]},
  invoices:{title:'Invoices',key:'invoice_no',fields:[['invoice_no','Invoice #'],['customer_id','Customer ID'],['invoice_date','Invoice Date','date'],['due_date','Due Date','date'],['terms','Terms'],['total','Total','number'],['balance_due','Balance Due','number'],['status','Status']]},
  invoiceLines:{title:'Invoice Lines',key:'_composite',fields:[['invoice_no','Invoice #'],['line_no','Line #','number'],['sku','SKU'],['qty','Qty','number'],['unit_price','Unit Price','number'],['line_total','Line Total','number'],['description','Description']]},
  suppliers:{title:'Suppliers',key:'id',fields:[['id','Supplier ID'],['name','Name'],['email','Email'],['phone','Phone'],['terms','Terms'],['category','Category'],['discount_pct','Discount %','number'],['discount_days','Discount Days','number'],['net_days','Net Days','number'],['lead_time_days','Lead Time Days','number']]},
  bills:{title:'Bills',key:'bill_no',fields:[['bill_no','Bill #'],['supplier_id','Supplier ID'],['bill_date','Bill Date','date'],['due_date','Due Date','date'],['terms','Terms'],['total','Total','number'],['balance_due','Balance Due','number'],['status','Status'],['discount_available','Discount Available','number']]},
  products:{title:'Products',key:'sku',fields:[['sku','SKU'],['name','Name'],['category','Category'],['supplier_id','Supplier ID'],['wac','WAC','number'],['on_hand','On Hand','number'],['sell_price','Sell Price','number'],['sales_60d','Sales 60d','number'],['annual_sales','Annual Unit Sales','number'],['lead_time_days','Lead Time','number'],['lead_time_stddev','Lead Time StdDev','number'],['days_quiet','Days Quiet','number'],['reorder_point','Manual Reorder Point','number'],['safety_stock','Manual Safety Stock','number']]},
  paymentsReceived:{title:'Payments Received',key:'receipt_no',fields:[['receipt_no','Receipt #'],['customer_id','Customer ID'],['payment_date','Payment Date','date'],['method','Method'],['amount','Amount','number'],['invoice_no','Applied Invoice #'],['applied_amount','Applied Amount','number']]},
  bankAccounts:{title:'Bank Accounts',key:'account_id',fields:[['account_id','Account ID'],['account_code','Code'],['name','Name'],['type','Type'],['institution','Institution'],['balance','Balance','number']]},
  paymentsMade:{title:'Payments Made',key:'payment_no',fields:[['payment_no','Payment #'],['supplier_id','Supplier ID'],['payment_date','Payment Date','date'],['method','Method'],['amount_paid','Amount Paid','number'],['discount_taken','Discount Taken','number'],['applied_to_bill','Applied Bill #']]},
};

function flatRow(dataset,row){
  if(dataset==='paymentsReceived') return {...row,invoice_no:row.applied_to?.[0]?.invoice_no||'',applied_amount:row.applied_to?.[0]?.amount||0};
  return row;
}
function cleanRow(dataset,form){
  const schema=SCHEMAS[dataset]; const row={};
  for(const [key,,type] of schema.fields){
    let v=form[key] ?? '';
    if(type==='number') v=v===''?0:Number(v);
    row[key]=v;
  }
  if(dataset==='paymentsReceived'){
    const {invoice_no,applied_amount,...rest}=row;
    return {...rest,applied_to:invoice_no?[{invoice_no,amount:Number(applied_amount||row.amount||0)}]:[]};
  }
  if(dataset==='invoiceLines') { if(!row.line_total && row.qty && row.unit_price) row.line_total=Number(row.qty)*Number(row.unit_price); delete row._composite; }
  return row;
}
function rowKey(dataset,row){
  if(dataset==='invoiceLines') return `${row.invoice_no}::${row.line_no}`;
  return row[SCHEMAS[dataset].key];
}

function DatasetEditor({dataset,rows,onChange}){
  const schema=SCHEMAS[dataset];
  const blank=useMemo(()=>Object.fromEntries(schema.fields.map(([k])=>[k,''])),[dataset]);
  const [form,setForm]=useState(blank);
  const [editingKey,setEditingKey]=useState(null);
  const save=()=>{
    const cleaned=cleanRow(dataset,form);
    const key=rowKey(dataset,cleaned);
    if(!key || String(key).includes('undefined')) return alert('Primary ID fields are required.');
    const next=editingKey ? rows.map(r=>rowKey(dataset,r)===editingKey?cleaned:r) : [...rows,cleaned];
    onChange(next); setForm(blank); setEditingKey(null);
  };
  const edit=(row)=>{setForm({...blank,...flatRow(dataset,row)});setEditingKey(rowKey(dataset,row));window.scrollTo({top:0,behavior:'smooth'});};
  const remove=(row)=>{if(confirm(`Delete ${rowKey(dataset,row)}?`)) onChange(rows.filter(r=>rowKey(dataset,r)!==rowKey(dataset,row)));};

  return <div className="space-y-5">
    <div className="card-surface p-4">
      <div className="mb-3 flex items-center justify-between"><div><h3 className="text-sm font-bold">{editingKey?'Edit':'Add'} {schema.title.slice(0,-1)}</h3><p className="text-[11px] text-muted-foreground">Saved locally and recalculated immediately.</p></div>{editingKey&&<button onClick={()=>{setForm(blank);setEditingKey(null)}} className={`${btn} border border-border`}>Cancel edit</button>}</div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {schema.fields.map(([key,label,type])=><label className={labelClass} key={key}>{label}<input type={type||'text'} step={type==='number'?'any':undefined} className={inputClass} value={form[key]??''} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}/></label>)}
      </div>
      <button onClick={save} className={`${btn} mt-4 bg-[#0d9488] text-white hover:bg-[#0f766e]`}><Save className="size-3.5"/>{editingKey?'Save changes':'Add record'}</button>
    </div>

    <div className="card-surface overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-surface border-b border-border"><tr>{schema.fields.slice(0,7).map(([,l])=><th key={l} className="p-3 font-semibold text-muted-foreground">{l}</th>)}<th className="p-3 text-right">Actions</th></tr></thead>
      <tbody className="divide-y divide-border">{rows.map((raw,idx)=>{const row=flatRow(dataset,raw);return <tr key={`${rowKey(dataset,raw)}-${idx}`} className="hover:bg-surface/50">{schema.fields.slice(0,7).map(([k])=><td key={k} className="p-3 max-w-[220px] truncate">{typeof row[k]==='number'?row[k].toLocaleString():String(row[k]??'')}</td>)}<td className="p-3"><div className="flex justify-end gap-1"><button onClick={()=>edit(raw)} className="p-1.5 rounded hover:bg-surface" title="Edit"><Pencil className="size-3.5"/></button><button onClick={()=>remove(raw)} className="p-1.5 rounded hover:bg-red-50 text-red-600" title="Delete"><Trash2 className="size-3.5"/></button></div></td></tr>})}</tbody></table>
    </div>
  </div>;
}

function Overview(){
  const {workspaceData,updateDataset,updateCompanyMetrics,sys1,sys2,sys4}=useData();
  const m=workspaceData.companyMetrics;
  const metricFields=[['as_of_date','As-of Date','date'],['revenue_last_30_days','Revenue - Last 30d','number'],['cogs_last_30_days','COGS - Last 30d','number'],['operating_expenses_last_30_days','Operating Expenses - Last 30d','number'],['other_expenses_last_30_days','Other Expenses - Last 30d','number'],['other_current_liabilities','Other Current Liabilities','number'],['forecast_baseline_other_outflows_60d','Other Forecast Outflows - 60d','number'],['forecast_baseline_other_inflows_60d','Other Forecast Inflows - 60d','number']];
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Cash',sys1.currentAssets-sys1.totalAR-sys1.inventoryValue],['Open AR',sys1.totalAR],['Open AP',sys1.totalAP],['Inventory',sys2.totalValue],['Working Capital',sys1.workingCapital],['CCC',`${sys1.ccc} days`],['ECL',sys4.totalECL],['Discounts',sys4.totalDiscountSavings]].map(([l,v])=><div key={l} className="card-surface p-4"><p className="text-[10px] uppercase font-semibold text-muted-foreground">{l}</p><p className="mt-1 text-xl font-bold">{typeof v==='number'?`$${v.toLocaleString()}`:v}</p></div>)}</div>
    <div className="card-surface p-4"><h3 className="font-bold text-sm mb-3">Calculation Inputs</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metricFields.map(([k,l,t])=><label className={labelClass} key={k}>{l}<input type={t} step={t==='number'?'any':undefined} className={inputClass} value={m[k]??''} onChange={e=>updateCompanyMetrics({[k]:t==='number'?Number(e.target.value):e.target.value})}/></label>)}</div></div>
    <div className="card-surface p-4"><h3 className="font-bold text-sm mb-1">Bank Accounts</h3><p className="text-[11px] text-muted-foreground mb-3">Cash is the sum of these balances.</p><div className="grid gap-3 md:grid-cols-3">{workspaceData.bankAccounts.map(a=><label key={a.account_id} className={labelClass}>{a.name}<input type="number" step="any" className={inputClass} value={a.balance} onChange={e=>updateDataset('bankAccounts',rows=>rows.map(x=>x.account_id===a.account_id?{...x,balance:Number(e.target.value)}:x))}/></label>)}</div></div>
  </div>;
}

export default function ManualDataPage(){
  const {workspaceData,updateDataset,resetWorkspace,replaceWorkspace,sys1,sys2}=useData();
  const [tab,setTab]=useState('overview'); const fileRef=useRef();
  const tabs=[['overview','Overview'],['customers','Customers'],['invoices','Invoices'],['invoiceLines','Invoice Lines'],['suppliers','Suppliers'],['bills','Bills'],['products','Products'],['bankAccounts','Bank Accounts'],['paymentsReceived','Payments In'],['paymentsMade','Payments Out']];
  const exportData=()=>{const blob=new Blob([JSON.stringify(workspaceData,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='i2cashflow-workspace.json';a.click();URL.revokeObjectURL(url);};
  const importData=async e=>{const f=e.target.files?.[0];if(!f)return;try{const d=JSON.parse(await f.text());const needed=['customers','suppliers','invoices','invoiceLines','bills','paymentsReceived','paymentsMade','products','bankAccounts','companyMetrics'];if(!needed.every(k=>k in d))throw new Error('Missing required dataset keys');replaceWorkspace(d);alert('Workspace imported and recalculated.');}catch(err){alert(`Import failed: ${err.message}`);}finally{e.target.value='';}};
  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold tracking-[.16em] text-muted-foreground uppercase">DATA</p><h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><Database className="size-6 text-[#0d9488]"/>Manual Data Entry</h1><p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">No integration required. Enter operational data here and every decision system recalculates from the same source.</p></div><div className="flex flex-wrap gap-2"><button onClick={exportData} className={`${btn} border border-border bg-card`}><Download className="size-3.5"/>Export JSON</button><button onClick={()=>fileRef.current?.click()} className={`${btn} border border-border bg-card`}><Upload className="size-3.5"/>Import JSON</button><input ref={fileRef} className="hidden" type="file" accept="application/json" onChange={importData}/><button onClick={()=>{if(confirm('Reset all manual changes to the repaired demo dataset?'))resetWorkspace();}} className={`${btn} bg-[#112723] text-white`}><RotateCcw className="size-3.5"/>Reset Demo Data</button></div></div>
    <div className="rounded-xl border border-[#0d9488]/30 bg-[#0d9488]/5 p-3 text-xs"><strong>Live reconciliation:</strong> AR ${sys1.totalAR.toLocaleString()} · AP ${sys1.totalAP.toLocaleString()} · Inventory ${sys2.totalValue.toLocaleString()} · {sys2.skus.length} SKUs. Changes are stored in this browser.</div>
    <div className="flex flex-wrap gap-1 rounded-xl bg-card p-1 border border-border">{tabs.map(([id,l])=><button key={id} onClick={()=>setTab(id)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${tab===id?'bg-[#0d9488] text-white':'text-muted-foreground hover:bg-surface'}`}>{l}</button>)}</div>
    {tab==='overview'?<Overview/>:<DatasetEditor dataset={tab} rows={workspaceData[tab]} onChange={rows=>updateDataset(tab,rows)}/>} 
  </div>;
}
