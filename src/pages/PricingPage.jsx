import React, { useState } from 'react';
import { Check, ArrowRight, Sparkles, HelpCircle } from 'lucide-react';

export default function PricingPage({ onNavigate }) {
  const [isAnnual, setIsAnnual] = useState(true);

  const tiers = [
    {
      name: 'Starter',
      description: 'Essential working capital & inventory replenishment for growing distributors.',
      monthlyPrice: 299,
      annualPrice: 239,
      popular: false,
      features: [
        'System 1: Overall Working Capital (CCC, Ratios)',
        'System 2: Inventory Controls & Reorder Points',
        'QuickBooks Online Integration',
        '30-Day Cash Forecast Horizon',
        '3 User Seats',
        'Email & Chat Support'
      ],
      cta: 'Start 14-Day Free Trial'
    },
    {
      name: 'Professional / Growth',
      description: 'Complete 5 Decision Systems & cross-domain intelligence for $2M–$10M distributors.',
      monthlyPrice: 699,
      annualPrice: 559,
      popular: true,
      features: [
        'All 5 Decision Systems (WCM, Inventory, Cash, AR+AP, Margins)',
        'QuickBooks + Brightpearl Interlock Engine',
        'Cross-Domain Moat Rules (Inventory Hostage, Chained AR/AP)',
        '90-Day Risk-Weighted Cash Horizon Forecast',
        'Customer PayScores & Collections Queue (P1–P4)',
        'True Margin Analysis (Cash Carrying Cost Deductions)',
        'Unlimited User Seats',
        'Dedicated Onboarding & Monthly Rule Calibration'
      ],
      cta: 'Get Started with Pro'
    },
    {
      name: 'Enterprise',
      description: 'Multi-entity governance, custom ERP integrations & peer benchmarking for $10M+ distributors.',
      monthlyPrice: 1499,
      annualPrice: 1199,
      popular: false,
      features: [
        'Everything in Professional',
        'Custom ERP Integrations (NetSuite, SAP, Custom APIs)',
        'Per-Workspace & Per-Entity Threshold Overrides',
        'Cross-Workspace Peer Benchmarking (100+ Workspaces)',
        'Custom Audit Trails & Predictions Log',
        '24/7 Priority SLA & Dedicated Account Engineer'
      ],
      cta: 'Contact Enterprise Sales'
    }
  ];

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
          <button onClick={() => onNavigate('landing')} className="hover:text-foreground transition-colors cursor-pointer">
            Home
          </button>
          <button onClick={() => onNavigate('landing')} className="hover:text-foreground transition-colors cursor-pointer">
            5 Decision Systems
          </button>
          <button onClick={() => onNavigate('pricing')} className="hover:text-foreground transition-colors cursor-pointer text-foreground">
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
      <section className="py-16 px-6 max-w-[1300px] mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#0d9488]/10 px-3.5 py-1.5 text-xs font-semibold text-[#0d9488] ring-1 ring-[#0d9488]/30 mb-4">
          <Sparkles className="size-3.5" />
          Transparent Pricing for Wholesale Distributors
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Predictable Pricing. Immediate ROI.
        </h1>
        <p className="mt-4 max-w-xl mx-auto text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Recover trapped working capital, eliminate dead stock carrying costs, and automate collections prioritization.
        </p>

        {/* Annual / Monthly Toggle */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={`text-xs font-semibold ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative h-6 w-12 rounded-full bg-surface p-1 ring-1 ring-border cursor-pointer transition-colors"
          >
            <div className={`h-4 w-4 rounded-full bg-[#0d9488] transition-transform ${isAnnual ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
          <span className={`text-xs font-semibold ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
            Annual <span className="rounded-full bg-[#16a34a]/10 px-2 py-0.5 text-[10px] font-bold text-[#16a34a] border border-[#16a34a]/20">Save 20%</span>
          </span>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="pb-20 px-6 max-w-[1300px] mx-auto w-full">
        <div className="grid gap-8 lg:grid-cols-3">
          {tiers.map((t, idx) => {
            const price = isAnnual ? t.annualPrice : t.monthlyPrice;
            return (
              <div
                key={idx}
                className={`card-surface relative flex flex-col justify-between p-8 transition-all hover:shadow-2xl ${
                  t.popular ? 'border-2 border-[#0d9488] shadow-xl bg-card' : 'border border-border'
                }`}
              >
                {t.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#0d9488] px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-md">
                    Most Popular for Distributors
                  </span>
                )}

                <div>
                  <h3 className="text-xl font-bold text-foreground">{t.name}</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{t.description}</p>

                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-foreground">${price}</span>
                    <span className="text-xs text-muted-foreground">/ month</span>
                  </div>

                  <ul className="mt-8 space-y-3 divide-y divide-border/60 text-xs">
                    {t.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 pt-3 first:pt-0">
                        <Check className="size-4 text-[#0d9488] shrink-0 mt-0.5" />
                        <span className="text-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4">
                  <button
                    onClick={() => onNavigate('login')}
                    className={`w-full rounded-xl py-3 text-xs font-bold transition-all cursor-pointer shadow-md ${
                      t.popular
                        ? 'bg-[#0d9488] text-white hover:bg-[#0f766e]'
                        : 'bg-surface text-foreground border border-border hover:bg-card'
                    }`}
                  >
                    {t.cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6 max-w-[1000px] mx-auto w-full border-t border-border">
        <h2 className="text-2xl font-bold text-center text-foreground mb-8">Frequently Asked Questions</h2>

        <div className="space-y-4 text-xs">
          <div className="card-surface p-5 space-y-2">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <HelpCircle className="size-4 text-[#0d9488]" />
              Does i2cashflow write back changes to my accounting software automatically?
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              No. i2cashflow reads data from QuickBooks and Brightpearl to calculate risk and generate recommendations, but operates strictly as an autonomous advisory layer. No entries are written to your ledger without manual approval.
            </p>
          </div>

          <div className="card-surface p-5 space-y-2">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <HelpCircle className="size-4 text-[#0d9488]" />
              Can we adjust rule thresholds for our specific business model?
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Yes! Every threshold across all 5 Decision Systems (Cost of Capital, Target CCC, Operating Floor, Target Service Level %, Stagnant Inventory Days) can be overridden per workspace without code deploys.
            </p>
          </div>

          <div className="card-surface p-5 space-y-2">
            <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
              <HelpCircle className="size-4 text-[#0d9488]" />
              How fast is setup and onboarding?
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              QuickBooks and Brightpearl OAuth setup takes under 10 minutes. i2cashflow immediately reads historical invoices, bills, and inventory logs to calculate Day-One findings.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background py-8 px-6 text-center text-xs text-muted-foreground">
        <div className="max-w-[1300px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <p>© 2026 i2cashflow inc. · Autonomous Inventory to Cashflow Intelligence</p>
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
