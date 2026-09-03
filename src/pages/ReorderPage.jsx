import React from 'react';
import { Boxes, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';
import EmptyWorkspaceState from '../components/EmptyWorkspaceState';

const riskPriority = { HIGH:'CRITICAL', MEDIUM:'HIGH', LOW:'MEDIUM', NONE:'LOW' };

export default function ReorderPage() {
  const { sys2 } = useData();

  if (!sys2.stockSkuCount) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyWorkspaceState title="No inventory data for reorder analysis" detail="Add products with on-hand, recent sales and lead-time fields to calculate reorder priority." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      {sys2.reorderCandidates.length === 0 ? (
        <div className="card-surface p-8 text-center"><p className="text-sm font-bold text-foreground">No active reorder signals</p><p className="mt-1 text-xs text-muted-foreground">Current stocked SKUs are outside the configured lead-time risk bands.</p></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {sys2.reorderCandidates.map(item => {
            const minQty = item.minimumReorderUnits;
            return (
              <article key={item.sku} className={`card-surface border-l-4 p-5 space-y-3 ${item.stockoutRisk === 'HIGH' ? 'border-l-[#ef4444]' : item.stockoutRisk === 'MEDIUM' ? 'border-l-[#f59e0b]' : 'border-l-[#0d9488]'}`}>
                <div className="flex items-start justify-between gap-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f59e0b]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#d97706]"><AlertTriangle className="size-3" />{riskPriority[item.stockoutRisk] || 'MEDIUM'} PRIORITY</span>
                  <span className="text-xs font-semibold text-muted-foreground">Class {item.abcClass === 'Unclassified' ? '—' : item.abcClass}</span>
                </div>
                <div><h3 className="text-base font-bold text-foreground">{item.name}</h3><p className="font-mono text-[10px] text-muted-foreground">{item.sku}</p></div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Datum label="On hand" value={item.onHand.toLocaleString()} />
                  <Datum label="Daily velocity" value={item.velocityDaily.toLocaleString()} />
                  <Datum label="Days of stock" value={item.daysOfStockInfinite ? 'No recent sales' : `${item.daysOfStock} days`} />
                  <Datum label="Lead time" value={`${item.leadTimeDays} days`} />
                  <Datum label="Safety stock" value={item.safetyStock.toLocaleString()} />
                  <Datum label="Reorder point" value={item.reorderPoint.toLocaleString()} />
                </div>
                <div className="rounded-lg border border-border bg-surface p-3 text-xs leading-relaxed">
                  <span className="block font-semibold text-[#0d9488]">Recommended action</span>
                  {minQty > 0
                    ? <>Reorder at least <strong>{minQty.toLocaleString()} units</strong> to restore stock to the calculated reorder point. Confirm vendor MOQ / pack size before placing the order.</>
                    : <>Review replenishment now. Stock coverage is inside the lead-time risk band, but a purchase quantity cannot be derived without vendor MOQ / order-policy data.</>}
                </div>
                <p className="text-[11px] text-muted-foreground">Confidence {item.dataConfidence}% · service target {item.serviceLevelTarget}</p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Header() {
  return <div><p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">INVENTORY</p><h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2"><Boxes className="size-6 text-[#0d9488]" />Reorder Priority</h1><p className="mt-1.5 max-w-3xl text-xs sm:text-sm text-muted-foreground">Pure inventory replenishment signals from sales velocity, lead time, safety stock, reorder point and ABC importance. Cash/AR chaining is intentionally kept out of this view.</p></div>;
}

function Datum({label,value}) { return <div className="rounded-lg bg-surface p-2.5"><span className="block text-[10px] uppercase text-muted-foreground">{label}</span><span className="mt-0.5 block font-semibold text-foreground">{value}</span></div>; }
