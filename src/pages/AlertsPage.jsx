import React, { useState } from 'react';
import { Bell, ShieldAlert, AlertTriangle, Info, CheckCircle2, Filter, Search } from 'lucide-react';

export default function AlertsPage({ onOpenActionModal }) {
  const [filter, setFilter] = useState('all');

  const alerts = [
    {
      id: 1,
      type: 'critical',
      domain: 'Receivables',
      title: 'Northgate Supply risk jumped — PayScore dropped to 42',
      time: '12 min ago',
      details: '$96,000 now past 60 days. Account stretched from 34 to 52 average days to pay.',
      action: 'Draft Collection Email'
    },
    {
      id: 2,
      type: 'warning',
      domain: 'Margins',
      title: 'PVC Pipe 2" margin slipped 7.2 points',
      time: '1 hour ago',
      details: 'Meridian lot cost increased 14% while list price held flat. Annual gap ~$31,200.',
      action: 'Adjust Price (+7.2%)'
    },
    {
      id: 3,
      type: 'info',
      domain: 'Payables',
      title: '3 Early-payment discounts closing within 7 days',
      time: '3 hours ago',
      details: 'Capturing Apex, Orchid, and Cascade early windows saves $3,653 cash.',
      action: 'Schedule 3 Payments'
    },
    {
      id: 4,
      type: 'warning',
      domain: 'Inventory',
      title: 'THHN Wire 12 AWG stockout projected in 24 days',
      time: '5 hours ago',
      details: 'Sales velocity up 18% month-over-month. Reorder lead time is 14 days.',
      action: 'Review Reorder Queue'
    },
    {
      id: 5,
      type: 'critical',
      domain: 'Cross-Domain',
      title: 'Financing riskiest customers\' inventory ($270K exposure)',
      time: '1 day ago',
      details: '$180,400 receivables sit with slow-payers on the same SKUs landing Sep 2.',
      action: 'Split Reorder Queue'
    }
  ];

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.type === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            DAILY
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Bell className="size-6 text-[#0d9488]" />
            Alerts & Notifications
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            System findings and automated threshold flags across receivables, payables, inventory and cash.
          </p>
        </div>

        <div className="flex rounded-full bg-card p-1 ring-1 ring-border shadow-2xs">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${filter === 'all' ? 'bg-[#0d9488] text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            All Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${filter === 'critical' ? 'bg-[#ef4444] text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Critical
          </button>
          <button
            onClick={() => setFilter('warning')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${filter === 'warning' ? 'bg-[#f59e0b] text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Warnings
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(alert => (
          <div 
            key={alert.id}
            className={`card-surface p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/40 transition-all ${
              alert.type === 'critical' ? 'border-l-4 border-l-[#ef4444]' :
              alert.type === 'warning' ? 'border-l-4 border-l-[#f59e0b]' : 'border-l-4 border-l-[#0d9488]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {alert.type === 'critical' ? <ShieldAlert className="size-5 text-[#ef4444]" /> :
                 alert.type === 'warning' ? <AlertTriangle className="size-5 text-[#f59e0b]" /> :
                 <Info className="size-5 text-[#0d9488]" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {alert.domain}
                  </span>
                  <span className="text-[10px] text-muted-foreground">· {alert.time}</span>
                </div>
                <h3 className="text-sm font-bold text-foreground mt-0.5">{alert.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{alert.details}</p>
              </div>
            </div>

            <button
              onClick={() => onOpenActionModal({ title: alert.action, details: alert.title })}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="size-3.5" />
              {alert.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
