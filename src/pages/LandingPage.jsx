import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck, TrendingUp, Layers, CheckCircle2, Network, Boxes, ListOrdered, Receipt, DollarSign } from 'lucide-react';

export default function LandingPage({ onNavigate }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-6 backdrop-blur">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate('landing')}>
          <div className="flex size-9 items-center justify-center rounded-xl bg-[#0d9488] text-white font-bold shadow-md">
            i2
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            i2cashflow <span className="text-xs font-normal text-muted-foreground">inc.</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-muted-foreground">
          <button onClick={() => onNavigate('landing')} className="hover:text-foreground transition-colors cursor-pointer text-foreground">
            Home
          </button>
          <a href="#features" className="hover:text-foreground transition-colors cursor-pointer">
            5 Decision Systems
          </a>
          <button onClick={() => onNavigate('pricing')} className="hover:text-foreground transition-colors cursor-pointer">
            Pricing
          </button>
          <button onClick={() => onNavigate('login')} className="hover:text-foreground transition-colors cursor-pointer">
            Sign In
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('login')}
            className="hidden sm:inline-flex text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-3 py-2"
          >
            Log In
          </button>
          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 rounded-full bg-[#0d9488] hover:bg-[#0f766e] px-4 py-2 text-xs font-semibold text-white shadow-md transition-all transform active:scale-95 cursor-pointer"
          >
            Launch Dashboard
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 px-6 max-w-[1300px] mx-auto text-center sm:pt-24 sm:pb-28">
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-20">
          <div className="h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-[#0d9488] to-[#701a75] blur-3xl" />
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-[#0d9488]/10 px-3.5 py-1.5 text-xs font-semibold text-[#0d9488] ring-1 ring-[#0d9488]/30 mb-6">
          <Sparkles className="size-3.5 text-[#0d9488]" />
          Autonomous Inventory to Cashflow Intelligence
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl max-w-4xl mx-auto leading-tight">
          Stop Cash Leaks Between <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0d9488] to-[#701a75]">QuickBooks & Brightpearl.</span>
        </h1>

        <p className="mt-6 max-w-2xl mx-auto text-sm sm:text-base text-muted-foreground leading-relaxed">
          i2cashflow joins receivables, inventory velocity, supplier lead times, and margin erosion into 5 unified Decision Systems — delivering honest, actionable recommendations before cash is trapped.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 rounded-full bg-[#0d9488] hover:bg-[#0f766e] px-6 py-3 text-sm font-bold text-white shadow-lg transition-all transform active:scale-95 cursor-pointer"
          >
            Try Interactive Dashboard Demo
            <ArrowRight className="size-4" />
          </button>
          <button
            onClick={() => onNavigate('pricing')}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card hover:bg-surface px-6 py-3 text-sm font-semibold text-foreground transition-all cursor-pointer shadow-xs"
          >
            Explore Pricing Tiers
          </button>
        </div>

        {/* Live Metrics Pill Bar */}
        <div className="mt-12 inline-flex flex-wrap items-center justify-center gap-6 rounded-2xl bg-card/80 p-4 border border-border/80 shadow-xl backdrop-blur">
          <div className="flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full bg-[#16a34a]" />
            <span className="text-muted-foreground">Connected:</span>
            <span className="font-bold text-foreground">QuickBooks + Brightpearl</span>
          </div>
          <div className="h-4 w-[1px] bg-border hidden sm:block" />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Confidence:</span>
            <span className="font-bold text-[#0d9488]">82%–95% Honest Tiering</span>
          </div>
          <div className="h-4 w-[1px] bg-border hidden sm:block" />
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Rules Engine:</span>
            <span className="font-bold text-foreground">5 Decision Systems</span>
          </div>
        </div>
      </section>

      {/* 5 Decision Systems Grid */}
      <section id="features" className="py-16 px-6 max-w-[1300px] mx-auto w-full border-t border-border">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-widest text-[#0d9488] uppercase mb-2">Architectural Blueprint</p>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
            The 5 Decision Systems of i2cashflow
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-xs sm:text-sm text-muted-foreground">
            Built strictly to answer critical B2B distributor questions across receivables, payables, stock velocity, and liquidity.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* System 1 */}
          <div className="card-surface p-6 space-y-3 border-l-4 border-l-[#0d9488] hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-2 text-[#0d9488]">
              <TrendingUp className="size-5" />
              <span className="text-xs font-bold uppercase tracking-wider">System 1</span>
            </div>
            <h3 className="text-base font-bold text-foreground">Overall Working Capital</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Monitors Cash Conversion Cycle (CCC = DIO + DSO − DPO), Quick Ratio, Working Capital Turnover, and calculates exact Cash Freed opportunities.
            </p>
          </div>

          {/* System 2 */}
          <div className="card-surface p-6 space-y-3 border-l-4 border-l-[#f59e0b] hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-2 text-[#f59e0b]">
              <Boxes className="size-5" />
              <span className="text-xs font-bold uppercase tracking-wider">System 2</span>
            </div>
            <h3 className="text-base font-bold text-foreground">Inventory Controls</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Automates sales velocity per SKU, dynamic Reorder Points, Safety Stock (95% service level), ABC Classification, EOQ, and Dead Stock liquidation.
            </p>
          </div>

          {/* System 3 */}
          <div className="card-surface p-6 space-y-3 border-l-4 border-l-[#701a75] hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-2 text-[#701a75]">
              <Layers className="size-5" />
              <span className="text-xs font-bold uppercase tracking-wider">System 3</span>
            </div>
            <h3 className="text-base font-bold text-foreground">Cash Controls</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Rolling 30/60/90-day cash horizon forecast weighted by customer PayScores, confidence bands, burn rate, and operating cash floor breach alerts.
            </p>
          </div>

          {/* System 4 */}
          <div className="card-surface p-6 space-y-3 border-l-4 border-l-[#ef4444] hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-2 text-[#ef4444]">
              <ListOrdered className="size-5" />
              <span className="text-xs font-bold uppercase tracking-wider">System 4</span>
            </div>
            <h3 className="text-base font-bold text-foreground">AR + AP Optimization</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Prioritizes Collections Queue (P1–P4), PayScores, Expected Credit Loss (ECL) bad debt reserves, Credit Limits, and Early-Pay Discount APRs.
            </p>
          </div>

          {/* System 5 */}
          <div className="card-surface p-6 space-y-3 border-l-4 border-l-[#16a34a] hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-2 text-[#16a34a]">
              <Receipt className="size-5" />
              <span className="text-xs font-bold uppercase tracking-wider">System 5</span>
            </div>
            <h3 className="text-base font-bold text-foreground">True Margin & Concentration</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Calculates True Realized Margin after capital carrying costs, growth financing needs, and single-customer/vendor concentration risks.
            </p>
          </div>

          {/* Cross-Domain Moat */}
          <div className="card-surface p-6 space-y-3 border-l-4 border-l-[#0d9488] bg-[#0d9488]/5">
            <div className="flex items-center gap-2 text-[#0d9488]">
              <Network className="size-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Cross-Domain Moat</span>
            </div>
            <h3 className="text-base font-bold text-foreground">Interlock Intelligence</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Detects findings requiring simultaneous QB + Brightpearl access: physical inventory hostage on overdue accounts, chained AR/AP discount triggers.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="bg-card border-t border-border py-16 px-6 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl font-extrabold text-foreground">Ready to take control of your cashflow?</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Sign in to explore your live dashboard or view flexible pricing plans tailored for distributors.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-2 rounded-full bg-[#0d9488] hover:bg-[#0f766e] px-6 py-3 text-sm font-bold text-white shadow-lg transition-colors cursor-pointer"
            >
              Sign In to i2cashflow
              <ArrowRight className="size-4" />
            </button>
            <button
              onClick={() => onNavigate('pricing')}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-surface hover:bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors cursor-pointer"
            >
              View Pricing Tiers
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8 px-6 text-center text-xs text-muted-foreground">
        <div className="max-w-[1300px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <p>© 2026 i2cashflow inc. · TellersCode LLC · Autonomous Inventory to Cashflow Intelligence</p>
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate('landing')} className="hover:text-foreground">Home</button>
            <button onClick={() => onNavigate('pricing')} className="hover:text-foreground">Pricing</button>
            <button onClick={() => onNavigate('login')} className="hover:text-foreground">Login</button>
            <button onClick={() => onNavigate('dashboard')} className="hover:text-foreground">Dashboard</button>
          </div>
        </div>
      </footer>
    </div>
  );
}
