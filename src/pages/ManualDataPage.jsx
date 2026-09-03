import React, { useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Database, Download, FileSpreadsheet, RotateCcw, Save, Trash2, Upload, Pencil } from 'lucide-react';
import { useData } from '../context/DataContext';
import { CSV_DATASET_LABELS, CSV_TEMPLATE_FILES, datasetTemplate, importCsvFiles, workspaceToCsv } from '../domain/csvImport';

const inputClass='w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-[#0d9488]';
const labelClass='space-y-1 text-[11px] font-semibold text-muted-foreground';
const btn='inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors';

const SCHEMAS={
  customers:{title:'Customers',key:'id',fields:[['id','Customer ID'],['name','Name'],['contact','Contact'],['email','Email'],['phone','Phone'],['terms','Terms'],['credit_limit','Credit Limit','number'],['category','Category'],['broken_promises','Broken Promises','number'],['risk_score_override','Risk Override','number']]},
  invoices:{title:'Invoices',key:'invoice_no',fields:[['invoice_no','Invoice #'],['customer_id','Customer ID'],['invoice_date','Invoice Date','date'],['due_date','Due Date','date'],['terms','Terms'],['total','Total','number'],['balance_due','Balance Due','number'],['status','Status']]},
  invoiceLines:{title:'Invoice Lines',key:'_composite',fields:[['invoice_no','Invoice #'],['line_no','Line #','number'],['sku','SKU'],['qty','Qty','number'],['unit_price','Unit Price','number'],['line_total','Line Total','number'],['description','Description']]},
  suppliers:{title:'Suppliers',key:'id',fields:[['id','Supplier ID'],['name','Name'],['email','Email'],['phone','Phone'],['terms','Terms'],['category','Category'],['discount_pct','Discount %','number'],['discount_days','Discount Days','number'],['net_days','Net Days','number'],['lead_time_days','Lead Time Days','number']]},
  bills:{title:'Bills',key:'bill_no',fields:[['bill_no','Bill #'],['supplier_id','Supplier ID'],['bill_date','Bill Date','date'],['due_date','Due Date','date'],['terms','Terms'],['total','Total','number'],['balance_due','Balance Due','number'],['status','Status'],['discount_available','Discount Available','number']]},
  products:{title:'Products',key:'sku',fields:[['sku','SKU'],['name','Name'],['category','Category'],['supplier_id','Supplier ID'],['wac','WAC','number'],['on_hand','On Hand','number'],['average_on_hand','Average On Hand','number'],['sell_price','Sell Price','number'],['sales_60d','Sales 60d','number'],['annual_sales','Annual Unit Sales','number'],['lead_time_days','Lead Time','number'],['lead_time_stddev','Lead Time StdDev','number'],['days_quiet','Days Quiet','number'],['reorder_point','Manual Reorder Point','number'],['safety_stock','Manual Safety Stock','number']]},
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
<<<<<<< HEAD
    if(type==='number') v=v===''?null:Number(v);
=======
    if(type==='number') v=v===''?0:Number(v);
>>>>>>> 027bfafd2792fe6dc39ecb59aefe31d6db9d6ec9
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
  const metricFields=[['as_of_date','As-of Date','date'],['revenue_last_30_days','Revenue - Last 30d','number'],['cogs_last_30_days','COGS - Last 30d','number'],['operating_expenses_last_30_days','Operating Expenses - Last 30d','number'],['other_expenses_last_30_days','Other Expenses - Last 30d','number'],['other_current_liabilities','Other Current Liabilities','number'],['monthly_payroll','Monthly Payroll','number'],['forecast_baseline_other_outflows_60d','Other Forecast Outflows - 60d','number'],['forecast_baseline_other_inflows_60d','Other Forecast Inflows - 60d','number']];
  return <div className="space-y-5">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Cash',sys1.currentAssets-sys1.totalAR-sys1.inventoryValue],['Open AR',sys1.totalAR],['Open AP',sys1.totalAP],['Inventory',sys2.totalValue],['Working Capital',sys1.workingCapital],['CCC',`${sys1.ccc} days`],['ECL',sys4.totalECL],['Discounts',sys4.totalDiscountSavings]].map(([l,v])=><div key={l} className="card-surface p-4"><p className="text-[10px] uppercase font-semibold text-muted-foreground">{l}</p><p className="mt-1 text-xl font-bold">{typeof v==='number'?`$${v.toLocaleString()}`:v}</p></div>)}</div>
    <div className="card-surface p-4"><h3 className="font-bold text-sm mb-3">Calculation Inputs</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metricFields.map(([k,l,t])=><label className={labelClass} key={k}>{l}<input type={t} step={t==='number'?'any':undefined} className={inputClass} value={m[k]??''} onChange={e=>updateCompanyMetrics({[k]:t==='number'?Number(e.target.value):e.target.value})}/></label>)}</div></div>
    <div className="card-surface p-4"><h3 className="font-bold text-sm mb-1">Bank Accounts</h3><p className="text-[11px] text-muted-foreground mb-3">Cash is the sum of these balances.</p><div className="grid gap-3 md:grid-cols-3">{workspaceData.bankAccounts.map(a=><label key={a.account_id} className={labelClass}>{a.name}<input type="number" step="any" className={inputClass} value={a.balance} onChange={e=>updateDataset('bankAccounts',rows=>rows.map(x=>x.account_id===a.account_id?{...x,balance:Number(e.target.value)}:x))}/></label>)}</div></div>
  </div>;
}

export default function ManualDataPage(){
  const {workspaceData,updateDataset,resetWorkspace,replaceWorkspace,sys1,sys2}=useData();
  const [tab,setTab]=useState('overview'); const jsonFileRef=useRef(); const csvFileRef=useRef();
  const [importResult,setImportResult]=useState(null);
  const tabs=[['overview','Overview'],['customers','Customers'],['invoices','Invoices'],['invoiceLines','Invoice Lines'],['suppliers','Suppliers'],['bills','Bills'],['products','Products'],['bankAccounts','Bank Accounts'],['paymentsReceived','Payments In'],['paymentsMade','Payments Out']];
  const exportData=()=>{const blob=new Blob([JSON.stringify(workspaceData,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='i2cashflow-workspace.json';a.click();URL.revokeObjectURL(url);};
  const importData=async e=>{const f=e.target.files?.[0];if(!f)return;try{const d=JSON.parse(await f.text());const needed=['customers','suppliers','invoices','invoiceLines','bills','paymentsReceived','paymentsMade','products','bankAccounts','companyMetrics'];if(!needed.every(k=>k in d))throw new Error('Missing required dataset keys');replaceWorkspace(d);setImportResult({ok:true,warnings:[],files:[{fileName:f.name,dataset:'JSON workspace',rows:0}]});}catch(err){setImportResult({ok:false,errors:[err.message],warnings:[],files:[]});}finally{e.target.value='';}};
  const importCsv=async e=>{
    const files=[...(e.target.files||[])]; if(!files.length)return;
    const result=await importCsvFiles(files,workspaceData);
    setImportResult(result);
    if(result.ok) replaceWorkspace(result.workspace);
    e.target.value='';
  };
  const downloadText=(name,text,type='text/csv')=>{const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);};
  const downloadTemplate=dataset=>downloadText(CSV_TEMPLATE_FILES[dataset],datasetTemplate(dataset));
  const exportCsv=dataset=>downloadText(CSV_TEMPLATE_FILES[dataset],workspaceToCsv(dataset,workspaceData));
  const csvDatasets=Object.keys(CSV_TEMPLATE_FILES);
  return <div className="space-y-6">
<<<<<<< HEAD
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold tracking-[.16em] text-muted-foreground uppercase">DATA MANAGEMENT</p><h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><Database className="size-6 text-[#0d9488]"/>Manual Data Collection</h1><p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">Upload CSV exports from i2C or other systems, or enter records manually. Available columns are mapped automatically; missing and extra values are accepted and shown as warnings.</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>csvFileRef.current?.click()} className={`${btn} bg-[#0d9488] text-white hover:bg-[#0f766e]`}><FileSpreadsheet className="size-3.5"/>Upload CSVs</button><input ref={csvFileRef} className="hidden" type="file" accept=".csv,text/csv" multiple onChange={importCsv}/><button onClick={exportData} className={`${btn} border border-border bg-card`}><Download className="size-3.5"/>Export JSON</button><button onClick={()=>jsonFileRef.current?.click()} className={`${btn} border border-border bg-card`}><Upload className="size-3.5"/>Import JSON</button><input ref={jsonFileRef} className="hidden" type="file" accept="application/json" onChange={importData}/><button onClick={()=>{if(confirm('Clear all workspace data? This cannot be undone unless you export it first.')){resetWorkspace();setImportResult(null);}}} className={`${btn} bg-[#112723] text-white`}><RotateCcw className="size-3.5"/>Clear Workspace</button></div></div>
    <div className="rounded-xl border border-[#0d9488]/30 bg-[#0d9488]/5 p-3 text-xs"><strong>Live reconciliation:</strong> AR ${sys1.totalAR.toLocaleString()} · AP ${sys1.totalAP.toLocaleString()} · Inventory ${sys2.totalValue.toLocaleString()} · {sys2.skus.length} SKUs. Changes are saved to your authenticated workspace only.</div>
    <div className="card-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-bold">Flexible CSV Import</h3><p className="mt-1 text-[11px] text-muted-foreground">Upload one file or several exports. Recognized fields are imported even when columns are missing, renamed, reordered, or additional columns are present. Data-quality and relationship issues are warnings, not blockers.</p></div>{workspaceData.importMeta?.source==='manual_csv'&&<div className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">Last CSV import: {new Date(workspaceData.importMeta.importedAt).toLocaleString()}</div>}</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{csvDatasets.map(dataset=><div key={dataset} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5"><div className="min-w-0"><p className="text-xs font-semibold truncate">{CSV_DATASET_LABELS[dataset]}</p><p className="text-[10px] text-muted-foreground truncate">{CSV_TEMPLATE_FILES[dataset]}</p></div><div className="flex shrink-0 gap-1"><button onClick={()=>downloadTemplate(dataset)} className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold hover:bg-surface">Template</button><button onClick={()=>exportCsv(dataset)} className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold hover:bg-surface">Current CSV</button></div></div>)}</div>
    </div>
    {importResult&&<div className={`rounded-xl border p-4 text-xs ${importResult.ok?'border-emerald-200 bg-emerald-50':'border-red-200 bg-red-50'}`}><div className="flex items-center gap-2 font-bold">{importResult.ok?<CheckCircle2 className="size-4 text-emerald-700"/>:<AlertTriangle className="size-4 text-red-700"/>}{importResult.ok?'CSV processed — available data imported and recalculated':'CSV could not be processed'}</div>{importResult.files?.length>0&&<p className="mt-2">{importResult.files.map(f=>`${f.fileName}${f.dataset&&f.dataset!=='JSON workspace'?` → ${CSV_DATASET_LABELS[f.dataset]} (${f.rows} rows)`:''}`).join(' · ')}</p>}{importResult.errors?.length>0&&<ul className="mt-2 list-disc pl-5 text-red-800">{importResult.errors.slice(0,8).map((e,i)=><li key={i}>{e}</li>)}</ul>}{importResult.warnings?.length>0&&<ul className="mt-2 list-disc pl-5 text-amber-900">{importResult.warnings.slice(0,8).map((w,i)=><li key={i}>{w}</li>)}</ul>}</div>}
=======
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-1 text-xs font-semibold tracking-[.16em] text-muted-foreground uppercase">DATA MANAGEMENT</p><h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><Database className="size-6 text-[#0d9488]"/>Manual Data Collection</h1><p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">Upload canonical CSV files or enter records manually. Imports validate schema and cross-file references before replacing workspace data.</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>csvFileRef.current?.click()} className={`${btn} bg-[#0d9488] text-white hover:bg-[#0f766e]`}><FileSpreadsheet className="size-3.5"/>Upload CSVs</button><input ref={csvFileRef} className="hidden" type="file" accept=".csv,text/csv" multiple onChange={importCsv}/><button onClick={exportData} className={`${btn} border border-border bg-card`}><Download className="size-3.5"/>Export JSON</button><button onClick={()=>jsonFileRef.current?.click()} className={`${btn} border border-border bg-card`}><Upload className="size-3.5"/>Import JSON</button><input ref={jsonFileRef} className="hidden" type="file" accept="application/json" onChange={importData}/><button onClick={()=>{if(confirm('Clear all workspace data? This cannot be undone unless you export it first.')){resetWorkspace();setImportResult(null);}}} className={`${btn} bg-[#112723] text-white`}><RotateCcw className="size-3.5"/>Clear Workspace</button></div></div>
    <div className="rounded-xl border border-[#0d9488]/30 bg-[#0d9488]/5 p-3 text-xs"><strong>Live reconciliation:</strong> AR ${sys1.totalAR.toLocaleString()} · AP ${sys1.totalAP.toLocaleString()} · Inventory ${sys2.totalValue.toLocaleString()} · {sys2.skus.length} SKUs. Changes are saved to your authenticated workspace only.</div>
    <div className="card-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-bold">CSV Import Contract</h3><p className="mt-1 text-[11px] text-muted-foreground">Upload one file or a full bundle. A full bundle replaces all operational datasets atomically; a partial upload only replaces detected datasets after validation.</p></div>{workspaceData.importMeta?.source==='manual_csv'&&<div className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">Last CSV import: {new Date(workspaceData.importMeta.importedAt).toLocaleString()}</div>}</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{csvDatasets.map(dataset=><div key={dataset} className="flex items-center justify-between gap-3 rounded-lg border border-border p-2.5"><div className="min-w-0"><p className="text-xs font-semibold truncate">{CSV_DATASET_LABELS[dataset]}</p><p className="text-[10px] text-muted-foreground truncate">{CSV_TEMPLATE_FILES[dataset]}</p></div><div className="flex shrink-0 gap-1"><button onClick={()=>downloadTemplate(dataset)} className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold hover:bg-surface">Template</button><button onClick={()=>exportCsv(dataset)} className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold hover:bg-surface">Current CSV</button></div></div>)}</div>
    </div>
    {importResult&&<div className={`rounded-xl border p-4 text-xs ${importResult.ok?'border-emerald-200 bg-emerald-50':'border-red-200 bg-red-50'}`}><div className="flex items-center gap-2 font-bold">{importResult.ok?<CheckCircle2 className="size-4 text-emerald-700"/>:<AlertTriangle className="size-4 text-red-700"/>}{importResult.ok?'Import accepted and recalculated':'Import rejected — existing workspace unchanged'}</div>{importResult.files?.length>0&&<p className="mt-2">{importResult.files.map(f=>`${f.fileName}${f.dataset&&f.dataset!=='JSON workspace'?` → ${CSV_DATASET_LABELS[f.dataset]} (${f.rows} rows)`:''}`).join(' · ')}</p>}{importResult.errors?.length>0&&<ul className="mt-2 list-disc pl-5 text-red-800">{importResult.errors.slice(0,8).map((e,i)=><li key={i}>{e}</li>)}</ul>}{importResult.warnings?.length>0&&<ul className="mt-2 list-disc pl-5 text-amber-900">{importResult.warnings.slice(0,8).map((w,i)=><li key={i}>{w}</li>)}</ul>}</div>}
>>>>>>> 027bfafd2792fe6dc39ecb59aefe31d6db9d6ec9
    <div className="flex flex-wrap gap-1 rounded-xl bg-card p-1 border border-border">{tabs.map(([id,l])=><button key={id} onClick={()=>setTab(id)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${tab===id?'bg-[#0d9488] text-white':'text-muted-foreground hover:bg-surface'}`}>{l}</button>)}</div>
    {tab==='overview'?<Overview/>:<DatasetEditor dataset={tab} rows={workspaceData[tab]} onChange={rows=>updateDataset(tab,rows)}/>}
  </div>;
}
