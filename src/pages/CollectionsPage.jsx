import React from 'react';
import { ListOrdered, ArrowUpRight, Mail, Phone, ShieldAlert } from 'lucide-react';

export default function CollectionsPage({ onOpenActionModal }) {
  const queue = [
    { rank: 1, name: 'Northgate Supply', balance: '$96,800', pastDue: '$96,800', payScore: 42, priority: 'Urgent', action: 'Send Formal Demand' },
    { rank: 2, name: 'Anchor Distributors', balance: '$14,200', pastDue: '$14,200', payScore: 28, priority: 'Urgent', action: 'Request Stock Return' },
    { rank: 3, name: 'Sierra Mechanical', balance: '$62,000', pastDue: '$24,000', payScore: 64, priority: 'High', action: 'Schedule Call' },
    { rank: 4, name: 'Cedar Building Materials', balance: '$41,500', pastDue: '$6,000', payScore: 71, priority: 'Medium', action: 'Send Reminder Email' }
  ];

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
            Ranked by expected recovery value, customer PayScore, and historical payment responsiveness.
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
              <th className="p-3.5">PayScore</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {queue.map(item => (
              <tr key={item.rank} className="hover:bg-surface/50 transition-colors">
                <td className="p-3.5 font-bold text-[#0d9488]">#{item.rank}</td>
                <td className="p-3.5 font-bold text-foreground">{item.name}</td>
                <td className="p-3.5 text-foreground">{item.balance}</td>
                <td className="p-3.5 font-semibold text-[#ef4444]">{item.pastDue}</td>
                <td className="p-3.5">
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${item.payScore < 50 ? 'bg-[#ef4444]/10 text-[#ef4444]' : 'bg-[#f59e0b]/10 text-[#f59e0b]'}`}>
                    {item.payScore} / 100
                  </span>
                </td>
                <td className="p-3.5 text-right">
                  <button
                    onClick={() => onOpenActionModal({ title: item.action, details: item.name })}
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
