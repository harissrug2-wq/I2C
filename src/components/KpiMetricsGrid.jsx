import React from 'react';
import { ShieldAlert, ArrowUp, ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useData } from '../context/DataContext';

export default function KpiMetricsGrid({ onOpenActionModal }) {
  const { sys1, sys3, sys4, sys5, cashBalance, invoices } = useData();

  const cashData = [
    { val: Math.round(cashBalance * 0.94) },
    { val: Math.round(cashBalance * 0.95) },
    { val: Math.round(cashBalance * 0.96) },
    { val: Math.round(cashBalance * 0.965) },
    { val: Math.round(cashBalance * 0.98) },
    { val: cashBalance }
  ];

  const arData = [
    { val: Math.round(sys4.totalAR * 0.91) },
    { val: Math.round(sys4.totalAR * 0.94) },
    { val: Math.round(sys4.totalAR * 0.935) },
    { val: Math.round(sys4.totalAR * 0.97) },
    { val: Math.round(sys4.totalAR * 0.985) },
    { val: sys4.totalAR }
  ];

  const avgGrossMargin = sys5.trueMarginSkus.length > 0
    ? (sys5.trueMarginSkus.reduce((s, p) => s + p.grossMarginPercent, 0) / sys5.trueMarginSkus.length).toFixed(1)
    : '23.8';

  const marginData = [
    { val: Number(avgGrossMargin) + 2.4 },
    { val: Number(avgGrossMargin) + 2.0 },
    { val: Number(avgGrossMargin) + 1.6 },
    { val: Number(avgGrossMargin) + 1.1 },
    { val: Number(avgGrossMargin) + 0.4 },
    { val: Number(avgGrossMargin) }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* 1. Cash Position Card */}
      <article className="card-surface p-5 hover:border-primary/40 transition-colors">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Cash position</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">${cashBalance.toLocaleString()}</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs font-semibold text-[#16a34a] bg-[#16a34a]/10 px-1.5 py-0.5 rounded">+3.2%</span>
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
        <div className="h-12 w-full mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashData}>
              <defs>
                <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="val" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#cashGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* 2. Total AR Card */}
      <article className="card-surface p-5 hover:border-primary/40 transition-colors">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Total AR</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">${sys4.totalAR.toLocaleString()}</p>
        <p className="mt-1 text-xs font-semibold text-[#0d9488]">~${(sys4.collectibleAR / 1000).toFixed(0)}K realistically collectible after expected losses</p>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-xs text-muted-foreground">${(sys4.moneyAtRisk / 1000).toFixed(0)}K at risk</span>
          <span className="font-semibold text-[#16a34a]">+6.8%</span>
        </div>
        <p className="text-[11px] text-muted-foreground">8 accounts, {invoices.length} open invoices</p>
        <div className="h-10 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={arData}>
              <defs>
                <linearGradient id="arGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="val" stroke="#0d9488" strokeWidth={2} fillOpacity={1} fill="url(#arGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      {/* 3. Money at Risk Card */}
      <div 
        onClick={() => onOpenActionModal({
          title: 'Money at Risk Protection',
          type: 'at-risk',
          amount: `$${(sys4.moneyAtRisk / 1000).toFixed(0)}K`,
          details: 'Northgate ($18K past 90 days), Cedar ($6K elevated risk), Anchor ($5K past 60 days).'
        })}
        className="card-surface relative cursor-pointer border-l-4 border-l-[#d97706] p-5 transition-all hover:bg-surface/80 hover:shadow-md group"
      >
        <span className="absolute top-4 right-4 flex size-2.5 items-center justify-center">
          <span className="absolute size-2.5 animate-ping rounded-full bg-[#d97706]/60"></span>
          <span className="size-2 rounded-full bg-[#d97706]"></span>
        </span>
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <ShieldAlert className="size-3.5 text-[#d97706]" />
          Money at risk
        </p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-[#d97706] sm:text-3xl">${(sys4.moneyAtRisk / 1000).toFixed(0)}K</p>
        <p className="mt-1 text-xs text-muted-foreground">across 3 accounts · ${(sys4.collectibleAR / 1000).toFixed(0)}K of ${(sys4.totalAR / 1000).toFixed(0)}K collectible</p>
        <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#d97706] bg-[#d97706]/10 px-2 py-0.5 rounded-full">
          <ArrowUp className="size-3.5" />
          $12K this week
        </p>
        <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0d9488] group-hover:underline">
          Protect it now <ArrowUpRight className="size-3.5" />
        </p>
      </div>

      {/* 4. Gross Margin Card */}
      <article className="card-surface p-5 hover:border-primary/40 transition-colors">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Gross margin</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{avgGrossMargin}%</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs font-semibold text-[#ef4444] bg-[#ef4444]/10 px-1.5 py-0.5 rounded">-2.1 pts</span>
          <span className="text-xs text-muted-foreground">Target 26.0%</span>
        </div>
        <div className="h-12 w-full mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={marginData}>
              <defs>
                <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="val" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#marginGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  );
}
