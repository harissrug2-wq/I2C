import React from 'react';
import { Info } from 'lucide-react';

export default function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 bg-[#0c4a3e] px-4 py-2 text-center text-xs font-medium text-[#d1fae5] border-b border-[#115e4c]">
      <Info className="size-3.5 text-[#bef264] shrink-0" />
      <span>
        <span className="font-semibold text-[#bef264]">Demo mode</span> — all figures, customers, suppliers and SKUs shown here are sample data for demonstration purposes only.
      </span>
    </div>
  );
}
