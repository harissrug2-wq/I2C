import React, { useState } from 'react';
import { Search, X, Users, Building2, Package, ArrowUpRight } from 'lucide-react';

export default function SearchModal({ isOpen, onClose, onSelectResult }) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const mockDatabase = [
    { type: 'Customer', name: 'Northgate Supply', info: '$96K past 60 days · PayScore 42', category: 'Receivables' },
    { type: 'Customer', name: 'Anchor Distributors', info: '$14.2K overdue (187d) · $6.4K stock recoverable', category: 'Receivables' },
    { type: 'Customer', name: 'Sierra Mechanical', info: '$62K balance · 47 days average pay', category: 'Receivables' },
    { type: 'Supplier', name: 'Meridian Supply Ltd', info: '$90,000 reorder landing Sep 2', category: 'Payables' },
    { type: 'Supplier', name: 'Apex Resins Corp', info: '$42.5K due Aug 22 · 2% early discount available', category: 'Payables' },
    { type: 'SKU', name: 'PVC Pipe 2" Schedule 40', info: 'Margin -7.2 pts · Lot cost +14%', category: 'Inventory' },
    { type: 'SKU', name: 'THHN Wire 12 AWG Copper', info: 'Margin 29.8% → 24.6% realized', category: 'Inventory' },
  ];

  const filteredResults = mockDatabase.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.info.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-card border border-border shadow-2xl">
        {/* Search Bar Input */}
        <div className="flex items-center border-b border-border px-4 py-3 bg-card">
          <Search className="size-5 text-muted-foreground mr-3" />
          <input
            type="text"
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Type customer name, supplier, or SKU..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-surface hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-1">
          {filteredResults.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No results found for "{searchTerm}"
            </div>
          ) : (
            filteredResults.map((item, index) => {
              const Icon = item.type === 'Customer' ? Users : item.type === 'Supplier' ? Building2 : Package;
              return (
                <div
                  key={index}
                  onClick={() => {
                    onSelectResult(item);
                    onClose();
                  }}
                  className="flex items-center justify-between rounded-xl p-3 hover:bg-surface transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-lg bg-surface text-[#0d9488] group-hover:bg-[#0d9488] group-hover:text-white transition-colors">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                        {item.name}
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-muted-foreground border border-border">
                          {item.type}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">{item.info}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-[#0d9488] transition-colors" />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="border-t border-border bg-surface px-4 py-2.5 flex justify-between items-center text-[11px] text-muted-foreground">
          <span>Search integrated across QuickBooks + Brightpearl</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
}
