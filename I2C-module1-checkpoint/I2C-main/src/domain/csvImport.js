const DATASETS = {
  customers: {
    filenames: ['customers','customer','customers_master','customer_master'],
    key: row => row.id,
    required: ['id','name'],
    numbers: ['credit_limit','broken_promises','risk_score_override'],
    aliases: { customer_id:'id', customer_name:'name', creditlimit:'credit_limit' },
  },
  suppliers: {
    filenames: ['suppliers','supplier','vendors','vendor','suppliers_master','vendors_master'],
    key: row => row.id,
    required: ['id','name'],
    numbers: ['discount_pct','discount_days','net_days','lead_time_days','lead_time_stddev'],
    booleans: ['allows_extension','single_source_for_class_a'],
    aliases: { supplier_id:'id', vendor_id:'id', supplier_name:'name', vendor_name:'name' },
  },
  invoices: {
    filenames: ['invoices','invoice','ar_ledger','accounts_receivable','receivables'],
    key: row => row.invoice_no,
    required: ['invoice_no','customer_id','invoice_date','due_date','total'],
    numbers: ['total','balance_due'],
    dates: ['invoice_date','due_date','paid_date'],
    aliases: { invoice:'invoice_no', invoice_number:'invoice_no', customer:'customer_id', amount:'total', balance:'balance_due' },
  },
  invoiceLines: {
    filenames: ['invoice_lines','invoice_line_items','invoiceitems','ar_line_items'],
    key: row => `${row.invoice_no}::${row.line_no}`,
    required: ['invoice_no','line_no','sku','qty','unit_price'],
    numbers: ['line_no','qty','unit_price','line_total'],
    aliases: { invoice:'invoice_no', invoice_number:'invoice_no', product:'sku', product_sku:'sku', quantity:'qty', unitprice:'unit_price', amount:'line_total' },
  },
  bills: {
    filenames: ['bills','bill','ap_ledger','accounts_payable','payables'],
    key: row => row.bill_no,
    required: ['bill_no','supplier_id','bill_date','due_date','total'],
    numbers: ['total','balance_due','discount_available'],
    dates: ['bill_date','due_date'],
    aliases: { bill:'bill_no', bill_number:'bill_no', vendor_id:'supplier_id', supplier:'supplier_id', vendor:'supplier_id', amount:'total', balance:'balance_due' },
  },
  paymentsReceived: {
    filenames: ['payments_received','payment_received','receipts','payments_in','customer_payments'],
    key: row => row.receipt_no,
    required: ['receipt_no','customer_id','payment_date','amount'],
    numbers: ['amount','applied_amount'],
    dates: ['payment_date'],
    aliases: { receipt:'receipt_no', payment_no:'receipt_no', customer:'customer_id', invoice:'invoice_no', applied_invoice:'invoice_no', applied_to_invoice:'invoice_no' },
  },
  paymentsMade: {
    filenames: ['payments_made','payment_made','payments_out','supplier_payments','vendor_payments'],
    key: row => row.payment_no,
    required: ['payment_no','supplier_id','payment_date','amount_paid'],
    numbers: ['amount_paid','discount_taken'],
    dates: ['payment_date'],
    aliases: { payment:'payment_no', vendor_id:'supplier_id', vendor:'supplier_id', supplier:'supplier_id', amount:'amount_paid', bill:'applied_to_bill', applied_bill:'applied_to_bill' },
  },
  products: {
    filenames: ['products','product','inventory','inventory_master','items'],
    key: row => row.sku,
    required: ['sku','name','supplier_id','wac','on_hand'],
    numbers: ['wac','reorder_point','safety_stock','on_hand','sell_price','sales_60d','annual_sales','lead_time_days','lead_time_stddev','days_quiet'],
    aliases: { product_sku:'sku', item:'sku', item_name:'name', vendor_id:'supplier_id', vendor:'supplier_id', qty_on_hand:'on_hand', quantity_on_hand:'on_hand', unit_cost:'wac', price:'sell_price' },
  },
  bankAccounts: {
    filenames: ['bank_accounts','bank_account','cash_bank','cash_accounts'],
    key: row => row.account_id,
    required: ['account_id','name','balance'],
    numbers: ['balance'],
    aliases: { account:'account_id', bank_account_id:'account_id', account_name:'name', current_balance:'balance' },
  },
  companyMetrics: {
    filenames: ['company_metrics','metrics','calculation_inputs'],
    key: () => 'companyMetrics',
    required: [],
    numbers: ['revenue_last_30_days','cogs_last_30_days','operating_expenses_last_30_days','other_expenses_last_30_days','other_current_liabilities','forecast_baseline_other_outflows_60d','forecast_baseline_other_inflows_60d','monthly_payroll'],
    dates: ['as_of_date'],
    aliases: { asofdate:'as_of_date', revenue_30d:'revenue_last_30_days', cogs_30d:'cogs_last_30_days' },
    singleObject: true,
  },
};

const REQUIRED_BUNDLE = ['customers','suppliers','invoices','invoiceLines','bills','paymentsReceived','paymentsMade','products','bankAccounts'];

export const CSV_DATASET_LABELS = {
  customers:'Customers', suppliers:'Suppliers', invoices:'Invoices', invoiceLines:'Invoice Lines', bills:'Bills',
  paymentsReceived:'Payments Received', paymentsMade:'Payments Made', products:'Products', bankAccounts:'Bank Accounts', companyMetrics:'Company Metrics',
};

export const CSV_TEMPLATE_FILES = {
  customers:'customers.csv', suppliers:'suppliers.csv', invoices:'invoices.csv', invoiceLines:'invoice_lines.csv', bills:'bills.csv',
  paymentsReceived:'payments_received.csv', paymentsMade:'payments_made.csv', products:'products.csv', bankAccounts:'bank_accounts.csv', companyMetrics:'company_metrics.csv',
};

function normalizeHeader(value='') {
  return String(value).replace(/^\uFEFF/,'').trim().toLowerCase()
    .replace(/[%]/g,'pct').replace(/[&#]/g,' ')
    .replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
}

function normalizeFilename(name='') {
  return String(name).toLowerCase().replace(/\.csv$/,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
}

export function parseCsv(text='') {
  const rows=[]; let row=[]; let field=''; let quoted=false;
  const src=String(text).replace(/^\uFEFF/,'');
  for(let i=0;i<src.length;i++){
    const ch=src[i];
    if(quoted){
      if(ch==='"' && src[i+1]==='"'){ field+='"'; i++; }
      else if(ch==='"') quoted=false;
      else field+=ch;
      continue;
    }
    if(ch==='"'){ quoted=true; continue; }
    if(ch===','){ row.push(field); field=''; continue; }
    if(ch==='\n' || ch==='\r'){
      if(ch==='\r' && src[i+1]==='\n') i++;
      row.push(field); field='';
      if(row.some(cell=>String(cell).trim()!=='')) rows.push(row);
      row=[];
      continue;
    }
    field+=ch;
  }
  row.push(field);
  if(row.some(cell=>String(cell).trim()!=='')) rows.push(row);
  if(!rows.length) return {headers:[], rows:[]};
  const headers=rows[0].map(normalizeHeader);
  const objects=rows.slice(1).map((cells,rowIndex)=>{
    const out={_rowNumber:rowIndex+2};
    headers.forEach((h,idx)=>{ if(h) out[h]=String(cells[idx] ?? '').trim(); });
    return out;
  }).filter(r=>Object.entries(r).some(([k,v])=>k!=='_rowNumber' && String(v).trim()!==''));
  return {headers,rows:objects};
}

function parseNumber(value) {
  if(value==null || value==='') return 0;
  if(typeof value==='number') return Number.isFinite(value)?value:0;
  const raw=String(value).trim();
  const negative=/^\(.*\)$/.test(raw);
  const cleaned=raw.replace(/[,$£€%()\s]/g,'');
  if(cleaned==='') return 0;
  const n=Number(cleaned);
  if(!Number.isFinite(n)) return NaN;
  return negative ? -n : n;
}

function parseBoolean(value) {
  if(typeof value==='boolean') return value;
  const v=String(value??'').trim().toLowerCase();
  if(['1','true','yes','y'].includes(v)) return true;
  if(['0','false','no','n',''].includes(v)) return false;
  return Boolean(value);
}

function canonicalizeRow(dataset, sourceRow) {
  const def=DATASETS[dataset];
  const raw={};
  Object.entries(sourceRow).forEach(([key,value])=>{ if(key!=='_rowNumber') raw[normalizeHeader(key)]=value; });
  const row={};
  Object.entries(raw).forEach(([key,value])=>{
    const canonical=def.aliases?.[key] || key;
    row[canonical]=value;
  });
  for(const key of def.numbers || []){
    if(key in row){ const n=parseNumber(row[key]); row[key]=n; }
  }
  for(const key of def.booleans || []) if(key in row) row[key]=parseBoolean(row[key]);
  for(const key of def.dates || []) if(row[key]==='') row[key]=null;
  if(dataset==='invoiceLines' && (!Number.isFinite(row.line_total) || row.line_total===0) && Number.isFinite(row.qty) && Number.isFinite(row.unit_price)) row.line_total=row.qty*row.unit_price;
  if(dataset==='paymentsReceived'){
    const invoiceNo=row.invoice_no || row.applied_to_invoice || '';
    const appliedAmount=Number.isFinite(row.applied_amount)?row.applied_amount:parseNumber(row.applied_amount || row.amount || 0);
    delete row.invoice_no; delete row.applied_amount; delete row.applied_to_invoice;
    row.applied_to=invoiceNo?[{invoice_no:invoiceNo,amount:Number.isFinite(appliedAmount)?appliedAmount:Number(row.amount||0)}]:[];
  }
  return {...row,_rowNumber:sourceRow._rowNumber};
}

function detectDataset(filename, headers) {
  const base=normalizeFilename(filename);
  for(const [dataset,def] of Object.entries(DATASETS)) if(def.filenames.some(alias=>base===alias)) return dataset;
  const candidates=[];
  for(const [dataset,def] of Object.entries(DATASETS)) for(const alias of def.filenames){
    if(base.endsWith(`_${alias}`) || base.startsWith(`${alias}_`)) candidates.push({dataset,alias});
  }
  candidates.sort((a,b)=>b.alias.length-a.alias.length);
  if(candidates.length) return candidates[0].dataset;
  const set=new Set(headers);
  const signatures=[
    ['paymentsReceived',['receipt_no','payment_date','customer_id']],['paymentsMade',['payment_no','payment_date','supplier_id']],
    ['invoiceLines',['invoice_no','line_no','sku']],['invoices',['invoice_no','customer_id','due_date']],['bills',['bill_no','supplier_id','due_date']],
    ['products',['sku','wac','on_hand']],['bankAccounts',['account_id','balance']],['customers',['customer_id','customer_name']],['suppliers',['supplier_id','supplier_name']],
  ];
  for(const [dataset,signature] of signatures) if(signature.every(h=>set.has(h))) return dataset;
  return null;
}

function isIsoDate(value){ return /^\d{4}-\d{2}-\d{2}$/.test(String(value||'')); }

function validateDataset(dataset, rows) {
  const def=DATASETS[dataset]; const errors=[]; const warnings=[]; const seen=new Set();
  rows.forEach((row,index)=>{
    const rowNo=row._rowNumber || index+2;
    for(const key of def.required || []) if(row[key]==null || row[key]==='') errors.push(`${CSV_DATASET_LABELS[dataset]} row ${rowNo}: ${key} is required.`);
    for(const key of def.numbers || []) if(key in row && !Number.isFinite(row[key])) errors.push(`${CSV_DATASET_LABELS[dataset]} row ${rowNo}: ${key} must be numeric.`);
    for(const key of def.dates || []) if(row[key] && !isIsoDate(row[key])) errors.push(`${CSV_DATASET_LABELS[dataset]} row ${rowNo}: ${key} must use YYYY-MM-DD.`);
    const key=def.key(row);
    if(key){ if(seen.has(key)) errors.push(`${CSV_DATASET_LABELS[dataset]} row ${rowNo}: duplicate key ${key}.`); seen.add(key); }
  });
  if(!rows.length) warnings.push(`${CSV_DATASET_LABELS[dataset]} contains no data rows.`);
  return {errors,warnings};
}

function stripMetaRows(rows){ return rows.map(({_rowNumber,...row})=>row); }

function validateRelationships(workspace) {
  const errors=[]; const warnings=[];
  const customers=new Set((workspace.customers||[]).map(x=>x.id));
  const suppliers=new Set((workspace.suppliers||[]).map(x=>x.id));
  const invoices=new Map((workspace.invoices||[]).map(x=>[x.invoice_no,x]));
  const bills=new Set((workspace.bills||[]).map(x=>x.bill_no));
  const products=new Set((workspace.products||[]).map(x=>x.sku));

  for(const i of workspace.invoices||[]){
    if(!customers.has(i.customer_id)) errors.push(`Invoice ${i.invoice_no} references missing customer ${i.customer_id}.`);
    if(!/^INV-\d{4}$/.test(String(i.invoice_no||''))) errors.push(`Invoice ${i.invoice_no || '(blank)'} must use INV-NNNN format.`);
  }
  for(const b of workspace.bills||[]){
    if(!suppliers.has(b.supplier_id)) errors.push(`Bill ${b.bill_no} references missing supplier ${b.supplier_id}.`);
    if(!/^BILL-\d{4}$/.test(String(b.bill_no||''))) errors.push(`Bill ${b.bill_no || '(blank)'} must use BILL-NNNN format.`);
  }
  for(const p of workspace.products||[]) if(p.supplier_id && !suppliers.has(p.supplier_id)) errors.push(`Product ${p.sku} references missing supplier ${p.supplier_id}.`);
  for(const l of workspace.invoiceLines||[]){
    if(!invoices.has(l.invoice_no)) errors.push(`Invoice line ${l.invoice_no}/${l.line_no} references a missing invoice.`);
    if(!products.has(l.sku)) errors.push(`Invoice line ${l.invoice_no}/${l.line_no} references missing SKU ${l.sku}.`);
  }
  for(const p of workspace.paymentsReceived||[]){
    if(!customers.has(p.customer_id)) errors.push(`Receipt ${p.receipt_no} references missing customer ${p.customer_id}.`);
    for(const a of p.applied_to||[]) if(!invoices.has(a.invoice_no)) errors.push(`Receipt ${p.receipt_no} is applied to missing invoice ${a.invoice_no}.`);
  }
  for(const p of workspace.paymentsMade||[]){
    if(!suppliers.has(p.supplier_id)) errors.push(`Payment ${p.payment_no} references missing supplier ${p.supplier_id}.`);
    if(p.applied_to_bill && !bills.has(p.applied_to_bill)) errors.push(`Payment ${p.payment_no} references missing bill ${p.applied_to_bill}.`);
  }

  const lineTotals={};
  for(const l of workspace.invoiceLines||[]) lineTotals[l.invoice_no]=(lineTotals[l.invoice_no]||0)+Number(l.line_total||0);
  Object.entries(lineTotals).forEach(([invoiceNo,total])=>{
    const inv=invoices.get(invoiceNo); if(!inv) return;
    if(Math.abs(Number(inv.total||0)-total)>0.02) errors.push(`Invoice ${invoiceNo}: line items total ${total.toFixed(2)} does not equal invoice total ${Number(inv.total||0).toFixed(2)}.`);
  });

  const receiptAlloc={};
  for(const receipt of workspace.paymentsReceived||[]) for(const allocation of receipt.applied_to||[]) receiptAlloc[allocation.invoice_no]=(receiptAlloc[allocation.invoice_no]||0)+Number(allocation.amount||0);
  for(const inv of workspace.invoices||[]){
    const calculated=Math.max(0,Number(inv.total||0)-Number(receiptAlloc[inv.invoice_no]||0));
    if(Math.abs(calculated-Number(inv.balance_due||0))>0.02) errors.push(`Invoice ${inv.invoice_no}: total minus applied payments = ${calculated.toFixed(2)}, but balance_due is ${Number(inv.balance_due||0).toFixed(2)}.`);
    if(Number(inv.balance_due||0)===0 && String(inv.status||'').toLowerCase()!=='paid') errors.push(`Invoice ${inv.invoice_no}: zero balance must have status paid.`);
    if(Number(inv.balance_due||0)>0 && Number(inv.balance_due||0)<Number(inv.total||0) && !String(inv.status||'').toLowerCase().includes('partial')) errors.push(`Invoice ${inv.invoice_no}: partial balance must use a partial status.`);
  }

  const billPayments={};
  for(const payment of workspace.paymentsMade||[]) if(payment.applied_to_bill) billPayments[payment.applied_to_bill]=(billPayments[payment.applied_to_bill]||0)+Number(payment.amount_paid||0)+Number(payment.discount_taken||0);
  for(const bill of workspace.bills||[]){
    const calculated=Math.max(0,Number(bill.total||0)-Number(billPayments[bill.bill_no]||0));
    if(Math.abs(calculated-Number(bill.balance_due||0))>0.02) errors.push(`Bill ${bill.bill_no}: total minus payments/discounts = ${calculated.toFixed(2)}, but balance_due is ${Number(bill.balance_due||0).toFixed(2)}.`);
  }
  return {errors,warnings};
}

export async function importCsvFiles(files, currentWorkspace) {
  const parsed=[]; const errors=[]; const warnings=[]; const seenDatasets=new Set();
  for(const file of files){
    const text=typeof file.text==='function' ? await file.text() : String(file.text ?? '');
    const table=parseCsv(text);
    const dataset=detectDataset(file.name,table.headers);
    if(!dataset){ errors.push(`${file.name}: could not identify dataset from filename/headers.`); continue; }
    if(seenDatasets.has(dataset)){ errors.push(`${file.name}: duplicate ${CSV_DATASET_LABELS[dataset]} file in this upload.`); continue; }
    seenDatasets.add(dataset);
    const rows=table.rows.map(r=>canonicalizeRow(dataset,r));
    const result=validateDataset(dataset,rows); errors.push(...result.errors.map(e=>`${file.name}: ${e}`)); warnings.push(...result.warnings.map(w=>`${file.name}: ${w}`));
    parsed.push({fileName:file.name,dataset,rows});
  }

  if(errors.length) return {ok:false,errors,warnings,files:parsed,workspace:currentWorkspace};
  const next=JSON.parse(JSON.stringify(currentWorkspace));
  parsed.forEach(item=>{ next[item.dataset]=DATASETS[item.dataset].singleObject ? (stripMetaRows(item.rows)[0] || {}) : stripMetaRows(item.rows); });
  const relationships=validateRelationships(next); errors.push(...relationships.errors); warnings.push(...relationships.warnings);
  if(errors.length) return {ok:false,errors,warnings,files:parsed,workspace:currentWorkspace};

  next.importMeta={
    source:'manual_csv',
    importedAt:new Date().toISOString(),
    files:parsed.map(p=>({name:p.fileName,dataset:p.dataset,rows:p.rows.length})),
    completeBundle:REQUIRED_BUNDLE.every(k=>seenDatasets.has(k)),
  };
  if(!next.importMeta.completeBundle) warnings.push(`Partial import: ${REQUIRED_BUNDLE.filter(k=>!seenDatasets.has(k)).map(k=>CSV_TEMPLATE_FILES[k]).join(', ')} were not included. Existing data for those datasets was retained.`);
  return {ok:true,errors,warnings,files:parsed,workspace:next};
}

export function datasetTemplate(dataset) {
  const headers={
    customers:['id','name','contact','email','phone','terms','credit_limit','category'],
    suppliers:['id','name','email','phone','terms','category','discount_pct','discount_days','net_days','lead_time_days'],
    invoices:['invoice_no','customer_id','invoice_date','due_date','terms','total','balance_due','status','paid_date'],
    invoiceLines:['invoice_no','line_no','sku','qty','unit_price','line_total','description'],
    bills:['bill_no','supplier_id','bill_date','due_date','terms','total','balance_due','status','discount_available'],
    paymentsReceived:['receipt_no','customer_id','payment_date','method','amount','invoice_no','applied_amount'],
    paymentsMade:['payment_no','supplier_id','payment_date','method','amount_paid','discount_taken','applied_to_bill'],
    products:['sku','name','category','supplier_id','uom','wac','reorder_point','safety_stock','on_hand','warehouse','sell_price','sales_60d','annual_sales','lead_time_days','lead_time_stddev','days_quiet'],
    bankAccounts:['account_id','account_code','name','type','institution','balance'],
    companyMetrics:['as_of_date','revenue_last_30_days','cogs_last_30_days','operating_expenses_last_30_days','other_expenses_last_30_days','other_current_liabilities','forecast_baseline_other_outflows_60d','forecast_baseline_other_inflows_60d','monthly_payroll'],
  }[dataset];
  if(!headers) throw new Error(`Unknown dataset: ${dataset}`);
  return `${headers.join(',')}\n`;
}

export function workspaceToCsv(dataset, workspace) {
  const rows=dataset==='companyMetrics'?[workspace.companyMetrics||{}]:(workspace[dataset]||[]);
  const template=datasetTemplate(dataset); const headers=template.trim().split(',');
  const csvRows=rows.map(raw=>{
    let row=raw;
    if(dataset==='paymentsReceived') row={...raw,invoice_no:raw.applied_to?.[0]?.invoice_no||'',applied_amount:raw.applied_to?.[0]?.amount||0};
    return headers.map(h=>csvEscape(row[h]??'')).join(',');
  });
  return [headers.join(','),...csvRows].join('\n');
}

function csvEscape(value){
  const text=String(value??'');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g,'""')}"` : text;
}
