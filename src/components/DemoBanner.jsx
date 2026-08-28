import React from 'react';
import { Activity, ShieldCheck } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function DemoBanner() {
  const { user } = useData();
  const companyName = user?.company || 'Harbourline Distribution';

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0c4a3e] px-4 py-2 text-xs font-medium text-[#d1fae5] border-b border-[#115e4c]">
      <div className="flex items-center gap-2">
        <Activity className="size-3.5 text-[#bef264] shrink-0 animate-pulse" />
        <span>
          <span className="font-bold text-[#bef264]">{companyName} Workspace</span> — Continuous calculation engine active (5 Decision Systems).
        </span>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-[#a7f3d0]">
        <ShieldCheck className="size-3.5 text-[#bef264]" />
        <span>QuickBooks + Brightpearl Read-Only Interlock</span>
      </div>
    </div>
  );
}
