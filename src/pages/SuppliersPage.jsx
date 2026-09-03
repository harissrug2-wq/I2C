import React from 'react';
import { Building2, BadgeDollarSign, Clock3 } from 'lucide-react';
import { useData } from '../context/DataContext';

function money(value) {
  return `$${Math.round(Number(value || 0)).toLocaleString()}`;
}

export default function SuppliersPage() {
  const { sys4 } = useData();
  const ap = sys4.payables;

  if (!ap) {
    return <div className="card-surface p-6 text-sm text-muted-foreground">Payables engine is not available in this workspace.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">PAYABLES</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Building2 className="size-6 text-[#0d9488]" /> Suppliers ({ap.suppliers.length})
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs sm:text-sm text-muted-foreground">
            Supplier AP exposure, payment terms, due pressure and historical payment behaviour from the active workspace.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Open AP</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{money(ap.totalAP)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Across {ap.suppliers.length} suppliers</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Largest Exposure</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{money(ap.highestExposureSupplier?.apBalance)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{ap.highestExposureSupplier?.name}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Historical Discounts Captured</p>
          <p className="mt-2 text-2xl font-bold text-[#16a34a]">{money(ap.paymentHistory.discountCaptured)}</p>
          <p className="mt-1 text-xs text-muted-foreground">From recorded supplier payments</p>
        </div>
      </div>

      <section className="card-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-xs">
            <thead className="bg-surface border-b border-border text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5">Open AP</th>
                <th className="p-3.5">Past Due</th>
                <th className="p-3.5">Due 0-15</th>
                <th className="p-3.5">Terms</th>
                <th className="p-3.5">Payment History</th>
                <th className="p-3.5">Avg Days Late</th>
                <th className="p-3.5">Discount Record</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...ap.suppliers].sort((a, b) => b.apBalance - a.apBalance).map(supplier => (
                <tr key={supplier.id} className="hover:bg-surface/50 transition-colors align-top">
                  <td className="p-3.5">
                    <p className="font-bold text-foreground">{supplier.name}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{supplier.category}</p>
                  </td>
                  <td className="p-3.5 font-semibold text-foreground">{money(supplier.apBalance)}</td>
                  <td className={`p-3.5 font-semibold ${supplier.pastDueAmount > 0 ? 'text-[#ef4444]' : 'text-muted-foreground'}`}>{money(supplier.pastDueAmount)}</td>
                  <td className="p-3.5 text-muted-foreground">{money(supplier.agingBuckets['0-15'])}</td>
                  <td className="p-3.5 text-muted-foreground">{supplier.terms}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Clock3 className="size-3.5 text-[#0d9488]" />
                      <span>{supplier.paymentHistoryCount || 0} payments</span>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">On-time rate {supplier.onTimeRate == null ? '—' : `${supplier.onTimeRate}%`}</p>
                  </td>
                  <td className={`p-3.5 font-semibold ${Number(supplier.avgDaysLate || 0) > 0 ? 'text-[#b45309]' : 'text-[#16a34a]'}`}>
                    {Number(supplier.avgDaysLate || 0).toFixed(1)} days
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1 text-muted-foreground"><BadgeDollarSign className="size-3.5 text-[#16a34a]" /> {supplier.discountsTakenCount || 0} taken</div>
                    <p className="mt-1 text-[10px] text-muted-foreground">{supplier.discountsMissedCount || 0} missed · {money(supplier.discountCaptured)} captured</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-4 text-xs leading-relaxed text-foreground">
        <strong>Data completeness:</strong> relationship rating, extension permission and explicit single-source Class A status are not present in the current canonical supplier file. AP-002/AP-003/AP-004 only fire when those fields are explicitly supplied; the engine does not invent them.
      </div>
    </div>
  );
}
