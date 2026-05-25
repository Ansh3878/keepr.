import React, { useMemo, useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { Shield, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

export const AuthPage = () => {
  const { isLoaded: isSignInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
  
  const [view, setView] = useState<'login' | 'register' | 'verify'>('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoadingStrategy, setOauthLoadingStrategy] = useState<OAuthStrategy | null>(null);

  const ssoCallbackUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return '/sso-callback';
    }

    return `${window.location.origin}/sso-callback`;
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignInLoaded) return;
    
    setLoading(true);
    setError('');
    
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });
      
      if (result.status === 'complete') {
        await setSignInActive({ session: result.createdSessionId });
      } else {
        console.log(result);
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'An error occurred during sign in.');
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
      await signUp.create({
        emailAddress: email,
        password,
      });
      
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setView('verify');
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'An error occurred during sign up.');
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
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });
      
      if (completeSignUp.status === 'complete') {
        await setSignUpActive({ session: completeSignUp.createdSessionId });
      } else {
        console.log(completeSignUp);
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || 'Invalid verification code.');
    } finally {
      setLoading(false);
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
        throw new Error('Please allow pop-ups for Keepr to continue with Google sign in.');
      }

      await authResource.authenticateWithPopup({
        strategy,
        redirectUrl: ssoCallbackUrl,
        redirectUrlComplete: '/',
        popup,
      });
    } catch (err: any) {
      popup?.close();
      setError(err.errors?.[0]?.longMessage || err.message || 'Unable to start social sign in. Please try again.');
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

    return <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg>;
  };

  if (!isSignInLoaded || !isSignUpLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 flex items-center justify-center rounded-2xl shadow-2xl relative z-10 mb-6">
          <Shield className="w-8 h-8 text-cyan-400" strokeWidth={2.5} />
        </div>
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin relative z-10" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-zinc-950">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,transparent_0%,#09090b_100%)] pointer-events-none" />

      <div className="w-full max-w-md p-6 relative z-10 flex flex-col items-center">
        {/* Brand/Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-10"
        >
          <div className="w-12 h-12 bg-white flex items-center justify-center rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            <Shield className="w-7 h-7 text-black" strokeWidth={2.5} />
          </div>
          <span className="text-white font-bold text-4xl tracking-tighter">Keepr.</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="w-full bg-zinc-900 border border-zinc-800 shadow-2xl rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden"
        >
          {/* Subtle gradient line at the top */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

          <AnimatePresence mode="wait">
            {view === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Sign in to Keepr.</h2>
                  <p className="text-zinc-400 font-serif italic">Welcome back! Enter your details.</p>
                </div>

                <div className="flex gap-4 mb-6">
                  <button type="button" onClick={() => handleOAuth('oauth_facebook')} disabled={!!oauthLoadingStrategy} aria-label="Continue with Facebook" className="flex-1 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl py-3 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] disabled:cursor-wait disabled:opacity-70">
                    {renderOAuthIcon('oauth_facebook')}
                  </button>
                  <button type="button" onClick={() => handleOAuth('oauth_github')} disabled={!!oauthLoadingStrategy} aria-label="Continue with GitHub" className="flex-1 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl py-3 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] disabled:cursor-wait disabled:opacity-70">
                    {renderOAuthIcon('oauth_github')}
                  </button>
                  <button type="button" onClick={() => handleOAuth('oauth_google')} disabled={!!oauthLoadingStrategy} aria-label="Continue with Google" className="flex-1 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl py-3 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] disabled:cursor-wait disabled:opacity-70">
                    {renderOAuthIcon('oauth_google')}
                  </button>
                </div>

                <div className="relative flex items-center justify-center mb-6">
                  <div className="absolute w-full border-t border-zinc-800"></div>
                  <div className="relative bg-zinc-900 px-4 text-[10px] uppercase tracking-widest font-black text-zinc-500">Or</div>
                </div>

                <form onSubmit={handleSignIn} className="space-y-5">
                  <div>
                    <label className="text-zinc-400 text-[10px] uppercase tracking-widest font-black mb-2 block">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:border-cyan-500/50 outline-none transition-all px-5 py-3.5 text-sm"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-[10px] uppercase tracking-widest font-black mb-2 block">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:border-cyan-500/50 outline-none transition-all px-5 py-3.5 text-sm"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  {error && <p className="text-red-400 text-xs font-medium text-center">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-white text-black hover:bg-zinc-200 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-3.5 h-3.5" /></>}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
                  <p className="text-zinc-500 text-xs">
                    Don't have an account?{' '}
                    <button onClick={() => { setView('register'); setError(''); setPassword(''); }} className="text-cyan-400 hover:text-cyan-300 font-bold ml-1 transition-colors">
                      Sign up
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {view === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Create your account</h2>
                  <p className="text-zinc-400 font-serif italic">Secure your data with Keepr.</p>
                </div>

                <div className="flex gap-4 mb-6">
                  <button type="button" onClick={() => handleOAuth('oauth_facebook')} disabled={!!oauthLoadingStrategy} aria-label="Continue with Facebook" className="flex-1 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl py-3 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] disabled:cursor-wait disabled:opacity-70">
                    {renderOAuthIcon('oauth_facebook')}
                  </button>
                  <button type="button" onClick={() => handleOAuth('oauth_github')} disabled={!!oauthLoadingStrategy} aria-label="Continue with GitHub" className="flex-1 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl py-3 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] disabled:cursor-wait disabled:opacity-70">
                    {renderOAuthIcon('oauth_github')}
                  </button>
                  <button type="button" onClick={() => handleOAuth('oauth_google')} disabled={!!oauthLoadingStrategy} aria-label="Continue with Google" className="flex-1 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-white rounded-xl py-3 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(0,0,0,0.5)] disabled:cursor-wait disabled:opacity-70">
                    {renderOAuthIcon('oauth_google')}
                  </button>
                </div>

                <div className="relative flex items-center justify-center mb-6">
                  <div className="absolute w-full border-t border-zinc-800"></div>
                  <div className="relative bg-zinc-900 px-4 text-[10px] uppercase tracking-widest font-black text-zinc-500">Or</div>
                </div>

                <form onSubmit={handleSignUp} className="space-y-5">
                  <div>
                    <label className="text-zinc-400 text-[10px] uppercase tracking-widest font-black mb-2 block">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:border-cyan-500/50 outline-none transition-all px-5 py-3.5 text-sm"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 text-[10px] uppercase tracking-widest font-black mb-2 block">Create Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:border-cyan-500/50 outline-none transition-all px-5 py-3.5 text-sm"
                      placeholder="8+ characters"
                      required
                    />
                  </div>

                  {error && <p className="text-red-400 text-xs font-medium text-center">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-white text-black hover:bg-zinc-200 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-3.5 h-3.5" /></>}
                  </button>
                </form>

                <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
                  <p className="text-zinc-500 text-xs">
                    Already have an account?{' '}
                    <button onClick={() => { setView('login'); setError(''); setPassword(''); }} className="text-cyan-400 hover:text-cyan-300 font-bold ml-1 transition-colors">
                      Sign in
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {view === 'verify' && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Check your email</h2>
                  <p className="text-zinc-400 font-serif italic">We sent a verification code to {email}</p>
                </div>

                <form onSubmit={handleVerify} className="space-y-5">
                  <div>
                    <label className="text-zinc-400 text-[10px] uppercase tracking-widest font-black mb-2 block">Verification Code</label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl focus:border-cyan-500/50 outline-none transition-all px-5 py-3.5 text-center tracking-[0.5em] text-lg font-mono"
                      placeholder="000000"
                      maxLength={6}
                      required
                    />
                  </div>

                  {error && <p className="text-red-400 text-xs font-medium text-center">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className="w-full bg-white text-black hover:bg-zinc-200 py-4 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify Identity <Shield className="w-3.5 h-3.5 ml-2" /></>}
                  </button>
                </form>
                
                <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
                  <button onClick={() => { setView('register'); setError(''); }} className="text-zinc-500 hover:text-white text-[10px] uppercase tracking-widest font-black transition-colors">
                    Back to registration
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};
