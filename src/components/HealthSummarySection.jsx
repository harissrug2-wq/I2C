import React from 'react';
import { ArrowUpRight, ShieldAlert, Package, AlertCircle } from 'lucide-react';

export default function HealthSummarySection({ onOpenActionModal }) {
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
                $774,790 outstanding across 8 accounts
              </p>
            </div>
            <button
              onClick={() => onOpenActionModal({
                title: 'Collections Priority View',
                type: 'collections',
                details: 'Showing prioritized collection queue for 8 accounts.'
              })}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0d9488] hover:underline cursor-pointer"
            >
              Collections priority <ArrowUpRight className="size-3.5" />
            </button>
          </header>

          {/* Progress Stack Bar */}
          <div className="mt-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface ring-1 ring-border">
              <div className="bg-[#ef4444] h-full" style={{ width: '42%' }} title="Critical: 42%" />
              <div className="bg-[#f59e0b] h-full" style={{ width: '28%' }} title="Elevated: 28%" />
              <div className="bg-[#16a34a] h-full" style={{ width: '30%' }} title="Healthy: 30%" />
            </div>
          </div>

          {/* Tier Metrics Breakdown */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:text-left">
            <div className="rounded-lg bg-surface p-2.5 border border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ef4444]">
                <span className="size-2 rounded-full bg-[#ef4444]" />
                Critical
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">$327K</p>
              <p className="text-[10px] text-muted-foreground">2 accounts · 42%</p>
            </div>

            <div className="rounded-lg bg-surface p-2.5 border border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f59e0b]">
                <span className="size-2 rounded-full bg-[#f59e0b]" />
                Elevated
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">$217K</p>
              <p className="text-[10px] text-muted-foreground">3 accounts · 28%</p>
            </div>

            <div className="rounded-lg bg-surface p-2.5 border border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#16a34a]">
                <span className="size-2 rounded-full bg-[#16a34a]" />
                Healthy
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">$231K</p>
              <p className="text-[10px] text-muted-foreground">3 accounts · 30%</p>
            </div>
          </div>
        </div>

        <p className="mt-4 rounded-lg bg-[#ef4444]/10 p-3 text-xs text-[#ef4444] font-medium ring-1 ring-[#ef4444]/20">
          42% of your receivables now sit in the Critical tier, up from 31% a month ago. Two accounts drive all of it.
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
                $2.09M of inventory value read from Brightpearl
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
              <div className="bg-[#16a34a] h-full" style={{ width: '68%' }} title="Healthy stock: 68%" />
              <div className="bg-[#f59e0b] h-full" style={{ width: '21%' }} title="Overstocked: 21%" />
              <div className="bg-[#ef4444] h-full" style={{ width: '11%' }} title="Dead stock: 11%" />
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:text-left">
            <div className="rounded-lg bg-surface p-2.5 border border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#16a34a]">
                <span className="size-2 rounded-full bg-[#16a34a]" />
                Healthy
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">$1.42M</p>
              <p className="text-[10px] text-muted-foreground">68% of inventory</p>
            </div>

            <div className="rounded-lg bg-surface p-2.5 border border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f59e0b]">
                <span className="size-2 rounded-full bg-[#f59e0b]" />
                Overstocked
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">$438K</p>
              <p className="text-[10px] text-muted-foreground">21% · 2 SKUs &gt;12m</p>
            </div>

            <div className="rounded-lg bg-surface p-2.5 border border-border/60">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ef4444]">
                <span className="size-2 rounded-full bg-[#ef4444]" />
                Dead stock
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">$229K</p>
              <p className="text-[10px] text-muted-foreground">11% · &gt;90d quiet</p>
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
            $329K recoverable cash
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#ef4444]/10 px-3 py-1 text-[#ef4444] font-semibold ring-1 ring-[#ef4444]/20">
            1 stockout in 24 days
          </span>
        </div>
      </article>
    </section>
  );
}
