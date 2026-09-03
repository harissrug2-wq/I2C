import React from 'react';
import { Boxes, PackageCheck, AlertTriangle, Layers3 } from 'lucide-react';
import { useData } from '../context/DataContext';
import EmptyWorkspaceState from '../components/EmptyWorkspaceState';

const money = value => `$${Math.round(Number(value || 0)).toLocaleString()}`;

export default function InventoryPage() {
  const { sys2 } = useData();

  if (!sys2.stockSkuCount) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyWorkspaceState
          title="No inventory data yet"
          detail="Import products or add SKUs manually to calculate sales velocity, ABC class, safety stock, reorder points and stagnant inventory risk."
        />
      </div>
    );
  }

  const atRiskValue = sys2.deadStockValue + sys2.overstockedValue + sys2.slowMovingValue;

  return (
    <div className="space-y-6">
      <Header />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Boxes} label="Inventory Value" value={money(sys2.totalValue)} detail={`${sys2.stockSkuCount} stocked SKUs · ${sys2.totalUnitsOnHand.toLocaleString()} units on hand`} />
        <Metric icon={AlertTriangle} label="Reorder Signals" value={sys2.reorderAlertCount.toLocaleString()} detail="Lead-time and reorder-point signals" />
        <Metric icon={Layers3} label="At-Risk Inventory" value={money(atRiskValue)} detail="Dead, overstocked and slow-moving value" />
        <Metric icon={PackageCheck} label="Healthy / Active Value" value={money(sys2.healthyValue)} detail={`${sys2.healthyPercent}% of inventory value`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="card-surface p-5">
          <div className="mb-4">
            <h2 className="text-base font-bold text-foreground">ABC Classification</h2>
            <p className="mt-1 text-xs text-muted-foreground">SKUs ranked by trailing annual revenue; A/B/C uses the product-mix rank bands from the inventory design.</p>
          </div>
          {!sys2.abcReady ? (
            <p className="rounded-lg bg-surface p-4 text-xs text-muted-foreground">Annual sales and selling-price data are required before ABC classes can be assigned.</p>
          ) : (
            <div className="space-y-3">
              {sys2.abcSummary.map(row => (
                <div key={row.abcClass} className="rounded-xl border border-border bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-foreground">Class {row.abcClass}</p>
                      <p className="text-[11px] text-muted-foreground">{row.skuCount} SKU{row.skuCount === 1 ? '' : 's'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{money(row.inventoryValue)}</p>
                      <p className="text-[11px] text-muted-foreground">Annual revenue {money(row.annualRevenue)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card-surface p-5">
          <div className="mb-4">
            <h2 className="text-base font-bold text-foreground">Inventory Risk</h2>
            <p className="mt-1 text-xs text-muted-foreground">Current operating signals only; seasonal and cross-domain analysis are not mixed into this view.</p>
          </div>
          <div className="space-y-3 text-xs">
            <RiskRow label="Dead / stagnant" value={sys2.deadStockValue} count={sys2.deadStockCandidates.length} />
            <RiskRow label="Overstocked" value={sys2.overstockedValue} count={sys2.skus.filter(s => s.status === 'Overstocked').length} />
            <RiskRow label="Slow-moving Class C" value={sys2.slowMovingValue} count={sys2.slowMovingCandidates.length} />
            <RiskRow label="Reorder attention" value={sys2.reorderCandidates.reduce((sum, p) => sum + p.inventoryValue, 0)} count={sys2.reorderCandidates.length} />
          </div>
        </section>
      </div>

      <section className="card-surface overflow-hidden">
        <div className="border-b border-border p-5">
          <h2 className="text-base font-bold text-foreground">Highest Inventory Attention</h2>
          <p className="mt-1 text-xs text-muted-foreground">Prioritized by stockout risk, ABC importance and trapped inventory value.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-surface text-muted-foreground uppercase font-semibold">
              <tr><th className="p-3.5">SKU</th><th className="p-3.5">Class</th><th className="p-3.5">On Hand</th><th className="p-3.5">Days Stock</th><th className="p-3.5">Reorder Point</th><th className="p-3.5">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...sys2.reorderCandidates, ...sys2.deadStockCandidates]
                .filter((row, index, all) => all.findIndex(x => x.sku === row.sku) === index)
                .slice(0, 10)
                .map(row => (
                  <tr key={row.sku} className="hover:bg-surface/50">
                    <td className="p-3.5"><span className="font-bold text-foreground">{row.name}</span><span className="block font-mono text-[10px] text-muted-foreground">{row.sku}</span></td>
                    <td className="p-3.5 font-semibold text-[#0d9488]">{row.abcClass === 'Unclassified' ? '—' : row.abcClass}</td>
                    <td className="p-3.5 text-foreground">{row.onHand.toLocaleString()}</td>
                    <td className="p-3.5 text-muted-foreground">{row.daysOfStockInfinite ? 'No recent sales' : `${row.daysOfStock}d`}</td>
                    <td className="p-3.5 text-muted-foreground">{row.reorderPoint.toLocaleString()}</td>
                    <td className="p-3.5 font-semibold text-foreground">{row.status}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Header() {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">INVENTORY</p>
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl"><Boxes className="size-6 text-[#0d9488]" /> Inventory Control Center</h1>
      <p className="mt-1.5 max-w-3xl text-xs text-muted-foreground sm:text-sm">Sales velocity, days of stock, ABC classification, safety stock, reorder points and stagnant-inventory controls from the active workspace.</p>
    </div>
  );
}

function Metric({ icon: Icon, label, value, detail }) {
  return <div className="card-surface p-5"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><Icon className="size-4 text-[#0d9488]" /></div><p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

function RiskRow({ label, value, count }) {
  return <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"><div><p className="font-semibold text-foreground">{label}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{count} SKU{count === 1 ? '' : 's'}</p></div><p className="text-base font-bold text-foreground">{money(value)}</p></div>;
}
