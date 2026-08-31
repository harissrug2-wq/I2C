import React from 'react';
import { Boxes, AlertTriangle, ArrowRight } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function ReorderPage({ onOpenActionModal }) {
  const { sys2, sys3 } = useData();

  const reorders = sys2.skus
    .filter(p => p.category !== 'Non-stock' && p.leadTimeDays > 0 && (p.daysOfStock < p.leadTimeDays * 2 || p.onHand < p.reorderPoint))
    .map(p => {
      const urgency = p.daysOfStock < p.leadTimeDays ? 3 : p.daysOfStock < p.leadTimeDays * 1.5 ? 2 : 1;
      let recommendation = `Reorder ${p.eoq || Math.max(1, p.reorderPoint - p.onHand)} units. Calculated reorder point: ${p.reorderPoint}; safety stock: ${p.safetyStock}.`;
      if (p.inventoryValue > 50000 && sys3.floorGap > 0) {
        recommendation = `Stockout risk is real, but stage the purchase around the projected $${sys3.lowPointCash.toLocaleString()} cash low point on ${sys3.lowPointDay}.`;
      }
      return {
        sku: p.name,
        cost: `$${p.inventoryValue.toLocaleString()}`,
        stockoutRisk: `${p.stockoutDays} days`,
        urgency,
        abcClass: p.abcClass,
        recommendation
      };
    })
    .sort((a,b) => b.urgency - a.urgency || (a.abcClass === 'A' ? -1 : 1))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            INVENTORY
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <Boxes className="size-6 text-[#0d9488]" />
            Reorder Priority & Queue
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            Replenishment priorities calculated from manual inventory inputs and the cash forecast (Systems 2 & 3).
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reorders.map((r, i) => (
          <div key={i} className="card-surface p-5 border-l-4 border-l-[#f59e0b] space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#f59e0b] bg-[#f59e0b]/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertTriangle className="size-3" /> Reorder Flag
              </span>
              <span className="text-xs font-bold text-foreground">{r.cost}</span>
            </div>

            <h3 className="text-base font-bold text-foreground">{r.sku}</h3>
            <p className="text-xs text-muted-foreground">Stockout Risk: <span className="font-semibold text-[#ef4444]">{r.stockoutRisk}</span></p>

            <div className="bg-surface p-3 rounded-lg border border-border text-xs">
              <span className="font-semibold text-[#0d9488] block mb-1">i2C Recommendation:</span>
              <span className="text-foreground leading-relaxed">{r.recommendation}</span>
            </div>

            <button
              onClick={() => onOpenActionModal({ title: 'Adjust Reorder Schedule', details: r.sku })}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0d9488] hover:bg-[#0f766e] px-3.5 py-2 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Adjust Reorder Schedule
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
