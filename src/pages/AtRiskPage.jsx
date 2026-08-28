import React from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function AtRiskPage({ onOpenActionModal }) {
  const { sys4 } = useData();

  const atRiskAccounts = sys4.collectionQueue
    .filter(c => c.riskScore > 30 || c.pastDue > 0)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            RECEIVABLES
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <ShieldAlert className="size-6 text-[#ef4444]" />
            Money at Risk (${(sys4.moneyAtRisk / 1000).toFixed(0)}K)
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            {atRiskAccounts.length} accounts holding ${sys4.moneyAtRisk.toLocaleString()} in high-risk receivables out of ${sys4.totalAR.toLocaleString()} total open AR.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {atRiskAccounts.map((item) => (
          <div key={item.id} className="card-surface p-5 border-l-4 border-l-[#ef4444] space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#ef4444] bg-[#ef4444]/10 px-2 py-0.5 rounded-full">
                  {item.riskScore > 60 ? 'Critical' : 'Elevated'} Risk
                </span>
                <h3 className="text-base font-bold text-foreground mt-2">{item.name}</h3>
              </div>
              <span className="text-xl font-bold text-[#ef4444]">${item.pastDue.toLocaleString()}</span>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Total Balance: <span className="font-semibold text-foreground">${item.balance.toLocaleString()}</span></p>
              <p>Avg Days to Pay: <span className="font-semibold text-foreground">{item.avgDaysToPay} days</span></p>
              <p>i2C PayScore: <span className="font-semibold text-foreground">{item.riskScore}/100</span></p>
            </div>

            <p className="text-xs bg-surface p-2.5 rounded-lg border border-border leading-relaxed text-foreground">
              {item.inventoryDeliveredValue
                ? `$${item.inventoryDeliveredValue.toLocaleString()} physical inventory delivered on unpaid invoices is recoverable.`
                : `Account velocity delayed by ${item.avgDaysLate} days past terms.`}
            </p>

            <button
              onClick={() => onOpenActionModal({ title: item.action, details: item.name })}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
            >
              <CheckCircle2 className="size-3.5" />
              {item.action}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
