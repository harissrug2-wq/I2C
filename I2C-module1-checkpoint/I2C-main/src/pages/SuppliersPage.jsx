import React from 'react';
import { Building2 } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function SuppliersPage({ onOpenActionModal }) {
  const { vendors, sys4 } = useData();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            PAYABLES
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Building2 className="size-6 text-[#0d9488]" />
            Suppliers & Vendors ({vendors.length})
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            Supplier accounts, payment terms, and working capital gap analysis (WC Gap: {sys4.wcGapDays} days).
          </p>
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface border-b border-border text-muted-foreground uppercase font-semibold">
            <tr>
              <th className="p-3.5">Supplier Name</th>
              <th className="p-3.5">Current AP Balance</th>
              <th className="p-3.5">Standard Terms</th>
              <th className="p-3.5">Order Lead Time</th>
              <th className="p-3.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {vendors.map((s) => (
              <tr key={s.id} className="hover:bg-surface/50 transition-colors">
                <td className="p-3.5 font-bold text-foreground">{s.name}</td>
                <td className="p-3.5 font-semibold text-foreground">${s.apBalance.toLocaleString()}</td>
                <td className="p-3.5 text-muted-foreground">{s.terms}</td>
                <td className="p-3.5 text-muted-foreground">{s.leadTimeDays} days</td>
                <td className="p-3.5 text-right">
                  <span className="bg-[#0d9488]/10 text-[#0d9488] px-2 py-0.5 rounded-full font-semibold text-[10px]">
                    {s.hasEarlyPay ? 'Active Discount Window' : 'Standard Terms'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
