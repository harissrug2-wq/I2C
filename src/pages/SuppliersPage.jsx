import React from 'react';
import { Building2 } from 'lucide-react';

export default function SuppliersPage({ onOpenActionModal }) {
  const suppliers = [
    { name: 'Meridian Pipe Works', ap: '$90,000', terms: 'COD / Net 15', leadTime: '14 days', status: 'Reorder Pending' },
    { name: 'Orchid Industrial Materials', ap: '$64,200', terms: '2/10 Net 30', leadTime: '7 days', status: 'Active Discount' },
    { name: 'Apex Resins Corp', ap: '$42,500', terms: '2/10 Net 30', leadTime: '10 days', status: 'Active Discount' },
    { name: 'Cascade Metals Group', ap: '$27,800', terms: '2/10 Net 30', leadTime: '5 days', status: 'Active Discount' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            PAYABLES
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Building2 className="size-6 text-[#0d9488]" />
            Suppliers & Vendors
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            Supplier accounts, payment terms, and scheduled lot purchase deliveries.
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
            {suppliers.map((s, i) => (
              <tr key={i} className="hover:bg-surface/50 transition-colors">
                <td className="p-3.5 font-bold text-foreground">{s.name}</td>
                <td className="p-3.5 font-semibold text-foreground">{s.ap}</td>
                <td className="p-3.5 text-muted-foreground">{s.terms}</td>
                <td className="p-3.5 text-muted-foreground">{s.leadTime}</td>
                <td className="p-3.5 text-right">
                  <span className="bg-[#0d9488]/10 text-[#0d9488] px-2 py-0.5 rounded-full font-semibold text-[10px]">
                    {s.status}
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
