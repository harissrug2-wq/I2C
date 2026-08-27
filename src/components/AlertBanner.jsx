import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function AlertBanner({ onOpenActionModal }) {
  return (
    <div 
      onClick={() => onOpenActionModal({
        title: 'Money At Risk Alert',
        type: 'at-risk-detail',
        amount: '$12,000 Increase',
        details: 'Northgate ($18K) slipped past 90 days and Cedar\'s PayScore climbed to 71.'
      })}
      className="mt-4 flex items-start gap-3 rounded-xl bg-[#d97706]/10 p-4 ring-1 ring-[#d97706]/30 ring-inset transition-colors hover:bg-[#d97706]/20 cursor-pointer shadow-xs"
    >
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[#d97706]" />
      <span className="text-sm text-foreground font-medium leading-snug">
        Money at risk rose <strong className="text-[#d97706]">$12K this week</strong> — Northgate ($18K) slipped past 90 days and Cedar's PayScore climbed to 71. Review the at-risk list.
      </span>
    </div>
  );
}
