import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { Shield, Loader2, ArrowRight, Mail, Lock, Eye, EyeOff, Check, AlertTriangle, RotateCcw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MouseAurora } from './MouseAurora';

type OAuthStrategy = 'oauth_facebook' | 'oauth_github' | 'oauth_google';

const oauthPopupFeatures = [
  'popup=yes',
  'width=500',
  'height=720',
  'left=200',
  'top=80',
  'resizable=yes',
  'scrollbars=yes',
].join(',');

const OAUTH_LABELS: Record<OAuthStrategy, string> = {
  oauth_facebook: 'Facebook',
  oauth_github: 'GitHub',
  oauth_google: 'Google'
};

export const AuthPage = ({ onClose }: { onClose?: () => void }) => {
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();

  const [view, setView] = useState<'login' | 'register' | 'verify'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoadingStrategy, setOauthLoadingStrategy] = useState<OAuthStrategy | null>(null);

  // Resend cooldown timer for the verification screen
  const [resendIn, setResendIn] = useState(0);
  const [resending, setResending] = useState(false);

  const ssoCallbackUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/sso-callback';
    return `${window.location.origin}/sso-callback`;
  }, []);

  // Countdown for resend
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn(s => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded) return;

    setLoading(true);
    setError('');

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('keepr_auth_transition', 'true');
      }
      const result = await signIn.create({ identifier: email, password });

      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
      } else {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('keepr_auth_transition');
        }
        console.log(result);
        setError('Additional verification is required. Please try another method.');
      }
    } catch (err: any) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('keepr_auth_transition');
      }
      setError(err.errors?.[0]?.longMessage || 'Could not sign in. Check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded) return;

    setLoading(true);
    setError('');

    try {
      // Create the sign-up. Clerk's Smart CAPTCHA reads the #clerk-captcha node
      // rendered in the form below — without it, email verification never sends.
      await signUp.create({ emailAddress: email, password });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setView('verify');
      setResendIn(30);
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'Could not create your account. Try a different email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignUpLoaded) return;

    setLoading(true);
    setError('');

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('keepr_auth_transition', 'true');
      }
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });

      if (completeSignUp.status === 'complete') {
        await setSignUpActive({ session: completeSignUp.createdSessionId });
      } else {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('keepr_auth_transition');
        }
        console.log(completeSignUp);
        setError('Verification incomplete. Please re-enter the code.');
      }
    } catch (err: any) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('keepr_auth_transition');
      }
      setError(err.errors?.[0]?.longMessage || 'That code is incorrect or expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!isSignUpLoaded || resendIn > 0 || resending) return;
    setResending(true);
    setError('');
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setResendIn(30);
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'Could not resend the code. Try again shortly.');
    } finally {
      setResending(false);
    }
  };

  const handleOAuth = async (strategy: OAuthStrategy) => {
    const isLogin = view === 'login';
    const authResource = isLogin ? signIn : signUp;
    const isAuthLoaded = isLogin ? isSignInLoaded : isSignUpLoaded;

    if (!isAuthLoaded || !authResource || oauthLoadingStrategy) return;

    setError('');
    setOauthLoadingStrategy(strategy);

    const popup = window.open('', '_blank', oauthPopupFeatures);

    try {
      if (!popup) {
        throw new Error('Please allow pop-ups for Keepr to continue.');
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('keepr_auth_transition', 'true');
      }

      await authResource.authenticateWithPopup({
        strategy,
        redirectUrl: ssoCallbackUrl,
        redirectUrlComplete: '/',
        popup,
      });
    } catch (err: any) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('keepr_auth_transition');
      }
      popup?.close();
      setError(err.errors?.[0]?.longMessage || err.message || `Unable to continue with ${OAUTH_LABELS[strategy]}.`);
    } finally {
      setOauthLoadingStrategy(null);
    }
  };

  const renderOAuthIcon = (strategy: OAuthStrategy) => {
    if (oauthLoadingStrategy === strategy) {
      return <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />;
    }
    if (strategy === 'oauth_facebook') {
      return <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>;
    }
    if (strategy === 'oauth_github') {
      return <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>;
    }
    return <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>;
  };

  const oauthRow = (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {(['oauth_facebook', 'oauth_github', 'oauth_google'] as OAuthStrategy[]).map(s => (
        <motion.button
          key={s}
          type="button"
          onClick={() => handleOAuth(s)}
          disabled={!!oauthLoadingStrategy}
          aria-label={`Continue with ${OAUTH_LABELS[s]}`}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          className="group relative bg-zinc-950 border border-zinc-800 hover:border-cyan-500/40 text-white rounded-2xl py-3.5 flex items-center justify-center transition-colors disabled:cursor-wait disabled:opacity-60"
        >
          {renderOAuthIcon(s)}
        </motion.button>
      ))}
    </div>
  );

  const divider = (
    <div className="relative flex items-center justify-center mb-6">
      <div className="absolute w-full border-t border-zinc-800" />
      <div className="relative bg-zinc-900 px-4 text-[10px] uppercase tracking-[0.3em] font-black text-zinc-600">or</div>
    </div>
  );

  const errorBanner = error && (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-xs"
    >
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{error}</span>
    </motion.div>
  );

  // ── Loading gate ──────────────────────────────────────────────────────────
  if (!isSignInLoaded || !isSignUpLoaded) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
        <MouseAurora position="fixed" grid={false} />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-white flex items-center justify-center rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.15)] mb-6">
            <Shield className="w-8 h-8 text-black" strokeWidth={2.5} />
          </div>
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black px-6 py-12">
      {/* Cursor-tracked aurora background — same as the rest of the site */}
      <MouseAurora position="fixed" grid={false} />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="w-11 h-11 bg-white flex items-center justify-center rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            <Shield className="w-6 h-6 text-black" strokeWidth={2.5} />
          </div>
          <span className="text-white font-bold text-3xl tracking-tight">Keepr.</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="w-full bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 shadow-2xl rounded-[2rem] p-8 md:p-9 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full text-zinc-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer z-50"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <AnimatePresence mode="wait">
            {/* ───────────────── LOGIN ───────────────── */}
            {view === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25 }}
              >
                <div className="text-center mb-7">
                  <h2 className="text-2xl font-bold text-white tracking-tight mb-1.5">Welcome back</h2>
                  <p className="text-zinc-500 text-sm">Sign in to your Keepr account.</p>
                </div>

                {oauthRow}
                {divider}

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="text-zinc-500 text-[10px] uppercase tracking-[0.25em] font-black mb-2 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:border-cyan-500/50 outline-none transition-colors pl-11 pr-4 py-3.5 text-sm placeholder:text-zinc-700"
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-500 text-[10px] uppercase tracking-[0.25em] font-black mb-2 block">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:border-cyan-500/50 outline-none transition-colors pl-11 pr-11 py-3.5 text-sm placeholder:text-zinc-700"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors p-1">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {errorBanner}

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.99 }}
                    className="w-full bg-white text-black hover:bg-zinc-200 py-3.5 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-colors shadow-[0_0_24px_rgba(255,255,255,0.12)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait mt-1"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign in <ArrowRight className="w-3.5 h-3.5" /></>}
                  </motion.button>
                </form>

                <div className="mt-7 pt-5 border-t border-zinc-800 text-center">
                  <p className="text-zinc-500 text-xs">
                    New to Keepr?{' '}
                    <button onClick={() => { setView('register'); setError(''); setPassword(''); }} className="text-cyan-400 hover:text-cyan-300 font-bold ml-1 transition-colors">
                      Create an account
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* ───────────────── REGISTER ───────────────── */}
            {view === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25 }}
              >
                <div className="text-center mb-7">
                  <h2 className="text-2xl font-bold text-white tracking-tight mb-1.5">Create your account</h2>
                  <p className="text-zinc-500 text-sm">Start protecting your data with Keepr.</p>
                </div>

                {oauthRow}
                {divider}

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <label className="text-zinc-500 text-[10px] uppercase tracking-[0.25em] font-black mb-2 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:border-cyan-500/50 outline-none transition-colors pl-11 pr-4 py-3.5 text-sm placeholder:text-zinc-700"
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-zinc-500 text-[10px] uppercase tracking-[0.25em] font-black mb-2 block">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:border-cyan-500/50 outline-none transition-colors pl-11 pr-11 py-3.5 text-sm placeholder:text-zinc-700"
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors p-1">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {errorBanner}

                  {/* Clerk Smart CAPTCHA mount point — REQUIRED for email verification to send */}
                  <div id="clerk-captcha" className="empty:hidden" />

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: loading ? 1 : 1.01 }}
                    whileTap={{ scale: loading ? 1 : 0.99 }}
                    className="w-full bg-white text-black hover:bg-zinc-200 py-3.5 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-colors shadow-[0_0_24px_rgba(255,255,255,0.12)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait mt-1"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create account <ArrowRight className="w-3.5 h-3.5" /></>}
                  </motion.button>
                </form>

                <div className="mt-7 pt-5 border-t border-zinc-800 text-center">
                  <p className="text-zinc-500 text-xs">
                    Already have an account?{' '}
                    <button onClick={() => { setView('login'); setError(''); setPassword(''); }} className="text-cyan-400 hover:text-cyan-300 font-bold ml-1 transition-colors">
                      Sign in
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* ───────────────── VERIFY ───────────────── */}
            {view === 'verify' && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25 }}
              >
                <div className="text-center mb-7">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-4">
                    <Mail className="w-5 h-5 text-cyan-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight mb-1.5">Check your email</h2>
                  <p className="text-zinc-500 text-sm">
                    We sent a 6-digit code to <span className="text-zinc-300 font-medium">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label className="text-zinc-500 text-[10px] uppercase tracking-[0.25em] font-black mb-2 block">Verification code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:border-cyan-500/50 outline-none transition-colors px-5 py-4 text-center tracking-[0.6em] text-xl font-mono placeholder:text-zinc-700"
                      placeholder="000000"
                      maxLength={6}
                      autoFocus
                      required
                    />
                  </div>

                  {errorBanner}

                  <motion.button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    whileHover={{ scale: loading || code.length !== 6 ? 1 : 1.01 }}
                    whileTap={{ scale: loading || code.length !== 6 ? 1 : 0.99 }}
                    className="w-full bg-white text-black hover:bg-zinc-200 py-3.5 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-colors shadow-[0_0_24px_rgba(255,255,255,0.12)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify & continue <Check className="w-3.5 h-3.5" strokeWidth={3} /></>}
                  </motion.button>
                </form>

                {/* Resend */}
                <div className="mt-5 text-center">
                  <button
                    onClick={handleResend}
                    disabled={resendIn > 0 || resending}
                    className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-cyan-400 transition-colors disabled:text-zinc-700 disabled:hover:text-zinc-700 disabled:cursor-not-allowed"
                  >
                    {resending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                    {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
                  </button>
                </div>

                <div className="mt-6 pt-5 border-t border-zinc-800 text-center">
                  <button onClick={() => { setView('register'); setError(''); setCode(''); }} className="text-zinc-600 hover:text-white text-[10px] uppercase tracking-[0.25em] font-black transition-colors">
                    ← Back
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="text-zinc-700 text-[10px] uppercase tracking-[0.25em] font-black mt-6 flex items-center gap-1.5">
          <Lock className="w-3 h-3" /> Protected by end-to-end encryption
        </p>
      </div>
    </div>
  );
};
