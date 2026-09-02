import React from 'react';
import { CircleDollarSign, BadgeDollarSign, Clock3, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';

function money(value) {
  return `$${Math.round(Number(value || 0)).toLocaleString()}`;
}

const priorityStyle = {
  P1: 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20',
  P2: 'bg-[#f59e0b]/10 text-[#b45309] border-[#f59e0b]/20',
  P3: 'bg-[#0d9488]/10 text-[#0d9488] border-[#0d9488]/20',
  P4: 'bg-surface text-muted-foreground border-border',
};

export default function PaymentsPage({ onOpenActionModal }) {
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
            <CircleDollarSign className="size-6 text-[#0d9488]" /> Payment Priority Queue
          </h1>
          <p className="mt-1.5 max-w-3xl text-xs sm:text-sm text-muted-foreground">
            Operational bill sequencing by overdue status, due date and source-confirmed discount economics. Chained AR→AP optimization is handled in Cross Domain Intelligence.
          </p>
        </div>
        <span className="rounded-full bg-[#16a34a]/10 px-3 py-1.5 text-xs font-bold text-[#16a34a] border border-[#16a34a]/20">
          {money(ap.totalDiscountSavings)} discount savings visible
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Past Due</p>
          <p className="mt-2 text-2xl font-bold text-[#ef4444]">{money(ap.pastDueAmount)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{ap.pastDueBillCount} bill{ap.pastDueBillCount === 1 ? '' : 's'}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Due 0-15 Days</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{money(ap.dueWithin15Amount)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Immediate payment schedule</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">APR-qualified Savings</p>
          <p className="mt-2 text-2xl font-bold text-[#16a34a]">{money(ap.totalDiscountCandidateSavings)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Current-cash gate only; forecast optimization deferred</p>
        </div>
      </div>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-border p-5">
          <h2 className="text-base font-bold text-foreground">All Open Bills — Ranked</h2>
          <p className="mt-1 text-xs text-muted-foreground">P1 = past due, P2 = high priority, P3 = medium, P4 = planned to terms.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-left text-xs">
            <thead className="bg-surface text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Bill</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5">Balance</th>
                <th className="p-3.5">Due</th>
                <th className="p-3.5">Timing</th>
                <th className="p-3.5">Discount</th>
                <th className="p-3.5">Recommended Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ap.paymentQueue.map(bill => (
                <tr key={bill.billNo} className="hover:bg-surface/50 align-top">
                  <td className="p-3.5">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${priorityStyle[bill.priorityTier] || priorityStyle.P4}`}>
                      {bill.priorityTier}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-foreground">{bill.billNo}</td>
                  <td className="p-3.5 text-foreground">{bill.vendorName}</td>
                  <td className="p-3.5 font-semibold text-foreground">{money(bill.balanceDue)}</td>
                  <td className="p-3.5 text-muted-foreground">{bill.dueDate}</td>
                  <td className={`p-3.5 font-semibold ${bill.daysOverdue > 0 ? 'text-[#ef4444]' : 'text-muted-foreground'}`}>
                    {bill.daysOverdue > 0 ? `${bill.daysOverdue}d overdue` : `${bill.daysToDue}d to due`}
                  </td>
                  <td className="p-3.5">
                    {bill.discountSavings > 0 ? (
                      <div>
                        <span className="font-semibold text-[#16a34a]">{money(bill.discountSavings)}</span>
                        <span className="block text-[10px] text-muted-foreground">APR {bill.discountAPRPercent}%</span>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-3.5">
                    <button
                      type="button"
                      onClick={() => onOpenActionModal?.({
                        title: `${bill.billNo} · ${bill.vendorName}`,
                        details: `${bill.recommendedAction}. ${bill.priorityReason}.`,
                      })}
                      className="text-left font-semibold text-[#0d9488] hover:underline"
                    >
                      {bill.recommendedAction}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2"><BadgeDollarSign className="size-4 text-[#16a34a]" /> Early-Pay Discount Visibility</h2>
          <p className="mt-1 text-xs text-muted-foreground">Source-confirmed discount amounts and APR comparison to workspace cost of capital.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {ap.discountOpportunities.map(bill => (
            <div key={bill.billNo} className="card-surface p-5 space-y-3 border-l-4 border-l-[#16a34a]">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-[#16a34a]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#16a34a]">
                  APR {bill.discountAPRPercent}%
                </span>
                <span className="text-xs text-muted-foreground">{bill.billNo}</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{bill.vendorName}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Bill {money(bill.balanceDue)} · due {bill.dueDate}</p>
              </div>
              <div className="rounded-lg border border-[#16a34a]/20 bg-[#16a34a]/5 p-3">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">Source-confirmed savings</p>
                <p className="mt-1 text-xl font-bold text-[#16a34a]">{money(bill.discountSavings)}</p>
              </div>
              <div className="flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
                {bill.discountCandidate ? <BadgeDollarSign className="mt-0.5 size-3.5 shrink-0 text-[#16a34a]" /> : <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[#f59e0b]" />}
                <span>{bill.discountOptimizationStatus}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-xl border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground flex items-start gap-2">
        <Clock3 className="mt-0.5 size-4 shrink-0 text-[#0d9488]" />
        <span><strong className="text-foreground">Scope:</strong> this page does not fund supplier discounts by accelerating a specific receivable. That chained decision belongs in Cross Domain Intelligence.</span>
      </div>
    </div>
  );
}
