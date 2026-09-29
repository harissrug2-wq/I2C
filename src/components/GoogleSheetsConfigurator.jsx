import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileSpreadsheet, Loader2, RefreshCw, Settings2 } from 'lucide-react';
import {
  configureGoogleSheetsConnection,
  inspectGoogleSpreadsheet,
  listGoogleSpreadsheets,
  syncLiveIntegration,
} from '../domain/integrationApi';
import { useData } from '../context/DataContext';

const DATASET_FIELDS = {
  customers:['id','name','contact','email','phone','terms','credit_limit','category','broken_promises','risk_score_override'],
  suppliers:['id','name','email','phone','terms','category','discount_pct','discount_days','net_days','lead_time_days'],
  invoices:['invoice_no','customer_id','invoice_date','due_date','terms','total','balance_due','status'],
  invoiceLines:['invoice_no','line_no','sku','qty','unit_price','line_total','description'],
  bills:['bill_no','supplier_id','bill_date','due_date','terms','total','balance_due','status','discount_available'],
  paymentsReceived:['receipt_no','customer_id','payment_date','method','amount','invoice_no','applied_amount'],
  paymentsMade:['payment_no','supplier_id','payment_date','method','amount_paid','discount_taken','applied_to_bill'],
  products:['sku','name','category','supplier_id','wac','on_hand','average_on_hand','sell_price','sales_60d','annual_sales','lead_time_days','lead_time_stddev','days_quiet','reorder_point','safety_stock'],
  bankAccounts:['account_id','account_code','name','type','institution','balance'],
  companyMetrics:['as_of_date','revenue_last_30_days','cogs_last_30_days','operating_expenses_last_30_days','other_expenses_last_30_days','other_current_liabilities','monthly_payroll','forecast_baseline_other_outflows_60d','forecast_baseline_other_inflows_60d'],
};

const LABELS = {
  customers:'Customers',
  suppliers:'Suppliers',
  invoices:'Invoices',
  invoiceLines:'Invoice lines',
  bills:'Bills',
  paymentsReceived:'Customer payments',
  paymentsMade:'Supplier payments',
  products:'Products / inventory',
  bankAccounts:'Bank accounts',
  companyMetrics:'Calculation inputs',
};

const TAB_ALIASES = {
  customers:['customers','customer'],
  suppliers:['suppliers','vendors','vendor'],
  invoices:['invoices','invoice'],
  invoiceLines:['invoice lines','invoicelines','invoice_items','invoice items'],
  bills:['bills','bill'],
  paymentsReceived:['payments received','customer payments','receipts','paymentsreceived'],
  paymentsMade:['payments made','supplier payments','bill payments','paymentsmade'],
  products:['products','inventory','skus','items'],
  bankAccounts:['bank accounts','bankaccounts','cash','accounts'],
  companyMetrics:['company metrics','metrics','calculation inputs','companymetrics'],
};

function norm(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function humanize(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}

function bestHeader(field, headers) {
  const target = norm(field);
  const exact = headers.find(header => norm(header) === target);
  if (exact) return exact;
  const aliases = {
    id:['customerid','supplierid','vendorid','id'],
    invoice_no:['invoiceno','invoice','invoiceid','docnumber'],
    bill_no:['billno','bill','billid','docnumber'],
    customer_id:['customerid','customer'],
    supplier_id:['supplierid','vendorid','supplier','vendor'],
    payment_no:['paymentno','paymentid'],
    receipt_no:['receiptno','receiptid','paymentno'],
    account_id:['accountid','id'],
    account_code:['accountcode','code'],
    balance_due:['balancedue','openbalance','balance'],
    payment_date:['paymentdate','date'],
    invoice_date:['invoicedate','date'],
    bill_date:['billdate','date'],
    due_date:['duedate'],
    on_hand:['onhand','quantityonhand','stockonhand'],
    sell_price:['sellprice','salesprice','price'],
    unit_price:['unitprice','price'],
    line_total:['linetotal','amount','total'],
    amount_paid:['amountpaid','amount'],
    applied_to_bill:['appliedtobill','billno','bill'],
  };
  return headers.find(header => (aliases[field] || []).includes(norm(header))) || '';
}

function autoMappings(spreadsheet) {
  const sheets = spreadsheet?.sheets || [];
  return Object.entries(DATASET_FIELDS).map(([dataset, fields]) => {
    const aliases = (TAB_ALIASES[dataset] || []).map(norm);
    const sheet = sheets.find(item => aliases.includes(norm(item.title)));
    const headers = sheet?.headers || [];
    return {
      dataset,
      sheetName:sheet?.title || '',
      headerRow:1,
      columnMap:Object.fromEntries(fields.map(field => [field, bestHeader(field, headers)]).filter(([, header]) => header)),
    };
  });
}

export default function GoogleSheetsConfigurator({ connection, onStatusRefresh }) {
  const { syncIntegrationPayload } = useData();
  const [files, setFiles] = useState([]);
  const [selectedId, setSelectedId] = useState(connection?.metadata?.spreadsheetId || '');
  const [spreadsheet, setSpreadsheet] = useState(null);
  const [mappings, setMappings] = useState(connection?.metadata?.mappings || []);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedFile = useMemo(() => files.find(file => file.id === selectedId), [files, selectedId]);

  const loadFiles = async () => {
    setBusy('files');
    setError('');
    try {
      const result = await listGoogleSpreadsheets();
      setFiles(result.files || []);
      if (!selectedId && result.selectedSpreadsheetId) setSelectedId(result.selectedSpreadsheetId);
    } catch (err) {
      setError(err?.message || 'Unable to list Google spreadsheets.');
    } finally {
      setBusy('');
    }
  };

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const inspect = async id => {
    const spreadsheetId = id || selectedId;
    if (!spreadsheetId) return;
    setBusy('inspect');
    setError('');
    setNotice('');
    try {
      const result = await inspectGoogleSpreadsheet(spreadsheetId);
      setSpreadsheet(result.spreadsheet);
      const existing = Array.isArray(connection?.metadata?.mappings) && connection.metadata.mappings.length
        && connection.metadata.spreadsheetId === spreadsheetId
        ? connection.metadata.mappings
        : null;
      setMappings(existing || autoMappings(result.spreadsheet));
    } catch (err) {
      setError(err?.message || 'Unable to inspect spreadsheet.');
    } finally {
      setBusy('');
    }
  };

  useEffect(() => {
    if (selectedId) inspect(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const updateSheet = (dataset, sheetName) => {
    const sheet = spreadsheet?.sheets?.find(item => item.title === sheetName);
    const fields = DATASET_FIELDS[dataset] || [];
    setMappings(prev => {
      const current = prev.find(item => item.dataset === dataset);
      const next = {
        dataset,
        sheetName,
        headerRow:1,
        columnMap:sheetName
          ? Object.fromEntries(fields.map(field => [field, bestHeader(field, sheet?.headers || [])]).filter(([, header]) => header))
          : {},
      };
      return current
        ? prev.map(item => item.dataset === dataset ? next : item)
        : [...prev, next];
    });
  };

  const updateColumn = (dataset, field, sourceHeader) => {
    setMappings(prev => prev.map(item => item.dataset === dataset
      ? { ...item, columnMap:{ ...(item.columnMap || {}), [field]:sourceHeader } }
      : item));
  };

  const saveAndSync = async () => {
    if (!selectedId || !spreadsheet) return;
    setBusy('save');
    setError('');
    setNotice('');
    try {
      const activeMappings = mappings.filter(item => item.sheetName && Object.values(item.columnMap || {}).some(Boolean));
      await configureGoogleSheetsConnection({
        spreadsheetId:selectedId,
        spreadsheetName:spreadsheet.title || selectedFile?.name || selectedId,
        mappings:activeMappings,
      });
      const result = await syncLiveIntegration('google_sheets');
      const applied = syncIntegrationPayload('google_sheets', result.payload, { syncedAt:result.syncedAt });
      setNotice(`Google Sheets sync completed. ${Object.values(applied.counts || {}).reduce((sum, value) => sum + Number(value || 0), 0)} canonical records refreshed.`);
      await onStatusRefresh?.();
    } catch (err) {
      setError(err?.message || 'Google Sheets configuration or sync failed.');
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="rounded-2xl border border-[#16a34a]/20 bg-[#16a34a]/5 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#16a34a] ring-1 ring-[#16a34a]/20">
            <FileSpreadsheet className="size-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-foreground">Google Sheets mapping</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Choose a spreadsheet, map each tab to an i2C dataset, then map headers to canonical fields. Re-sync replaces only rows owned by Google Sheets.
            </p>
          </div>
        </div>
        <button onClick={loadFiles} disabled={Boolean(busy)} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold sm:min-h-0">
          {busy === 'files' ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh files
        </button>
      </div>

      {error && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      {notice && <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">{notice}</p>}

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="text-[11px] font-semibold text-muted-foreground">
          Spreadsheet
          <select
            value={selectedId}
            onChange={event => setSelectedId(event.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-xs text-foreground outline-none focus:border-[#0d9488]"
          >
            <option value="">Select a Google spreadsheet…</option>
            {files.map(file => <option key={file.id} value={file.id}>{file.name}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <button onClick={() => inspect()} disabled={!selectedId || Boolean(busy)} className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold lg:w-auto">
            {busy === 'inspect' ? <Loader2 className="size-3.5 animate-spin" /> : <Settings2 className="size-3.5" />}
            Inspect tabs
          </button>
        </div>
      </div>

      {spreadsheet && (
        <div className="mt-5 space-y-3">
          <div className="rounded-xl border border-border bg-card px-3 py-2.5 text-xs">
            <span className="font-semibold">{spreadsheet.title}</span>
            <span className="text-muted-foreground"> · {spreadsheet.sheets?.length || 0} tabs detected</span>
          </div>

          <div className="space-y-2">
            {Object.keys(DATASET_FIELDS).map(dataset => {
              const mapping = mappings.find(item => item.dataset === dataset) || { dataset, sheetName:'', columnMap:{} };
              const sheet = spreadsheet.sheets?.find(item => item.title === mapping.sheetName);
              const headers = sheet?.headers || [];
              const mappedCount = Object.values(mapping.columnMap || {}).filter(Boolean).length;
              return (
                <details key={dataset} className="rounded-xl border border-border bg-card">
                  <summary className="flex cursor-pointer list-none flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-foreground">{LABELS[dataset]}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{mappedCount}/{DATASET_FIELDS[dataset].length} fields mapped</p>
                    </div>
                    <select
                      value={mapping.sheetName || ''}
                      onClick={event => event.stopPropagation()}
                      onChange={event => updateSheet(dataset, event.target.value)}
                      className="w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-xs outline-none sm:w-56"
                    >
                      <option value="">Not synced</option>
                      {(spreadsheet.sheets || []).map(item => <option key={item.sheetId} value={item.title}>{item.title}</option>)}
                    </select>
                  </summary>

                  {mapping.sheetName && (
                    <div className="grid gap-2 border-t border-border p-3 sm:grid-cols-2 lg:grid-cols-3">
                      {DATASET_FIELDS[dataset].map(field => (
                        <label key={field} className="text-[10px] font-semibold text-muted-foreground">
                          {humanize(field)}
                          <select
                            value={mapping.columnMap?.[field] || ''}
                            onChange={event => updateColumn(dataset, field, event.target.value)}
                            className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-2 text-xs font-normal text-foreground outline-none"
                          >
                            <option value="">Ignore / missing</option>
                            {headers.map(header => <option key={header} value={header}>{header}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                  )}
                </details>
              );
            })}
          </div>

          <button
            onClick={saveAndSync}
            disabled={busy === 'save' || !mappings.some(item => item.sheetName)}
            className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[#0d9488] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#0f766e] disabled:opacity-60 sm:w-auto"
          >
            {busy === 'save' ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
            Save mapping & sync now
          </button>
        </div>
      )}
    </section>
  );
}
