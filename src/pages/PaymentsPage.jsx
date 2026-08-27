import React from 'react';
import { CircleDollarSign, CheckCircle2, Zap } from 'lucide-react';

export default function PaymentsPage({ onOpenActionModal }) {
  const discounts = [
    { vendor: 'Apex Resins Corp', amount: '$42,500', discount: '2% ($850)', dueDate: 'Aug 22', action: 'Capture $850 Savings' },
    { vendor: 'Orchid Industrial Materials', amount: '$64,200', discount: '3.5% ($2,247)', dueDate: 'Aug 24', action: 'Capture $2,247 Savings' },
    { vendor: 'Cascade Metals Group', amount: '$27,800', discount: '2% ($556)', dueDate: 'Aug 26', action: 'Capture $556 Savings' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            PAYABLES
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <CircleDollarSign className="size-6 text-[#16a34a]" />
            Payment Priority & Discounts
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            Sequence supplier payments to maximize early payment cash discounts while keeping operating cash above your floor.
          </p>
        </div>

        <span className="rounded-full bg-[#16a34a]/10 px-3 py-1.5 text-xs font-bold text-[#16a34a] border border-[#16a34a]/20">
          $3,653 Total Discount Savings Available
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {discounts.map((d, i) => (
          <div key={i} className="card-surface p-5 border-l-4 border-l-[#16a34a] space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#16a34a] bg-[#16a34a]/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Zap className="size-3" /> Discount Window
              </span>
              <span className="text-xs text-muted-foreground">Expires {d.dueDate}</span>
            </div>

            <h3 className="text-base font-bold text-foreground">{d.vendor}</h3>
            <p className="text-xs text-muted-foreground">Bill Amount: <span className="font-semibold text-foreground">{d.amount}</span></p>

            <div className="bg-[#16a34a]/10 p-3 rounded-lg border border-[#16a34a]/20">
              <span className="block text-[11px] font-semibold text-muted-foreground">Discount Return</span>
              <span className="text-lg font-bold text-[#16a34a]">{d.discount}</span>
            </div>

            <button
              onClick={() => onOpenActionModal({ title: d.action, details: d.vendor })}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#16a34a] hover:bg-[#15803d] px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <CheckCircle2 className="size-3.5" />
              {d.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
