import React from 'react';
import { Receipt, TrendingDown, ArrowUpRight } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function MarginsPage({ onOpenActionModal }) {
  const { sys5, thresholds } = useData();

  const marginSkus = sys5.trueMarginSkus.slice(0, 3).map((item) => ({
    sku: item.name,
    currentMargin: `${item.trueMarginPercent}%`,
    targetMargin: `${item.grossMarginPercent}%`,
    change: `-${item.marginErosionPts} pts`,
    cause: `Carrying cost delay (${Math.round(thresholds.cost_of_capital * 100)}% cost of capital) across slow-paying accounts.`,
    impact: `$${Math.round(item.inventoryValue * 0.08).toLocaleString()}/yr`,
    action: item.marginErosionPts > 4.0 ? 'Tighten Credit Terms' : 'Adjust Price List'
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            INVENTORY
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Receipt className="size-6 text-[#ef4444]" />
            Margin Priority & Cost Creep (System 5)
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            SKUs with realized gross margin erosion due to capital carrying costs, supplier price changes, or unadjusted price lists.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {marginSkus.map((item, idx) => (
          <div key={idx} className="card-surface p-5 border-l-4 border-l-[#ef4444] space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#ef4444] bg-[#ef4444]/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <TrendingDown className="size-3" /> Margin Slippage
              </span>
              <span className="text-xs font-bold text-[#ef4444]">{item.change}</span>
            </div>

            <h3 className="text-base font-bold text-foreground">{item.sku}</h3>
            <p className="text-xs text-muted-foreground">
              Realized True Margin: <span className="font-bold text-foreground">{item.currentMargin}</span> (Headline {item.targetMargin})
            </p>

            <div className="bg-surface p-3 rounded-lg border border-border text-xs space-y-1">
              <p className="font-semibold text-foreground">Root Cause:</p>
              <p className="text-muted-foreground leading-relaxed">{item.cause}</p>
              <p className="pt-1 text-[#ef4444] font-semibold">Annual Margin Impact: {item.impact}</p>
            </div>

            <button
              onClick={() => onOpenActionModal({ title: item.action, details: item.sku })}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              {item.action}
              <ArrowUpRight className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
