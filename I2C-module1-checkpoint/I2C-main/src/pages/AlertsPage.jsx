import React, { useState } from 'react';
import { Bell, ShieldAlert, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function AlertsPage({ onOpenActionModal }) {
  const { advisories } = useData();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? advisories
    : advisories.filter(a => a.priority.toLowerCase().includes(filter));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            DAILY
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Bell className="size-6 text-[#0d9488]" />
            Alerts & Notifications ({advisories.length})
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            System findings and automated threshold flags generated dynamically across receivables, payables, inventory and cash.
          </p>
        </div>

        <div className="flex rounded-full bg-card p-1 ring-1 ring-border shadow-2xs">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${filter === 'all' ? 'bg-[#0d9488] text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            All Alerts ({advisories.length})
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${filter === 'critical' ? 'bg-[#ef4444] text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Critical
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${filter === 'high' ? 'bg-[#f59e0b] text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            High Priority
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(alert => (
          <div 
            key={alert.id}
            className={`card-surface p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/40 transition-all ${
              alert.priority === 'CRITICAL' ? 'border-l-4 border-l-[#ef4444]' :
              alert.priority === 'HIGH' ? 'border-l-4 border-l-[#f59e0b]' : 'border-l-4 border-l-[#0d9488]'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {alert.priority === 'CRITICAL' ? <ShieldAlert className="size-5 text-[#ef4444]" /> :
                 alert.priority === 'HIGH' ? <AlertTriangle className="size-5 text-[#f59e0b]" /> :
                 <Info className="size-5 text-[#0d9488]" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {alert.system} ({alert.id})
                  </span>
                  <span className="text-[10px] font-bold text-[#16a34a]">· {alert.confidence}% Confidence</span>
                </div>
                <h3 className="text-sm font-bold text-foreground mt-0.5">{alert.finding}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{alert.reason}</p>
                <p className="text-xs font-medium text-[#ef4444] mt-1">Risk: {alert.risk}</p>
              </div>
            </div>

            <button
              onClick={() => onOpenActionModal({
                title: alert.recommendedAction,
                type: alert.id,
                details: alert.finding,
                reason: alert.reason,
                risk: alert.risk,
                priority: alert.priority,
                confidence: alert.confidence
              })}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="size-3.5" />
              {alert.recommendedAction}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
