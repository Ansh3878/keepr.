/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Shield,
  Lock,
  Zap,
  Eye,
  EyeOff,
  Globe,
  Server,
  Cpu,
  KeyRound,
  Fingerprint,
  Clock,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Upload,
  Download,
  MessageSquare,
  ScanSearch,
  Sparkles,
  Check,
  X,
  ChevronDown,
  ArrowRight,
  Plus,
  Minus,
  Code2,
  Database,
  CloudOff,
  Wifi,
  Layers,
  Hash,
  Ghost,
  FileLock2,
  Network,
  Activity,
  AlertTriangle,
  Target,
  Atom
} from 'lucide-react';

type ViewType = 'home' | 'send' | 'receive' | 'scan' | 'pricing' | 'detonator' | 'chat' | 'whyus' | 'storage';

interface WhyUsProps {
  navigateTo?: (view: ViewType) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero — bold typography with a shared cursor-tracked aurora background
// ─────────────────────────────────────────────────────────────────────────────
const Hero: React.FC = () => {
  return (
    <section className="relative min-h-[100svh] flex items-center justify-center px-6 pt-28 pb-12 overflow-hidden">
      <div className="relative max-w-5xl mx-auto text-center w-full">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] drop-shadow-[0_2px_8px_rgba(255,255,255,0.08)]"
        >
          <span className="bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
            Privacy isn't a
          </span>
          <br />
          <span className="font-serif font-extralight italic bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            feature.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="font-serif italic text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-zinc-400 mt-4"
        >
          It's our architecture.
        </motion.p>

        {/* Floating chips */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
          {[
            { icon: ShieldCheck, label: 'Zero-Knowledge' },
            { icon: KeyRound, label: 'Client-Side AES-256' },
            { icon: Ghost, label: 'No Telemetry' },
            { icon: CloudOff, label: 'No Tracking' },
            { icon: Atom, label: 'Quantum-Aware' }
          ].map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -6 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 22,
                opacity: { type: "tween", ease: "easeOut", delay: 0.4 + i * 0.06, duration: 0.3 }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/60 border border-zinc-800 hover:border-cyan-500/50 text-zinc-300 text-xs font-medium backdrop-blur-sm transition-colors duration-100 cursor-pointer"
            >
              <c.icon className="w-3.5 h-3.5 text-cyan-400" /> {c.label}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Live Encryption Demo — user-driven, watch your file get encrypted on-device
// ─────────────────────────────────────────────────────────────────────────────
const sampleMessages = [
  'recovery_codes.txt',
  'api_secrets.env',
  'personal_diary.md',
  'ssh_private_key.pem',
  'bitcoin_wallet_seed.txt'
];

const LiveEncryptionDemo: React.FC = () => {
  const [phase, setPhase] = useState<'idle' | 'hashing' | 'keygen' | 'encrypting' | 'sealed'>('idle');
  const [progress, setProgress] = useState(0);
  const [input, setInput] = useState(sampleMessages[0]);
  const [cipher, setCipher] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clear any running demo interval when the component unmounts so it never
  // fires setState on an unmounted component (leak / console warnings).
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const run = () => {
    if (phase !== 'idle' && phase !== 'sealed') return;
    setPhase('hashing');
    setProgress(0);
    setCipher('');
    let p = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      p += 1.6;
      setProgress(Math.min(100, p));
      if (p > 22) setPhase('keygen');
      if (p > 55) setPhase('encrypting');
      if (p >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setPhase('sealed');
        // Generate a deterministic-looking ciphertext for the demo
        const hex = '0123456789abcdef';
        let c = '';
        for (let i = 0; i < 96; i++) {
          c += hex[Math.floor(Math.random() * 16)];
          if (i % 4 === 3 && i !== 95) c += ' ';
        }
        setCipher(c);
      }
    }, 28);
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPhase('idle');
    setProgress(0);
    setCipher('');
  };

  const phaseLabel: Record<typeof phase, string> = {
    idle: 'Ready',
    hashing: 'Hashing payload (SHA-256)',
    keygen: 'Deriving 256-bit key (PBKDF2)',
    encrypting: 'Sealing with AES-GCM',
    sealed: 'Sealed. No server has seen your data.'
  };

  return (
    <section className="relative py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Left-aligned header — consistent with the rest of the page */}
        <div className="mb-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
            <Activity className="w-3 h-3" /> Live Demo
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Watch encryption <span className="font-serif font-extralight italic text-zinc-400">happen.</span>
          </h2>
          <p className="text-zinc-500 mt-4 leading-relaxed max-w-2xl">
            Type anything below and press <span className="text-cyan-400 font-bold">Encrypt</span>.
            Every step runs in your browser. Nothing leaves this tab.
          </p>
        </div>

        {/* Action button — left-anchored to match the heading */}
        <div className="mb-10">
          <button
            onClick={phase === 'sealed' ? reset : run}
            disabled={phase !== 'idle' && phase !== 'sealed'}
            className="group flex items-center gap-2 bg-white text-black px-7 py-3 rounded-full text-sm font-bold hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-wait shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          >
            {phase === 'sealed' ? 'Reset' : 'Encrypt'}
            <Lock className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Plaintext panel */}
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-zinc-500" />
                <span className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-500">Plaintext (your device)</span>
              </div>
              <div className="flex gap-1.5">
                {sampleMessages.slice(0, 3).map((m, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(m); reset(); }}
                    className="text-[10px] px-2 py-1 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                  >
                    sample {i + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Spacer to match the right panel's progress row, keeping vertical rhythm aligned */}
            <div className="mb-5">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-2">
                <span className="uppercase tracking-widest">Awaiting input</span>
                <span>0%</span>
              </div>
              <div className="h-1 bg-zinc-800/60 rounded-full" />
            </div>

            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); reset(); }}
              className="w-full bg-black/50 border border-zinc-800 rounded-2xl p-5 text-zinc-200 text-sm font-mono focus:outline-none focus:border-cyan-500/50 resize-none h-[180px]"
            />

            <div className="mt-4 flex items-center gap-2 text-xs text-zinc-600">
              <Wifi className="w-3.5 h-3.5" />
              <span>Bytes transmitted to Keepr servers: <span className="text-cyan-400 font-bold">0</span></span>
            </div>
          </div>

          {/* Ciphertext panel */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[80px] rounded-full pointer-events-none" />
            <div className="relative flex flex-col flex-1">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-cyan-400" />
                  <span className="text-[10px] uppercase tracking-[0.3em] font-black text-cyan-400">Ciphertext (what we'd see)</span>
                </div>
                <span className="text-[10px] uppercase tracking-widest font-black text-zinc-600">AES-256-GCM</span>
              </div>

              {/* Progress + status */}
              <div className="mb-5">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-2">
                  <span className="uppercase tracking-widest">{phaseLabel[phase]}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-cyan-300"
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: 'linear', duration: 0.05 }}
                  />
                </div>
              </div>

              <div className="bg-black/60 border border-zinc-900 rounded-2xl p-5 h-[180px] overflow-hidden font-mono text-[11px] leading-relaxed text-cyan-400/80 break-all">
                {phase === 'idle' && (
                  <span className="text-zinc-700 italic">Press Encrypt to begin...</span>
                )}
                {phase !== 'idle' && phase !== 'sealed' && (
                  <motion.span
                    key={phase}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {Array.from({ length: Math.floor(progress * 1.2) })
                      .map(() => '0123456789abcdef'[Math.floor(Math.random() * 16)])
                      .join('')}
                  </motion.span>
                )}
                {phase === 'sealed' && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {cipher}
                  </motion.span>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs">
                {phase === 'sealed' ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-zinc-400">
                      Sealed. Decryption key never left your device.
                    </span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-zinc-600" />
                    <span className="text-zinc-600">Awaiting your input...</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// The Three Pillars — expandable cards
// ─────────────────────────────────────────────────────────────────────────────
const pillars = [
  {
    icon: Lock,
    title: 'Zero-Knowledge',
    tag: 'Architecture',
    short: "We can't read your data. Not even if a court demands it.",
    long: [
      'Your encryption keys are derived on your device using PBKDF2 with 600,000 iterations. They never travel over the wire.',
      'When you upload a file, we receive a meaningless block of ciphertext. We have no master key, no backdoor, and no recovery path that bypasses you.',
      'If our database leaked tomorrow, attackers would inherit a pile of unreadable noise. That is the point.'
    ],
    metric: '256-bit',
    metricLabel: 'AES-GCM keys'
  },
  {
    icon: Clock,
    title: 'Ephemeral by Default',
    tag: 'Lifecycle',
    short: "Data that doesn't exist can't be stolen. Most of ours is gone in minutes.",
    long: [
      "Secure Chat rooms self-destruct on your schedule. Messages live in memory only — they're never written to disk in plaintext.",
      'File transfers default to single-use links. The moment your recipient downloads, the object is purged from S3.',
      'A serverless cron sweeps every secure room hourly. Anything past its TTL is shredded with a cryptographic erase.'
    ],
    metric: '< 1 hour',
    metricLabel: 'Avg data lifetime'
  },
  {
    icon: Fingerprint,
    title: 'You Hold the Keys',
    tag: 'Sovereignty',
    short: 'Your password is the only path. We physically cannot reset it.',
    long: [
      'Forget your passphrase and your data is gone. We mean it. There is no "I forgot my password" workflow that magically restores access.',
      'This sounds harsh. It is also the only honest definition of zero-knowledge. Anything else is theatre.',
      'Power users can export key material as a recovery seed and store it offline. Your security model, your call.'
    ],
    metric: '0',
    metricLabel: 'Recovery backdoors'
  }
];

const PillarsSection: React.FC = () => {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
            <Layers className="w-3 h-3" /> Three Pillars
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Built on principles, <br />
            <span className="font-serif font-extralight italic text-zinc-400">not promises.</span>
          </h2>
          <p className="text-zinc-500 mt-4 leading-relaxed">
            Marketing copy is cheap. Architecture is permanent.
            Tap any pillar to see exactly how we keep our word.
          </p>
        </div>

        <div className="space-y-3">
          {pillars.map((p, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={p.title}
                layout
                className={`border rounded-[2.5rem] overflow-hidden transition-colors ${isOpen ? 'border-cyan-500/30 bg-zinc-900/60' : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                  }`}
              >
                <motion.button
                  layout
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center gap-6 p-7 md:p-9 text-left cursor-pointer"
                >
                  <div className={`shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center border transition-colors ${isOpen ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-zinc-800 border-zinc-700'
                    }`}>
                    <p.icon className={`w-6 h-6 md:w-7 md:h-7 ${isOpen ? 'text-cyan-400' : 'text-white'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-500 mb-1">
                      Pillar {String(i + 1).padStart(2, '0')} · {p.tag}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                      {p.title}
                    </h3>
                    <p className="text-zinc-500 text-sm mt-1 hidden sm:block">{p.short}</p>
                  </div>
                  <div className="hidden md:flex flex-col items-end shrink-0 mr-4">
                    <div className="text-2xl font-black text-white tracking-tighter">{p.metric}</div>
                    <div className="text-[9px] uppercase tracking-widest font-black text-zinc-600">{p.metricLabel}</div>
                  </div>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="shrink-0 w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center"
                  >
                    <ChevronDown className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </motion.div>
                </motion.button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-7 md:px-9 pb-9 pl-7 md:pl-[7.5rem]">
                        <div className="border-t border-zinc-800 pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                          {p.long.map((para, j) => (
                            <p key={j} className="text-zinc-400 text-sm leading-relaxed font-light">
                              {para}
                            </p>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Comparison Toggle — Keepr vs Typical Cloud
// ─────────────────────────────────────────────────────────────────────────────
const comparison = [
  { feature: 'Encryption keys', them: 'Held by provider', us: 'Held only by you', themOk: false },
  { feature: 'Server-side data access', them: 'Yes — for indexing, ads, ML', us: 'Impossible — encrypted blobs', themOk: false },
  { feature: 'Government data requests', them: 'We can hand over plaintext', us: 'We can hand over ciphertext', themOk: false },
  { feature: 'File retention', them: 'Indefinite by default', us: 'Auto-purge after delivery', themOk: false },
  { feature: 'Ephemeral chat', them: 'Logs persist on backend', us: 'Memory only, TTL purge', themOk: false },
  { feature: 'Telemetry & analytics', them: 'Tracked across sessions', us: 'No persistent tracking', themOk: false },
  { feature: 'Account recovery', them: 'Email link → full access', us: 'Key material required', themOk: true },
  { feature: 'Source transparency', them: 'Closed', us: 'Architecture published', themOk: false }
];

const ComparisonSection: React.FC = () => {
  const [side, setSide] = useState<'them' | 'us'>('us');

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-12 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
            <Target className="w-3 h-3" /> Side-by-Side
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            The honest <span className="font-serif font-extralight italic text-zinc-400">comparison.</span>
          </h2>
        </div>

        {/* Toggle — left-aligned to match heading */}
        <div className="flex justify-start mb-10">
          <div className="bg-zinc-900 border border-zinc-800 rounded-full p-1.5 inline-flex relative">
            <button
              onClick={() => setSide('them')}
              className={`relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-colors ${side === 'them' ? 'text-black' : 'text-zinc-400 hover:text-white'
                }`}
            >
              {side === 'them' && (
                <motion.span
                  layoutId="comparison-toggle-pill"
                  className="absolute inset-0 bg-white rounded-full -z-10"
                  transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                />
              )}
              Typical Cloud
            </button>
            <button
              onClick={() => setSide('us')}
              className={`relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-colors ${side === 'us' ? 'text-black' : 'text-zinc-400 hover:text-white'
                }`}
            >
              {side === 'us' && (
                <motion.span
                  layoutId="comparison-toggle-pill"
                  className="absolute inset-0 bg-white rounded-full -z-10"
                  transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                />
              )}
              Keepr
            </button>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-2 md:p-4 overflow-hidden">
          <div className="divide-y divide-zinc-900">
            {comparison.map((row, i) => {
              const isUs = side === 'us';
              const value = isUs ? row.us : row.them;
              const positive = isUs ? true : row.themOk;
              return (
                <motion.div
                  key={row.feature}
                  initial={{ opacity: 0, x: isUs ? 30 : -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 py-5 px-5 md:px-7 items-center"
                >
                  <div className="md:col-span-5 text-zinc-300 text-sm font-medium">{row.feature}</div>
                  <div className="md:col-span-6 flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${positive ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-red-500/10 border border-red-500/30'
                      }`}>
                      {positive ? (
                        <Check className="w-4 h-4 text-cyan-400" strokeWidth={3} />
                      ) : (
                        <X className="w-4 h-4 text-red-400" strokeWidth={3} />
                      )}
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`${side}-${row.feature}`}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className={positive ? 'text-zinc-200' : 'text-zinc-400 italic'}
                      >
                        {value}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <div className="md:col-span-1 text-right">
                    <span className={`text-[10px] uppercase tracking-widest font-black ${positive ? 'text-cyan-400' : 'text-red-400'
                      }`}>
                      {positive ? 'Win' : 'Risk'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Feature Tabs — deep-dive into each Keepr capability
// ─────────────────────────────────────────────────────────────────────────────
const features = [
  {
    id: 'send',
    icon: Upload,
    name: 'Send File',
    headline: 'End-to-end encrypted file transfer.',
    body: 'Drop a file. We chunk it, encrypt each chunk on your device with AES-256-GCM, and upload to a single-use S3 location. The recipient gets a one-time link. Once downloaded, the object is purged.',
    bullets: ['Chunked client-side encryption', 'Single-use share links', 'Self-destructs on download', 'No file size meta leaked']
  },
  {
    id: 'receive',
    icon: Download,
    name: 'Receive',
    headline: 'Decrypt only on the receiving device.',
    body: 'The recipient pastes the link, supplies the passphrase, and decryption happens locally. Our servers never see plaintext or keys at any point. Lose the link, lose the file.',
    bullets: ['Browser-native WebCrypto', 'No account required', 'Tamper-evident integrity tags', 'Works offline after download']
  },
  {
    id: 'scan',
    icon: ScanSearch,
    name: 'Malware Scan',
    headline: 'Multi-engine threat analysis before you trust it.',
    body: 'Suspicious attachment? Scan it with our orchestrated multi-engine pipeline. Files are analyzed in an ephemeral sandbox and shredded immediately after the report.',
    bullets: ['Multi-engine signature checks', 'Heuristic & behavioral analysis', 'Ephemeral sandbox execution', 'No retention of submissions']
  },
  {
    id: 'chat',
    icon: MessageSquare,
    name: 'Secure Chat',
    headline: 'Ephemeral, end-to-end encrypted rooms.',
    body: 'Spin up a room with a TTL of your choice. Messages are E2E encrypted, exist only in volatile memory on the server, and are wiped the moment the timer expires.',
    bullets: ['TTL-controlled self-destruct', 'No message persistence', 'Forward secrecy per session', 'Anonymous room IDs']
  },
  {
    id: 'detonator',
    icon: Zap,
    name: 'Link Detonator',
    headline: 'Detonate suspicious URLs in a sandbox.',
    body: 'Paste any link. It opens in an isolated headless browser inside our infrastructure. Vision models inspect the rendered page for phishing patterns. You stay safe on your machine.',
    bullets: ['Headless sandboxed browsing', 'AI-driven phishing detection', 'Screenshot & DOM forensics', 'Zero exposure to your device']
  },
  {
    id: 'storage',
    icon: FileLock2,
    name: 'Secure Storage',
    headline: 'A vault that even we cannot open.',
    body: 'A long-term encrypted vault for the files you actually want to keep. Folder-style organization, search across encrypted metadata, all without us ever seeing names or contents.',
    bullets: ['Encrypted folder hierarchy', 'Search across blind index', 'Per-file revocation', 'Cross-device sync']
  }
];

const FeatureTabs: React.FC<{ navigateTo?: (v: ViewType) => void }> = ({ navigateTo }) => {
  const [active, setActive] = useState(features[0].id);
  const current = features.find(f => f.id === active)!;

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-14 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
            <Cpu className="w-3 h-3" /> The Toolkit
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            One philosophy, <br />
            <span className="font-serif font-extralight italic text-zinc-400">six tools.</span>
          </h2>
          <p className="text-zinc-500 mt-4 leading-relaxed">
            Every feature ships with the same zero-knowledge contract.
            Pick one to see how it works under the hood.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start">
          {/* Tab list — fixed-size buttons, height never changes when switching tabs */}
          <div className="lg:col-span-4 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible -mx-6 lg:mx-0 px-6 lg:px-0 pb-2 lg:pb-0 lg:h-[544px]">
            {features.map(f => {
              const isActive = active === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setActive(f.id)}
                  className={`flex items-center gap-3 px-4 h-[84px] rounded-2xl border text-left shrink-0 transition-all ${isActive
                      ? 'bg-zinc-900 border-cyan-500/30 text-white'
                      : 'bg-zinc-900/30 border-zinc-800 text-zinc-400 hover:bg-zinc-900/60 hover:text-white'
                    }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${isActive ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-zinc-800 border-zinc-700'
                    }`}>
                    <f.icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-white'}`} />
                  </div>
                  <span className="font-bold text-sm">{f.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="feature-tab-indicator"
                      className="ml-auto w-1.5 h-1.5 bg-cyan-400 rounded-full hidden lg:block"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content — locked to the same fixed height as the tab list */}
          <div className="lg:col-span-8 bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden min-h-[480px] lg:h-[544px] lg:min-h-0">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-cyan-500/[0.07] blur-[100px] rounded-full pointer-events-none" />
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                    <current.icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.3em] font-black text-zinc-500">
                    Feature · {current.name}
                  </span>
                </div>
                <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-5">
                  {current.headline}
                </h3>
                <p className="text-zinc-400 leading-relaxed mb-8 max-w-2xl">{current.body}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                  {current.bullets.map((b, i) => (
                    <motion.div
                      key={b}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800"
                    >
                      <Check className="w-4 h-4 text-cyan-400 shrink-0" strokeWidth={3} />
                      <span className="text-sm text-zinc-300">{b}</span>
                    </motion.div>
                  ))}
                </div>

                {navigateTo && (
                  <button
                    onClick={() => navigateTo(current.id as ViewType)}
                    className="group inline-flex items-center gap-2 text-sm font-bold text-white"
                  >
                    Try {current.name}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Architecture Diagram — animated nodes & connecting lines
// ─────────────────────────────────────────────────────────────────────────────
const ArchitectureSection: React.FC = () => {
  const steps = [
    {
      n: '01',
      t: 'Encrypt',
      d: 'Your browser derives a 256-bit key and seals the payload locally.',
      icon: KeyRound,
      label: 'Your Device',
      sub: 'Encrypts locally',
      tag: 'Plaintext',
      glow: true
    },
    {
      n: '02',
      t: 'Upload',
      d: 'Ciphertext is streamed to a presigned, single-use S3 endpoint.',
      icon: Server,
      label: 'Edge Lambda',
      sub: 'Routes ciphertext only',
      tag: 'Ciphertext',
      glow: false
    },
    {
      n: '03',
      t: 'Store',
      d: 'A short, opaque token is generated. We store no association to identity.',
      icon: Database,
      label: 'S3 Vault',
      sub: 'Stores opaque blobs',
      tag: 'Ciphertext',
      glow: false
    },
    {
      n: '04',
      t: 'Deliver',
      d: 'Recipient pulls ciphertext, decrypts locally, original is purged.',
      icon: KeyRound,
      label: 'Recipient',
      sub: 'Decrypts locally',
      tag: 'Plaintext',
      glow: true
    }
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto bg-zinc-950 border border-zinc-800 rounded-[3rem] overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/[0.06] blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/[0.04] blur-[120px] rounded-full pointer-events-none" />

        <div className="p-10 md:p-16 relative">
          {/* Heading */}
          <div className="max-w-2xl mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
              <Network className="w-3 h-3" /> The Pipeline
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              How a file <span className="font-serif font-extralight italic text-zinc-400">travels.</span>
            </h2>
            <p className="text-zinc-500 leading-relaxed">
              Every transfer follows the same path. Plaintext lives only on the two endpoints —
              your device and the recipient's. Everything in between is opaque ciphertext riding
              over an encrypted transport.
            </p>
          </div>

          {/* Pipeline rows — each row pairs the step description with its node */}
          <div className="relative">
            <div className="space-y-5">
              {steps.map((s, i) => (
                <motion.div
                  key={s.n}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 items-center"
                >
                  {/* Left: step description */}
                  <div className="flex items-start gap-4">
                    <div className="text-cyan-400 font-mono font-black text-sm pt-0.5 shrink-0">{s.n}</div>
                    <div>
                      <div className="text-white font-bold mb-1">{s.t}</div>
                      <div className="text-zinc-500 text-sm font-light leading-relaxed">{s.d}</div>
                    </div>
                  </div>

                  {/* Right: node card */}
                  <div className="relative z-10 flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${s.glow
                        ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]'
                        : 'bg-zinc-800 border-zinc-700'
                      }`}>
                      <s.icon className={`w-5 h-5 ${s.glow ? 'text-cyan-400' : 'text-white'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-bold text-sm truncate">{s.label}</div>
                      <div className="text-zinc-500 text-xs font-light truncate">{s.sub}</div>
                    </div>
                    <span className={`text-[9px] uppercase tracking-widest font-black shrink-0 ${s.glow ? 'text-cyan-400' : 'text-zinc-600'
                      }`}>
                      {s.tag}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Threat Model — what we protect against
// ─────────────────────────────────────────────────────────────────────────────
const threats = [
  { icon: ShieldAlert, label: 'Server breach', desc: 'Even if our database leaks, attackers see only ciphertext.' },
  { icon: Eye, label: 'Insider access', desc: 'Engineers cannot read user data. The keys are not on our side.' },
  { icon: AlertTriangle, label: 'Subpoena & legal demands', desc: 'We can only hand over encrypted blobs. We have no plaintext to share.' },
  { icon: Wifi, label: 'Network interception', desc: 'TLS plus client-side encryption means double-sealed transit.' },
  { icon: Hash, label: 'Tamper attempts', desc: 'GCM auth tags detect any bit-flip in ciphertext on arrival.' },
  { icon: Ghost, label: 'Cross-session tracking', desc: 'No persistent identifiers. No marketing pixels. No third-party scripts.' }
];

const ThreatModelSection: React.FC = () => {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-14 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
            <ShieldCheck className="w-3 h-3" /> Threat Model
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            What we <span className="font-serif font-extralight italic text-zinc-400">defend against.</span>
          </h2>
          <p className="text-zinc-500 mt-4 leading-relaxed">
            Security only matters when measured against real threats.
            Here is a partial list of the adversaries we engineered against.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {threats.map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              whileHover={{ y: -8 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 22,
                opacity: { type: "tween", ease: "easeOut", delay: i * 0.06, duration: 0.3 }
              }}
              className="group bg-zinc-900/40 border border-zinc-800 rounded-3xl p-7 hover:border-cyan-500/30 transition-colors duration-100 cursor-pointer"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:border-cyan-500/40 transition-colors">
                  <t.icon className="w-5 h-5 text-white" />
                </div>
                <div className="w-9 h-9 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <Check className="w-4 h-4 text-cyan-400" strokeWidth={3} />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">{t.label}</h3>
              <p className="text-zinc-500 text-sm font-light leading-relaxed">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Stats Strip — security spec cards (no count-up; values are facts, not progress)
// ─────────────────────────────────────────────────────────────────────────────
const StatsSection: React.FC = () => {
  const stats = [
    {
      icon: KeyRound,
      value: '256',
      unit: 'bit',
      label: 'AES-GCM Encryption',
      hint: 'Industry-grade symmetric cipher, applied client-side.'
    },
    {
      icon: Cpu,
      value: '600K',
      unit: 'rounds',
      label: 'PBKDF2 Iterations',
      hint: 'Key derivation hardened against brute-force attacks.'
    },
    {
      icon: Database,
      value: '0',
      unit: 'bytes',
      label: 'Plaintext Stored',
      hint: 'Servers only ever hold encrypted blobs. Never plaintext.'
    },
    {
      icon: Activity,
      value: '99.99',
      unit: '%',
      label: 'Service Availability',
      hint: 'Built on AWS Serverless — resilient by design.'
    }
  ];

  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              whileHover={{ y: -8 }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 22,
                opacity: { type: "tween", ease: "easeOut", delay: i * 0.06, duration: 0.4 }
              }}
              className="group relative bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 hover:border-cyan-500/30 transition-colors duration-100 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center group-hover:border-cyan-500/40 transition-colors">
                  <s.icon className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-600 font-black">
                  {s.unit}
                </span>
              </div>

              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none">
                  {s.value}
                </span>
              </div>

              <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-400 font-black mb-3">
                {s.label}
              </div>

              <p className="text-xs text-zinc-500 font-light leading-relaxed">
                {s.hint}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FAQ Accordion
// ─────────────────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: "Can Keepr read my files if forced to?",
    a: "No. We never receive your encryption key. Files arrive at our infrastructure already sealed. We can hand over the ciphertext, but it is mathematically meaningless without your key."
  },
  {
    q: "What happens if I forget my passphrase?",
    a: "Your data becomes permanently inaccessible. This is the cost of true zero-knowledge. You can export an offline recovery seed at any time from settings if you want a personal backup path."
  },
  {
    q: "Why should I trust the client-side code?",
    a: "Inspect it. Our web client is JavaScript, fully readable in your browser. We publish build hashes so you can verify the deployed code matches what we describe. Trust is earned by being verifiable."
  },
  {
    q: "How is this different from end-to-end encrypted messengers?",
    a: "Same principle, broader scope. Keepr applies E2E encryption to file transfer, long-term storage, ephemeral chat, and threat analysis — all with the same zero-knowledge guarantee."
  },
  {
    q: "Do you keep logs?",
    a: "Operational metrics only — request counts, error rates, latency. No content, no identifiers, no persistent fingerprints. Logs are aggregated and rotated within hours."
  },
  {
    q: "Is Keepr quantum-safe?",
    a: "AES-256 and SHA-256 hold up well against known quantum attacks. We are tracking NIST PQ standardization and will roll hybrid post-quantum key exchange into our roadmap as it matures."
  }
];

const FAQSection: React.FC = () => {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
            FAQ
          </div>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Direct answers, <span className="font-serif font-extralight italic text-zinc-400">no hand-waving.</span>
          </h2>
        </div>

        <div className="space-y-2">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={i}
                layout
                className={`border rounded-2xl overflow-hidden transition-colors ${isOpen ? 'border-cyan-500/30 bg-zinc-900/60' : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
                  }`}
              >
                <motion.button
                  layout
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-6 p-6 text-left cursor-pointer"
                >
                  <span className="text-white font-bold text-base md:text-lg">{f.q}</span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="shrink-0 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center"
                  >
                    <ChevronDown className="w-4 h-4 text-white" />
                  </motion.div>
                </motion.button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="px-6 pb-6 text-zinc-400 leading-relaxed font-light">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Final CTA
// ─────────────────────────────────────────────────────────────────────────────
const CTASection: React.FC<{ navigateTo?: (v: ViewType) => void }> = ({ navigateTo }) => {
  return (
    <section className="py-28 px-6">
      <div className="max-w-5xl mx-auto bg-gradient-to-b from-zinc-900 to-black border border-zinc-800 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/[0.06] blur-[140px] rounded-full pointer-events-none" />
        <div className="relative">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight">
            Take back your <br />
            <span className="font-serif italic font-extralight opacity-70">privacy.</span>
          </h2>
          <p className="text-zinc-400 mt-6 max-w-xl mx-auto leading-relaxed">
            Free to start. No credit card. No telemetry.
            Just an honest privacy contract you can verify yourself.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigateTo?.('send')}
              className="group flex items-center gap-2 bg-white text-black px-7 py-3.5 rounded-full text-sm font-bold hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              Send your first file
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigateTo?.('pricing')}
              className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-white px-7 py-3.5 rounded-full text-sm font-bold hover:border-cyan-500/40 transition-colors"
            >
              See pricing
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────
export const WhyUsView: React.FC<WhyUsProps> = ({ navigateTo }) => {
  return (
    <div className="relative">
      <Hero />
      <StatsSection />
      <LiveEncryptionDemo />
      <PillarsSection />
      <ComparisonSection />
      <FeatureTabs navigateTo={navigateTo} />
      <ArchitectureSection />
      <ThreatModelSection />
      <FAQSection />
      <CTASection navigateTo={navigateTo} />
    </div>
  );
};

export default WhyUsView;
