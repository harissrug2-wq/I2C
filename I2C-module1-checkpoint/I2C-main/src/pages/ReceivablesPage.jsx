import React from 'react';
import { WalletCards, ShieldCheck, AlertTriangle, Clock3 } from 'lucide-react';
import { useData } from '../context/DataContext';

const bucketOrder = ['Current', '1-30', '31-60', '61-90', '91-120', '120+'];

function money(value) {
  return `$${Math.round(Number(value || 0)).toLocaleString()}`;
}

export default function ReceivablesPage() {
  const { sys4 } = useData();
  const ar = sys4.receivables || sys4;
  const pastDue = bucketOrder.slice(1).reduce((sum, key) => sum + Number(ar.aging?.buckets?.[key] || 0), 0);
  const pastDuePct = ar.totalAR > 0 ? (pastDue / ar.totalAR) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">MODULE 2 · RECEIVABLES</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <WalletCards className="size-6 text-[#0d9488]" /> Receivables Control Center
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs sm:text-sm text-muted-foreground">
            AR aging, payment behaviour, PayScore, collection priority and expected credit loss computed from the active manual-data workspace.
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${ar.aging?.reconciled ? 'bg-[#16a34a]/10 text-[#16a34a] ring-[#16a34a]/20' : 'bg-[#ef4444]/10 text-[#ef4444] ring-[#ef4444]/20'}`}>
          {ar.aging?.reconciled ? 'AR aging reconciled' : `AR drift ${money(ar.aging?.reconciliationDelta)}`}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={WalletCards} label="Open AR" value={money(ar.totalAR)} detail={`${ar.openInvoiceCount} open invoices`} />
        <Metric icon={Clock3} label="Past Due" value={money(pastDue)} detail={`${pastDuePct.toFixed(1)}% of open AR`} />
        <Metric icon={AlertTriangle} label="Required ECL" value={money(ar.totalECL)} detail={`${ar.totalAR ? (ar.totalECL / ar.totalAR * 100).toFixed(1) : '0.0'}% of AR`} />
        <Metric icon={ShieldCheck} label="Collectible AR" value={money(ar.collectibleAR)} detail={`After design-v1 ECL`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="card-surface p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">AR Aging</h2>
              <p className="text-xs text-muted-foreground">Zero-drift bucket reconciliation against total open AR.</p>
            </div>
            <span className="text-xs font-semibold text-[#0d9488]">Total {money(ar.aging?.total)}</span>
          </div>
          <div className="space-y-3">
            {bucketOrder.map(bucket => {
              const value = Number(ar.aging?.buckets?.[bucket] || 0);
              const pct = ar.totalAR ? value / ar.totalAR * 100 : 0;
              return (
                <div key={bucket}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold text-foreground">{bucket === 'Current' ? 'Current / not due' : `${bucket} days overdue`}</span>
                    <span className="text-muted-foreground">{money(value)} · {pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface ring-1 ring-border ring-inset">
                    <div className="h-full rounded-full bg-[#0d9488]" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card-surface p-5 space-y-4">
          <div>
            <h2 className="text-base font-bold text-foreground">Risk Snapshot</h2>
            <p className="text-xs text-muted-foreground">Highest-risk customer and single-invoice ECL exposure.</p>
          </div>
          {ar.highestRiskCustomer && (
            <div className="rounded-xl border border-[#ef4444]/20 bg-[#ef4444]/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#ef4444]">Highest PayScore</p>
              <p className="mt-1 text-sm font-bold text-foreground">{ar.highestRiskCustomer.name}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>PayScore <strong className="text-foreground">{ar.highestRiskCustomer.payScore}</strong></span>
                <span>Avg late <strong className="text-foreground">{ar.highestRiskCustomer.avgDaysLate}d</strong></span>
                <span>Open AR <strong className="text-foreground">{money(ar.highestRiskCustomer.balance)}</strong></span>
                <span>ECL <strong className="text-foreground">{money(ar.highestRiskCustomer.ecl)}</strong></span>
              </div>
            </div>
          )}
          {ar.highestECLInvoice && (
            <div className="rounded-xl border border-border bg-surface p-4 text-xs">
              <p className="font-semibold text-foreground">Highest ECL invoice: {ar.highestECLInvoice.invoiceNo}</p>
              <p className="mt-1 text-muted-foreground">{ar.highestECLInvoice.customerName} · {ar.highestECLInvoice.daysOverdue} days overdue</p>
              <p className="mt-2 text-lg font-bold text-[#ef4444]">{money(ar.highestECLInvoice.ecl)}</p>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 p-4 text-xs leading-relaxed text-foreground">
          <strong>PayScore is provisional.</strong> The current executable reference uses the supplied avg-days-late bands. The final seven-component transformations are still unavailable because the source document delegates them to the i2C Intelligence Specification.
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-foreground">
          <strong>ECL model:</strong> Decision Systems Design v1 PD schedule + {Math.round((ar.eclModel?.lgd || 0.85) * 100)}% LGD. This deliberately differs from the older simplified ECL rates in the Calculation Visuals workbook.
        </div>
      </div>
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
