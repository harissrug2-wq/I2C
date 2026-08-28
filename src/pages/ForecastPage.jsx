import React, { useState } from 'react';
import { Sparkles, ChevronDown, Network, ShieldAlert, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { useData } from '../context/DataContext';

export default function ForecastPage({ onOpenActionModal }) {
  const { sys3, thresholds } = useData();
  const [horizon, setHorizon] = useState('30');
  const [showDriverDetails, setShowDriverDetails] = useState(true);

  const horizonDays = Number(horizon);
  const filteredPoints = sys3.points.filter((_, idx) => (idx * 3) <= horizonDays);

  return (
    <div className="space-y-6">
      {/* Page Title Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            DAILY
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Cash flow forecast
          </h1>
          <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#701a75]/10 px-2.5 py-1 text-[11px] font-semibold text-[#701a75]">
            <Sparkles className="size-3 text-[#701a75]" />
            Powered by i2C CashHorizon™
          </p>
          <p className="mt-2 max-w-2xl text-xs sm:text-sm text-muted-foreground leading-relaxed">
            Projected from open invoices, scheduled payables and risk-adjusted payment timing. Nothing here is written back to your books.
          </p>
        </div>

        <span className="rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground ring-1 ring-border ring-inset">
          Manual workspace data
        </span>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="card-surface p-5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Cash today</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">${sys3.cashToday.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">Across 3 operating accounts</p>
        </article>

        <article className="card-surface border-l-4 border-l-[#ef4444] p-5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Projected low point</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-[#ef4444]">${sys3.lowPointCash.toLocaleString()}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {sys3.floorGap > 0 ? `$${sys3.floorGap.toLocaleString()} below your $${thresholds.operating_cash_floor.toLocaleString()} floor` : 'Above operating floor'}
          </p>
        </article>

        <article className="card-surface p-5">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">When</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{sys3.lowPointDay}, 2026</p>
          <p className="mt-1 text-xs text-muted-foreground">{sys3.lowPointDaysOut} days out</p>
        </article>
      </div>

      {/* Projection Chart Section */}
      <section className="card-surface p-5 sm:p-6">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Projection</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Solid line is the expected path; the shaded band is the 80% confidence range · Risk-weighted by i2C PayScore
            </p>
          </div>
          <div className="flex rounded-full bg-surface p-1 ring-1 ring-border ring-inset">
            <button
              onClick={() => setHorizon('30')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                horizon === '30' ? 'bg-[#0d9488] text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              30 days
            </button>
            <button
              onClick={() => setHorizon('60')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                horizon === '60' ? 'bg-[#0d9488] text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              60 days
            </button>
            <button
              onClick={() => setHorizon('90')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                horizon === '90' ? 'bg-[#0d9488] text-white' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              90 days
            </button>
          </div>
        </header>

        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${Math.round(v/1000)}k`} />
              <Tooltip 
                formatter={(value) => [`$${value.toLocaleString()}`, 'Projected Cash']} 
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="cash" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#forecastGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Low Point Warning Button Toggle */}
        <button
          onClick={() => setShowDriverDetails(!showDriverDetails)}
          className="mt-4 flex w-full flex-wrap items-center gap-3 rounded-xl bg-surface px-4 py-3 text-left transition-colors hover:bg-surface/70 cursor-pointer ring-1 ring-border"
        >
          <span className="size-2.5 shrink-0 rounded-full bg-[#ef4444]" />
          <span className="text-sm font-semibold text-foreground">
            Low point Day {sys3.lowPointDaysOut} · {sys3.lowPointDay}, 2026 · ${sys3.lowPointCash.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">
            {sys3.floorGap > 0 ? `$${sys3.floorGap.toLocaleString()} below your $${thresholds.operating_cash_floor.toLocaleString()} floor` : 'Operating floor secured'}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[#0d9488]">
            What's driving this
            <ChevronDown className={`size-3.5 transition-transform ${showDriverDetails ? 'rotate-180' : ''}`} />
          </span>
        </button>

        {/* Driver Breakdown List */}
        {showDriverDetails && (
          <div className="mt-3 rounded-xl border border-[#701a75]/30 bg-card p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#701a75]/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[#701a75] uppercase">
                <Network className="size-3" /> AP × Cash
              </span>
              <span className="rounded-full bg-surface px-2 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase ring-1 ring-border">
                Cross-domain
              </span>
            </div>
            <p className="text-xs sm:text-sm leading-relaxed text-foreground">
              Open receivables and scheduled payables overlap inside the same forecast window. The projection uses payment-risk probabilities and current due dates.
            </p>
            <ul className="mt-4 divide-y divide-border text-xs">
              <li className="flex flex-wrap items-start gap-3 py-3">
                <span className="w-20 shrink-0">
                  <span className="inline-flex rounded-md bg-surface px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase ring-1 ring-border">
                    AR
                  </span>
                </span>
                <span className="min-w-[200px] flex-1">
                  <span className="block font-semibold text-foreground">Open receivables due in forecast window</span>
                  <span className="mt-0.5 block text-muted-foreground">Risk-adjusted receipt timing from the active customer payment history</span>
                </span>
                <span className="shrink-0 font-semibold text-[#16a34a]">Risk-adjusted</span>
              </li>
              <li className="flex flex-wrap items-start gap-3 py-3">
                <span className="w-20 shrink-0">
                  <span className="inline-flex rounded-md bg-surface px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase ring-1 ring-border">
                    Inventory
                  </span>
                </span>
                <span className="min-w-[200px] flex-1">
                  <span className="block font-semibold text-foreground">Inventory replenishment exposure</span>
                  <span className="mt-0.5 block text-muted-foreground">Reorder recommendations are calculated from velocity, lead time and safety stock</span>
                </span>
                <span className="shrink-0 font-semibold text-[#ef4444]">Calculated</span>
              </li>
              <li className="flex flex-wrap items-start gap-3 py-3">
                <span className="w-20 shrink-0">
                  <span className="inline-flex rounded-md bg-surface px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase ring-1 ring-border">
                    AP
                  </span>
                </span>
                <span className="min-w-[200px] flex-1">
                  <span className="block font-semibold text-foreground">Open payables due in forecast window</span>
                  <span className="mt-0.5 block text-muted-foreground">Scheduled bill due dates are included in the cash projection</span>
                </span>
                <span className="shrink-0 font-semibold text-[#ef4444]">Calculated</span>
              </li>
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
