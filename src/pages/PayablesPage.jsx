import React from 'react';
import { Landmark, Clock3, BadgeDollarSign, Building2 } from 'lucide-react';
import { useData } from '../context/DataContext';

const bucketOrder = ['Past Due', '0-15', '16-30', '31-60', '61+'];

function money(value) {
  return `$${Math.round(Number(value || 0)).toLocaleString()}`;
}

export default function PayablesPage() {
  const { sys4 } = useData();
  const ap = sys4.payables;

  if (!ap) {
    return <div className="card-surface p-6 text-sm text-muted-foreground">Payables engine is not available in this workspace.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">MODULE 3 · PAYABLES</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Landmark className="size-6 text-[#0d9488]" /> Payables Control Center
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs sm:text-sm text-muted-foreground">
            Open AP, due-date aging, supplier exposure, payment sequencing and early-pay discount visibility from the active workspace.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${ap.aging.reconciled ? 'bg-[#16a34a]/10 text-[#16a34a] ring-[#16a34a]/20' : 'bg-[#ef4444]/10 text-[#ef4444] ring-[#ef4444]/20'}`}>
          {ap.aging.reconciled ? 'AP aging reconciled' : `AP drift ${money(ap.aging.reconciliationDelta)}`}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Landmark} label="Open AP" value={money(ap.totalAP)} detail={`${ap.openBillCount} open bills`} />
        <Metric icon={Clock3} label="Past Due" value={money(ap.pastDueAmount)} detail={`${ap.pastDueBillCount} past-due bill${ap.pastDueBillCount === 1 ? '' : 's'}`} />
        <Metric icon={BadgeDollarSign} label="Active Discounts" value={money(ap.totalDiscountSavings)} detail={`${ap.discountOpportunities.length} source-confirmed opportunities`} />
        <Metric icon={Building2} label="Largest Supplier Exposure" value={money(ap.highestExposureSupplier?.apBalance)} detail={ap.highestExposureSupplier?.name || 'No supplier exposure'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="card-surface p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">AP Payment Schedule</h2>
              <p className="text-xs text-muted-foreground">Buckets are based on days until due; past-due bills are separated.</p>
            </div>
            <span className="text-xs font-semibold text-[#0d9488]">Total {money(ap.aging.total)}</span>
          </div>

          <div className="space-y-3">
            {bucketOrder.map(bucket => {
              const value = Number(ap.aging.buckets[bucket] || 0);
              const pct = ap.totalAP ? value / ap.totalAP * 100 : 0;
              const label = bucket === 'Past Due' ? 'Past due' : `Due in ${bucket} days`;
              return (
                <div key={bucket}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold text-foreground">{label}</span>
                    <span className="text-muted-foreground">{money(value)} · {pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface ring-1 ring-border ring-inset">
                    <div className={`h-full rounded-full ${bucket === 'Past Due' ? 'bg-[#ef4444]' : 'bg-[#0d9488]'}`} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card-surface p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground">AP Snapshot</h2>
            <p className="text-xs text-muted-foreground">Immediate payment pressure and current discount economics.</p>
          </div>

          {ap.paymentQueue[0] && (
            <div className={`rounded-xl border p-4 ${ap.paymentQueue[0].priorityTier === 'P1' ? 'border-[#ef4444]/20 bg-[#ef4444]/5' : 'border-border bg-surface'}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Top payment priority</p>
              <p className="mt-1 text-sm font-bold text-foreground">{ap.paymentQueue[0].billNo} · {ap.paymentQueue[0].vendorName}</p>
              <p className="mt-1 text-xs text-muted-foreground">{ap.paymentQueue[0].priorityReason}</p>
              <p className="mt-2 text-xl font-bold text-foreground">{money(ap.paymentQueue[0].balanceDue)}</p>
            </div>
          )}

          <div className="rounded-xl border border-[#16a34a]/20 bg-[#16a34a]/5 p-4 text-xs">
            <p className="font-semibold text-foreground">APR-qualified discount candidates</p>
            <p className="mt-1 text-muted-foreground">Current source-confirmed savings: <strong className="text-[#16a34a]">{money(ap.totalDiscountCandidateSavings)}</strong></p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">Module 3 surfaces discount economics. AR→AP chained funding decisions remain deferred to Cross Domain Intelligence.</p>
          </div>
        </section>
      </div>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-border p-5">
          <h2 className="text-base font-bold text-foreground">Supplier Exposure</h2>
          <p className="mt-1 text-xs text-muted-foreground">Open AP grouped by supplier with current due pressure.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-surface text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5">Open AP</th>
                <th className="p-3.5">Past Due</th>
                <th className="p-3.5">Due 0-15</th>
                <th className="p-3.5">Open Bills</th>
                <th className="p-3.5">Terms</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...ap.suppliers].sort((a, b) => b.apBalance - a.apBalance).map(supplier => (
                <tr key={supplier.id} className="hover:bg-surface/50">
                  <td className="p-3.5 font-bold text-foreground">{supplier.name}</td>
                  <td className="p-3.5 font-semibold text-foreground">{money(supplier.apBalance)}</td>
                  <td className={`p-3.5 font-semibold ${supplier.pastDueAmount > 0 ? 'text-[#ef4444]' : 'text-muted-foreground'}`}>{money(supplier.pastDueAmount)}</td>
                  <td className="p-3.5 text-muted-foreground">{money(supplier.agingBuckets['0-15'])}</td>
                  <td className="p-3.5 text-muted-foreground">{supplier.openBillCount}</td>
                  <td className="p-3.5 text-muted-foreground">{supplier.terms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="size-4 text-[#0d9488]" />
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
