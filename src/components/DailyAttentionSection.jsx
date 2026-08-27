import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function DailyAttentionSection({ onOpenActionModal }) {
  const items = [
    {
      id: 'ar-attention',
      category: 'Receivables',
      title: 'Northgate Supply has stretched from 34 to 52 average days to pay, with $96k now past 60 days',
      desc: 'This is the single largest movement in your AR book this month. Accounts with this pattern paid 19 days sooner when contacted before day 45.',
      actionLabel: 'Draft Collection Email',
      border: 'border-l-4 border-l-[#ef4444]'
    },
    {
      id: 'margin-attention',
      category: 'Margins',
      title: 'PVC Pipe 2" Schedule 40 margin fell 7.2 points while list price held flat',
      desc: 'Meridian\'s lot cost rose 14% since February and none of it was passed through. The gap is worth about $31,200 a year on this SKU alone.',
      actionLabel: 'Adjust Price (+7.2%)',
      border: 'border-l-4 border-l-[#f59e0b]'
    },
    {
      id: 'ap-attention',
      category: 'Payables',
      title: 'Three early-payment discounts worth $3,653 close within the next 7 days',
      desc: 'Cash position supports capturing all three. Sequencing Orchid on Aug 21 keeps the Sep 4 forecast low point above your $250k floor.',
      actionLabel: 'Schedule 3 Payments ($3,653 savings)',
      border: 'border-l-4 border-l-[#16a34a]'
    }
  ];

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-full bg-[#701a75]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#701a75]">
              <Sparkles className="size-3 text-[#701a75]" />
              i2C Intelligence™
            </span>
            <span className="text-xs text-muted-foreground">Generated 4 min ago</span>
          </div>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground sm:text-xl">
            What needs your attention today
          </h2>
        </div>
        <span className="text-xs text-muted-foreground ring-1 ring-border rounded-full px-3 py-1 bg-surface">
          Explanation only — nothing was changed automatically
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <div 
            key={item.id} 
            className={`card-surface p-5 flex flex-col justify-between hover:border-primary/40 transition-colors ${item.border}`}
          >
            <div>
              <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                {item.category}
              </span>
              <h3 className="mt-2 text-sm font-semibold text-foreground leading-snug">
                {item.title}
              </h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-border/50">
              <button
                onClick={() => onOpenActionModal({
                  title: item.actionLabel,
                  type: item.id,
                  details: item.title
                })}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0d9488] hover:text-[#0f766e] group cursor-pointer"
              >
                {item.actionLabel}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
