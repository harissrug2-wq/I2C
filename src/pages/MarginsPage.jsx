import React from 'react';
import { Receipt, TrendingDown, ArrowUpRight } from 'lucide-react';

export default function MarginsPage({ onOpenActionModal }) {
  const marginSkus = [
    { sku: 'PVC Pipe 2" Schedule 40', currentMargin: '16.6%', targetMargin: '23.8%', change: '-7.2 pts', cause: 'Meridian lot cost +14% not passed through', impact: '$31,200/yr', action: 'Adjust Price (+7.2%)' },
    { sku: 'THHN Wire 12 AWG Copper', currentMargin: '24.6%', targetMargin: '29.8%', change: '-5.2 pts', cause: 'Carrying cost & slow pay by 60% of buyers', impact: '$18,400/yr', action: 'Tighten Credit Terms' },
    { sku: 'Copper Fitting 3/4" Elbow', currentMargin: '28.1%', targetMargin: '31.0%', change: '-2.9 pts', cause: 'Freight surcharge increase', impact: '$9,600/yr', action: 'Review Shipping Costs' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            INVENTORY
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Receipt className="size-6 text-[#ef4444]" />
            Margin Priority & Cost Creep
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            SKUs with realized gross margin erosion due to supplier price increases, carrying costs, or unadjusted price lists.
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
              Realized Margin: <span className="font-bold text-foreground">{item.currentMargin}</span> (Target {item.targetMargin})
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
