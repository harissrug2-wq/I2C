import React from 'react';
import { ArrowUpRight, ShieldAlert, Package, AlertCircle } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function HealthSummarySection({ onOpenActionModal }) {
  const { sys2, sys4, customers } = useData();

  const criticalAR = sys4.collectionQueue.filter(c => c.payScoreRiskTier === 'CRITICAL').reduce((s, c) => s + c.balance, 0);
  const elevatedAR = sys4.collectionQueue.filter(c => ['HIGH','MEDIUM'].includes(c.payScoreRiskTier)).reduce((s, c) => s + c.balance, 0);
  const healthyAR = Math.max(0, sys4.totalAR - criticalAR - elevatedAR);

  const critPercent = Math.round((criticalAR / (sys4.totalAR || 1)) * 100);
  const elevPercent = Math.round((elevatedAR / (sys4.totalAR || 1)) * 100);
  const healthPercent = Math.round((healthyAR / (sys4.totalAR || 1)) * 100);

  return (
    <section className="mt-8 grid gap-4 lg:grid-cols-2">
      {/* Card 1: AR Risk Summary */}
      <article className="card-surface p-5 flex flex-col justify-between">
        <div>
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <ShieldAlert className="size-4 text-[#ef4444]" />
                AR risk summary
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                ${sys4.totalAR.toLocaleString()} outstanding across {customers.length} accounts
              </p>
            </div>
            <button
              onClick={() => onOpenActionModal({
                title: 'Collections Priority View',
                type: 'collections',
                details: `Showing prioritized collection queue for ${customers.length} accounts.`
              })}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0d9488] hover:underline cursor-pointer"
            >
              Collections priority <ArrowUpRight className="size-3.5" />
            </button>
          </header>

          {/* Progress Stack Bar */}
          <div className="mt-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface ring-1 ring-border">
              <div className="bg-[#ef4444] h-full" style={{ width: `${critPercent}%` }} title={`Critical: ${critPercent}%`} />
              <div className="bg-[#f59e0b] h-full" style={{ width: `${elevPercent}%` }} title={`Elevated: ${elevPercent}%`} />
              <div className="bg-[#16a34a] h-full" style={{ width: `${healthPercent}%` }} title={`Healthy: ${healthPercent}%`} />
            </div>
          </div>

          {/* Tier Metrics Breakdown */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:text-left">
            <div className="rounded-lg bg-surface p-2.5 border border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ef4444]">
                <span className="size-2 rounded-full bg-[#ef4444]" />
                Critical
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">${(criticalAR / 1000).toFixed(0)}K</p>
              <p className="text-[10px] text-muted-foreground">{critPercent}%</p>
            </div>

            <div className="rounded-lg bg-surface p-2.5 border border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f59e0b]">
                <span className="size-2 rounded-full bg-[#f59e0b]" />
                Elevated
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">${(elevatedAR / 1000).toFixed(0)}K</p>
              <p className="text-[10px] text-muted-foreground">{elevPercent}%</p>
            </div>

            <div className="rounded-lg bg-surface p-2.5 border border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#16a34a]">
                <span className="size-2 rounded-full bg-[#16a34a]" />
                Healthy
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">${(healthyAR / 1000).toFixed(0)}K</p>
              <p className="text-[10px] text-muted-foreground">{healthPercent}%</p>
            </div>
          </div>
        </div>

        <p className="mt-4 rounded-lg bg-[#ef4444]/10 p-3 text-xs text-[#ef4444] font-medium ring-1 ring-[#ef4444]/20">
          {critPercent}% of receivables sit in the Critical PayScore reference tier. PayScore remains provisional until the full component specification is available.
        </p>
      </article>

      {/* Card 2: Inventory Health */}
      <article className="card-surface p-5 flex flex-col justify-between">
        <div>
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Package className="size-4 text-[#0d9488]" />
                Inventory health
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                ${(sys2.totalValue / 1000000).toFixed(2)}M of inventory value in the active workspace
              </p>
            </div>
            <button
              onClick={() => onOpenActionModal({
                title: 'Products & SKUs View',
                type: 'products',
                details: 'Showing SKU status, turnover days, and stock reorder schedules.'
              })}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0d9488] hover:underline cursor-pointer"
            >
              Products <ArrowUpRight className="size-3.5" />
            </button>
          </header>

          {/* Progress Stack Bar */}
          <div className="mt-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface ring-1 ring-border">
              <div className="bg-[#16a34a] h-full" style={{ width: `${sys2.healthyPercent}%` }} title={`Healthy stock: ${sys2.healthyPercent}%`} />
              <div className="bg-[#f59e0b] h-full" style={{ width: `${sys2.overstockedPercent}%` }} title={`Overstocked: ${sys2.overstockedPercent}%`} />
              <div className="bg-[#ef4444] h-full" style={{ width: `${sys2.deadStockPercent}%` }} title={`Dead stock: ${sys2.deadStockPercent}%`} />
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:text-left">
            <div className="rounded-lg bg-surface p-2.5 border border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#16a34a]">
                <span className="size-2 rounded-full bg-[#16a34a]" />
                Healthy
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">${(sys2.healthyValue / 1000000).toFixed(2)}M</p>
              <p className="text-[10px] text-muted-foreground">{sys2.healthyPercent}% of inventory</p>
            </div>

            <div className="rounded-lg bg-surface p-2.5 border border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f59e0b]">
                <span className="size-2 rounded-full bg-[#f59e0b]" />
                Overstocked
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">${(sys2.overstockedValue / 1000).toFixed(0)}K</p>
              <p className="text-[10px] text-muted-foreground">{sys2.overstockedPercent}%</p>
            </div>

            <div className="rounded-lg bg-surface p-2.5 border border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ef4444]">
                <span className="size-2 rounded-full bg-[#ef4444]" />
                Dead stock
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">${(sys2.deadStockValue / 1000).toFixed(0)}K</p>
              <p className="text-[10px] text-muted-foreground">{sys2.deadStockPercent}% · &gt;180d quiet</p>
            </div>
          </div>
        </div>

        {/* Highlights Tags */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-muted-foreground ring-1 ring-border font-medium">
            <AlertCircle className="size-3 text-[#f59e0b]" />
            2 SKUs frozen
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#16a34a]/10 px-3 py-1 text-[#16a34a] font-semibold ring-1 ring-[#16a34a]/20">
            ${((sys2.overstockedValue + sys2.deadStockValue) / 1000).toFixed(0)}K recoverable cash
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ef4444]/10 px-3 py-1 text-[#ef4444] font-semibold ring-1 ring-[#ef4444]/20">
            1 stockout in 24 days
          </span>
        </div>
      </article>
    </section>
  );
}
