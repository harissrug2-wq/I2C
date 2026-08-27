import React from 'react';
import { Users, Search, ExternalLink } from 'lucide-react';

export default function CustomersPage({ onOpenActionModal }) {
  const customers = [
    { name: 'Northgate Supply', ar: '$96,800', terms: 'Net 30', avgDays: 52, status: 'Critical', payScore: 42 },
    { name: 'Sierra Mechanical', ar: '$62,000', terms: 'Net 45', avgDays: 47, status: 'Elevated', payScore: 64 },
    { name: 'Cedar Building Materials', ar: '$41,500', terms: 'Net 30', avgDays: 38, status: 'Elevated', payScore: 71 },
    { name: 'Cascade Construction', ar: '$38,200', terms: 'Net 30', avgDays: 29, status: 'Healthy', payScore: 89 },
    { name: 'Orchid Industrial', ar: '$28,400', terms: 'Net 30', avgDays: 28, status: 'Healthy', payScore: 92 },
    { name: 'Anchor Distributors', ar: '$14,200', terms: 'Net 30', avgDays: 187, status: 'Critical', payScore: 28 },
    { name: 'Apex General Contractors', ar: '$11,500', terms: 'Net 15', avgDays: 14, status: 'Healthy', payScore: 96 },
    { name: 'Summit Hardware & Supply', ar: '$7,400', terms: 'Net 30', avgDays: 26, status: 'Healthy', payScore: 88 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            RECEIVABLES
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Users className="size-6 text-[#0d9488]" />
            Customer Accounts (8)
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            Complete list of active customer accounts, AR aging, and i2C payment behavior tracking.
          </p>
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface border-b border-border text-muted-foreground uppercase font-semibold">
            <tr>
              <th className="p-3.5">Customer</th>
              <th className="p-3.5">Open AR Balance</th>
              <th className="p-3.5">Payment Terms</th>
              <th className="p-3.5">Avg Days to Pay</th>
              <th className="p-3.5">Risk Tier</th>
              <th className="p-3.5 text-right">PayScore</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {customers.map((c, i) => (
              <tr key={i} className="hover:bg-surface/50 transition-colors">
                <td className="p-3.5 font-bold text-foreground">{c.name}</td>
                <td className="p-3.5 font-semibold text-foreground">{c.ar}</td>
                <td className="p-3.5 text-muted-foreground">{c.terms}</td>
                <td className="p-3.5 text-muted-foreground">{c.avgDays} days</td>
                <td className="p-3.5">
                  <span className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                    c.status === 'Critical' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                    c.status === 'Elevated' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : 'bg-[#16a34a]/10 text-[#16a34a]'
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="p-3.5 text-right font-bold text-foreground">{c.payScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
