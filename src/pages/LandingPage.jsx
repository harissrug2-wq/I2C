import React from 'react';
import { ArrowRight, Lock, TrendingUp, Users, DollarSign, Package, Bell, RefreshCw } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function LandingPage({ onNavigate }) {
  const { sys2, sys4, sys3, advisories } = useData();

  const screens = [
    'Dashboard', 'Cash flow forecast', 'Alerts',
    'Collections priority', 'Customers', 'Customer risk profile',
    'Payment priority', 'Suppliers', 'Supplier profile',
    'Margin priority', 'Products', 'Product profile',
    'Connections'
  ];

  // Dynamic values derived from live DataContext calculations
  const receivablesMonitoredStr = `$${Math.round((sys4?.totalAR || 300000) / 1000)}K`;
  const skusCount = sys2?.skus?.length || 3908;
  const topAdvisories = advisories?.slice(0, 3) || [];

  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#0f172a] flex flex-col font-sans">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-[#f8faf9]/90 px-6 backdrop-blur md:px-12">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('landing')}>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#84cc16] text-[#052e16] font-black text-xl shadow-xs">
              i2
            </span>
            <div className="flex flex-col">
              <span className="leading-none text-[#0f172a] text-xl font-bold tracking-tight">cashflow</span>
              <span className="text-[9px] font-semibold text-[#64748b] tracking-[0.18em] uppercase mt-0.5">INVENTORY TO CASHFLOW</span>
            </div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#475569]">
          <a href="#features" className="hover:text-[#0f172a] transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-[#0f172a] transition-colors">How it works</a>
          <a href="#screens" className="hover:text-[#0f172a] transition-colors">Screens</a>
          <button onClick={() => onNavigate('pricing')} className="hover:text-[#0f172a] transition-colors cursor-pointer">Pricing</button>
          <a href="#read-only" className="hover:text-[#0f172a] transition-colors">Read-only</a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('login')}
            className="inline-flex items-center gap-2 rounded-full bg-[#84cc16] hover:bg-[#65a30d] px-5 py-2.5 text-xs font-bold text-[#052e16] shadow-sm transition-all transform active:scale-95 cursor-pointer"
          >
            Launch Workspace
            <ArrowRight className="size-4" />
          </button>
        </div>
      </header>

      {/* Main Hero Section */}
      <section className="py-12 px-6 md:px-12 max-w-[1300px] mx-auto w-full grid gap-12 lg:grid-cols-12 items-center">
        {/* Hero Left Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#ecfccb] px-3.5 py-1.5 text-xs font-bold text-[#3f6212] ring-1 ring-[#bef264]">
            <span className="text-xs">✨</span> Financial intelligence for wholesale distributors
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#0f172a] leading-[1.1]">
            Turn your inventory and invoices into <span className="text-[#84cc16]">cash flow you can see</span>
          </h1>

          <p className="text-sm sm:text-base text-[#475569] leading-relaxed max-w-xl">
            i2cashflow reads QuickBooks and Brightpearl and tells you what is about to hurt your cash: which customers will pay late, which suppliers to pay first, and which products are quietly losing margin. It explains — it never edits.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-2 rounded-full bg-[#84cc16] hover:bg-[#65a30d] px-6 py-3.5 text-sm font-bold text-[#052e16] shadow-md transition-all transform active:scale-95 cursor-pointer"
            >
              Open Workspace
              <ArrowRight className="size-4" />
            </button>
            <span className="flex items-center gap-1.5 text-xs text-[#64748b] font-medium">
              <Lock className="size-3.5 text-[#84cc16]" /> Live interlock engine · read-only safe
            </span>
          </div>

          {/* 4 Stat Counters (Dynamically Populated) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-slate-200">
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#0f172a]">{receivablesMonitoredStr}</p>
              <p className="text-[11px] font-medium text-[#64748b] mt-0.5">Receivables monitored</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#0f172a]">{skusCount.toLocaleString()}</p>
              <p className="text-[11px] font-medium text-[#64748b] mt-0.5">SKUs analysed</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#0f172a]">90 days</p>
              <p className="text-[11px] font-medium text-[#64748b] mt-0.5">Forward cash visibility</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-extrabold text-[#0f172a]">0</p>
              <p className="text-[11px] font-medium text-[#64748b] mt-0.5">Records ever changed</p>
            </div>
          </div>
        </div>

        {/* Hero Right Column: Dark Green Live Dynamic Preview Card */}
        <div className="lg:col-span-5">
          <div className="rounded-3xl bg-[#052e16] p-6 text-white shadow-2xl space-y-4 border border-[#14532d]">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-[#84cc16] uppercase">LIVE ENGINE PREVIEW</p>
              <h3 className="text-lg font-bold mt-1 text-white">What needs your attention today</h3>
            </div>

            <div className="space-y-3">
              {topAdvisories.map((adv, idx) => (
                <div key={idx} className="rounded-xl bg-[#093322] p-4 border border-[#14532d] space-y-1">
                  <span className="inline-block rounded-md bg-[#14532d] px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase text-[#84cc16]">
                    {adv.domain}
                  </span>
                  <p className="text-xs font-bold text-white">{adv.finding}</p>
                  <p className="text-[11px] text-[#86a7a0]">{adv.reason}</p>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center gap-1.5 text-[10px] text-[#86a7a0]">
              <Lock className="size-3 text-[#84cc16]" />
              <span>Read-only — nothing in your books was changed</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Everything a distributor needs */}
      <section id="features" className="py-16 px-6 md:px-12 max-w-[1300px] mx-auto w-full space-y-10">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] leading-tight">
            Everything a distributor needs to protect cash — nothing that touches your ledger
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Feature 1 */}
          <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs space-y-3">
            <div className="size-10 rounded-xl bg-[#ecfccb] flex items-center justify-center text-[#3f6212]">
              <TrendingUp className="size-5" />
            </div>
            <h3 className="text-base font-bold text-[#0f172a]">Cash flow forecast</h3>
            <p className="text-xs text-[#64748b] leading-relaxed">
              A 30/60/90 day projection with a confidence band, so you see your low point before it arrives.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs space-y-3">
            <div className="size-10 rounded-xl bg-[#ecfccb] flex items-center justify-center text-[#3f6212]">
              <Users className="size-5" />
            </div>
            <h3 className="text-base font-bold text-[#0f172a]">Customer payment risk</h3>
            <p className="text-xs text-[#64748b] leading-relaxed">
              Every account scored for late-payment likelihood, with the factors that drive the score shown in plain language.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs space-y-3">
            <div className="size-10 rounded-xl bg-[#ecfccb] flex items-center justify-center text-[#3f6212]">
              <DollarSign className="size-5" />
            </div>
            <h3 className="text-base font-bold text-[#0f172a]">Payment priority</h3>
            <p className="text-xs text-[#64748b] leading-relaxed">
              What to pay, when — early-payment discounts captured, safe delays flagged, cash preserved.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs space-y-3">
            <div className="size-10 rounded-xl bg-[#ecfccb] flex items-center justify-center text-[#3f6212]">
              <Package className="size-5" />
            </div>
            <h3 className="text-base font-bold text-[#0f172a]">Margin & dead stock</h3>
            <p className="text-xs text-[#64748b] leading-relaxed">
              Which margin leak to fix first, ranked by margin loss times volume, plus the frozen cash sitting in slow SKUs.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs space-y-3">
            <div className="size-10 rounded-xl bg-[#ecfccb] flex items-center justify-center text-[#3f6212]">
              <Bell className="size-5" />
            </div>
            <h3 className="text-base font-bold text-[#0f172a]">Alerts that explain</h3>
            <p className="text-xs text-[#64748b] leading-relaxed">
              Risk increases, margin drops and overdue invoices arrive as a feed with severity, category and reasoning.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="rounded-2xl bg-white p-6 border border-slate-200/80 shadow-xs space-y-3">
            <div className="size-10 rounded-xl bg-[#ecfccb] flex items-center justify-center text-[#3f6212]">
              <RefreshCw className="size-5" />
            </div>
            <h3 className="text-base font-bold text-[#0f172a]">Reads QuickBooks + Brightpearl</h3>
            <p className="text-xs text-[#64748b] leading-relaxed">
              We connect, read and interpret. Your books stay exactly as your team left them.
            </p>
          </div>
        </div>

        {/* 3 Step How it Works */}
        <div id="how-it-works" className="grid gap-6 md:grid-cols-3 pt-6">
          <div className="rounded-2xl bg-white p-6 border border-slate-200/80 space-y-2">
            <span className="text-xs font-bold text-[#84cc16]">01</span>
            <h4 className="font-bold text-sm text-[#0f172a]">We read your systems</h4>
            <p className="text-xs text-[#64748b]">QuickBooks and Brightpearl sync on a read-only connection.</p>
          </div>
          <div className="rounded-2xl bg-white p-6 border border-slate-200/80 space-y-2">
            <span className="text-xs font-bold text-[#84cc16]">02</span>
            <h4 className="font-bold text-sm text-[#0f172a]">AI explains what changed</h4>
            <p className="text-xs text-[#64748b]">Findings are ranked by cash impact and written in plain English.</p>
          </div>
          <div className="rounded-2xl bg-white p-6 border border-slate-200/80 space-y-2">
            <span className="text-xs font-bold text-[#84cc16]">03</span>
            <h4 className="font-bold text-sm text-[#0f172a]">You decide, in order</h4>
            <p className="text-xs text-[#64748b]">Worklists tell you who to chase, what to pay and which margin to fix first.</p>
          </div>
        </div>
      </section>

      {/* Thirteen Screens Section */}
      <section id="screens" className="py-16 px-6 md:px-12 max-w-[1300px] mx-auto w-full space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold text-[#0f172a]">Thirteen screens, one story</h2>
          <p className="text-xs text-[#64748b] mt-1">Every screen answers one question and shows its reasoning.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {screens.map((name, i) => (
            <div
              key={i}
              onClick={() => onNavigate('dashboard')}
              className="rounded-full bg-white px-5 py-3 border border-slate-200/80 text-xs font-semibold text-[#0f172a] flex items-center gap-2 hover:border-[#84cc16] transition-colors cursor-pointer shadow-2xs"
            >
              <span className="size-1.5 rounded-full bg-[#84cc16]" />
              {name}
            </div>
          ))}
        </div>
      </section>

      {/* Bottom Dark Green Banner */}
      <section id="read-only" className="py-12 px-6 md:px-12 max-w-[1300px] mx-auto w-full">
        <div className="rounded-3xl bg-[#052e16] p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl border border-[#14532d]">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#14532d] px-3 py-1 text-[10px] font-bold text-[#84cc16]">
              <Lock className="size-3 text-[#84cc16]" /> Read-only by design
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-snug">
              Your books are the source of truth. We just read them.
            </h2>
            <p className="text-xs text-[#86a7a0] leading-relaxed">
              No records created, edited or sent. No reorders placed, no emails fired. i2cashflow only observes and explains, so finance and ops keep full control.
            </p>
          </div>

          <button
            onClick={() => onNavigate('login')}
            className="inline-flex items-center gap-2 shrink-0 rounded-full bg-[#84cc16] hover:bg-[#65a30d] px-6 py-3.5 text-xs font-bold text-[#052e16] shadow-lg transition-all transform active:scale-95 cursor-pointer"
          >
            Launch Workspace
            <ArrowRight className="size-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-[#f8faf9] py-6 px-6 text-center text-[11px] text-[#64748b]">
        <div className="max-w-[1300px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <p>© 2026 i2cashflow — Inventory to cashflow</p>
          <p>Continuous Dynamic Decision Engine Active</p>
        </div>
      </footer>
    </div>
  );
}
