import React from 'react';
import { PlugZap, RefreshCw, CheckCircle2, ShieldCheck, Database } from 'lucide-react';

export default function ConnectionsPage({ onOpenActionModal }) {
  const connections = [
    { name: 'QuickBooks Online', type: 'Accounting & Invoicing (AR/AP)', status: 'Connected', lastSync: '4 min ago', details: '8 Customer AR Accounts · 42 Invoices · Payables Ledger' },
    { name: 'Brightpearl ERP', type: 'Inventory & Purchase Orders', status: 'Connected', lastSync: '4 min ago', details: '3,908 SKUs · $2.09M Inventory Value · Reorder Queue' },
    { name: 'Bank Feeds (Plaid API)', type: 'Real-time Cash Balances', status: 'Connected', lastSync: '10 min ago', details: '3 Operating Accounts · $1,284,900 Total Cash' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            DATA
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <PlugZap className="size-6 text-[#0d9488]" />
            Data Connections
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            Connected ERPs, accounting systems, and bank feeds powering autonomous cross-domain intelligence.
          </p>
        </div>

        <button
          onClick={() => onOpenActionModal({ title: 'Force System Sync', details: 'Triggering full sync across QuickBooks Online & Brightpearl...' })}
          className="inline-flex items-center gap-2 rounded-full bg-[#0d9488] hover:bg-[#0f766e] px-4 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer"
        >
          <RefreshCw className="size-3.5" />
          Sync All Data Now
        </button>
      </div>

      <div className="space-y-4">
        {connections.map((c, i) => (
          <div key={i} className="card-surface p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-[#0d9488]/10 text-[#0d9488] shrink-0 mt-0.5">
                <Database className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-foreground">{c.name}</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#16a34a]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#16a34a] border border-[#16a34a]/20">
                    <CheckCircle2 className="size-3" />
                    {c.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{c.type}</p>
                <p className="text-xs text-foreground mt-2 font-medium">{c.details}</p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs text-muted-foreground block">Last Synced</span>
              <span className="text-xs font-bold text-foreground">{c.lastSync}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
