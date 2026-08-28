import React from 'react';
import { Users } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function CustomersPage({ onOpenActionModal }) {
  const { sys4 } = useData();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            RECEIVABLES
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Users className="size-6 text-[#0d9488]" />
            Customer Accounts ({sys4.creditManagement.length})
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            Complete list of active customer accounts, AR aging, PayScores, and recommended credit limits (System 4 Sub-Area B).
          </p>
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface border-b border-border text-muted-foreground uppercase font-semibold">
            <tr>
              <th className="p-3.5">Customer</th>
              <th className="p-3.5">Open AR Balance</th>
              <th className="p-3.5">Credit Limit (Current / Rec)</th>
              <th className="p-3.5">Avg Days to Pay</th>
              <th className="p-3.5">Risk Tier</th>
              <th className="p-3.5 text-right">PayScore</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sys4.creditManagement.map((c) => (
              <tr key={c.id} className="hover:bg-surface/50 transition-colors">
                <td className="p-3.5 font-bold text-foreground">{c.name}</td>
                <td className="p-3.5 font-semibold text-foreground">${c.balance.toLocaleString()}</td>
                <td className="p-3.5 text-muted-foreground">
                  ${c.creditLimit.toLocaleString()} / <span className="font-semibold text-[#0d9488]">${c.recommendedLimit.toLocaleString()}</span>
                  {c.isBreached && <span className="ml-1 text-[10px] font-bold text-[#ef4444]">(Breached)</span>}
                </td>
                <td className="p-3.5 text-muted-foreground">{c.avgDaysToPay} days</td>
                <td className="p-3.5">
                  <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                    c.riskScore > 60 ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                    c.riskScore > 30 ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : 'bg-[#16a34a]/10 text-[#16a34a]'
                  }`}>
                    {c.riskScore > 60 ? 'Critical' : c.riskScore > 30 ? 'Elevated' : 'Healthy'}
                  </span>
                </td>
                <td className="p-3.5 text-right font-bold text-foreground">{c.riskScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
