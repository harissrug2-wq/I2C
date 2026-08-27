import React from 'react';
import { ShieldAlert, ArrowUpRight, CheckCircle2, UserX, AlertTriangle } from 'lucide-react';

export default function AtRiskPage({ onOpenActionModal }) {
  const atRiskAccounts = [
    {
      name: 'Northgate Supply',
      amount: '$18,000',
      totalBalance: '$96,000',
      daysOverdue: 92,
      payScore: 42,
      riskLevel: 'Critical',
      reason: 'Slipped past 90 days threshold. Payment velocity slowed by 53%.',
      recAction: 'Draft Demand Letter & Hold Shipments'
    },
    {
      name: 'Cedar Building Materials',
      amount: '$6,000',
      totalBalance: '$41,500',
      daysOverdue: 64,
      payScore: 71,
      riskLevel: 'Elevated',
      reason: 'PayScore climbed to 71. Multiple partial payments recorded.',
      recAction: 'Issue 14-day Payment Reminder'
    },
    {
      name: 'Anchor Distributors',
      amount: '$5,000',
      totalBalance: '$14,200',
      daysOverdue: 187,
      payScore: 28,
      riskLevel: 'Critical',
      reason: '$6,400 physical inventory delivered on unpaid invoices is recoverable.',
      recAction: 'Request Inventory Return'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            RECEIVABLES
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <ShieldAlert className="size-6 text-[#ef4444]" />
            Money at Risk ($29K)
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            3 accounts holding $29,000 in high-risk receivables out of $340,000 total open AR.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {atRiskAccounts.map((item, idx) => (
          <div key={idx} className="card-surface p-5 border-l-4 border-l-[#ef4444] space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#ef4444] bg-[#ef4444]/10 px-2 py-0.5 rounded-full">
                  {item.riskLevel} Risk
                </span>
                <h3 className="text-base font-bold text-foreground mt-2">{item.name}</h3>
              </div>
              <span className="text-xl font-bold text-[#ef4444]">{item.amount}</span>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Total Balance: <span className="font-semibold text-foreground">{item.totalBalance}</span></p>
              <p>Days Overdue: <span className="font-semibold text-foreground">{item.daysOverdue} days</span></p>
              <p>i2C PayScore: <span className="font-semibold text-foreground">{item.payScore}/100</span></p>
            </div>

            <p className="text-xs bg-surface p-2.5 rounded-lg border border-border leading-relaxed text-foreground">
              {item.reason}
            </p>

            <button
              onClick={() => onOpenActionModal({ title: item.recAction, details: item.name })}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="size-3.5" />
              {item.recAction}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
