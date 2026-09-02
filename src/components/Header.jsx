import React from 'react';
import { PanelLeft, Search, Sparkles, RefreshCw, Bell, Settings } from 'lucide-react';

export default function Header({ onToggleSidebar, onOpenSearch, onOpenAskAi, onOpenSettings }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
      <button
        onClick={onToggleSidebar}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-muted h-8 w-8 text-muted-foreground"
        title="Toggle Sidebar"
        aria-label="Toggle Sidebar"
      >
        <PanelLeft className="size-4" />
      </button>

      {/* Search Bar */}
      <div
        onClick={onOpenSearch}
        className="relative hidden max-w-md flex-1 sm:block cursor-pointer"
      >
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          readOnly
          placeholder="Search customers, suppliers, SKUs…"
          className="h-10 w-full rounded-full border border-border bg-card pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#a3e635] focus:outline-none cursor-pointer shadow-xs"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground hidden md:inline-block">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Ask i2C AI Button */}
        <button
          type="button"
          onClick={onOpenAskAi}
          className="inline-flex items-center gap-2 rounded-full bg-[#701a75] hover:bg-[#86198f] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all transform active:scale-95 cursor-pointer"
        >
          <Sparkles className="size-3.5 text-[#f472b6]" />
          Ask i2C
        </button>

        {/* Synced Badge */}
        <span className="inline-flex items-center gap-2 rounded-full bg-[#15803d]/10 px-3 py-1.5 text-xs font-semibold text-[#15803d] ring-1 ring-[#15803d]/20 ring-inset">
          <RefreshCw className="size-3.5 animate-spin-slow" />
          Synced 4 min ago
        </span>

        {/* Notification Bell */}
        <button
          onClick={onOpenAskAi}
          className="relative flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-2 size-2 rounded-full bg-[#ef4444] ring-2 ring-card animate-pulse"></span>
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title="Rules & Thresholds Settings"
        >
          <Settings className="size-4 text-[#0d9488]" />
        </button>
      </div>
    </header>
  );
}
