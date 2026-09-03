import React from 'react';
import { Database } from 'lucide-react';

export default function EmptyWorkspaceState({ title = 'No workspace data yet', detail = 'Add records manually or import CSV files to activate this view.' }) {
  return (
    <div className="card-surface p-8 text-center sm:p-10">
      <span className="mx-auto flex size-11 items-center justify-center rounded-xl bg-[#0d9488]/10 text-[#0d9488]">
        <Database className="size-5" />
      </span>
      <h2 className="mt-3 text-base font-bold text-foreground">{title}</h2>
      <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">{detail}</p>
      <a href="/manual-data" className="mt-4 inline-flex rounded-lg bg-[#0d9488] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0f766e]">
        Add or import data
      </a>
    </div>
  );
}
