/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Shield } from 'lucide-react';
import MouseAurora from './MouseAurora';

export const InteractiveLoader: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  const loadingMessages = useMemo(() => [
    "Establishing zero-knowledge protocol and secure keys.",
    "Verifying cryptographic handshake tokens with Clerk.",
    "Mounting sandboxed vault environment for session.",
    "Synchronizing end-to-end keys across instances.",
    "Securing local vault parameters and connection details."
  ], []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [loadingMessages.length]);

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center relative overflow-hidden select-none">
      {/* Background Interactive Aurora */}
      <MouseAurora position="fixed" grid={false} />

      {/* Main Interactive Loader Container */}
      <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center">
        {/* Brand Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex items-center gap-3 mb-8"
        >
          <div className="w-10 h-10 bg-white flex items-center justify-center rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.15)]">
            <Shield className="w-5.5 h-5.5 text-black" strokeWidth={2.5} />
          </div>
          <span className="text-white font-bold text-2xl tracking-tighter">Keepr.</span>
        </motion.div>

        {/* Center Card (styled exactly like the feature cards) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05, duration: 0.5, ease: 'easeOut' }}
          className="w-full bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] p-10 relative overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] text-left hover:border-cyan-500/40 transition-colors duration-300"
        >
          {/* Top Sheen */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent pointer-events-none" />

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/[0.02] text-[9px] font-mono tracking-widest uppercase text-zinc-400 mb-8">
            SECURE INITIALIZATION
          </div>

          {/* Icon Wrapper with glowing cyan aura */}
          <div className="relative w-36 h-36 mx-auto mb-8 flex items-center justify-center">
            {/* Cyan blur aura behind the icon (blends perfectly) */}
            <div className="absolute w-28 h-28 bg-cyan-500/15 blur-[40px] rounded-full pointer-events-none" />

            {/* Lock Icon */}
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 450, damping: 15 }}
              className="relative z-10 cursor-pointer"
            >
              <Lock className="w-16 h-16 text-cyan-400 filter drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]" strokeWidth={1.5} />
            </motion.div>
          </div>

          {/* Simplified & Styled Typography */}
          <div className="space-y-3 mt-4">
            <h3 className="text-white font-bold text-2xl tracking-tight select-none">
              Securing Connection
            </h3>

            <div className="h-14 relative overflow-hidden flex items-start text-zinc-400 text-sm font-light leading-relaxed select-none">
              <AnimatePresence mode="wait">
                <motion.p
                  key={messageIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className="absolute"
                >
                  {loadingMessages[messageIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Sleek Progress Bar inside the card */}
          <div className="w-full h-[2px] bg-zinc-950 rounded-full mt-6 overflow-hidden relative border border-white/5">
            <motion.div
              initial={{ left: '-100%', width: '40%' }}
              animate={{ left: '100%', width: ['40%', '60%', '40%'] }}
              transition={{
                repeat: Infinity,
                duration: 2.0,
                ease: 'easeInOut',
              }}
              className="absolute h-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_6px_rgba(6,182,212,0.6)]"
            />
          </div>
        </motion.div>

        {/* Bottom Encrypted Label */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[9px] uppercase tracking-[0.2em] text-zinc-700 font-bold">
          <Lock className="w-3 h-3 text-zinc-700" /> End-to-end encrypted
        </div>
      </div>
    </div>
  );
};

export default InteractiveLoader;
