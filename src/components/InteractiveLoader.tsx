/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock } from 'lucide-react';
import MouseAurora from './MouseAurora';

export const InteractiveLoader: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const loadingMessages = useMemo(() => [
    "Establishing zero-knowledge protocol...",
    "Verifying handshake tokens...",
    "Mounting sandboxed vault...",
    "Synchronizing end-to-end keys...",
    "Securing local vault parameters..."
  ], []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [loadingMessages.length]);

  const handleLockClick = () => {
    setClickCount((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center relative overflow-hidden select-none">
      {/* Background Interactive Aurora */}
      <MouseAurora position="fixed" grid={false} />




      {/* Main Content */}
      <div className="relative z-10 w-full max-w-[340px] px-6 flex flex-col items-center">

        {/* Lock Centerpiece */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-10 flex items-center justify-center"
        >
          {/* Click shockwave ripples — only on click */}
          {clickCount > 0 && Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={`${clickCount}-${i}`}
              initial={{ scale: 0.5, opacity: 0.6 }}
              animate={{ scale: 2.6, opacity: 0 }}
              transition={{
                duration: 1.2,
                ease: "easeOut",
                delay: i * 0.22,
              }}
              className="absolute w-20 h-20 rounded-full pointer-events-none"
              style={{ border: '1px solid rgba(6,182,212,0.6)' }}
            />
          ))}

          {/* Interactive Lock Button */}
          <motion.button
            onClick={handleLockClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 380, damping: 16 }}
            className="relative z-10 cursor-pointer w-20 h-20 rounded-full flex items-center justify-center bg-zinc-950/80 border border-zinc-800/80 hover:border-cyan-500/40 transition-all duration-300 outline-none shadow-[0_0_30px_rgba(0,0,0,0.5)]"
            style={{
              boxShadow: isHovered
                ? '0 0 0 1px rgba(6,182,212,0.25), 0 0 30px rgba(6,182,212,0.1), 0 20px 40px rgba(0,0,0,0.4)'
                : '0 0 0 1px rgba(255,255,255,0.04), 0 20px 40px rgba(0,0,0,0.4)',
            }}
          >
            <Lock
              className={`w-8 h-8 transition-all duration-300 ${isHovered ? 'text-cyan-300' : 'text-cyan-400/80'
                }`}
              strokeWidth={1.5}
              style={{
                filter: isHovered
                  ? 'drop-shadow(0 0 12px rgba(6,182,212,0.5))'
                  : 'drop-shadow(0 0 6px rgba(6,182,212,0.25))',
              }}
            />
          </motion.button>
        </motion.div>

        {/* Typography */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
          className="text-center mb-8"
        >
          <h2 className="text-white font-bold text-2xl tracking-tight mb-2 select-none bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            Securing Connection
          </h2>

          <div className="h-9 relative overflow-hidden flex items-center justify-center select-none">
            <AnimatePresence mode="wait">
              <motion.p
                key={messageIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="absolute text-center text-zinc-500 text-[11px] font-light leading-relaxed px-2"
              >
                {loadingMessages[messageIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="w-full h-px bg-zinc-900 rounded-full overflow-hidden relative mb-10"
        >
          <motion.div
            initial={{ left: '-60%', width: '40%' }}
            animate={{ left: '110%', width: ['35%', '55%', '35%'] }}
            transition={{
              repeat: Infinity,
              duration: 2.2,
              ease: 'easeInOut',
            }}
            className="absolute h-full bg-gradient-to-r from-transparent via-cyan-500/70 to-transparent"
            style={{ filter: 'blur(0.5px)' }}
          />
        </motion.div>

        {/* Bottom Label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex items-center justify-center gap-1.5 text-[9px] uppercase tracking-[0.22em] text-zinc-700 font-medium"
        >
          <Lock className="w-2.5 h-2.5 text-zinc-700" strokeWidth={2} />
          AES-256-GCM Encrypted
        </motion.div>

      </div>
    </div>
  );
};

export default InteractiveLoader;
