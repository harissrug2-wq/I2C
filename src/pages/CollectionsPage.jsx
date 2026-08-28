import React from 'react';
import { ListOrdered } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function CollectionsPage({ onOpenActionModal }) {
  const { sys4 } = useData();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            RECEIVABLES
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
            <ListOrdered className="size-6 text-[#0d9488]" />
            Collections Priority Queue
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
            Ranked dynamically by expected recovery value, customer PayScore, and historical payment responsiveness (System 4 Sub-Area A).
          </p>
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface border-b border-border text-muted-foreground uppercase font-semibold">
            <tr>
              <th className="p-3.5">Priority Rank</th>
              <th className="p-3.5">Customer Name</th>
              <th className="p-3.5">Total Balance</th>
              <th className="p-3.5">Past Due</th>
              <th className="p-3.5">PayScore / Priority</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sys4.collectionQueue.map((item, idx) => (
              <tr key={item.id} className="hover:bg-surface/50 transition-colors">
                <td className="p-3.5 font-bold text-[#0d9488]">#{idx + 1}</td>
                <td className="p-3.5 font-bold text-foreground">{item.name}</td>
                <td className="p-3.5 text-foreground">${item.balance.toLocaleString()}</td>
                <td className="p-3.5 font-semibold text-[#ef4444]">${item.pastDue.toLocaleString()}</td>
                <td className="p-3.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${item.riskScore > 60 ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#16a34a]/10 text-[#16a34a]'}`}>
                      {item.riskScore} Risk Score
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground">({item.priorityTier})</span>
                  </div>
                </td>
                <td className="p-3.5 text-right">
                  <button
                    onClick={() => onOpenActionModal({ title: item.action, details: `${item.name} - Past Due $${item.pastDue.toLocaleString()}` })}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#0d9488] px-3 py-1 text-xs font-semibold text-white hover:bg-[#0f766e] cursor-pointer"
                  >
                    {item.action}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
