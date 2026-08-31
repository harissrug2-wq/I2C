import React from 'react';
import { CircleDollarSign, CheckCircle2, Zap } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function PaymentsPage({ onOpenActionModal }) {
  const { sys4 } = useData();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            PAYABLES
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <CircleDollarSign className="size-6 text-[#16a34a]" />
            Payment Priority & Discounts (System 4 Sub-Area D)
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            Sequence supplier payments to maximize early payment cash discounts while keeping operating cash above your floor.
          </p>
        </div>

        <span className="rounded-full bg-[#16a34a]/10 px-3 py-1.5 text-xs font-bold text-[#16a34a] border border-[#16a34a]/20">
          ${sys4.totalDiscountSavings.toLocaleString()} Total Discount Savings Available
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {sys4.discountOpportunities.map((d) => (
          <div key={d.id} className="card-surface p-5 border-l-4 border-l-[#16a34a] space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#16a34a] bg-[#16a34a]/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Zap className="size-3" /> Discount Window (APR {d.discountAPRPercent}%)
              </span>
              <span className="text-xs text-muted-foreground">Expires {d.dueDate}</span>
            </div>

            <h3 className="text-base font-bold text-foreground">{d.vendorName}</h3>
            <p className="text-xs text-muted-foreground">Bill Amount: <span className="font-semibold text-foreground">${d.amount.toLocaleString()}</span></p>

            <div className="bg-[#16a34a]/10 p-3 rounded-lg border border-[#16a34a]/20">
              <span className="block text-[11px] font-semibold text-muted-foreground">Discount Return ({d.discountPercent}%)</span>
              <span className="text-lg font-bold text-[#16a34a]">${d.savings.toLocaleString()}</span>
            </div>

            <button
              onClick={() => onOpenActionModal({ title: `Capture $${d.savings.toLocaleString()} Savings`, details: d.vendorName })}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#16a34a] hover:bg-[#15803d] px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <CheckCircle2 className="size-3.5" />
              Capture ${d.savings.toLocaleString()} Savings
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
