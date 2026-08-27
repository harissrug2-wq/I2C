import React from 'react';
import { ShieldAlert, ArrowUp, ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

const cashData = [
  { val: 1210000 }, { val: 1225000 }, { val: 1240000 }, { val: 1235000 }, { val: 1260000 }, { val: 1284900 }
];

const arData = [
  { val: 310000 }, { val: 320000 }, { val: 318000 }, { val: 330000 }, { val: 335000 }, { val: 340000 }
];

const marginData = [
  { val: 26.2 }, { val: 25.8 }, { val: 25.4 }, { val: 24.9 }, { val: 24.2 }, { val: 23.8 }
];

export default function KpiMetricsGrid({ onOpenActionModal }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* 1. Cash Position Card */}
      <article className="card-surface p-5 hover:border-primary/40 transition-colors">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Cash position</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">$1,284,900</p>
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
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">$340,000</p>
        <p className="mt-1 text-xs font-semibold text-[#0d9488]">~$311K realistically collectible after expected losses</p>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-xs text-muted-foreground">$29K at risk</span>
          <span className="font-semibold text-[#16a34a]">+6.8%</span>
        </div>
        <p className="text-[11px] text-muted-foreground">8 accounts, 42 open invoices</p>
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

      {/* 3. Money at Risk Card (Interactive Highlight Card) */}
      <div 
        onClick={() => onOpenActionModal({
          title: 'Money at Risk Protection',
          type: 'at-risk',
          amount: '$29,000',
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
        <p className="mt-2 text-2xl font-bold tracking-tight text-[#d97706] sm:text-3xl">$29K</p>
        <p className="mt-1 text-xs text-muted-foreground">across 3 customers · $311K of $340K collectible</p>
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
        <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">23.8%</p>
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
