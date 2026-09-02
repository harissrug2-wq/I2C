import React, { useState } from 'react';
import { ArrowRight, Lock, TrendingUp, Users, DollarSign, Package, Bell, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage({ onNavigate, onLoginSuccess }) {
  const { signIn, signUp, isConfigured } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isConfigured) {
      setError('Authentication is not configured yet. Add the Supabase environment variables first.');
      return;
    }

    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (isSignUp && (!name.trim() || !company.trim())) {
      setError('Please enter your full name and company name.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await signUp({
          email,
          password,
          fullName: name,
          companyName: company,
        });
        if (signUpError) throw signUpError;

        if (!data?.session) {
          setSuccess('Account created. Check your email to confirm your address, then sign in.');
          setIsSignUp(false);
          setPassword('');
          return;
        }
      } else {
        const { error: signInError } = await signIn(email, password);
        if (signInError) throw signInError;
      }

      if (onLoginSuccess) onLoginSuccess();
      else onNavigate('dashboard');
    } catch (err) {
      const message = err?.message || 'Authentication failed.';
      setError(message === 'Invalid login credentials'
        ? 'No matching account was found for that email/password. Create an account first or check your credentials.'
        : message);
    } finally {
      setLoading(false);
    }
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
                onClick={() => { setIsSignUp(false); setError(''); setSuccess(''); }}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                  !isSignUp ? 'bg-white text-[#0f172a] shadow-xs' : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsSignUp(true); setError(''); setSuccess(''); }}
                className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all cursor-pointer ${
                  isSignUp ? 'bg-white text-[#0f172a] shadow-xs' : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">
                {isSignUp ? 'Create your i2C account' : 'Sign in to i2C'}
              </h1>
              <p className="text-xs text-[#64748b] leading-relaxed">
                {isSignUp
                  ? 'Create a secure account with its own isolated workspace. Your business data is never shared with another i2C account.'
                  : 'Only existing i2C accounts can sign in. If you do not have an account yet, create one first.'
                }
              </p>
            </div>

            {/* Callout Banner */}
            <div className="rounded-2xl bg-[#ecfccb] p-4 border border-[#bef264] flex items-start gap-3 text-xs text-[#3f6212] leading-relaxed">
              <Lock className="size-4 shrink-0 text-[#3f6212] mt-0.5" />
              <span>
                <strong>Account-isolated workspace.</strong> Your customers, invoices, bills, products and settings are stored against your authenticated account and protected by database row-level security.
              </span>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-3 border border-red-200 text-xs font-semibold text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200 text-xs font-semibold text-emerald-700">
                {success}
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
                      placeholder="Your name"
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
                      placeholder="Your company"
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
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  className="w-full rounded-2xl bg-white px-4 py-3 border border-slate-200 text-xs text-[#0f172a] focus:outline-none focus:border-[#84cc16] shadow-2xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#84cc16] hover:bg-[#65a30d] py-3.5 px-6 text-xs font-bold text-[#052e16] shadow-md transition-all transform active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
                <ArrowRight className="size-4" />
              </button>
            </form>

            {/* Quick Access Action */}
            <div className="pt-2 border-t border-slate-200 text-center space-y-3">
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
                  30-day operating projection with a confidence band and your low point marked.
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
                <h3 className="font-bold text-xs text-white">Secure account isolation</h3>
                <p className="text-[11px] text-[#86a7a0] leading-relaxed">
                  Each account gets its own protected workspace. External connections can be added later without mixing account data.
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
