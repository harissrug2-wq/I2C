import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleGauge,
  Landmark,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useData } from '../context/DataContext';

const money = value => `$${Math.round(Number(value || 0)).toLocaleString()}`;

function Metric({ icon: Icon, label, value, detail, tone = 'default' }) {
  const toneClass = tone === 'danger' ? 'text-[#ef4444]' : tone === 'good' ? 'text-[#16a34a]' : 'text-foreground';
  return (
    <article className="card-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="size-4 text-[#0d9488]" />
      </div>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}

export default function ForecastPage() {
  const { sys3, thresholds, advisories } = useData();
  const cashAlerts = advisories.filter(item => item.domain === 'Cash');
  const lowPointTone = sys3.lowPointCash < Number(thresholds.operating_cash_floor || 0) ? 'danger' : 'good';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">CASH FORECASTING</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Cash Forecasting Control Center</h1>
          <p className="mt-1.5 max-w-3xl text-xs sm:text-sm text-muted-foreground">
            Daily 30-day cash visibility using risk-weighted receivables, scheduled payables and recurring cash commitments from the active workspace.
          </p>
        </div>
        <span className="rounded-full bg-[#0d9488]/10 px-3 py-1.5 text-xs font-semibold text-[#0d9488] ring-1 ring-[#0d9488]/20 ring-inset">
          Forecast confidence {sys3.forecastConfidence}%
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Metric icon={Landmark} label="Cash Today" value={money(sys3.cashToday)} detail="Current bank-account balance" />
        <Metric icon={TrendingDown} label="Projected Low" value={money(sys3.lowPointCash)} detail={`${sys3.lowPointDay} · ${sys3.lowPointDaysOut} days out`} tone={lowPointTone} />
        <Metric icon={CalendarDays} label="30-Day Ending Cash" value={money(sys3.endingCash)} detail={`Net movement ${money(sys3.netMovement)}`} tone={sys3.endingCash >= sys3.cashToday ? 'good' : 'default'} />
        <Metric icon={CircleGauge} label="Coverage Ratio" value={`${sys3.coverageRatio.toFixed(2)}×`} detail="Cash + inflow ÷ scheduled outflow" tone={sys3.coverageRatio >= Number(thresholds.coverage_multiplier || 1.2) ? 'good' : 'danger'} />
        <Metric icon={ShieldCheck} label="Cash Runway" value={sys3.runwayDays >= 9999 ? 'Growing' : `${sys3.runwayDays} days`} detail={sys3.burnRateDaily > 0 ? `${money(sys3.burnRateDaily)} daily burn` : '60-day actuals are cash-generative'} tone={sys3.runwayDays >= 90 ? 'good' : 'danger'} />
      </div>

      <section className="card-surface p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">30-Day Daily Projection</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Expected invoice receipts are weighted by customer payment risk. Payables use due dates; recurring commitments use the manual forecast baseline.
            </p>
          </div>
          <div className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold text-muted-foreground ring-1 ring-border ring-inset">
            {sys3.horizonStartDate} → {sys3.horizonEndDate}
          </div>
        </div>

        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sys3.points} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="cashProjection" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.34} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.18} />
              <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={value => `$${Math.round(value / 1000)}k`} />
              <Tooltip
                formatter={(value, name) => [money(value), name === 'cash' ? 'Projected cash' : name]}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="cash" stroke="#0d9488" strokeWidth={3} fill="url(#cashProjection)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Operating floor</p>
            <p className="mt-1 text-lg font-bold text-foreground">{money(sys3.operatingFloor)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{sys3.floorGap > 0 ? `${money(sys3.floorGap)} low-point shortfall` : 'Projected path remains above the configured floor'}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Downside band</p>
            <p className={`mt-1 text-lg font-bold ${sys3.confidenceLowNegative ? 'text-[#ef4444]' : 'text-[#16a34a]'}`}>{sys3.confidenceLowNegative ? 'Potential gap' : 'No negative point'}</p>
            <p className="mt-1 text-xs text-muted-foreground">Timing uncertainty uses customer payment variability where available.</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Forecast data</p>
            <p className="mt-1 text-lg font-bold text-foreground">{sys3.inputCoverage.openInvoices} invoices · {sys3.inputCoverage.openBills} bills</p>
            <p className="mt-1 text-xs text-muted-foreground">Recurring commitments: {sys3.inputCoverage.hasRecurringCommitments ? 'included' : 'not supplied'}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card-surface p-5">
          <h2 className="text-base font-bold text-foreground">30-Day Cash Bridge</h2>
          <p className="mt-1 text-xs text-muted-foreground">Sources and uses that build the projected ending cash.</p>
          <div className="mt-4 space-y-3 text-sm">
            <BridgeRow icon={ArrowUpRight} label="Risk-weighted invoice inflows" value={sys3.invoiceInflows} positive />
            <BridgeRow icon={ArrowUpRight} label="Other baseline inflows" value={sys3.baselineInflows} positive />
            <BridgeRow icon={ArrowDownRight} label="Scheduled bill outflows" value={sys3.billOutflows} />
            <BridgeRow icon={ArrowDownRight} label="Recurring commitments" value={sys3.recurringOutflows} />
            <div className="border-t border-border pt-3 flex items-center justify-between font-bold">
              <span>Projected ending cash</span>
              <span>{money(sys3.endingCash)}</span>
            </div>
          </div>
        </section>

        <section className="card-surface p-5">
          <h2 className="text-base font-bold text-foreground">Cash Alerts</h2>
          <p className="mt-1 text-xs text-muted-foreground">Gap, runway and coverage rules generated from this forecast.</p>
          <div className="mt-4 space-y-3">
            {cashAlerts.length === 0 ? (
              <div className="rounded-xl border border-[#16a34a]/20 bg-[#16a34a]/5 p-4 text-xs">
                <p className="font-semibold text-[#16a34a]">No active cash alerts</p>
                <p className="mt-1 text-muted-foreground">The current forecast does not trigger a configured cash-gap, runway or coverage rule.</p>
              </div>
            ) : cashAlerts.slice(0, 5).map(alert => (
              <div key={alert.id} className="rounded-xl border border-border bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-foreground">{alert.id}</span>
                  <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-bold text-muted-foreground ring-1 ring-border">{alert.priority}</span>
                </div>
                <p className="mt-2 text-xs font-semibold text-foreground">{alert.finding}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{alert.recommendedAction}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CashEvents title="Largest Expected Inflows" icon={TrendingUp} rows={sys3.topInflows} type="inflow" />
        <CashEvents title="Largest Scheduled Outflows" icon={TrendingDown} rows={sys3.topOutflows} type="outflow" />
      </div>
    </div>
  );
}

function BridgeRow({ icon: Icon, label, value, positive = false }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2.5">
      <span className="inline-flex items-center gap-2 text-muted-foreground"><Icon className={`size-4 ${positive ? 'text-[#16a34a]' : 'text-[#ef4444]'}`} />{label}</span>
      <span className={`font-semibold ${positive ? 'text-[#16a34a]' : 'text-[#ef4444]'}`}>{positive ? '+' : '-'}{money(value)}</span>
    </div>
  );
}

function CashEvents({ title, icon: Icon, rows, type }) {
  return (
    <section className="card-surface overflow-hidden">
      <div className="border-b border-border p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-foreground"><Icon className="size-4 text-[#0d9488]" />{title}</h2>
      </div>
      <div className="divide-y divide-border">
        {rows.length === 0 ? <p className="p-5 text-xs text-muted-foreground">No events in the current 30-day horizon.</p> : rows.map(row => (
          <div key={row.id} className="flex items-center justify-between gap-4 p-4 text-xs">
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{type === 'inflow' ? row.customerName : row.vendorName}</p>
              <p className="mt-0.5 text-muted-foreground">{row.id} · {type === 'inflow' ? `Expected ${row.expectedPayDate}` : `Due ${row.projectedPayDate}`}</p>
              {type === 'inflow' && <p className="mt-0.5 text-[10px] text-muted-foreground">Collection probability {Math.round(row.collectionProbability * 100)}%</p>}
            </div>
            <p className={`shrink-0 text-sm font-bold ${type === 'inflow' ? 'text-[#16a34a]' : 'text-[#ef4444]'}`}>
              {type === 'inflow' ? money(row.riskAdjustedAmount) : money(row.balanceDue)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
