import React from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Bell, 
  Network, 
  ShieldAlert, 
  ListOrdered, 
  Users, 
  CircleDollarSign, 
  Building2, 
  Receipt, 
  Boxes, 
  Package, 
  PlugZap, 
  Lock,
  X,
  LogOut,
  Home
} from 'lucide-react';

export default function Sidebar({ isOpen, isCollapsed, onClose, activeTab, setActiveTab }) {
  const menuGroups = [
    {
      label: 'DAILY',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'forecast', label: 'Cash flow forecast', icon: TrendingUp },
        { id: 'alerts', label: 'Alerts', icon: Bell },
      ]
    },
    {
      label: 'INTELLIGENCE',
      items: [
        { id: 'insights', label: 'Cross-domain insights', icon: Network },
      ]
    },
    {
      label: 'RECEIVABLES',
      items: [
        { id: 'at-risk', label: 'Money at risk', icon: ShieldAlert },
        { id: 'collections', label: 'Collections priority', icon: ListOrdered },
        { id: 'customers', label: 'Customers', icon: Users },
      ]
    },
    {
      label: 'PAYABLES',
      items: [
        { id: 'payments', label: 'Payment priority', icon: CircleDollarSign },
        { id: 'suppliers', label: 'Suppliers', icon: Building2 },
      ]
    },
    {
      label: 'INVENTORY',
      items: [
        { id: 'margins', label: 'Margin priority', icon: Receipt },
        { id: 'reorder', label: 'Reorder priority', icon: Boxes },
        { id: 'products', label: 'Products', icon: Package },
      ]
    },
    {
      label: 'DATA',
      items: [
        { id: 'connections', label: 'Connections', icon: PlugZap },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full flex-col bg-[#112723] text-[#e2f1ed] border-r border-[#1a3832] transition-all duration-200 ease-linear
          ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'md:w-16' : 'md:w-64'}
        `}
      >
        {/* Header Branding */}
        <div className="flex flex-col p-4 gap-3">
          <div className="flex items-center justify-between">
            <a 
              href="/dashboard" 
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('dashboard');
              }} 
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#bef264] text-[#112723] font-black text-xl shadow-xs shrink-0">
                i2
              </span>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="leading-none text-white text-lg font-bold tracking-tight">cashflow</span>
                  <span className="text-[8px] font-semibold text-[#86a7a0] tracking-[0.16em] uppercase mt-0.5">INVENTORY TO CASHFLOW</span>
                </div>
              )}
            </a>
            <button 
              onClick={onClose}
              className="md:hidden text-sidebar-foreground/70 hover:text-white p-1"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Security Banner */}
          {!isCollapsed && (
            <p className="flex items-start gap-2 rounded-lg bg-[#193a34] px-2.5 py-2 text-[11px] leading-snug text-[#b7d5ce] ring-1 ring-[#224b43] ring-inset">
              <Lock className="mt-px size-3 shrink-0 text-[#bef264]" />
              <span>
                <span className="font-semibold text-[#bef264]">You're always in control</span> — nothing sends without your rules
              </span>
            </p>
          )}
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2 custom-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.label} className="px-1">
              {!isCollapsed && (
                <h4 className="px-2 mb-1.5 text-[10px] font-semibold tracking-[0.18em] text-[#6b8f87] uppercase">
                  {group.label}
                </h4>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          setActiveTab(item.id);
                          onClose();
                        }}
                        className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer text-left
                          ${isActive 
                            ? 'bg-[#1a3f38] text-[#bef264] font-semibold' 
                            : 'text-[#9ebdb6] hover:bg-[#16352f] hover:text-white'
                          }
                          ${isCollapsed ? 'justify-center px-0' : ''}
                        `}
                        title={item.label}
                      >
                        <Icon className={`size-4 shrink-0 ${isActive ? 'text-[#bef264]' : 'text-[#82a69e]'}`} />
                        {!isCollapsed && <span>{item.label}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer Profile */}
        {!isCollapsed && (
          <div className="p-4 border-t border-[#1a3832] bg-[#0e221f] space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-[#173731] px-3 py-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#bef264] text-xs font-bold text-[#112723]">
                DM
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-white">Dana Mercer</span>
                <span className="block truncate text-[11px] text-[#86a7a0]">Harbourline Distribution</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#86a7a0]">
              <button 
                onClick={() => setActiveTab('landing')}
                className="flex items-center gap-1 hover:text-[#bef264] transition-colors cursor-pointer"
              >
                <Home className="size-3.5" /> Landing Page
              </button>
              <button 
                onClick={() => setActiveTab('login')}
                className="flex items-center gap-1 hover:text-[#ef4444] transition-colors cursor-pointer"
              >
                <LogOut className="size-3.5" /> Sign Out
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
