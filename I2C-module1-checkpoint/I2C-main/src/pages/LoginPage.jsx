import React, { useState } from 'react';
import { ArrowRight, Lock, TrendingUp, Users, DollarSign, Package, Bell, CheckCircle2 } from 'lucide-react';
import { useData } from '../context/DataContext';

export default function LoginPage({ onNavigate, onLoginSuccess }) {
  const { loginUser } = useData();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('dana@harbourline.com');
  const [password, setPassword] = useState('••••••••••••');
  const [name, setName] = useState('Dana Mercer');
  const [company, setCompany] = useState('Harbourline Distribution');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      loginUser(email, name, company);
      if (onLoginSuccess) onLoginSuccess();
      else onNavigate('dashboard');
    }, 400);
  };

  const handleQuickSignIn = () => {
    loginUser('dana@harbourline.com', 'Dana Mercer', 'Harbourline Distribution');
    if (onLoginSuccess) onLoginSuccess();
    else onNavigate('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] text-[#0f172a] flex flex-col font-sans">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-screen">
        {/* Left Half: Dynamic Authentication & Workspace Entry Form */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-8 sm:p-12 lg:p-16 bg-[#f8faf9]">
          <div className="space-y-8 max-w-md mx-auto w-full">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('landing')}>
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#84cc16] text-[#052e16] font-black text-xl shadow-xs">
                i2
              </span>
              <div className="flex flex-col">
                <span className="leading-none text-[#0f172a] text-xl font-bold tracking-tight">cashflow</span>
                <span className="text-[9px] font-semibold text-[#64748b] tracking-[0.18em] uppercase mt-0.5">INVENTORY TO CASHFLOW</span>
              </div>
            </div>

            {/* Auth Mode Switcher Tabs */}
            <div className="flex items-center gap-2 rounded-2xl bg-slate-200/80 p-1">
              <button
                onClick={() => { setIsSignUp(false); setError(''); }}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                  !isSignUp ? 'bg-white text-[#0f172a] shadow-xs' : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsSignUp(true); setError(''); }}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                  isSignUp ? 'bg-white text-[#0f172a] shadow-xs' : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                Create Workspace
              </button>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">
                {isSignUp ? 'Setup your workspace' : 'Enter your workspace'}
              </h1>
              <p className="text-xs text-[#64748b] leading-relaxed">
                {isSignUp 
                  ? 'Start with the repaired demo dataset and enter live values manually. External integrations can be connected later.' 
                  : 'Access continuous receivables, payables, inventory velocity & cash horizon analytics.'
                }
              </p>
            </div>

            {/* Callout Banner */}
            <div className="rounded-2xl bg-[#ecfccb] p-4 border border-[#bef264] flex items-start gap-3 text-xs text-[#3f6212] leading-relaxed">
              <Lock className="size-4 shrink-0 text-[#3f6212] mt-0.5" />
              <span>
                <strong>Manual mode.</strong> Workspace data is stored in this browser and does not write to any external accounting or inventory system.
              </span>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-3 border border-red-200 text-xs font-semibold text-red-700">
                {error}
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#64748b] mb-1.5">Full name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dana Mercer"
                      className="w-full rounded-2xl bg-white px-4 py-3 border border-slate-200 text-xs text-[#0f172a] focus:outline-none focus:border-[#84cc16] shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#64748b] mb-1.5">Company name</label>
                    <input
                      type="text"
                      required
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="e.g. Harbourline Distribution"
                      className="w-full rounded-2xl bg-white px-4 py-3 border border-slate-200 text-xs text-[#0f172a] focus:outline-none focus:border-[#84cc16] shadow-2xs"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-1.5">Work email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full rounded-2xl bg-white px-4 py-3 border border-slate-200 text-xs text-[#0f172a] focus:outline-none focus:border-[#84cc16] shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#64748b] mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-2xl bg-white px-4 py-3 border border-slate-200 text-xs text-[#0f172a] focus:outline-none focus:border-[#84cc16] shadow-2xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#84cc16] hover:bg-[#65a30d] py-3.5 px-6 text-xs font-bold text-[#052e16] shadow-md transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Authenticating Workspace…' : isSignUp ? 'Create & Launch Workspace' : 'Sign In to Workspace'}
                <ArrowRight className="size-4" />
              </button>
            </form>

            {/* Quick Access Action */}
            <div className="pt-2 border-t border-slate-200 text-center space-y-3">
              <button
                type="button"
                onClick={handleQuickSignIn}
                className="w-full rounded-full bg-slate-100 hover:bg-slate-200/80 py-2.5 px-4 text-xs font-semibold text-[#0f172a] transition-colors cursor-pointer"
              >
                ⚡ Quick Launch Dana Mercer's Workspace
              </button>

              <div>
                <button
                  onClick={() => onNavigate('landing')}
                  className="text-xs font-semibold text-[#64748b] hover:text-[#0f172a] cursor-pointer"
                >
                  Back to overview
                </button>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-[#94a3b8] text-center pt-8">
            © 2026 i2cashflow — Inventory to cashflow
          </div>
        </div>

        {/* Right Half: Deep Forest Dark Green Section */}
        <div className="lg:col-span-6 xl:col-span-7 bg-[#052e16] p-8 sm:p-12 lg:p-16 flex flex-col justify-between text-white border-l border-[#14532d]">
          <div className="max-w-xl mx-auto space-y-8 w-full">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-[#84cc16] uppercase">WHAT YOU WILL SEE INSIDE</p>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2 leading-tight">
                Six lenses on the same question: where is my cash going?
              </h2>
            </div>

            {/* 6 Dark Green Feature Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Card 1 */}
              <div className="rounded-2xl bg-[#093322] p-5 border border-[#14532d] space-y-2">
                <div className="size-8 rounded-lg bg-[#14532d] flex items-center justify-center text-[#84cc16]">
                  <TrendingUp className="size-4" />
                </div>
                <h3 className="font-bold text-xs text-white">Cash flow forecast</h3>
                <p className="text-[11px] text-[#86a7a0] leading-relaxed">
                  90-day projection with a confidence band and your low point marked.
                </p>
              </div>

              {/* Card 2 */}
              <div className="rounded-2xl bg-[#093322] p-5 border border-[#14532d] space-y-2">
                <div className="size-8 rounded-lg bg-[#14532d] flex items-center justify-center text-[#84cc16]">
                  <Users className="size-4" />
                </div>
                <h3 className="font-bold text-xs text-white">Customer risk scoring</h3>
                <p className="text-[11px] text-[#86a7a0] leading-relaxed">
                  Late-payment likelihood per account, with the driving factors explained.
                </p>
              </div>

              {/* Card 3 */}
              <div className="rounded-2xl bg-[#093322] p-5 border border-[#14532d] space-y-2">
                <div className="size-8 rounded-lg bg-[#14532d] flex items-center justify-center text-[#84cc16]">
                  <DollarSign className="size-4" />
                </div>
                <h3 className="font-bold text-xs text-white">Payment priority</h3>
                <p className="text-[11px] text-[#86a7a0] leading-relaxed">
                  What to pay now to capture discounts, and what is safe to delay.
                </p>
              </div>

              {/* Card 4 */}
              <div className="rounded-2xl bg-[#093322] p-5 border border-[#14532d] space-y-2">
                <div className="size-8 rounded-lg bg-[#14532d] flex items-center justify-center text-[#84cc16]">
                  <Package className="size-4" />
                </div>
                <h3 className="font-bold text-xs text-white">Margin & dead stock</h3>
                <p className="text-[11px] text-[#86a7a0] leading-relaxed">
                  Ranked margin leaks and the frozen cash sitting inside slow SKUs.
                </p>
              </div>

              {/* Card 5 */}
              <div className="rounded-2xl bg-[#093322] p-5 border border-[#14532d] space-y-2">
                <div className="size-8 rounded-lg bg-[#14532d] flex items-center justify-center text-[#84cc16]">
                  <Bell className="size-4" />
                </div>
                <h3 className="font-bold text-xs text-white">Explained alerts</h3>
                <p className="text-[11px] text-[#86a7a0] leading-relaxed">
                  Risk, margin and overdue events with severity and reasoning.
                </p>
              </div>

              {/* Card 6 */}
              <div className="rounded-2xl bg-[#093322] p-5 border border-[#14532d] space-y-2">
                <div className="size-8 rounded-lg bg-[#14532d] flex items-center justify-center text-[#84cc16]">
                  <Lock className="size-4" />
                </div>
                <h3 className="font-bold text-xs text-white">Read-only always</h3>
                <p className="text-[11px] text-[#86a7a0] leading-relaxed">
                  Manual workspace first. External connections are optional and currently disabled.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#86a7a0] pt-8 max-w-xl mx-auto w-full">
            <Lock className="size-3.5 text-[#84cc16]" />
            <span>Active workspace interlock · read-only protection</span>
          </div>
        </div>
      </div>
    </div>
  );
}
