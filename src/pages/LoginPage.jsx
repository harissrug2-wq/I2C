import React, { useState } from 'react';
import { Sparkles, ArrowRight, Lock, Mail, CheckCircle2, ShieldCheck } from 'lucide-react';

export default function LoginPage({ onNavigate, onLoginSuccess }) {
  const [email, setEmail] = useState('dana.mercer@i2cashflow-distributor.com');
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (onLoginSuccess) onLoginSuccess();
      else onNavigate('dashboard');
    }, 600);
  };

  const handleDemoAccess = () => {
    if (onLoginSuccess) onLoginSuccess();
    else onNavigate('dashboard');
  };

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

        <div className="flex items-center gap-4 text-xs font-semibold">
          <button onClick={() => onNavigate('landing')} className="text-muted-foreground hover:text-foreground cursor-pointer">
            Home
          </button>
          <button onClick={() => onNavigate('pricing')} className="text-muted-foreground hover:text-foreground cursor-pointer">
            Pricing
          </button>
        </div>
      </header>

      {/* Main Login Card Area */}
      <main className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-25">
          <div className="h-[450px] w-[450px] rounded-full bg-gradient-to-br from-[#0d9488] via-[#701a75] to-[#16a34a] blur-3xl" />
        </div>

        <div className="w-full max-w-md card-surface rounded-2xl p-8 border border-border/80 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#0d9488]/10 text-[#0d9488] mb-2 shadow-inner">
              <ShieldCheck className="size-6" />
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Sign In to i2cashflow</h1>
            <p className="text-xs text-muted-foreground">
              Autonomous Inventory to Cashflow Intelligence Workspace
            </p>
          </div>

          {/* Quick Demo Access Notice */}
          <div className="rounded-xl bg-[#0d9488]/10 p-3 border border-[#0d9488]/20 flex items-start gap-2.5 text-xs text-foreground">
            <Sparkles className="size-4 text-[#0d9488] shrink-0 mt-0.5" />
            <p>Pre-populated with Dana Mercer's workspace credentials for instant evaluation.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-muted-foreground">Email Address</label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-surface pl-9 pr-4 py-2.5 border border-border text-foreground focus:outline-none focus:border-[#0d9488]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-muted-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-surface pl-9 pr-4 py-2.5 border border-border text-foreground focus:outline-none focus:border-[#0d9488]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-border" />
                Remember this device
              </label>
              <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-foreground text-[#0d9488]">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0d9488] hover:bg-[#0f766e] py-3 text-xs font-bold text-white shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Authenticating Workspace…' : 'Sign In to Dashboard'}
              <ArrowRight className="size-4" />
            </button>
          </form>

          <div className="relative flex items-center justify-center border-t border-border/80 pt-4">
            <span className="bg-card px-3 text-[10px] uppercase font-bold text-muted-foreground absolute -top-2.5">
              OR
            </span>
          </div>

          {/* Quick Demo Shortcut */}
          <button
            type="button"
            onClick={handleDemoAccess}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#0d9488]/40 bg-[#0d9488]/10 hover:bg-[#0d9488]/20 py-2.5 text-xs font-bold text-[#0d9488] transition-all cursor-pointer"
          >
            ⚡ One-Click Demo Access (Skip Login)
          </button>
        </div>
      </main>

      <footer className="py-4 text-center text-[11px] text-muted-foreground border-t border-border">
        © 2026 i2cashflow inc. · QuickBooks + Brightpearl Interlock Security Verified
      </footer>
    </div>
  );
}
