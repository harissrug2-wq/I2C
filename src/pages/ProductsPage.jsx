import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function ProductsPage({ onOpenActionModal }) {
  const { sys2 } = useData();
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = statusFilter === 'all'
    ? sys2.skus
    : sys2.skus.filter(p => p.status.toLowerCase().includes(statusFilter));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            INVENTORY
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Package className="size-6 text-[#0d9488]" />
            Products & SKUs (${(sys2.totalValue / 1000000).toFixed(2)}M Total)
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            Inventory valuation, turnover velocity, and carrying cost optimization from Brightpearl (System 2).
          </p>
        </div>

        <div className="flex rounded-full bg-card p-1 ring-1 ring-border shadow-2xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${statusFilter === 'all' ? 'bg-[#0d9488] text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            All SKUs ({sys2.skus.length})
          </button>
          <button
            onClick={() => setStatusFilter('healthy')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${statusFilter === 'healthy' ? 'bg-[#16a34a] text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Healthy ({sys2.healthyPercent}%)
          </button>
          <button
            onClick={() => setStatusFilter('overstocked')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${statusFilter === 'overstocked' ? 'bg-[#f59e0b] text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Overstocked ({sys2.overstockedPercent}%)
          </button>
          <button
            onClick={() => setStatusFilter('dead')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${statusFilter === 'dead' ? 'bg-[#ef4444] text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Dead Stock ({sys2.deadStockPercent}%)
          </button>
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface border-b border-border text-muted-foreground uppercase font-semibold">
            <tr>
              <th className="p-3.5">SKU Code</th>
              <th className="p-3.5">Product Name</th>
              <th className="p-3.5">Category / ABC</th>
              <th className="p-3.5">Inventory Value</th>
              <th className="p-3.5">Turnover / EOQ</th>
              <th className="p-3.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((item) => (
              <tr key={item.sku} className="hover:bg-surface/50 transition-colors">
                <td className="p-3.5 font-mono text-muted-foreground">{item.sku}</td>
                <td className="p-3.5 font-bold text-foreground">{item.name}</td>
                <td className="p-3.5 text-muted-foreground">
                  {item.category} <span className="font-semibold text-[#0d9488]">(Class {item.abcClass})</span>
                </td>
                <td className="p-3.5 font-semibold text-foreground">${item.inventoryValue.toLocaleString()}</td>
                <td className="p-3.5 text-muted-foreground">{item.turnoverAnnual}x / EOQ {item.eoq} units</td>
                <td className="p-3.5 text-right">
                  <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${
                    item.status === 'Dead Stock' ? 'bg-[#ef4444]/10 text-[#ef4444]' :
                    item.status === 'Overstocked' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : 'bg-[#16a34a]/10 text-[#16a34a]'
                  }`}>
                    {item.status}
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
