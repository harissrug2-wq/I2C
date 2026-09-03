import React from 'react';
import { ArrowRight, Check, Lock } from 'lucide-react';

export default function PricingPage({ onNavigate }) {
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
          <button onClick={() => onNavigate('landing')} className="hover:text-[#0f172a] transition-colors cursor-pointer">
            Home
          </button>
          <button onClick={() => onNavigate('pricing')} className="hover:text-[#0f172a] transition-colors cursor-pointer text-[#0f172a]">
            Pricing
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('login')}
            className="inline-flex items-center gap-2 rounded-full bg-[#84cc16] hover:bg-[#65a30d] px-5 py-2.5 text-xs font-bold text-[#052e16] shadow-sm transition-all transform active:scale-95 cursor-pointer"
          >
            Open Workspace
            <ArrowRight className="size-4" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6 md:px-12 max-w-[1300px] mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#ecfccb] px-3.5 py-1.5 text-xs font-bold text-[#3f6212] ring-1 ring-[#bef264]">
          <span>✨</span> Simple plans, one read-only engine
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0f172a] max-w-3xl mx-auto leading-tight">
          Pricing that grows with your <span className="text-[#84cc16]">cash flow</span>
        </h1>

        <p className="max-w-2xl mx-auto text-xs sm:text-sm text-[#64748b] leading-relaxed">
          Start with receivables intelligence, expand into payables and margin, and add a chartered accountant when you want a human to act on what we surface.
        </p>
      </section>

      {/* 3 Main Plan Cards */}
      <section className="pb-16 px-6 md:px-12 max-w-[1300px] mx-auto w-full">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Card 1: Starter */}
          <div className="rounded-3xl bg-white p-8 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-[#0f172a]">Starter</h3>
                <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
                  Small distributors just getting a handle on who pays late
                </p>
              </div>

              <div className="pt-2">
                <span className="text-4xl font-extrabold text-[#0f172a]">$149</span>
                <span className="text-xs font-medium text-[#64748b]"> /mo</span>
                <p className="text-[11px] text-[#64748b] mt-1">Under $2M revenue · up to ~150 customers</p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-[9px] font-bold tracking-widest text-[#64748b] uppercase mb-3">THE HOOK: RECEIVABLES INTELLIGENCE</p>
                <ul className="space-y-2.5 text-xs text-[#334155]">
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#84cc16] shrink-0" /> AI bad-debt prediction
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#84cc16] shrink-0" /> AR aging & risk
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#84cc16] shrink-0" /> Collections priority
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#84cc16] shrink-0" /> Customer risk profiles
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#84cc16] shrink-0" /> QuickBooks connection
                  </li>
                  <li className="flex items-center gap-2 text-slate-300">
                    <span>—</span> Payables intelligence
                  </li>
                  <li className="flex items-center gap-2 text-slate-300">
                    <span>—</span> Cash flow forecast
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <p className="text-[11px] font-bold text-[#0f172a]">Leads with the crown-jewel feature at a low entry price</p>
            </div>
          </div>

          {/* Card 2: Growth (Most Popular) */}
          <div className="rounded-3xl bg-white p-8 border-2 border-[#84cc16] shadow-xl flex flex-col justify-between space-y-6 relative">
            <span className="absolute -top-3 left-6 rounded-full bg-[#ecfccb] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#3f6212] ring-1 ring-[#bef264]">
              Most popular
            </span>

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-[#0f172a]">Growth</h3>
                <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
                  Distributors who want the full cash-flow picture
                </p>
              </div>

              <div className="pt-2">
                <span className="text-4xl font-extrabold text-[#0f172a]">$349</span>
                <span className="text-xs font-medium text-[#64748b]"> /mo</span>
                <p className="text-[11px] text-[#64748b] mt-1">$2M–$8M revenue · up to ~500 customers</p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-[9px] font-bold tracking-widest text-[#64748b] uppercase mb-3">EVERYTHING IN STARTER, PLUS</p>
                <ul className="space-y-2.5 text-xs text-[#334155]">
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#84cc16] shrink-0" /> Payables + supplier intelligence
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#84cc16] shrink-0" /> Payment priority
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#84cc16] shrink-0" /> Margin & inventory intelligence
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#84cc16] shrink-0" /> Cash flow forecast (risk-weighted)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#84cc16] shrink-0" /> Brightpearl connection
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#84cc16] shrink-0" /> Alerts (email + Slack)
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <p className="text-[11px] font-bold text-[#0f172a]">The full three-pillar engine — the real product</p>
            </div>
          </div>

          {/* Card 3: Scale */}
          <div className="rounded-3xl bg-white p-8 border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-[#0f172a]">Scale</h3>
                <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
                  Larger operations that need depth and scenario planning
                </p>
              </div>

              <div className="pt-2">
                <span className="text-4xl font-extrabold text-[#0f172a]">$749</span>
                <span className="text-xs font-medium text-[#64748b]"> /mo</span>
                <p className="text-[11px] text-[#64748b] mt-1">$8M+ revenue · unlimited customers</p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-[9px] font-bold tracking-widest text-[#64748b] uppercase mb-3">EVERYTHING IN GROWTH, PLUS</p>
                <ul className="space-y-2.5 text-xs text-[#334155]">
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#84cc16] shrink-0" /> Cash flow scenario modeling
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#84cc16] shrink-0" /> Multi-entity / multi-location
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#84cc16] shrink-0" /> Extended data history
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#84cc16] shrink-0" /> Custom reports & exports
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#84cc16] shrink-0" /> Priority support
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-[#84cc16] shrink-0" /> Included quarterly advisory review
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <p className="text-[11px] font-bold text-[#0f172a]">Bundles a taste of advisory to seed the upsell</p>
            </div>
          </div>
        </div>
      </section>

      {/* Advisory Human Layer Section */}
      <section className="py-12 px-6 md:px-12 max-w-[1300px] mx-auto w-full">
        <div className="rounded-3xl bg-[#f0fdf4] p-8 md:p-10 border border-[#bbf7d0] space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-[#0f172a]">i2cashflow Advisory</h3>
            <span className="text-xs font-bold text-[#166534]">Powered by your in-house CA</span>
          </div>

          <p className="text-xs text-[#334155] leading-relaxed max-w-4xl">
            The software finds the problem; your chartered accountant helps solve it. Because the product already surfaces exactly where the risks and leaks are, your CA walks in informed — making each engagement faster and higher-value. This is the human layer where action happens, so the product itself stays read-only.
          </p>

          <div className="grid gap-4 md:grid-cols-3 pt-2">
            <div className="rounded-2xl bg-white p-5 border border-slate-200/80 space-y-2">
              <p className="text-xs font-bold text-[#0f172a]">Monthly review</p>
              <p className="text-sm font-extrabold text-[#166534]">$300–$600/mo</p>
              <p className="text-[11px] text-[#64748b] leading-relaxed">
                A recurring session walking the numbers, cash-flow risks, and what to do next. Recurring, high-retention.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 border border-slate-200/80 space-y-2">
              <p className="text-xs font-bold text-[#0f172a]">On-demand engagement</p>
              <p className="text-sm font-extrabold text-[#166534]">Hourly / project</p>
              <p className="text-[11px] text-[#64748b] leading-relaxed">
                Supplier renegotiation, collections strategy, tax planning. Priced per project as the need arises.
              </p>
            </div>

            <div className="rounded-2xl bg-white p-5 border border-slate-200/80 space-y-2">
              <p className="text-xs font-bold text-[#0f172a]">Done-with-you setup</p>
              <p className="text-sm font-extrabold text-[#166534]">One-time fee</p>
              <p className="text-[11px] text-[#64748b] leading-relaxed">
                CA-led onboarding + first cash-flow health assessment. Also a warm entry into the recurring review.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Dark Green Banner */}
      <section className="py-12 px-6 md:px-12 max-w-[1300px] mx-auto w-full">
        <div className="rounded-3xl bg-[#052e16] p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl border border-[#14532d]">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#14532d] px-3 py-1 text-[10px] font-bold text-[#84cc16]">
              <Lock className="size-3 text-[#84cc16]" /> Read-only by design
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Open a clean workspace before you pick a plan
            </h2>
            <p className="text-xs text-[#86a7a0]">
              The workspace starts empty. Add your own data manually or by CSV; live integrations can be connected later.
            </p>
          </div>

          <button
            onClick={() => onNavigate('login')}
            className="inline-flex items-center gap-2 shrink-0 rounded-full bg-[#84cc16] hover:bg-[#65a30d] px-6 py-3.5 text-xs font-bold text-[#052e16] shadow-lg transition-all transform active:scale-95 cursor-pointer"
          >
            Open Workspace
            <ArrowRight className="size-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-[#f8faf9] py-6 px-6 text-center text-[11px] text-[#64748b]">
        <div className="max-w-[1300px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <p>© 2026 i2cashflow — Inventory to cashflow</p>
          <p>Manual workspace · bring your own data</p>
        </div>
      </footer>
    </div>
  );
}
