import React, { useState } from 'react';
import { Package, Search, AlertCircle } from 'lucide-react';

export default function ProductsPage({ onOpenActionModal }) {
  const [statusFilter, setStatusFilter] = useState('all');

  const products = [
    { sku: 'PVC-2040-SCH40', name: 'PVC Pipe 2" Schedule 40 (10ft)', category: 'Piping', stockVal: '$210,000', turnDays: 45, status: 'Overstocked' },
    { sku: 'THHN-12AWG-CU', name: 'THHN Wire 12 AWG Copper Reel', category: 'Electrical', stockVal: '$348,000', turnDays: 32, status: 'Healthy' },
    { sku: 'FIT-CU-075-ELB', name: 'Copper Fitting 3/4" Elbow 90-Deg', category: 'Fittings', stockVal: '$142,000', turnDays: 28, status: 'Healthy' },
    { sku: 'VAL-BR-100-BAL', name: 'Brass Ball Valve 1" Full Port', category: 'Valves', stockVal: '$228,000', turnDays: 210, status: 'Overstocked' },
    { sku: 'PMP-SUB-050-HP', name: 'Submersible Sump Pump 1/2 HP', category: 'Pumps', stockVal: '$229,000', turnDays: 340, status: 'Dead Stock' },
    { sku: 'CON-EMT-075-STR', name: 'EMT Conduit 3/4" Steel (10ft)', category: 'Conduit', stockVal: '$180,000', turnDays: 30, status: 'Healthy' },
  ];

  const filtered = statusFilter === 'all' ? products : products.filter(p => p.status.toLowerCase().includes(statusFilter));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            INVENTORY
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Package className="size-6 text-[#0d9488]" />
            Products & SKUs (3,908 SKUs)
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            Inventory valuation, turnover velocity, and carrying cost optimization from Brightpearl.
          </p>
        </div>

        <div className="flex rounded-full bg-card p-1 ring-1 ring-border shadow-2xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${statusFilter === 'all' ? 'bg-[#0d9488] text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            All SKUs (3,908)
          </button>
          <button
            onClick={() => setStatusFilter('healthy')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${statusFilter === 'healthy' ? 'bg-[#16a34a] text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Healthy (68%)
          </button>
          <button
            onClick={() => setStatusFilter('overstocked')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${statusFilter === 'overstocked' ? 'bg-[#f59e0b] text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Overstocked (21%)
          </button>
          <button
            onClick={() => setStatusFilter('dead')}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${statusFilter === 'dead' ? 'bg-[#ef4444] text-white' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Dead Stock (11%)
          </button>
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface border-b border-border text-muted-foreground uppercase font-semibold">
            <tr>
              <th className="p-3.5">SKU Code</th>
              <th className="p-3.5">Product Name</th>
              <th className="p-3.5">Category</th>
              <th className="p-3.5">Inventory Value</th>
              <th className="p-3.5">Turnover Days</th>
              <th className="p-3.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map((item, idx) => (
              <tr key={idx} className="hover:bg-surface/50 transition-colors">
                <td className="p-3.5 font-mono text-muted-foreground">{item.sku}</td>
                <td className="p-3.5 font-bold text-foreground">{item.name}</td>
                <td className="p-3.5 text-muted-foreground">{item.category}</td>
                <td className="p-3.5 font-semibold text-foreground">{item.stockVal}</td>
                <td className="p-3.5 text-muted-foreground">{item.turnDays} days</td>
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
