/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Shield,
  ShieldCheck,
  Upload,
  Share2,
  Globe,
  ArrowRight,
  Menu,
  X,
  ChevronRight,
  MessageSquare,
  LifeBuoy,
  Phone,
  Download,
  UserCircle,
  ChevronDown,
  Search,
  Link as LinkIcon,
  Zap,
  Check,
  Copy,
  File as FileIcon,
  AlertTriangle,
  KeyRound,
  ScanSearch
} from 'lucide-react';
import { AuthenticateWithRedirectCallback, SignedIn, SignedOut, UserButton, useClerk, useUser, useAuth } from '@clerk/clerk-react';
import { CheckoutButton } from '@clerk/clerk-react/experimental';
import { AuthPage } from './components/AuthPage';
import { TiltCard } from './components/TiltCard';
import { MouseAurora } from './components/MouseAurora';
import { InteractiveLoader } from './components/InteractiveLoader';

// Heavy / route-specific components are lazy-loaded so they aren't part of the
// initial home-page payload. Silk pulls in three.js (~600 KB), chat/detonator
// pull socket.io, storage pulls jszip — none of which the landing page needs.
const Silk = lazy(() => import('./components/Silk'));
const JourneySection = lazy(() => import('./components/JourneySection').then(m => ({ default: m.JourneySection })));
const WhyUsView = lazy(() => import('./components/WhyUs').then(m => ({ default: m.WhyUsView })));
const DetonatorView = lazy(() => import('./components/DetonatorView').then(m => ({ default: m.DetonatorView })));
const EphemeralChat = lazy(() => import('./components/EphemeralChat').then(m => ({ default: m.EphemeralChat })));
const SecureStorageRoom = lazy(() => import('./components/SecureStorageRoom').then(m => ({ default: m.SecureStorageRoom })));

const PRO_PLAN_ID = 'cplan_3DxALr3WcHcdWjgUQNny6lyq6Bm';

// Lightweight fallback shown while a lazy-loaded view chunk is fetched.
const ViewLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
      className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"
    />
  </div>
);

// Defers mounting the (heavy, three.js-backed) Silk background until the page is
// idle, so three.js never blocks first paint or interactivity. The black
// background shows instantly; silk fades in once its chunk has loaded. Skipped
// when the user prefers reduced motion.
const DeferredSilk = (props: React.ComponentProps<typeof Silk>) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return; // respect reduced-motion: keep the static black background
    }
    const ric: typeof window.requestIdleCallback | undefined = (window as any).requestIdleCallback;
    const handle = ric
      ? ric(() => setShow(true), { timeout: 2000 })
      : window.setTimeout(() => setShow(true), 600);
    return () => {
      if (ric && (window as any).cancelIdleCallback) (window as any).cancelIdleCallback(handle);
      else clearTimeout(handle as number);
    };
  }, []);

  if (!show) return <div className="absolute inset-0 bg-black" />;
  return (
    <Suspense fallback={<div className="absolute inset-0 bg-black" />}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        className="absolute inset-0"
      >
        <Silk {...props} />
      </motion.div>
    </Suspense>
  );
};

const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

type ViewType = 'home' | 'send' | 'receive' | 'scan' | 'pricing' | 'detonator' | 'chat' | 'whyus' | 'storage';

interface NavbarProps {
  activeView: ViewType;
  navigateTo: (view: ViewType) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
  isPro: boolean;
  isFree: boolean;
  isTrialActive: boolean;
  onPremiumFeatureAttempt: () => void;
}

const Navbar = ({ activeView, navigateTo, isMenuOpen, setIsMenuOpen, isPro, isFree, isTrialActive, onPremiumFeatureAttempt }: NavbarProps) => {
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);
  const { user } = useUser();

  const premiumFeatures = ['detonator', 'chat', 'storage'];
  const freeFeatures = ['send', 'receive', 'scan'];

  const handleFeatureClick = (feature: ViewType) => {
    const isPremium = premiumFeatures.includes(feature);

    // Check premium features only
    if (isPremium && !isPro) {
      onPremiumFeatureAttempt();
      return;
    }

    // Free features (send, receive, scan) are always accessible
    navigateTo(feature);
    setIsFeaturesOpen(false);
  };

  const canAccessFeature = (feature: ViewType): boolean => {
    const isPremium = premiumFeatures.includes(feature);
    // Free features always accessible, premium features need pro
    return !isPremium || isPro;
  };

  const refreshSubscriptionStatus = async () => {
    try {
      if (user) {
        const reloadedUser = await user.reload?.();
        if (reloadedUser) {
          console.log('User metadata:', reloadedUser.unsafeMetadata);
          console.log('Has subscriptions:', (reloadedUser as any).subscriptions);
        }
      }
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-3 py-3 sm:px-6 sm:py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass rounded-full px-4 py-2.5 sm:px-6 sm:py-3">
        <button onClick={() => navigateTo('home')} className="flex items-center gap-2 group cursor-pointer">
          <motion.div
            initial={false}
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="relative w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-lg shrink-0 transform-gpu"
            style={{ transformOrigin: 'center center', willChange: 'transform', backfaceVisibility: 'hidden' }}
          >
            <Lock
              className="absolute inset-0 m-auto w-4 h-4 sm:w-5 sm:h-5 text-black"
              strokeWidth={2.5}
            />
          </motion.div>
          <span className="text-white font-bold text-lg sm:text-xl tracking-tighter transition-colors group-hover:text-cyan-400">Keepr.</span>
        </button>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8 text-nowrap">
          <button
            onClick={() => navigateTo('home')}
            className={`text-sm font-medium hover:text-white transition-colors cursor-pointer ${activeView === 'home' ? 'text-white font-bold' : 'text-zinc-400'}`}
          >
            Home
          </button>

          <div
            className="relative"
            onMouseLeave={() => setIsFeaturesOpen(false)}
          >
            <button
              onMouseEnter={() => setIsFeaturesOpen(true)}
              onClick={() => setIsFeaturesOpen(!isFeaturesOpen)}
              className={`text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer py-1 ${isFeaturesOpen ? 'text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Features
              <motion.span animate={{ rotate: isFeaturesOpen ? 180 : 0 }} className="flex">
                <ChevronDown className="w-3.5 h-3.5" />
              </motion.span>
            </button>

            <AnimatePresence>
              {isFeaturesOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 z-[60] origin-top"
                >
                  {/* Interaction Bridge - ensures mouse doesn't "leave" when moving from button to menu */}
                  <div className="absolute -top-4 left-0 w-full h-4 bg-transparent" />

                  <div className="bg-zinc-900/95 backdrop-blur-3xl rounded-3xl p-2 shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => { navigateTo('send'); setIsFeaturesOpen(false); }}
                        className="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/10 transition-all text-left group/item"
                      >
                        <div className="w-11 h-11 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 group-hover/item:border-cyan-500/50 group-hover/item:bg-zinc-700 transition-colors shrink-0">
                          <Upload className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-white text-sm font-bold tracking-tight">Send File</span>
                          <span className="text-zinc-400 text-[10px] uppercase tracking-widest font-black leading-none mt-1.5 group-hover/item:text-zinc-300 transition-colors">Encrypted peer transfer</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { navigateTo('receive'); setIsFeaturesOpen(false); }}
                        className="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/10 transition-all text-left group/item"
                      >
                        <div className="w-11 h-11 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 group-hover/item:border-cyan-500/50 group-hover/item:bg-zinc-700 transition-colors shrink-0">
                          <Download className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-white text-sm font-bold tracking-tight">Receive File</span>
                          <span className="text-zinc-400 text-[10px] uppercase tracking-widest font-black leading-none mt-1.5 group-hover/item:text-zinc-300 transition-colors">Secure asset retrieval</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { navigateTo('scan'); setIsFeaturesOpen(false); }}
                        className="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/10 transition-all text-left group/item"
                      >
                        <div className="w-11 h-11 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 group-hover/item:border-cyan-500/50 group-hover/item:bg-zinc-700 transition-colors shrink-0">
                          <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col flex-1">
                          <span className="text-white text-sm font-bold tracking-tight">Malware Scan</span>
                          <span className="text-zinc-400 text-[10px] uppercase tracking-widest font-black leading-none mt-1.5 group-hover/item:text-zinc-300 transition-colors">Virus & threat analysis</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleFeatureClick('chat')}
                        disabled={!canAccessFeature('chat')}
                        className="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/10 transition-all text-left group/item disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="w-11 h-11 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 group-hover/item:border-cyan-500/50 group-hover/item:bg-zinc-700 transition-colors shrink-0">
                          <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-bold tracking-tight">Secure Chat</span>
                            {!isPro && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full font-black">PREMIUM</span>}
                          </div>
                          <span className="text-zinc-400 text-[10px] uppercase tracking-widest font-black leading-none mt-1.5 group-hover/item:text-zinc-300 transition-colors">Ephemeral E2EE messaging</span>
                        </div>
                      </button>
                      <button
                        onClick={() => handleFeatureClick('detonator')}
                        disabled={!canAccessFeature('detonator')}
                        className="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/10 transition-all text-left group/item disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="w-11 h-11 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 group-hover/item:border-cyan-500/50 group-hover/item:bg-zinc-700 transition-colors shrink-0">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-bold tracking-tight">Link Detonator</span>
                            {!isPro && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full font-black">PREMIUM</span>}
                          </div>
                          <span className="text-zinc-400 text-[10px] uppercase tracking-widest font-black leading-none mt-1.5 group-hover/item:text-zinc-300 transition-colors">Isolated sandbox analysis</span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleFeatureClick('storage')}
                        disabled={!canAccessFeature('storage')}
                        className="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/10 transition-all text-left group/item disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="w-11 h-11 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 group-hover/item:border-cyan-500/50 group-hover/item:bg-zinc-700 transition-colors shrink-0">
                          <Lock className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-sm font-bold tracking-tight">Secure Storage</span>
                            {!isPro && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full font-black">PREMIUM</span>}
                          </div>
                          <span className="text-zinc-400 text-[10px] uppercase tracking-widest font-black leading-none mt-1.5 group-hover/item:text-zinc-300 transition-colors">Encrypted MacBook Finder</span>
                        </div>
                      </button>

                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => navigateTo('whyus')}
            className={`text-sm font-medium hover:text-white transition-colors cursor-pointer ${activeView === 'whyus' ? 'text-white font-bold' : 'text-zinc-400'}`}
          >
            Why Us
          </button>
          <button
            onClick={() => navigateTo('pricing')}
            className={`text-sm font-medium hover:text-white transition-colors cursor-pointer ${activeView === 'pricing' ? 'text-white font-bold' : 'text-zinc-400'}`}
          >
            Pricing
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative flex items-center justify-center group">
            <UserButton appearance={{ elements: { userButtonAvatarBox: `w-8 h-8 sm:w-10 sm:h-10 shadow-[0_0_20px_rgba(255,255,255,0.2)] ${isPro ? 'ring-2 ring-cyan-500 shadow-[0_0_12px_rgba(34,211,238,0.6)]' : ''}` } }} />
            {isPro && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-cyan-500 text-black text-[10px] font-black rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                PREMIUM
              </div>
            )}
          </div>
          <button
            onClick={() => navigateTo('send')}
            className="hidden sm:flex items-center gap-2 bg-white text-black px-6 py-2 rounded-full text-sm font-bold hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer"
          >
            Send File
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            className="md:hidden text-white p-1.5 sm:p-2 flex items-center justify-center hover:text-cyan-400 transition-all cursor-pointer"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </nav>
  );
};

const HomeHero = ({ navigateTo }: { navigateTo: (v: ViewType) => void }) => (
  <section className="relative px-6 overflow-hidden">
    {/* Silk spans the hero AND the transition gap below; fade lives only at the very bottom (below the fold) */}
    <div className="absolute inset-0 z-0">
      <div className="absolute inset-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />
      <DeferredSilk
        speed={0.7}
        scale={0.8}
        color="#1f6b7d"
        noiseIntensity={1.4}
        rotation={0}
      />
      {/* Gradual fade only in the lower transition zone — silk dissolves to black before "How It Works" */}
      <div className="absolute inset-x-0 bottom-0 h-[45vh] bg-gradient-to-t from-black via-black/85 to-transparent pointer-events-none" />
    </div>

    {/* First screen — full silk, content centered, exactly as before */}
    <div className="relative z-10 min-h-screen flex flex-col justify-center items-center pt-28 pb-10">
      <div className="max-w-4xl mx-auto text-center flex flex-col items-center pointer-events-none">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-3 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 gradient-text drop-shadow-[0_2px_8px_rgba(255,255,255,0.08)]"
        >
          Share Files <span className="bg-gradient-to-b from-white via-zinc-100 to-zinc-400 gradient-text">Securely.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-serif italic text-2xl md:text-4xl text-zinc-400"
        >
          Uncompromising Zero-Trust Privacy.
        </motion.p>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-6 flex flex-col items-center justify-center p-6 pointer-events-auto"
        >
          <div className="relative w-[260px] h-[260px] md:w-[340px] md:h-[340px] flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-zinc-900 shadow-2xl border border-zinc-800" />
            <div className="absolute w-[85%] h-[85%] rounded-full bg-zinc-950 shadow-inner border border-zinc-900 overflow-hidden flex flex-col items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="relative w-[75%] h-[75%] rounded-full shadow-[0_0_50px_rgba(255,255,255,0.1),inset_0_0_30px_rgba(0,0,0,0.5)] border-4 border-zinc-400 p-1"
                style={{
                  background: 'conic-gradient(from 0deg, #f5f5f5 0deg, #525252 45deg, #f5f5f5 90deg, #525252 135deg, #f5f5f5 180deg, #525252 225deg, #f5f5f5 270deg, #525252 315deg, #f5f5f5 360deg)',
                  willChange: 'transform',
                  backfaceVisibility: 'hidden',
                }}
              >
                <div className="w-full h-full rounded-full border border-zinc-300 flex items-center justify-center bg-transparent">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-black/20" />
                </div>
              </motion.div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-zinc-900/40 p-4 rounded-full backdrop-blur-sm border border-black/20 shadow-lg">
                  <Lock className="w-12 h-12 md:w-16 md:h-16 text-zinc-900 brightness-75 drop-shadow-lg" strokeWidth={2} />
                </div>
              </div>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={() => navigateTo('send')}
                className="absolute bottom-5 bg-zinc-800/80 border border-zinc-600/50 text-white px-5 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-700 hover:border-zinc-500 transition-all backdrop-blur-sm shadow-xl active:scale-95 pointer-events-auto"
              >
                Get Started
              </motion.button>
            </div>
          </div>
          {/* Glow blob — hidden on mobile (blur-3xl is expensive on mobile GPU) */}
          <div className="absolute -bottom-6 w-[60%] h-8 bg-cyan-500/10 blur-3xl rounded-full hidden md:block" />
        </motion.div>
      </div>
    </div>

    {/* Transition gap — silk continues here and fades to black before the next section */}
    <div className="relative z-10 h-[45vh]" />
  </section>
);

const HomeBelow = () => (
  <section className="relative z-10 py-24 px-6 bg-black">
    <div className="max-w-7xl mx-auto">
      <div className="mb-16">
        <h2 className="text-4xl md:text-5xl font-bold mb-4">How It <span className="font-serif italic text-zinc-400">Works.</span></h2>
        <p className="text-zinc-500 max-w-lg">
          Privacy shouldn't be complicated. We built Keepr. to be as intuitive as it is secure.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-4 gap-4" style={{ perspective: 1200 }}>
        <TiltCard className="md:col-span-3 lg:col-span-2 min-h-[320px]" contentClassName="p-8 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-6 border border-zinc-700 group-hover:border-cyan-500/50 transition-colors">
              <Upload className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 group-hover:text-cyan-400 transition-colors">Upload with Ease</h3>
            <p className="text-zinc-500 font-thin italic">
              Simply drag and drop your files into the vault. Our system encrypts them instantly before they ever leave your device.
            </p>
          </div>
          <div className="mt-8 flex justify-end">
            <div className="w-32 h-32 bg-gradient-to-br from-zinc-800 to-transparent rounded-2xl rotate-12 flex items-center justify-center opacity-30 group-hover:opacity-100 transition-all">
              <Upload className="w-16 h-16 text-zinc-600 group-hover:text-cyan-500" />
            </div>
          </div>
        </TiltCard>

        <TiltCard className="md:col-span-3 lg:col-span-1 min-h-[320px]" contentClassName="p-8">
          <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-6 border border-zinc-700 group-hover:border-cyan-500/50 transition-colors">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-3 group-hover:text-cyan-400 transition-colors">Keep It Safe</h3>
          <p className="text-zinc-500">
            Zero-knowledge architecture ensures that even we haven't seen your data. Your keys, your files.
          </p>
        </TiltCard>

        <TiltCard className="md:col-span-3 lg:col-span-1 min-h-[320px]" contentClassName="p-8">
          <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-6 border border-zinc-700 group-hover:border-cyan-500/50 transition-colors">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-3 group-hover:text-cyan-400 transition-colors">Share Instantly</h3>
          <p className="text-zinc-500">
            Generate secure single-use links or password-protected galleries in seconds.
          </p>
        </TiltCard>

        <TiltCard className="md:col-span-6 lg:col-span-2 min-h-[200px]" contentClassName="p-8 flex items-center justify-between">
          <div className="max-w-xs">
            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-6 border border-zinc-700 group-hover:border-cyan-500/50 transition-colors">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 group-hover:text-cyan-400 transition-colors">Access Anywhere</h3>
            <p className="text-zinc-500">
              Sync your vault across all your devices with seamless cross-platform support and native apps.
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="w-40 h-40 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-800 via-transparent to-transparent opacity-50 group-hover:opacity-100 group-hover:from-cyan-900/40 transition-all rounded-full flex items-center justify-center">
              <Globe className="w-20 h-20 text-zinc-700 group-hover:text-cyan-400" />
            </div>
          </div>
        </TiltCard>

        <TiltCard className="md:col-span-6 lg:col-span-2 min-h-[200px]" contentClassName="p-8 h-full flex flex-wrap gap-12 items-center justify-around">
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">256-bit</div>
            <div className="text-xs uppercase tracking-widest text-zinc-600 font-bold">AES Encryption</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">0%</div>
            <div className="text-xs uppercase tracking-widest text-zinc-600 font-bold">Data Leak History</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">10M+</div>
            <div className="text-xs uppercase tracking-widest text-zinc-600 font-bold">Safe Transfers</div>
          </div>
        </TiltCard>
      </div>
    </div>
  </section>
);

const SendView = ({
  file,
  setFile,
  status,
  handleEncrypt,
  shareLink,
  error,
  onReset
}: {
  file: File | null;
  setFile: (f: File | null) => void;
  status: string;
  handleEncrypt: () => void;
  shareLink: string;
  error: string | null;
  onReset: () => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only flip off when leaving the dropzone container (not its children)
    if (e.currentTarget === e.target) setIsDragging(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const fileExt = file?.name.split('.').pop()?.toUpperCase() || 'FILE';

  return (
    <section className="relative pt-32 pb-20 px-6 min-h-screen overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-14"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-b from-white via-zinc-200 to-zinc-500 gradient-text drop-shadow-[0_2px_8px_rgba(255,255,255,0.08)]">
            Send a file <span className="font-serif font-extralight italic text-zinc-300">privately.</span>
          </h1>
        </motion.div>

        {status === 'success' ? (
          /* ─────── SUCCESS STATE ─────── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-10 md:p-14 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/[0.08] blur-[80px] rounded-full pointer-events-none" />

            <div className="relative text-center space-y-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
                <ShieldCheck className="w-7 h-7 text-cyan-400" strokeWidth={2} />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white tracking-tight">File secured</h2>
                <p className="text-zinc-500 text-sm">
                  Share this zero-knowledge link with your recipient.
                </p>
              </div>

              <div className="relative">
                <input
                  readOnly
                  value={shareLink}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-5 pr-28 py-4 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50 font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className={`absolute right-2 top-2 bottom-2 w-[100px] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 ${isCopied ? 'bg-cyan-500 text-black' : 'bg-white text-black hover:bg-zinc-200'}`}
                >
                  <AnimatePresence mode="wait">
                    {isCopied ? (
                      <motion.span key="copied" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-1.5">
                        <Check className="w-3 h-3" strokeWidth={3} /> Copied
                      </motion.span>
                    ) : (
                      <motion.span key="copy" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex items-center gap-1.5">
                        <Copy className="w-3 h-3" strokeWidth={3} /> Copy
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              </div>

              {/* Security note */}
              <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.25em] text-zinc-600 font-black">
                <Lock className="w-3 h-3" /> Self-destructs on first download
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Keepr Secure Transfer',
                        text: 'I sent you an encrypted file via Keepr.',
                        url: shareLink
                      }).catch(() => { });
                    }
                  }}
                  className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 text-white py-3.5 rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" /> Share via app
                </button>
                <button
                  onClick={onReset}
                  className="flex-1 bg-white text-black py-3.5 rounded-2xl text-sm font-bold hover:bg-zinc-200 transition-colors"
                >
                  Send another
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ─────── DROP / ENCRYPT STATE ─────── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={onDragEnter}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`relative bg-zinc-950 border rounded-[2.5rem] p-10 md:p-14 cursor-pointer transition-colors duration-300 min-h-[420px] flex flex-col items-center justify-center overflow-hidden ${isDragging
                  ? 'border-cyan-500/60 bg-cyan-500/[0.04]'
                  : file
                    ? 'border-cyan-500/30'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
            >
              {/* Animated dotted grid backdrop */}
              <div className={`absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(103,232,249,0.08)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_50%,transparent_100%)] transition-opacity duration-300 ${isDragging ? 'opacity-100' : 'opacity-40'
                }`} />

              {/* Active drag glow */}
              {isDragging && (
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.08] via-transparent to-cyan-500/[0.04] pointer-events-none" />
              )}

              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />

              <div className="relative z-10 w-full flex flex-col items-center">
                <AnimatePresence mode="wait" initial={false}>
                {file ? (
                  /* File selected — preview */
                  <motion.div
                    key="file-preview"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    className="w-full max-w-md flex items-center gap-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5"
                  >
                    {/* File type chip */}
                    <div className="shrink-0 w-16 h-20 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex flex-col items-center justify-center relative overflow-hidden">
                      <FileIcon className="w-7 h-7 text-cyan-400/80" strokeWidth={1.5} />
                      <div className="text-[8px] font-black uppercase tracking-widest text-zinc-400 mt-1">
                        {fileExt.length > 4 ? 'FILE' : fileExt}
                      </div>
                      {/* Folded corner */}
                      <div className="absolute top-0 right-0 w-3 h-3 bg-zinc-700 [clip-path:polygon(0_0,100%_0,100%_100%)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-bold truncate">{file.name}</div>
                      <div className="text-zinc-500 text-xs mt-1 flex items-center gap-3">
                        <span>{formatBytes(file.size)}</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700" />
                        <span className="flex items-center gap-1.5 text-cyan-400">
                          <Lock className="w-3 h-3" /> Ready to encrypt
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      className="shrink-0 w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                ) : (
                  /* Empty state */
                  <motion.div
                    key="empty-state"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                    className="flex flex-col items-center"
                  >
                    <motion.div
                      animate={{ y: isDragging ? -6 : [0, -8, 0] }}
                      transition={isDragging ? { duration: 0.2 } : { repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                      className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border transition-colors ${isDragging
                          ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_24px_rgba(6,182,212,0.3)]'
                          : 'bg-zinc-900 border-zinc-800'
                        }`}
                    >
                      {status === 'processing' ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="w-9 h-9 border-2 border-cyan-500 border-t-transparent rounded-full"
                        />
                      ) : (
                        <Upload
                          className={`w-9 h-9 transition-colors ${isDragging ? 'text-cyan-400' : 'text-white'}`}
                          strokeWidth={1.5}
                        />
                      )}
                    </motion.div>

                    <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight text-center">
                      {isDragging ? 'Release to encrypt' : 'Drop a file or click to browse'}
                    </h2>
                    <p className="text-zinc-500 text-sm text-center max-w-sm">
                      Files are encrypted on your device with AES-256 before leaving it.
                    </p>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            </div>

            {/* Encrypt button row */}
            <div className="mt-5">
              <button
                disabled={!file || status === 'processing'}
                onClick={handleEncrypt}
                className="w-full group bg-white text-black px-7 py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_0_24px_rgba(255,255,255,0.12)] flex items-center justify-center gap-2"
              >
                {status === 'processing' ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                      className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full"
                    />
                    Encrypting
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" strokeWidth={3} />
                    Encrypt & Generate Link
                  </>
                )}
              </button>
            </div>

            {status === 'error' && error && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
};

const ReceiveView = ({
  downloadInput,
  setDownloadInput,
  status,
  handleDecrypt,
  decryptedUrl,
  decryptedFileName,
  error,
  onReset
}: {
  downloadInput: string;
  setDownloadInput: (v: string) => void;
  status: string;
  handleDecrypt: () => void;
  decryptedUrl: string | null;
  decryptedFileName: string;
  error: string | null;
  onReset: () => void;
}) => {
  const onPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setDownloadInput(text);
    } catch {
      
    }
  };

  return (
    <section className="relative pt-32 pb-20 px-6 min-h-screen overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-14"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-b from-white via-zinc-200 to-zinc-500 gradient-text drop-shadow-[0_2px_8px_rgba(255,255,255,0.08)]">
            Decrypt your <span className="font-serif font-extralight italic text-zinc-400">file.</span>
          </h1>
        </motion.div>

        {status === 'success' && decryptedUrl ? (
          /* ─────── SUCCESS STATE ─────── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-10 md:p-14 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/[0.08] blur-[80px] rounded-full pointer-events-none" />

            <div className="relative text-center space-y-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
                <ShieldCheck className="w-7 h-7 text-cyan-400" strokeWidth={2} />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white tracking-tight">Decryption successful</h2>
                <p className="text-zinc-500 text-sm">Your file is ready to download.</p>
              </div>

              {/* File preview pill */}
              <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-left">
                <div className="shrink-0 w-12 h-14 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 flex items-center justify-center">
                  <FileIcon className="w-5 h-5 text-cyan-400/80" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-bold text-sm truncate">{decryptedFileName}</div>
                  <div className="text-zinc-500 text-xs mt-0.5 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-cyan-400" /> Decrypted locally
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={decryptedUrl}
                  download={decryptedFileName}
                  className="flex-1 bg-white text-black py-3.5 rounded-2xl text-sm font-bold hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download file
                </a>
                <button
                  onClick={onReset}
                  className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 text-white py-3.5 rounded-2xl text-sm font-bold transition-colors"
                >
                  Receive another
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ─────── INPUT STATE ─────── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-10 md:p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(103,232,249,0.06)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_50%,transparent_100%)] opacity-40" />

              <div className="relative z-10">
                <label className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-black mb-3 block">
                  Vault link
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={downloadInput}
                    onChange={(e) => setDownloadInput(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-5 pr-24 py-4 text-zinc-200 font-mono text-sm focus:border-cyan-500/50 outline-none transition-colors placeholder:text-zinc-600"
                    placeholder="https://keepr..."
                  />
                  <button
                    type="button"
                    onClick={onPaste}
                    className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors"
                    title="Paste from clipboard"
                  >
                    Paste
                  </button>
                </div>

                <button
                  disabled={!downloadInput || status === 'processing'}
                  onClick={handleDecrypt}
                  className="w-full mt-5 group bg-white text-black px-7 py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_0_24px_rgba(255,255,255,0.12)] flex items-center justify-center gap-2"
                >
                  {status === 'processing' ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full"
                      />
                      Decrypting
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" strokeWidth={3} />
                      Decrypt & Download
                    </>
                  )}
                </button>

                {error && (
                  <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

const ScanView = ({
  status,
  handleScan,
  scanResult,
  error,
  onReset
}: {
  status: string;
  handleScan: (input: File | string) => void;
  scanResult: any;
  error: string | null;
  onReset: () => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [scanMode, setScanMode] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState('');
  const [pickedFile, setPickedFile] = useState<File | null>(null);

  const handleFile = (files: FileList | null) => {
    if (files && files[0]) {
      setPickedFile(files[0]);
      handleScan(files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput) handleScan(urlInput);
  };

  const stats = scanResult?.data?.attributes?.stats;
  const totalEngines =
    (stats?.malicious || 0) + (stats?.suspicious || 0) + (stats?.harmless || 0) + (stats?.undetected || 0);
  const isClean = scanResult && (stats?.malicious || 0) === 0 && (stats?.suspicious || 0) === 0;

  return (
    <section className="relative pt-32 pb-20 px-6 min-h-screen overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-b from-white via-zinc-200 to-zinc-500 gradient-text drop-shadow-[0_2px_8px_rgba(255,255,255,0.08)]">
            Scan before you <span className="font-serif font-extralight italic text-zinc-400">trust.</span>
          </h1>

          {/* Mode toggle — segmented pill */}
          {!scanResult && (
            <div className="flex justify-center mt-8">
              <div className="bg-zinc-900 border border-zinc-800 rounded-full p-1.5 inline-flex relative">
                <button
                  onClick={() => { setScanMode('file'); onReset(); setPickedFile(null); }}
                  className={`relative z-10 px-5 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-2 ${scanMode === 'file' ? 'text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                >
                  {scanMode === 'file' && (
                    <motion.span
                      layoutId="scan-toggle-pill"
                      className="absolute inset-0 bg-white rounded-full -z-10"
                      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    />
                  )}
                  <Upload className="w-3.5 h-3.5" /> File
                </button>
                <button
                  onClick={() => { setScanMode('url'); onReset(); setUrlInput(''); }}
                  className={`relative z-10 px-5 py-2 rounded-full text-xs font-bold transition-colors flex items-center gap-2 ${scanMode === 'url' ? 'text-black' : 'text-zinc-400 hover:text-white'
                    }`}
                >
                  {scanMode === 'url' && (
                    <motion.span
                      layoutId="scan-toggle-pill"
                      className="absolute inset-0 bg-white rounded-full -z-10"
                      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    />
                  )}
                  <LinkIcon className="w-3.5 h-3.5" /> URL
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {scanResult ? (
          /* ─────── RESULT STATE ─────── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full pointer-events-none ${isClean ? 'bg-emerald-500/[0.08]' : 'bg-red-500/[0.10]'
              }`} />

            <div className="relative">
              {/* Header verdict */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isClean
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                    }`}>
                    {isClean ? (
                      <ShieldCheck className="w-6 h-6 text-emerald-400" strokeWidth={2} />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-red-400" strokeWidth={2} />
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] font-black text-zinc-500 mb-1">
                      Verdict
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">
                      {isClean ? 'No threats detected' : `${stats?.malicious || 0} engine${(stats?.malicious || 0) !== 1 ? 's' : ''} flagged this`}
                    </h2>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-black mb-1">Scanned</div>
                  <div className="text-white text-sm font-bold">{totalEngines} engines</div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                {[
                  { n: stats?.malicious || 0, label: 'Malicious', accent: 'text-red-400', bg: 'bg-red-500/5 border-red-500/20' },
                  { n: stats?.suspicious || 0, label: 'Suspicious', accent: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/20' },
                  { n: stats?.harmless || 0, label: 'Harmless', accent: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/20' },
                  { n: stats?.undetected || 0, label: 'Undetected', accent: 'text-zinc-300', bg: 'bg-zinc-900 border-zinc-800' }
                ].map(s => (
                  <div key={s.label} className={`rounded-2xl p-4 border ${s.bg}`}>
                    <div className={`text-2xl font-black tracking-tighter ${s.accent}`}>{s.n}</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-black mt-1">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Detection list */}
              {scanResult.data?.attributes?.results && (stats?.malicious || 0) > 0 && (
                <div className="mt-6 bg-zinc-900/40 rounded-2xl p-5 border border-zinc-800">
                  <h3 className="text-[10px] uppercase tracking-[0.25em] font-black text-red-400 mb-4">
                    Positive detections
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {Object.entries(scanResult.data.attributes.results)
                      .filter(([_, v]: [any, any]) => v.category === 'malicious')
                      .map(([engine, v]: [any, any]) => (
                        <div
                          key={engine}
                          className="flex justify-between items-center text-xs py-1.5 border-b border-zinc-800/60 last:border-0"
                        >
                          <span className="text-zinc-300 truncate">{engine}</span>
                          <span className="text-red-400 font-mono italic ml-3 truncate">{v.result}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => { onReset(); setPickedFile(null); }}
                  className="flex-1 bg-white text-black py-3.5 rounded-2xl text-sm font-bold hover:bg-zinc-200 transition-colors"
                >
                  New scan
                </button>
                <a
                  href={`https://www.virustotal.com/gui/${scanMode === 'url' ? 'url' : 'file'}-analysis/${scanResult.data?.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 text-white py-3.5 rounded-2xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  Full report <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="text-[9px] uppercase tracking-widest text-zinc-700 font-black mt-5 break-all">
                Analysis ID · {scanResult.data?.id}
              </div>
            </div>
          </motion.div>
        ) : (
          /* ─────── INPUT STATE ─────── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            {scanMode === 'file' ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={(e) => { if (e.currentTarget === e.target) setIsDragging(false); }}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files); }}
                className={`relative bg-zinc-950 border rounded-[2.5rem] p-10 md:p-14 cursor-pointer transition-colors duration-300 min-h-[420px] flex flex-col items-center justify-center overflow-hidden ${isDragging
                    ? 'border-red-500/60 bg-red-500/[0.04]'
                    : 'border-zinc-800 hover:border-zinc-700'
                  }`}
              >
                <div className={`absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(239,68,68,0.07)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_50%,transparent_100%)] transition-opacity ${isDragging ? 'opacity-100' : 'opacity-40'
                  }`} />

                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={(e) => handleFile(e.target.files)}
                />

                <div className="relative z-10 flex flex-col items-center">
                  <motion.div
                    animate={status === 'processing' ? {} : { y: isDragging ? -6 : [0, -8, 0] }}
                    transition={status === 'processing' ? {} : isDragging ? { duration: 0.2 } : { repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                    className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border transition-colors ${isDragging
                        ? 'bg-red-500/10 border-red-500/40 shadow-[0_0_24px_rgba(239,68,68,0.3)]'
                        : 'bg-zinc-900 border-zinc-800'
                      }`}
                  >
                    {status === 'processing' ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                        className="w-9 h-9 border-2 border-red-500 border-t-transparent rounded-full"
                      />
                    ) : (
                      <ScanSearch
                        className={`w-9 h-9 ${isDragging ? 'text-red-400' : 'text-white'}`}
                        strokeWidth={1.5}
                      />
                    )}
                  </motion.div>

                  <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight text-center">
                    {status === 'processing'
                      ? 'Analyzing...'
                      : isDragging
                        ? 'Release to scan'
                        : 'Drop a file or click to browse'}
                  </h2>
                  <p className="text-zinc-500 text-sm text-center max-w-sm">
                    {status === 'processing'
                      ? 'Submitting to threat intelligence engines.'
                      : pickedFile
                        ? pickedFile.name
                        : 'Up to 32 MB. Files are deleted right after the scan.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-10 md:p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(239,68,68,0.07)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_50%,transparent_100%)] opacity-40" />

                <div className="relative z-10">
                  <form onSubmit={handleUrlSubmit}>
                    <label className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-black mb-3 block">
                      URL
                    </label>
                    <input
                      type="url"
                      required
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://suspicious-link.example"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-5 pr-4 py-4 text-zinc-200 font-mono text-sm focus:border-red-500/50 outline-none transition-colors placeholder:text-zinc-600"
                    />

                    <button
                      type="submit"
                      disabled={status === 'processing'}
                      className="w-full mt-5 group bg-red-500 text-white px-7 py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] hover:bg-red-400 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_0_24px_rgba(239,68,68,0.25)] flex items-center justify-center gap-2"
                    >
                      {status === 'processing' ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"
                          />
                          Scanning
                        </>
                      ) : (
                        <>
                          <ScanSearch className="w-3.5 h-3.5" strokeWidth={3} />
                          Scan URL
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
};

const PricingView = ({
  handleFreePlan,
  handleProSubscriptionComplete,
  handleRestoreProPlan,
  hasPaidProSubscription,
  isActivatingPro,
  isPro,
  isFree
}: {
  handleFreePlan: () => void;
  handleProSubscriptionComplete: () => void | Promise<void>;
  handleRestoreProPlan: () => void | Promise<void>;
  hasPaidProSubscription: boolean;
  isActivatingPro: boolean;
  isPro: boolean;
  isFree: boolean;
}) => (
  <section className="relative pt-40 pb-20 px-6 min-h-screen overflow-hidden">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-cyan-500/[0.02] blur-[180px] rounded-full pointer-events-none" />

    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-20 space-y-4">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-4 bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(255,255,255,0.08)]"
        >
          Simple, <span className="font-serif font-extralight italic text-zinc-400">honest.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-zinc-500 max-w-xl mx-auto"
        >
          Free for everyday encrypted transfers. Upgrade for storage, chat, and link detonation.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            name: 'Free',
            price: 'Free',
            description: 'Everything you need for personal encrypted file transfer.',
            features: [
              'End-to-end file send & receive',
              'Multi-engine malware scan',
              'Single-use share links',
              'AES-256-GCM client-side encryption'
            ],
            excluded: ['Secure storage rooms', 'Secure chat', 'Link detonator'],
            cta: 'Get started',
            popular: false,
            id: 'basic'
          },
          {
            name: 'Pro',
            price: '$5',
            description: 'Unlocks every Keepr tool and 5 GB of encrypted storage.',
            features: [
              '5 GB secure storage rooms',
              'Ephemeral end-to-end chat',
              'Sandboxed link detonator',
              'Auto-purge & email handoff'
            ],
            excluded: [],
            cta: 'Go Pro',
            popular: true,
            id: PRO_PLAN_ID
          },
          {
            name: 'Enterprise',
            price: 'Custom',
            description: 'Higher quotas, custom retention, and SLA-backed support.',
            features: [
              'Custom storage quota',
              'Configurable retention',
              'Priority response',
              'Custom SLA'
            ],
            cta: 'Contact us',
            popular: false,
            id: 'enterprise'
          }
        ].map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i + 0.3 }}
            className={`relative p-8 rounded-[2.5rem] flex flex-col h-full transition-all group ${plan.popular ? 'bg-white text-black scale-105 z-10 shadow-[0_30px_60px_rgba(255,255,255,0.1)]' : 'bg-zinc-900/50 border border-zinc-800 text-white hover:border-zinc-700'}`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-cyan-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Most Popular
              </div>
            )}

            <div className="mb-8">
              <h3 className={`text-xs uppercase tracking-widest font-black mb-4 ${plan.popular ? 'text-zinc-500' : 'text-zinc-600'}`}>{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl font-black tracking-tighter">{plan.price}</span>
                {plan.price !== 'Custom' && <span className={`text-xs font-bold uppercase tracking-widest ${plan.popular ? 'text-zinc-400' : 'text-zinc-600'}`}>/ Month</span>}
              </div>
              <p className={`text-sm italic font-serif leading-relaxed ${plan.popular ? 'text-zinc-600' : 'text-zinc-500'}`}>{plan.description}</p>
            </div>

            <div className="space-y-4 mb-12 flex-grow">
              <div className={`text-[10px] uppercase tracking-widest font-black ${plan.popular ? 'text-zinc-300' : 'text-zinc-700'}`}>Included Features</div>
              <ul className="space-y-3">
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-center gap-3 text-xs font-medium">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${plan.popular ? 'bg-black text-white' : 'bg-white/10 text-white'}`}>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              {plan.excluded && plan.excluded.length > 0 && (
                <ul className="space-y-3 pt-2">
                  {plan.excluded.map(feature => (
                    <li key={feature} className={`flex items-center gap-3 text-xs font-medium opacity-30 ${plan.popular ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      <X className="w-4 h-4 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {plan.id === PRO_PLAN_ID && !isPro && !hasPaidProSubscription ? (
              <CheckoutButton
                planId={plan.id}
                planPeriod="month"
                onSubscriptionComplete={handleProSubscriptionComplete}
                newSubscriptionRedirectUrl="/?checkout=complete"
              >
                <button
                  type="button"
                  disabled={isActivatingPro}
                  className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${plan.popular ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isActivatingPro ? 'Activating...' : plan.cta}
                </button>
              </CheckoutButton>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (plan.id === 'basic') handleFreePlan();
                  if (plan.id === PRO_PLAN_ID && hasPaidProSubscription) handleRestoreProPlan();
                }}
                disabled={(isPro && plan.id === PRO_PLAN_ID) || (isFree && plan.id === 'basic') || isActivatingPro}
                className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${plan.popular ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isActivatingPro && plan.id === PRO_PLAN_ID ? 'Activating...' : isPro && plan.id === PRO_PLAN_ID ? 'Current Plan' : isFree && plan.id === 'basic' ? 'Current Plan' : plan.cta}
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const TrialEndedModal = ({ isOpen, onClose, onUpgrade }: { isOpen: boolean; onClose: () => void; onUpgrade: () => void }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">⏰</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Free Trial Ended
              </h2>
              <p className="text-zinc-400 text-sm">
                Your 7-day free trial for premium features has expired. Upgrade to Pro to continue using Link Detonator and Secure Chat.
              </p>
              <div className="pt-4 space-y-3">
                <button
                  onClick={onUpgrade}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-black py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all"
                >
                  Upgrade to Pro
                </button>
                <button
                  onClick={onClose}
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all"
                >
                  Continue as Free User
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function AppContent() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('home');
  const [showTrialEndedModal, setShowTrialEndedModal] = useState(false);
  const [localPlan, setLocalPlan] = useState<'free' | 'pro' | null>(null);
  const [isActivatingPro, setIsActivatingPro] = useState(false);
  const [hasPaidProSubscription, setHasPaidProSubscription] = useState(false);
  const { user, isLoaded } = useUser();
  const clerk = useClerk();
  const { getToken } = useAuth();



  // Robust subscription detection
  const checkIfPro = (loadedUser: any): boolean => {
    if (!loadedUser) return false;

    // Check all possible subscription indicators
    const unsafeMeta = loadedUser?.unsafeMetadata || {};
    const publicMeta = loadedUser?.publicMetadata || {};

    // Log the full user object structure for debugging
    console.log('Full user object for subscription check:', {
      unsafeMeta,
      publicMeta,
      subscriptions: (loadedUser as any)?.subscriptions,
      orgMemberships: (loadedUser as any)?.organizationMemberships,
      userId: loadedUser?.id,
      email: loadedUser?.primaryEmailAddress?.emailAddress,
    });

    // Direct plan checks
    if (unsafeMeta.plan === 'pro' || publicMeta.plan === 'pro') {
      console.log('✓ Pro detected via plan metadata');
      return true;
    }
    if (unsafeMeta.subscription === 'active' || publicMeta.subscription === 'active') {
      console.log('✓ Pro detected via subscription metadata');
      return true;
    }

    // Check if Clerk's internal subscription array exists
    const subs = (loadedUser as any)?.subscriptions;
    if (Array.isArray(subs) && subs.length > 0) {
      console.log('✓ Pro detected via subscriptions array:', subs);
      return true;
    }

    // Check if user has org ID with premium access (alternative Clerk indicator)
    if ((loadedUser as any)?.organizationMemberships?.length > 0) {
      console.log('✓ Pro detected via organization memberships');
      return true;
    }

    // Fallback: check if any subscription-related fields exist
    const allKeys = Object.keys(loadedUser || {});
    const subscriptionKeys = allKeys.filter(k =>
      k.toLowerCase().includes('subscription') ||
      k.toLowerCase().includes('plan') ||
      k.toLowerCase().includes('billing')
    );

    if (subscriptionKeys.length > 0) {
      console.log('Found subscription-related keys:', subscriptionKeys);
      subscriptionKeys.forEach(key => {
        console.log(`  ${key}:`, (loadedUser as any)[key]);
      });
    }

    console.log('✗ No pro subscription detected');
    return false;
  };

  const metadataPlan = user?.unsafeMetadata?.plan;
  const isPro = localPlan ? localPlan === 'pro' : metadataPlan === 'pro' || (user ? checkIfPro(user) : false);
  const isFree = localPlan ? localPlan === 'free' : metadataPlan === 'free' || (!isPro && !!user);
  const trialStartDate = user?.unsafeMetadata?.trialStartDate as string | undefined;

  // Calculate if trial is active (7 days = 604800000 ms)
  const isTrialActive = (() => {
    if (!trialStartDate || isPro) return false;
    const startTime = new Date(trialStartDate).getTime();
    const currentTime = new Date().getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    return (currentTime - startTime) < sevenDaysMs;
  })();

  // Keep metadata in sync with subscription status
  useEffect(() => {
    if (!user || !isLoaded || !isPro) return;

    const syncMetadata = async () => {
      try {
        const currentMeta = user.unsafeMetadata || {};
        if (currentMeta.plan !== 'pro') {
          console.log('🔄 Syncing user metadata to pro plan');
          await user.update({
            unsafeMetadata: {
              ...currentMeta,
              plan: 'pro',
              syncedAt: new Date().toISOString()
            }
          });

          // Force reload to get fresh user data
          await user.reload?.();
          console.log('✓ Metadata synced and user reloaded');
        }
      } catch (error) {
        console.error('✗ Error syncing metadata:', error);
      }
    };

    syncMetadata();
  }, [user, isLoaded, isPro]);

  // Watch for explicit plan changes and reload user
  useEffect(() => {
    if (!user || !isLoaded) return;

    let reloadCount = 0;
    const reloadInterval = setInterval(async () => {
      reloadCount++;
      try {
        // Reload user from Clerk server every 2 seconds to catch plan changes
        await user.reload?.();

        if (reloadCount >= 15) {
          // Stop after 30 seconds
          clearInterval(reloadInterval);
        }
      } catch (error) {
        console.error('Error reloading user:', error);
      }
    }, 2000);

    return () => clearInterval(reloadInterval);
  }, [user, isLoaded]);

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const subscriptionHasProPlan = (subscription: any): boolean => {
    const items = subscription?.subscriptionItems;
    if (!Array.isArray(items)) return false;

    return items.some((item: any) => {
      const plan = item?.plan || {};
      const isActive = item?.status === 'active' && !item?.canceledAt;
      const isProPlan = plan.id === PRO_PLAN_ID || plan.slug === 'pro' || plan.name?.toLowerCase?.() === 'pro';
      return isActive && isProPlan;
    });
  };

  const refreshPaidProSubscription = async (): Promise<boolean> => {
    try {
      const subscription = await (clerk as any).billing?.getSubscription?.({});
      const hasProSubscription = subscriptionHasProPlan(subscription);
      setHasPaidProSubscription(hasProSubscription);
      return hasProSubscription;
    } catch (error) {
      console.error('Error checking Clerk subscription:', error);
      return false;
    }
  };

  useEffect(() => {
    if (!user || !isLoaded) return;
    refreshPaidProSubscription();
  }, [user, isLoaded]);

  const reloadUserUntilSubscriptionAppears = async () => {
    if (!user) return null;

    let latestUser: any = user;
    for (let attempt = 0; attempt < 6; attempt++) {
      latestUser = await user.reload?.() || user;
      const hasPaidSubscription = await refreshPaidProSubscription();

      if (hasPaidSubscription || checkIfPro(latestUser)) {
        return latestUser;
      }

      await wait(800);
    }

    return latestUser;
  };

  const handleProSubscriptionComplete = async () => {
    if (!user) return;

    setIsActivatingPro(true);
    try {
      const latestUser: any = await reloadUserUntilSubscriptionAppears();
      const metadataUser = latestUser || user;

      await metadataUser.update?.({
        unsafeMetadata: {
          ...(metadataUser.unsafeMetadata || {}),
          plan: 'pro',
          activatedAt: new Date().toISOString(),
          activationSource: 'checkout',
        },
      });

      await user.reload?.();
      setHasPaidProSubscription(true);
      setLocalPlan('pro');
      setActiveView('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error activating Pro after checkout:', error);
    } finally {
      setIsActivatingPro(false);
    }
  };

  const handleRestoreProPlan = async () => {
    if (!user) return;

    setIsActivatingPro(true);
    try {
      const hasPaidSubscription = await refreshPaidProSubscription();
      if (!hasPaidSubscription) return;

      await user.update({
        unsafeMetadata: {
          ...(user.unsafeMetadata || {}),
          plan: 'pro',
          restoredAt: new Date().toISOString(),
          activationSource: 'existing_subscription',
        },
      });

      await user.reload?.();
      setLocalPlan('pro');
      setActiveView('home');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error restoring Pro UI:', error);
    } finally {
      setIsActivatingPro(false);
    }
  };

  useEffect(() => {
    if (!user || !isLoaded || isPro || isActivatingPro) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== 'complete') return;

    window.history.replaceState(null, '', window.location.pathname);
    handleProSubscriptionComplete();
  }, [user, isLoaded, isPro, isActivatingPro]);

  // Open Pro checkout - handles both first-time payment and existing subscriptions
  // Handle Free plan activation
  const handleFreePlan = async () => {
    try {
      console.log('📱 Activating Free plan...');

      if (user) {
        await user.update({
          unsafeMetadata: {
            ...user.unsafeMetadata,
            plan: 'free',
            activatedAt: new Date().toISOString()
          }
        });

        console.log('✅ Free plan activated!');
        setLocalPlan('free');
        setActiveView('home');
      }
    } catch (error) {
      console.error('❌ Error enrolling in free plan:', error);
    }
  };

  const handlePremiumFeatureAttempt = async () => {
    if (!trialStartDate && !isPro) {
      // Start trial on first premium feature attempt
      try {
        if (user) {
          await user.update({ unsafeMetadata: { ...user.unsafeMetadata, trialStartDate: new Date().toISOString() } });
        }
      } catch (error) {
        console.error('Error starting trial:', error);
      }
    } else if (!isTrialActive && !isPro) {
      // Trial has ended
      setShowTrialEndedModal(true);
    }
  };


  useEffect(() => {
    if (isMenuOpen) {
      // iOS Safari fix: save scroll position and use position:fixed to lock scroll
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      // Restore scroll position when menu closes
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }
    return () => {
      // Always clean up on unmount
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
    };
  }, [isMenuOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Logic states
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [shareLink, setShareLink] = useState('');
  const [downloadInput, setDownloadInput] = useState('');
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [decryptedFileName, setDecryptedFileName] = useState<string>('decrypted_file');
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [roomToJoin, setRoomToJoin] = useState<{ id: string, key: string } | null>(null);

  // Tracks the live decrypted blob object URL so we can revoke it (free the
  // memory) instead of leaking one per decrypt for the page's lifetime.
  const decryptedUrlRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (decryptedUrlRef.current) URL.revokeObjectURL(decryptedUrlRef.current);
    };
  }, []);

  // Navigation handler
  const resetSessionState = () => {
    setFile(null);
    setStatus('idle');
    setShareLink('');
    setDownloadInput('');
    if (decryptedUrlRef.current) {
      URL.revokeObjectURL(decryptedUrlRef.current);
      decryptedUrlRef.current = null;
    }
    setDecryptedUrl(null);
    setDecryptedFileName('decrypted_file');
    setError(null);
    setScanResult(null);
  };

  // 1. Save pending room hash if found on mount (e.g. before OAuth login redirect)
  useEffect(() => {
    if (window.location.hash.includes('room=')) {
      sessionStorage.setItem('keepr_pending_room_hash', window.location.hash);
    }
  }, []);

  // 2. Restore pending room hash after login completes
  useEffect(() => {
    if (isLoaded && user) {
      const pendingHash = sessionStorage.getItem('keepr_pending_room_hash');
      if (pendingHash) {
        sessionStorage.removeItem('keepr_pending_room_hash');
        // Restore hash to the URL
        window.location.hash = pendingHash;
        
        // Parse the restored hash
        const hash = pendingHash.replace(/^#/, '');
        const params = new URLSearchParams(hash);
        const roomId = params.get('room');
        const key = params.get('key');
        if (roomId && key) {
          setRoomToJoin({ id: roomId, key: key });
          setActiveView('chat');
        }
      }
    }
  }, [isLoaded, user]);

  // 3. Dynamic hashchange listener (handles link pasting on active tabs/devices)
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash.includes('room=')) {
        const hash = window.location.hash.replace(/^#/, '');
        const params = new URLSearchParams(hash);
        const roomId = params.get('room');
        const key = params.get('key');

        if (roomId && key) {
          setRoomToJoin({ id: roomId, key: key });
          setActiveView('chat');
        }
      }
    };
    
    // Check if there is an active hash on mount
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);



  const premiumFeatures: ViewType[] = ['detonator', 'chat', 'storage'];

  const navigateTo = (view: ViewType) => {
    const isPremium = premiumFeatures.includes(view);

    // Check if user is trying to access premium feature without access
    if (isPremium && !isPro) {
      handlePremiumFeatureAttempt();
      return;
    }

    // Clear chat-room hash from URL when navigating away from chat. Without this
    // the room=ID&key=KEY hash persists, and a page refresh would re-trigger the
    // chat-room-detection effect on mount.
    if (view !== 'chat' && window.location.hash.includes('room=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    resetSessionState();
    setRoomToJoin(null); // Clear room when navigating away
    setActiveView(view);
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Encrypt & Send Logic (AWS Integrated)
  const handleEncrypt = async () => {
    if (!file) return;
    setStatus('processing');
    setError(null);

    try {
      // 1. Generate AES-GCM Key
      const key = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      // 2. Generate IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // 3. Encrypt File
      const fileBuffer = await file.arrayBuffer();
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        fileBuffer
      );

      // 4. AWS Upload Logic — Direct to S3 via pre-signed URL (no server size limit)
      const encryptedBlob = new Blob([encryptedBuffer], { type: 'application/octet-stream' });
      const fileId = Math.random().toString(36).substring(2, 15);

      // Step 4a: Ask backend for a pre-signed S3 upload URL
      const urlRes = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      });
      if (!urlRes.ok) throw new Error(`Failed to get upload URL (${urlRes.status})`);
      const { uploadUrl } = await urlRes.json();

      // Step 4b: Upload encrypted blob DIRECTLY to S3 — bypasses server entirely
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: encryptedBlob,
        headers: { 'Content-Type': 'application/octet-stream' }
      });
      if (!uploadRes.ok) throw new Error(`S3 upload failed (${uploadRes.status})`);

      // 5. Package Metadata for link
      const rawKey = await window.crypto.subtle.exportKey('raw', key);
      const base64Key = bufferToBase64(rawKey);
      const base64Iv = bufferToBase64(iv.buffer);

      // We encode the file name and type so they don't break the URL string
      const base64FileName = btoa(encodeURIComponent(file.name));
      const base64FileType = btoa(encodeURIComponent(file.type || 'application/octet-stream'));

      // 6. Final link
      const finalLink = `${window.location.origin}/vault#${base64Iv}:${base64Key}:${fileId}:${base64FileName}:${base64FileType}`;

      setShareLink(finalLink);
      setStatus('success');
    } catch (err) {
      console.error('Encryption Failed:', err);
      setStatus('error');
      const message = err instanceof Error ? err.message : 'Unknown encryption error';
      setError(message);
    }
  };

  // Receiver Logic (AWS Integrated)
  const handleDecrypt = async () => {
    if (!downloadInput) return;
    setStatus('processing');
    setError(null);

    try {
      const hash = downloadInput.split('#')[1];
      if (!hash) throw new Error('Invalid vault link');

      const [base64Iv, base64Key, fileId, base64FileName, base64FileType] = hash.split(':');
      if (!base64Iv || !base64Key || !fileId) throw new Error('Fragmented vault data');

      const iv = base64ToBuffer(base64Iv);
      const keyBuffer = base64ToBuffer(base64Key);

      // Decoding the original file name and type back to text
      const fileName = base64FileName ? decodeURIComponent(atob(base64FileName)) : 'decrypted_file';
      const fileType = base64FileType ? decodeURIComponent(atob(base64FileType)) : 'application/octet-stream';

      // 1. Fetch encrypted data ticket from AWS via your server
      const ticketRes = await fetch('/api/download-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId })
      });

      if (!ticketRes.ok) throw new Error('File not found or already burned.');
      const { downloadUrl } = await ticketRes.json();

      // 2. Import Key
      const key = await window.crypto.subtle.importKey(
        'raw',
        keyBuffer,
        'AES-GCM',
        true,
        ['decrypt']
      );

      // 3. Fetch encrypted data
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Failed to download encrypted package.');
      const encryptedBuffer = await response.arrayBuffer();

      // 4. Decrypt
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        encryptedBuffer
      );

      // We apply the original file type here so images open as images, pdfs as pdfs, etc.
      const decryptedBlob = new Blob([decryptedBuffer], { type: fileType });
      // Revoke any previous URL before creating a new one to avoid leaks.
      if (decryptedUrlRef.current) URL.revokeObjectURL(decryptedUrlRef.current);
      const objectUrl = URL.createObjectURL(decryptedBlob);
      decryptedUrlRef.current = objectUrl;
      setDecryptedUrl(objectUrl);
      setDecryptedFileName(fileName);
      setStatus('success');

      // 5. BURN IT from AWS forever
      fetch(`/api/burn/${fileId}`, { method: 'DELETE' }).catch(console.error);

    } catch (err) {
      console.error('Decryption Failed:', err);
      setStatus('error');
      setError('Decryption failed. Invalid key or corrupted vault package.');
    }
  };

  // Malware Scan Logic
  const handleScan = async (input: File | string) => {
    setStatus('processing');
    setError(null);
    setScanResult(null);

    try {
      const isUrl = typeof input === 'string';
      const endpoint = isUrl ? '/api/scan-url' : '/api/scan';

      let body: any;
      if (isUrl) {
        body = JSON.stringify({ url: input });
      } else {
        const formData = new FormData();
        formData.append('file', input);
        body = formData;
      }

      const headers: any = {};
      if (isUrl) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body,
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error('Server returned an invalid response (HTML instead of JSON). This often means the API endpoint is not correctly configured or the server crashed.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || data.details || 'Scan failed');
      }

      setScanResult(data);
      setStatus('success');
    } catch (err: any) {
      console.error('Scan Error:', err);
      setStatus('error');
      setError(err.message || 'Threat analysis failed. Please check your VIRUSTOTAL_API_KEY.');
    }
  };

  if (!isLoaded) {
    return <InteractiveLoader />;
  }

  return (
    <>
      <SignedOut>
        <AuthPage />
      </SignedOut>
      <SignedIn>
        <div className="min-h-screen bg-black text-zinc-400 selection:bg-cyan-500/30 selection:text-cyan-200 relative isolate">
          <Navbar
            activeView={activeView}
            navigateTo={navigateTo}
            isMenuOpen={isMenuOpen}
            setIsMenuOpen={setIsMenuOpen}
            isPro={isPro}
            isFree={isFree}
            isTrialActive={isTrialActive}
            onPremiumFeatureAttempt={handlePremiumFeatureAttempt}
          />

          <TrialEndedModal
            isOpen={showTrialEndedModal}
            onClose={() => setShowTrialEndedModal(false)}
            onUpgrade={() => {
              setShowTrialEndedModal(false);
              navigateTo('pricing');
            }}
          />

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, x: '100%' }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: '100%' }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed inset-0 min-h-[100dvh] z-40 pt-28 pb-10 px-6 bg-black backdrop-blur-3xl md:hidden overflow-y-auto custom-scrollbar"
              >
                <div className="flex flex-col gap-8">
                  <div className="space-y-4">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-[0.3em] font-black">Main Navigation</p>
                    <div className="flex flex-col gap-4">
                      <button onClick={() => navigateTo('home')} className={`text-3xl sm:text-4xl font-bold text-left tracking-tighter transition-colors ${activeView === 'home' ? 'text-cyan-400' : 'text-white'}`}>Home.</button>
                      <button onClick={() => navigateTo('whyus')} className={`text-3xl sm:text-4xl font-bold text-left tracking-tighter transition-colors ${activeView === 'whyus' ? 'text-cyan-400' : 'text-white'}`}>Why Us.</button>
                      <button onClick={() => navigateTo('pricing')} className={`text-3xl sm:text-4xl font-bold text-left tracking-tighter transition-colors ${activeView === 'pricing' ? 'text-cyan-400' : 'text-white'}`}>Pricing.</button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <p className="text-[10px] text-zinc-600 uppercase tracking-[0.3em] font-black">Encrypted Features</p>
                    <div className="grid gap-2">
                      {[
                        { id: 'send', title: 'Send File', desc: 'Encrypted peer transfer', icon: Upload, isPremium: false },
                        { id: 'receive', title: 'Receive File', desc: 'Secure asset retrieval', icon: Download, isPremium: false },
                        { id: 'scan', title: 'Malware Scan', desc: 'Virus & threat analysis', icon: Shield, isPremium: false },
                        { id: 'chat', title: 'Secure Chat', desc: 'Ephemeral E2EE messaging', icon: MessageSquare, isPremium: true },
                        { id: 'detonator', title: 'Link Detonator', desc: 'Isolated sandbox analysis', icon: Zap, isPremium: true },
                        { id: 'storage', title: 'Secure Room', desc: 'Encrypted Cloud Storage', icon: Lock, isPremium: true }
                      ].map((item) => {
                        const isFeatureLocked = item.isPremium && !isPro;
                        return (
                          <button
                            key={item.id}
                            onClick={() => navigateTo(item.id as ViewType)}
                            className={`w-full flex items-center gap-4 p-4 rounded-3xl bg-zinc-900/50 border border-white/5 text-left active:bg-white/10 transition-all ${isFeatureLocked ? 'opacity-50' : ''}`}
                          >
                            <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 shrink-0">
                              <item.icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 flex flex-col min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-white text-lg font-bold tracking-tight">{item.title}</span>
                                {isFeatureLocked && (
                                  <span className="text-[9px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-black uppercase tracking-widest shrink-0">PREMIUM</span>
                                )}
                              </div>
                              <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-black mt-1 leading-none">{item.desc}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-900">
                    <button
                      onClick={() => isPro ? navigateTo('storage') : navigateTo('pricing')}
                      className="w-full bg-white text-black py-5 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-[0.98] transition-all"
                    >
                      Open Vault
                    </button>
                    <p className="text-center text-zinc-800 text-[9px] uppercase tracking-widest font-black mt-6 italic">Secure end-to-end communication active</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <main className="relative z-10">
                <Suspense fallback={<ViewLoader />}>
                {/* Home: hero stays untouched, aurora-bound region begins at "How It Works" */}
                {activeView === 'home' && (
                  <>
                    <HomeHero navigateTo={navigateTo} />
                    <div className="relative">
                      <MouseAurora />
                      <div className="relative z-10">
                        <HomeBelow />
                      </div>
                    </div>
                  </>
                )}

                {/* All other views: aurora wraps the entire view, ending right before JourneySection */}
                {activeView !== 'home' && (
                  <div className="relative">
                    <MouseAurora />
                    <div className="relative z-10">
                      {activeView === 'send' && (
                        <SendView
                          file={file}
                          setFile={setFile}
                          status={status}
                          handleEncrypt={handleEncrypt}
                          shareLink={shareLink}
                          error={error}
                          onReset={resetSessionState}
                        />
                      )}
                      {activeView === 'receive' && (
                        <ReceiveView
                          downloadInput={downloadInput}
                          setDownloadInput={setDownloadInput}
                          status={status}
                          handleDecrypt={handleDecrypt}
                          decryptedUrl={decryptedUrl}
                          decryptedFileName={decryptedFileName}
                          error={error}
                          onReset={resetSessionState}
                        />
                      )}
                      {activeView === 'scan' && (
                        <ScanView
                          status={status}
                          handleScan={handleScan}
                          scanResult={scanResult}
                          error={error}
                          onReset={resetSessionState}
                        />
                      )}
                      {activeView === 'pricing' && (
                        <PricingView
                          handleFreePlan={handleFreePlan}
                          handleProSubscriptionComplete={handleProSubscriptionComplete}
                          handleRestoreProPlan={handleRestoreProPlan}
                          hasPaidProSubscription={hasPaidProSubscription}
                          isActivatingPro={isActivatingPro}
                          isPro={isPro}
                          isFree={isFree}
                        />
                      )}
                      {activeView === 'whyus' && <WhyUsView navigateTo={navigateTo} />}
                      {activeView === 'detonator' && <DetonatorView />}
                      {activeView === 'chat' && (
                        <EphemeralChat
                          initialRoomId={roomToJoin?.id}
                          initialKey={roomToJoin?.key}
                        />
                      )}
                      {activeView === 'storage' && <SecureStorageRoom />}
                    </div>
                  </div>
                )}
                </Suspense>
              </main>
            </motion.div>
          </AnimatePresence>

          {/* Bottom region (Journey + Footer) — hidden on feature pages so users can focus on the tool */}
          {!['send', 'receive', 'scan', 'chat', 'detonator', 'storage'].includes(activeView) && (
            <div className="relative z-10">
              <MouseAurora />
              <div className="relative z-10">
                <Suspense fallback={<div className="min-h-[400px]" />}>
                  <JourneySection />
                </Suspense>
                <footer className="relative pt-24 pb-12 px-6 overflow-hidden">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12 relative z-10 text-left">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-white flex items-center justify-center rounded-md">
                    <Lock className="w-3.5 h-3.5 text-black" strokeWidth={3} />
                  </div>
                  <span className="text-white font-bold text-lg tracking-tighter">Keepr.</span>
                </div>
                <p className="text-zinc-700 text-[10px] max-w-xs uppercase tracking-[0.2em] leading-relaxed font-black">
                  Global Headquarters • 123 Secure Street <br />
                  Encryption Valley, NV 89101
                </p>
              </div>

              <div className="flex gap-16 md:gap-24">
                <div className="space-y-4">
                  <div className="text-zinc-400 font-black text-[10px] tracking-widest uppercase">Product</div>
                  <div className="flex flex-col items-start gap-2 text-zinc-600 text-sm italic font-serif">
                    <button onClick={() => navigateTo('send')} className="hover:text-cyan-400 transition-colors cursor-pointer text-left">Send File</button>
                    <button onClick={() => navigateTo('receive')} className="hover:text-cyan-400 transition-colors cursor-pointer text-left">Receive File</button>
                    <button onClick={() => navigateTo('detonator')} className="hover:text-cyan-400 transition-colors cursor-pointer text-left">Link Detonator</button>
                    <button onClick={() => navigateTo('storage')} className="hover:text-cyan-400 transition-colors cursor-pointer text-left">Personal Vault</button>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="text-zinc-400 font-black text-[10px] tracking-widest uppercase">Privacy</div>
                  <div className="flex flex-col items-start gap-2 text-zinc-600 text-sm italic font-serif">
                    <button className="hover:text-cyan-400 transition-colors cursor-pointer text-left">Zero Knowledge</button>
                    <button className="hover:text-cyan-400 transition-colors cursor-pointer text-left">Compliance</button>
                    <button className="hover:text-cyan-400 transition-colors cursor-pointer text-left">Security Audit</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center mt-24 text-[10px] uppercase tracking-[0.3em] text-zinc-800 font-black relative z-10 gap-4">
              <div className="text-zinc-700">© 2026 Keepr. Built on Trust.</div>
              <div className="flex gap-8">
                <button className="text-zinc-700 hover:text-cyan-400 transition-colors">Twitter</button>
                <button className="text-zinc-700 hover:text-cyan-400 transition-colors">Github</button>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 pointer-events-none select-none overflow-hidden h-[40%] flex items-end justify-center pointer-events-none">
              <span className="text-[12rem] sm:text-[18rem] md:text-[25rem] lg:text-[35rem] text-zinc-900/5 font-black tracking-tighter leading-none translate-y-1/3">
                keepr.
              </span>
            </div>
          </footer>
            </div>
          </div>
          )}
        </div>
      </SignedIn>
    </>
  );
}

export default function App() {
  if (window.location.pathname === '/sso-callback') {
    return (
      <div className="relative">
        <AuthenticateWithRedirectCallback />
        <InteractiveLoader />
      </div>
    );
  }

  return <AppContent />;
}
