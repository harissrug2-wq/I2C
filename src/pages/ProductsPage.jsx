import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { useData } from '../context/DataContext';
import EmptyWorkspaceState from '../components/EmptyWorkspaceState';

const money = value => `$${Math.round(Number(value || 0)).toLocaleString()}`;

export default function ProductsPage() {
  const { sys2 } = useData();
  const [statusFilter, setStatusFilter] = useState('all');

  if (!sys2.stockSkuCount) {
    return (
      <div className="space-y-6">
        <Header totalValue={0} />
        <EmptyWorkspaceState title="No products or SKUs yet" detail="Add products manually or import products.csv to activate inventory valuation and SKU analytics." />
      </div>
    );
  }

  const filtered = statusFilter === 'all'
    ? sys2.skus.filter(p => p.category !== 'Non-stock')
    : sys2.skus.filter(p => p.category !== 'Non-stock' && p.status.toLowerCase().includes(statusFilter));

  const filters = [
    ['all', `All SKUs (${sys2.stockSkuCount})`],
    ['reorder', `Reorder (${sys2.reorderCandidates.length})`],
    ['dead', `Dead Stock (${sys2.deadStockCandidates.filter(p => p.status === 'Dead Stock').length})`],
    ['slow', `Slow Moving (${sys2.slowMovingCandidates.length})`],
    ['overstocked', `Overstocked (${sys2.skus.filter(p => p.status === 'Overstocked').length})`],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Header totalValue={sys2.totalValue} />
        <div className="flex flex-wrap rounded-xl bg-card p-1 ring-1 ring-border shadow-2xs">
          {filters.map(([key,label]) => (
            <button key={key} onClick={() => setStatusFilter(key)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${statusFilter === key ? 'bg-[#0d9488] text-white' : 'text-muted-foreground hover:text-foreground'}`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="card-surface overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="bg-surface border-b border-border text-muted-foreground uppercase font-semibold">
            <tr>
              <th className="p-3.5">SKU / Product</th>
              <th className="p-3.5">ABC</th>
              <th className="p-3.5">On Hand</th>
              <th className="p-3.5">Velocity / Day</th>
              <th className="p-3.5">Days of Stock</th>
              <th className="p-3.5">Safety Stock</th>
              <th className="p-3.5">Reorder Point</th>
              <th className="p-3.5">Turnover</th>
              <th className="p-3.5">Inventory Value</th>
              <th className="p-3.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(item => (
              <tr key={item.sku} className="hover:bg-surface/50 transition-colors">
                <td className="p-3.5"><span className="block font-bold text-foreground">{item.name}</span><span className="font-mono text-[10px] text-muted-foreground">{item.sku}</span></td>
                <td className="p-3.5"><span className="font-semibold text-[#0d9488]">{item.abcClass === 'Unclassified' ? '—' : `Class ${item.abcClass}`}</span><span className="block text-[10px] text-muted-foreground">Target {item.serviceLevelTarget}</span></td>
                <td className="p-3.5 font-semibold text-foreground">{item.onHand.toLocaleString()}</td>
                <td className="p-3.5 text-muted-foreground">{item.velocityDaily.toLocaleString()}</td>
                <td className="p-3.5 text-muted-foreground">{item.daysOfStockInfinite ? 'No recent sales' : `${item.daysOfStock} days`}</td>
                <td className="p-3.5 text-muted-foreground">{item.safetyStock.toLocaleString()}</td>
                <td className="p-3.5 text-muted-foreground">{item.reorderPoint.toLocaleString()}</td>
                <td className="p-3.5 text-muted-foreground">{item.turnoverAnnual}x{item.turnoverUsesCurrentOnHandProxy ? ' *' : ''}</td>
                <td className="p-3.5 font-semibold text-foreground">{money(item.inventoryValue)}</td>
                <td className="p-3.5 text-right"><Status status={item.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">* Turnover uses current on-hand as a proxy when average-on-hand history is not supplied.</p>
    </div>
  );
}

function Header({ totalValue }) {
  return <div><p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">INVENTORY</p><h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2"><Package className="size-6 text-[#0d9488]" />Products & SKUs</h1><p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">SKU-level inventory valuation, velocity, turnover, safety stock and reorder controls. Current inventory value: {money(totalValue)}.</p></div>;
}

function Status({ status }) {
  const cls = status === 'Dead Stock' ? 'bg-[#ef4444]/10 text-[#ef4444]' : status === 'Overstocked' ? 'bg-[#f59e0b]/10 text-[#d97706]' : status === 'Reorder' ? 'bg-[#f97316]/10 text-[#ea580c]' : status === 'Slow Moving' ? 'bg-[#7c3aed]/10 text-[#7c3aed]' : 'bg-[#16a34a]/10 text-[#16a34a]';
  return <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${cls}`}>{status}</span>;
}
