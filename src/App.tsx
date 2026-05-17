/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  Shield,
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
  Zap
} from 'lucide-react';
import { DetonatorView } from './components/DetonatorView';
import { EphemeralChat } from './components/EphemeralChat';

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

type ViewType = 'home' | 'send' | 'receive' | 'scan' | 'pricing' | 'detonator' | 'chat' | 'whyus';

interface NavbarProps {
  activeView: ViewType;
  navigateTo: (view: ViewType) => void;
  isMenuOpen: boolean;
  setIsMenuOpen: (open: boolean) => void;
}

const Navbar = ({ activeView, navigateTo, isMenuOpen, setIsMenuOpen }: NavbarProps) => {
  const [isFeaturesOpen, setIsFeaturesOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between glass rounded-full px-6 py-3">
        <button onClick={() => navigateTo('home')} className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 bg-white flex items-center justify-center rounded-lg group-hover:scale-110 transition-transform">
            <Lock className="w-5 h-5 text-black" strokeWidth={2.5} />
          </div>
          <span className="text-white font-bold text-xl tracking-tighter transition-colors group-hover:text-cyan-400">Keepr.</span>
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
                        <div className="flex flex-col">
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
                        <div className="flex flex-col">
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
                        <div className="flex flex-col">
                          <span className="text-white text-sm font-bold tracking-tight">Malware Scan</span>
                          <span className="text-zinc-400 text-[10px] uppercase tracking-widest font-black leading-none mt-1.5 group-hover/item:text-zinc-300 transition-colors">Virus & threat analysis</span>
                        </div>
                      </button>

                      <button
                        onClick={() => { navigateTo('chat'); setIsFeaturesOpen(false); }}
                        className="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/10 transition-all text-left group/item"
                      >
                        <div className="w-11 h-11 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 group-hover/item:border-cyan-500/50 group-hover/item:bg-zinc-700 transition-colors shrink-0">
                          <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white text-sm font-bold tracking-tight">Secure Chat</span>
                          <span className="text-zinc-400 text-[10px] uppercase tracking-widest font-black leading-none mt-1.5 group-hover/item:text-zinc-300 transition-colors">Ephemeral E2EE messaging</span>
                        </div>
                      </button>
                      <button
                        onClick={() => { navigateTo('detonator'); setIsFeaturesOpen(false); }}
                        className="w-full flex items-center gap-4 p-3.5 rounded-2xl hover:bg-white/10 transition-all text-left group/item"
                      >
                        <div className="w-11 h-11 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 group-hover/item:border-cyan-500/50 group-hover/item:bg-zinc-700 transition-colors shrink-0">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-white text-sm font-bold tracking-tight">Link Detonator</span>
                          <span className="text-zinc-400 text-[10px] uppercase tracking-widest font-black leading-none mt-1.5 group-hover/item:text-zinc-300 transition-colors">Isolated sandbox analysis</span>
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

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateTo('send')}
            className="hidden sm:flex items-center gap-2 bg-white text-black px-6 py-2 rounded-full text-sm font-bold hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.2)] cursor-pointer"
          >
            Open Vault
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            className="md:hidden text-white p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
    </nav>
  );
};

const HomeView = ({ navigateTo }: { navigateTo: (v: ViewType) => void }) => (

  <>
    <section className="relative pt-40 pb-20 px-6 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl md:text-8xl font-bold tracking-tight mb-4"
        >
          Share Files <span className="text-white">Securely.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-serif italic text-3xl md:text-5xl text-zinc-400 mb-8"
        >
          Uncompromising Zero-Trust Privacy.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-xl text-lg mb-12 text-zinc-500"
        >
          Store, share, and protect your data with end-to-end client-side encryption.
          No complicated setup, no limits. Your privacy is our architecture.
        </motion.p>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="relative mt-8 mb-20 flex flex-col items-center justify-center p-12"
        >
          <div className="relative w-[300px] h-[300px] md:w-[450px] md:h-[450px] flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-zinc-900 shadow-2xl border border-zinc-800" />
            <div className="absolute w-[85%] h-[85%] rounded-full bg-zinc-950 shadow-inner border border-zinc-900 overflow-hidden flex flex-col items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="relative w-[75%] h-[75%] rounded-full shadow-[0_0_50px_rgba(255,255,255,0.1),inset_0_0_30px_rgba(0,0,0,0.5)] border-4 border-zinc-400 p-1"
                style={{
                  background: 'conic-gradient(from 0deg, #f5f5f5 0deg, #525252 45deg, #f5f5f5 90deg, #525252 135deg, #f5f5f5 180deg, #525252 225deg, #f5f5f5 270deg, #525252 315deg, #f5f5f5 360deg)'
                }}
              >
                <div className="w-full h-full rounded-full border border-zinc-300 flex items-center justify-center bg-transparent">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-black/20" />
                </div>
              </motion.div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-zinc-900/40 p-4 rounded-full backdrop-blur-sm border border-black/20 shadow-lg">
                  <Lock className="w-16 h-16 md:w-20 md:h-20 text-zinc-900 brightness-75 drop-shadow-lg" strokeWidth={2} />
                </div>
              </div>
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={() => navigateTo('send')}
                className="absolute bottom-6 bg-zinc-800/80 border border-zinc-600/50 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 hover:border-zinc-500 transition-all backdrop-blur-sm shadow-xl active:scale-95"
              >
                Get Started
              </motion.button>
            </div>
          </div>
          <div className="absolute -bottom-8 w-[60%] h-8 bg-cyan-500/10 blur-3xl rounded-full" />
        </motion.div>
      </div>
    </section>

    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">How It <span className="font-serif italic font-extralight opacity-60">Works.</span></h2>
          <p className="text-zinc-500 max-w-lg">
            Privacy shouldn't be complicated. We built Keepr. to be as intuitive as it is secure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-4 gap-4">
          <motion.div whileHover={{ y: -5 }} className="md:col-span-3 lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 group hover:border-cyan-500/30 transition-all flex flex-col justify-between min-h-[320px]">
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
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="md:col-span-3 lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 group hover:border-cyan-500/30 transition-all min-h-[320px]">
            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-6 border border-zinc-700 group-hover:border-cyan-500/50 transition-colors">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 group-hover:text-cyan-400 transition-colors">Keep It Safe</h3>
            <p className="text-zinc-500">
              Zero-knowledge architecture ensures that even we haven't seen your data. Your keys, your files.
            </p>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="md:col-span-3 lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 group hover:border-cyan-500/30 transition-all min-h-[320px]">
            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-6 border border-zinc-700 group-hover:border-cyan-500/50 transition-colors">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-3 group-hover:text-cyan-400 transition-colors">Share Instantly</h3>
            <p className="text-zinc-500">
              Generate secure single-use links or password-protected galleries in seconds.
            </p>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="md:col-span-6 lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-3xl p-8 group hover:border-cyan-500/30 transition-all flex items-center justify-between min-h-[200px]">
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
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="md:col-span-6 lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 flex flex-wrap gap-12 items-center justify-around group hover:border-cyan-500/30 transition-all">
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
          </motion.div>
        </div>
      </div>
    </section>
  </>
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

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  return (
    <section className="relative pt-40 pb-20 px-6 min-h-screen overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-cyan-500/[0.03] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        <div className="lg:col-span-12 text-center mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest mx-auto">
              <Shield className="w-3 h-3" strokeWidth={3} /> Zero-Trust Transmit
            </div>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight">
              Transmit with <br />
              <span className="text-white">Absolute Privacy.</span>
            </h1>
            <p className="font-serif italic text-3xl md:text-4xl text-zinc-400">
              End-to-End Encrypted File Transfer.
            </p>
          </motion.div>
        </div>

        <div className="lg:col-span-8 lg:col-start-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative p-1 rounded-[2.5rem] bg-gradient-to-br from-zinc-700 to-zinc-950 shadow-2xl overflow-hidden group/container"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] aspect-square bg-[conic-gradient(from_0deg,transparent_0deg,transparent_300deg,#06B6D4_360deg)] opacity-0 group-hover/container:opacity-40 transition-opacity duration-1000 animate-[spin_6s_linear_infinite]" />

            <div className="bg-zinc-950 rounded-[2.2rem] p-12 md:p-20 border border-black/50 relative z-10">
              {status === 'success' ? (
                <div className="text-center space-y-8 py-10">
                  <button 
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: 'Keepr Secure Transfer',
                          text: 'I sent you an encrypted file via Keepr.',
                          url: shareLink
                        }).catch(() => {});
                      } else {
                        alert('Native sharing is not supported on this browser.');
                      }
                    }}
                    className="w-20 h-20 bg-cyan-500/20 hover:bg-cyan-500/30 active:scale-95 transition-all cursor-pointer rounded-full flex items-center justify-center mx-auto border border-cyan-500/30 group"
                    title="Share via App"
                  >
                    <Share2 className="w-10 h-10 text-cyan-400 group-hover:scale-110 transition-transform" />
                  </button>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-white uppercase tracking-tighter">File Secured</h2>
                    <p className="text-zinc-500 font-serif italic">Share this zero-knowledge link with your recipient</p>
                  </div>
                  <div className="relative group">
                    <input
                      readOnly
                      value={shareLink}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50 pr-24"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(shareLink);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }}
                      className={`absolute right-2 top-2 bottom-2 w-[85px] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 overflow-hidden flex items-center justify-center ${isCopied ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'bg-white text-black hover:bg-zinc-200'}`}
                    >
                      <AnimatePresence mode="wait">
                        {isCopied ? (
                          <motion.div
                            key="copied"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ type: "spring", bounce: 0.4, duration: 0.4 }}
                          >
                            COPIED!
                          </motion.div>
                        ) : (
                          <motion.div
                            key="copy"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ type: "spring", bounce: 0.4, duration: 0.4 }}
                          >
                            COPY
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </div>
                  <div className="flex flex-col gap-4 pt-2">
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: 'Keepr Secure Transfer',
                            text: 'I sent you an encrypted file via Keepr.',
                            url: shareLink
                          }).catch(() => {});
                        }
                      }}
                      className="bg-white text-black py-4 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Share Link via App
                    </button>
                    <button
                      onClick={onReset}
                      className="text-zinc-500 hover:text-white text-xs uppercase tracking-widest transition-colors mt-2"
                    >
                      Send Another File
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                    className="border-2 border-dashed border-zinc-800 rounded-3xl p-16 flex flex-col items-center justify-center group hover:border-cyan-500/40 hover:bg-cyan-500/[0.02] transition-all cursor-pointer min-h-[400px]"
                  >
                    <input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      className="w-24 h-24 bg-zinc-900 rounded-3xl flex items-center justify-center mb-8 shadow-xl border border-zinc-800 group-hover:border-cyan-500/50 transition-colors"
                    >
                      {status === 'processing' ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full"
                        />
                      ) : (
                        <Upload className="w-12 h-12 text-white" />
                      )}
                    </motion.div>

                    {file ? (
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-white mb-2">{file.name}</h2>
                        <p className="text-zinc-500 text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for encryption</p>
                      </div>
                    ) : (
                      <>
                        <h2 className="text-3xl font-bold mb-4 tracking-tighter">Secure Dropzone</h2>
                        <p className="text-zinc-500 mb-2 italic font-serif">Drag and drop or click to browse</p>
                        <p className="text-zinc-700 text-[10px] uppercase tracking-widest font-black">Files up to 10GB • Encrypted locally</p>
                      </>
                    )}
                  </div>

                  <div className="mt-12 flex justify-center">
                    <button
                      disabled={!file || status === 'processing'}
                      onClick={handleEncrypt}
                      className="bg-white text-black px-10 py-4 rounded-2xl font-bold hover:bg-zinc-200 transition-all uppercase tracking-widest text-[10px] shadow-[0_0_30px_rgba(255,255,255,0.1)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {status === 'processing' ? 'Encrypting...' : 'Initialize Encryption'}
                    </button>
                  </div>
                  {status === 'error' && error && (
                    <p className="mt-6 text-red-500 text-[10px] uppercase tracking-widest font-black text-center leading-tight">
                      {error}
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
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
}) => (
  <section className="relative pt-40 pb-20 px-6 min-h-screen flex items-center justify-center bg-zinc-950/20 overflow-hidden">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-zinc-500/[0.02] blur-[150px] rounded-full pointer-events-none" />

    <div className="max-w-xl w-full text-center relative">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 mb-16">
        <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 relative group">
          <div className="absolute inset-0 bg-cyan-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <Download className="w-10 h-10 text-white relative z-10 group-hover:scale-110 transition-transform" />
        </div>
        <h1 className="text-6xl font-black tracking-tighter">
          Retrieve Your <br />
          <span className="text-white">Data Safely.</span>
        </h1>
        <p className="font-serif italic text-3xl text-zinc-400">
          Decryption Happens on Your Terms.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-[3rem] p-12 md:p-16 border border-white/5 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

        {status === 'success' && decryptedUrl ? (
          <div className="py-6 space-y-6">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
              <Shield className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Decryption Successful</h2>
            <div className="text-zinc-500 font-sans text-xs truncate max-w-xs mx-auto mb-2">{decryptedFileName}</div>
            <a
              href={decryptedUrl}
              download={decryptedFileName}
              className="block w-full bg-white text-black font-bold py-5 rounded-2xl hover:bg-zinc-200 transition-all text-center tracking-widest text-[10px] uppercase"
            >
              Download File
            </a>
            <button
              onClick={onReset}
              className="text-zinc-500 hover:text-white text-[10px] uppercase tracking-widest transition-colors font-black"
            >
              Close Vault
            </button>
          </div>
        ) : (
          <>
            <p className="text-zinc-600 mb-8 text-[10px] uppercase tracking-[0.4em] font-black">Authorized Access Only</p>

            <div className="mb-10 text-left">
              <label className="text-[10px] uppercase tracking-widest text-zinc-700 font-black mb-3 block">Paste Vault Link</label>
              <div className="relative group">
                <input
                  type="text"
                  value={downloadInput}
                  onChange={(e) => setDownloadInput(e.target.value)}
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-4 text-white font-sans focus:border-cyan-500/50 outline-none transition-all focus:bg-zinc-950 placeholder:text-zinc-800"
                  placeholder="Enter link from sender..."
                />
              </div>
              {error && <p className="text-red-500 text-[10px] mt-2 uppercase tracking-widest font-black leading-tight text-center">{error}</p>}
            </div>

            <button
              disabled={!downloadInput || status === 'processing'}
              onClick={handleDecrypt}
              className="w-full bg-zinc-900 border border-zinc-700 text-white font-bold py-5 rounded-2xl hover:border-cyan-500/50 hover:bg-zinc-800 transition-all active:scale-[0.98] mb-6 tracking-widest text-[10px] uppercase group disabled:opacity-50"
            >
              {status === 'processing' ? 'Processing...' : 'Decrypt & Download'}
              <ArrowRight className="inline-block w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-[10px] text-zinc-700 uppercase tracking-widest font-black">Encrypted via 256-bit AES GCM</p>
          </>
        )}
      </motion.div>
    </div>
  </section>
);

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
  const [dragActive, setDragActive] = useState(false);
  const [scanMode, setScanMode] = useState<'file' | 'url'>('file');
  const [urlInput, setUrlInput] = useState('');

  const handleFile = (files: FileList | null) => {
    if (files && files[0]) {
      handleScan(files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput) handleScan(urlInput);
  };

  return (
    <section className="relative pt-40 pb-20 px-6 min-h-screen overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-red-500/[0.03] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest mx-auto">
            <Shield className="w-3 h-3" /> Advanced Threat Intelligence
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white">
            Scan for <span className="text-red-500">Threats.</span>
          </h1>
          <p className="font-serif italic text-xl md:text-2xl text-zinc-400">Powered by the VirusTotal Intelligence Network.</p>

          <div className="flex justify-center gap-4 pt-6">
            <button
              onClick={() => { setScanMode('file'); onReset(); }}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${scanMode === 'file' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
            >
              File Scan
            </button>
            <button
              onClick={() => { setScanMode('url'); onReset(); }}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${scanMode === 'url' ? 'bg-red-500 text-white shadow-[0_0_15_rgba(239,68,68,0.4)]' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
            >
              URL Scan
            </button>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative p-1 rounded-[3rem] bg-gradient-to-br from-zinc-800 to-zinc-950 shadow-2xl overflow-hidden"
        >
          <div className="bg-zinc-950 rounded-[2.8rem] p-8 md:p-16 border border-white/5 relative z-10">
            {scanResult ? (
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-800 pb-6 gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Analysis Complete</h2>
                    <p className="text-zinc-500 text-sm">Real-time scan results from 70+ antivirus engines</p>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap ${scanResult.data?.attributes?.stats?.malicious > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                    {scanResult.data?.attributes?.stats?.malicious > 0 ? 'Threat Projected' : 'Clean'}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 text-center">
                    <div className="text-2xl font-bold text-white">{scanResult.data?.attributes?.stats?.malicious || 0}</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Malicious</div>
                  </div>
                  <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 text-center">
                    <div className="text-2xl font-bold text-white">{scanResult.data?.attributes?.stats?.suspicious || 0}</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Suspicious</div>
                  </div>
                  <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 text-center">
                    <div className="text-2xl font-bold text-white">{scanResult.data?.attributes?.stats?.harmless || 0}</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Harmless</div>
                  </div>
                  <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 text-center">
                    <div className="text-2xl font-bold text-white">{scanResult.data?.attributes?.stats?.undetected || 0}</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Undetected</div>
                  </div>
                </div>

                {/* Threat Details - List engines that detected something if any */}
                {(scanResult.data?.attributes?.results && scanResult.data?.attributes?.stats?.malicious > 0) && (
                  <div className="bg-zinc-900/30 rounded-2xl p-6 border border-zinc-800">
                    <h3 className="text-xs uppercase tracking-widest font-bold text-red-400 mb-4">Positive Detections</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {Object.entries(scanResult.data.attributes.results)
                        .filter(([_, value]: [any, any]) => value.category === 'malicious')
                        .map(([engine, value]: [any, any]) => (
                          <div key={engine} className="flex justify-between text-xs py-1 border-b border-zinc-800 last:border-0">
                            <span className="text-zinc-400">{engine}</span>
                            <span className="text-red-500 font-mono italic">{value.result}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-4">
                  <div className="text-zinc-600 text-[10px] uppercase tracking-widest font-black break-all">Analysis ID: {scanResult.data?.id}</div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={onReset}
                      className="flex-1 bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-all text-center tracking-widest text-[10px] uppercase shadow-lg"
                    >
                      New Scan
                    </button>
                    <a
                      href={`https://www.virustotal.com/gui/${scanMode === 'url' ? 'url' : 'file'}-analysis/${scanResult.data?.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-zinc-900 border border-zinc-700 text-white font-bold py-4 rounded-xl hover:bg-zinc-800 transition-all text-center tracking-widest text-[10px] uppercase"
                    >
                      Get Detailed Report <ArrowRight className="inline-block w-3 h-3 ml-1" />
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {scanMode === 'file' ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files); }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-[2rem] p-16 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[350px] ${dragActive ? 'border-red-500 bg-red-500/5' : 'border-zinc-800 hover:border-red-500/40 hover:bg-red-500/[0.02]'
                      }`}
                  >
                    <input
                      type="file"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={(e) => handleFile(e.target.files)}
                    />
                    <motion.div
                      animate={status === 'processing' ? { rotate: 360, scale: [1, 1.1, 1] } : { y: [0, -10, 0] }}
                      transition={status === 'processing' ? { repeat: Infinity, duration: 1.5 } : { repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      className="w-20 h-20 bg-zinc-900 rounded-[1.5rem] flex items-center justify-center mb-8 border border-zinc-800 shadow-xl"
                    >
                      {status === 'processing' ? (
                        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
                      ) : (
                        <Upload className="w-10 h-10 text-white" />
                      )}
                    </motion.div>
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tighter">
                      {status === 'processing' ? 'Uploading & Analyzing...' : 'Drop File to Scan'}
                    </h2>
                    <p className="text-zinc-500 italic font-serif text-lg mb-2">
                      {status === 'processing' ? 'Submitting to threat intelligence core' : 'Scan binaries, documents, or scripts under 32MB'}
                    </p>
                    <p className="text-zinc-700 text-[10px] uppercase tracking-widest font-black">Anonymous • Private • E2E Integrity Checks</p>
                  </div>
                ) : (
                  <div className="min-h-[350px] flex flex-col items-center justify-center space-y-10 py-10">
                    <motion.div
                      animate={status === 'processing' ? { rotate: 360, scale: [1, 1.1, 1] } : { y: [0, -10, 0] }}
                      transition={status === 'processing' ? { repeat: Infinity, duration: 1.5 } : { repeat: Infinity, duration: 3, ease: "easeInOut" }}
                      className="w-20 h-20 bg-zinc-900 rounded-[1.5rem] flex items-center justify-center border border-zinc-800 shadow-xl"
                    >
                      {status === 'processing' ? (
                        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
                      ) : (
                        <LinkIcon className="w-10 h-10 text-white" />
                      )}
                    </motion.div>

                    <div className="text-center">
                      <h2 className="text-3xl font-bold text-white mb-2 tracking-tighter">Scan URL for Threats</h2>
                      <p className="text-zinc-500 italic font-serif text-lg">Verify links, domains, or specific web resources.</p>
                    </div>

                    <form onSubmit={handleUrlSubmit} className="w-full max-w-xl relative group">
                      <input
                        type="url"
                        required
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://suspected-malware.com"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-5 text-zinc-300 focus:outline-none focus:border-red-500/50 transition-all font-sans text-lg italic pr-32"
                      />
                      <button
                        disabled={status === 'processing'}
                        type="submit"
                        className="absolute right-2 top-2 bottom-2 bg-red-500 text-white px-6 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] disabled:opacity-50"
                      >
                        {status === 'processing' ? 'Scanning...' : 'Scan Now'}
                      </button>
                    </form>
                    <p className="text-zinc-700 text-[10px] uppercase tracking-widest font-black">Malware • Phishing • Suspicious Activity Checks</p>
                  </div>
                )}

                {error && (
                  <div className="mt-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <p className="text-red-400 text-[10px] text-center uppercase tracking-widest font-black leading-tight">
                      {error}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const PricingView = () => (
  <section className="relative pt-40 pb-20 px-6 min-h-screen overflow-hidden">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-cyan-500/[0.02] blur-[180px] rounded-full pointer-events-none" />

    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-20 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-[0.2em] mx-auto"
        >
          Simple Pricing
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-4"
        >
          Choose your <span className="font-serif italic text-zinc-500 font-light">tier.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-zinc-500 max-w-xl mx-auto"
        >
          Scale your digital security with plans designed for individuals, teams, and global organizations.
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            name: 'Lite',
            price: '$0',
            description: 'For personal safety and casual file sharing.',
            features: ['5GB Storage', 'Peer-to-Peer Transfer', 'Basic Malware Scan', 'AES-256 Encryption'],
            excluded: ['Priority Support', 'Custom Domains', 'Admin Panel'],
            cta: 'Get Started',
            popular: false
          },
          {
            name: 'Pro',
            price: '$12',
            description: 'For power users and data-conscious professionals.',
            features: ['100GB Storage', 'Advanced Threat Intel', 'Password Expiry Control', 'Custom Share Branding', 'Priority Email Support'],
            excluded: ['Dedicated Servers', 'SSO Integration'],
            cta: 'Go Pro',
            popular: true
          },
          {
            name: 'Enterprise',
            price: 'Custom',
            description: 'Uncompromising security for large scale operations.',
            features: ['Unlimited Storage', 'Dedicated GPU Nodes', 'Full Admin Controls', 'SSO & Audit Logs', '24/7 Dedicated Support', 'Custom SLA'],
            cta: 'Contact Sales',
            popular: false
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

            <button className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${plan.popular ? 'bg-black text-white hover:bg-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}>
              {plan.cta}
            </button>
          </motion.div>
        ))}
      </div>

      <div className="mt-20 p-12 rounded-[3rem] border border-zinc-900 bg-zinc-950/50 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-white tracking-tight">Need a custom security audit?</h3>
          <p className="text-zinc-500 font-serif italic">Our threat labs can provide bespoke analysis for your infrastructure.</p>
        </div>
        <button className="bg-zinc-900 border border-zinc-700 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-cyan-500 transition-all flex items-center gap-2 group">
          Contact Threat Labs <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  </section>
);

const WhyUsView = () => (
  <section className="relative pt-40 pb-20 px-6 min-h-screen overflow-hidden">
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-cyan-500/[0.03] blur-[150px] rounded-full pointer-events-none" />

    <div className="max-w-4xl mx-auto text-center mb-24">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[10px] font-black uppercase tracking-[0.3em] mx-auto">
          The Keepr Advantage
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white">
          Why <span className="font-serif italic font-extralight opacity-60">Keepr?</span>
        </h1>
        <p className="text-xl text-zinc-500 max-w-2xl mx-auto font-light leading-relaxed">
          In a world of data harvesting, we chose a different path.
          Keepr isn't just a tool; it's a statement that privacy is a human right.
        </p>
      </motion.div>
    </div>

    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
      {[
        {
          title: "Zero-Knowledge",
          desc: "We don't just 'not read' your data. We CAN'T read it. Everything is encrypted on your device before it touches our cloud.",
          icon: Shield,
          stat: "100%",
          statLabel: "Client-Side"
        },
        {
          title: "Cloud Native",
          desc: "Built on AWS Serverless infrastructure, ensuring massive scale and 99.99% availability without compromising on speed.",
          icon: Zap,
          stat: "45ms",
          statLabel: "Latency"
        },
        {
          title: "AI Analysis",
          desc: "Our Link Detonator uses state-of-the-art vision models to protect you from threats that traditional scanners miss.",
          icon: Globe,
          stat: "Gemini",
          statLabel: "Powered"
        }
      ].map((feature, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="bg-zinc-900/30 border border-zinc-800 rounded-[3rem] p-10 group hover:bg-zinc-900/50 transition-all hover:border-cyan-500/20"
        >
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mb-8 border border-zinc-800 group-hover:border-cyan-500/50 transition-colors">
            <feature.icon className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4 lowercase tracking-tighter">{feature.title}.</h3>
          <p className="text-zinc-500 text-sm font-light leading-relaxed mb-8 italic font-serif">
            {feature.desc}
          </p>
          <div className="pt-6 border-t border-zinc-800">
            <div className="text-3xl font-black text-white tracking-tighter">{feature.stat}</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-600 font-black">{feature.statLabel}</div>
          </div>
        </motion.div>
      ))}
    </div>

    <div className="max-w-5xl mx-auto bg-zinc-950 border border-zinc-800 rounded-[4rem] p-16 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[80px] rounded-full" />
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-4xl font-bold text-white mb-6 tracking-tighter">Infrastructure as <span className="text-cyan-500">Code.</span></h2>
          <p className="text-zinc-500 font-light leading-relaxed mb-8">
            Our entire stack is automated via Serverless Framework. This means no manual configuration errors,
            consistent security policies, and rapid deployment of new features.
            When you use Keepr, you're using a perfectly orchestrated cloud environment.
          </p>
          <button className="flex items-center gap-2 text-white font-bold text-[10px] uppercase tracking-widest group">
            Learn about our stack <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        <div className="bg-black/50 rounded-3xl p-8 border border-zinc-800 font-mono text-[10px] text-zinc-500">
          <div className="text-cyan-500/50 mb-4">// keepr-infrastructure.yml</div>
          <div className="space-y-1">
            <div><span className="text-zinc-400">service:</span> keepr-ephemeral-chat</div>
            <div><span className="text-zinc-400">provider:</span> aws</div>
            <div className="pl-4"><span className="text-zinc-400">region:</span> ap-south-1</div>
            <div className="pl-4"><span className="text-zinc-400">runtime:</span> nodejs20.x</div>
            <div><span className="text-zinc-400">resources:</span></div>
            <div className="pl-4"><span className="text-zinc-400">VaultBucket:</span> AWS::S3::Bucket</div>
            <div className="pl-4"><span className="text-zinc-400">Connections:</span> AWS::DynamoDB::Table</div>
            <div className="pl-4"><span className="text-zinc-400">Detonator:</span> AWS::Lambda::Function</div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('home');

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

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

  // Navigation handler
  const resetSessionState = () => {
    setFile(null);
    setStatus('idle');
    setShareLink('');
    setDownloadInput('');
    setDecryptedUrl(null);
    setDecryptedFileName('decrypted_file');
    setError(null);
    setScanResult(null);
  };

  useEffect(() => {
    // Check for chat room link: #room=ID&key=KEY
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
  }, []);

  const navigateTo = (view: ViewType) => {
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
      setDecryptedUrl(URL.createObjectURL(decryptedBlob));
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

  return (
    <div className="min-h-screen bg-black text-zinc-400 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar
        activeView={activeView}
        navigateTo={navigateTo}
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
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
                  <button onClick={() => navigateTo('home')} className={`text-4xl font-bold text-left tracking-tighter transition-colors ${activeView === 'home' ? 'text-cyan-400' : 'text-white'}`}>Home.</button>
                  <button onClick={() => navigateTo('whyus')} className={`text-4xl font-bold text-left tracking-tighter transition-colors ${activeView === 'whyus' ? 'text-cyan-400' : 'text-white'}`}>Why Us.</button>
                  <button onClick={() => navigateTo('pricing')} className={`text-4xl font-bold text-left tracking-tighter transition-colors ${activeView === 'pricing' ? 'text-cyan-400' : 'text-white'}`}>Pricing.</button>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-[10px] text-zinc-600 uppercase tracking-[0.3em] font-black">Encrypted Features</p>
                <div className="grid gap-2">
                  {[
                    { id: 'send', title: 'Send File', desc: 'Encrypted peer transfer', icon: Upload },
                    { id: 'receive', title: 'Receive File', desc: 'Secure asset retrieval', icon: Download },
                    { id: 'scan', title: 'Malware Scan', desc: 'Virus & threat analysis', icon: Shield },
                    { id: 'chat', title: 'Secure Chat', desc: 'Ephemeral E2EE messaging', icon: MessageSquare },
                    { id: 'detonator', title: 'Link Detonator', desc: 'Isolated sandbox analysis', icon: Zap }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigateTo(item.id as ViewType)}
                      className="w-full flex items-center gap-4 p-4 rounded-3xl bg-zinc-900/50 border border-white/5 text-left active:bg-white/10 transition-all"
                    >
                      <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 shrink-0">
                        <item.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-white text-lg font-bold tracking-tight">{item.title}</span>
                        <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-black mt-1 leading-none">{item.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900">
                <button
                  onClick={() => navigateTo('send')}
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
          <main>
            {activeView === 'home' && <HomeView navigateTo={navigateTo} />}
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
            {activeView === 'pricing' && <PricingView />}
            {activeView === 'whyus' && <WhyUsView />}
            {activeView === 'detonator' && <DetonatorView />}
            {activeView === 'chat' && (
              <EphemeralChat
                initialRoomId={roomToJoin?.id}
                initialKey={roomToJoin?.key}
              />
            )}


            {/* Global CTA & Footer Sections (Always visible) */}
            <section className="py-24 px-6 bg-zinc-950/50">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center text-center lg:text-left">
                <div className="max-w-lg mx-auto lg:mx-0">
                  <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tighter">Ready to Get <br /><span className="font-serif italic font-extralight opacity-60 block mt-2">Started?</span></h2>
                  <p className="text-zinc-500 mb-10 text-lg font-thin">Join thousands of individuals who trust Keepr. with their most sensitive data.</p>

                  <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="First Name" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3 focus:outline-none focus:border-cyan-500/50 text-white placeholder:text-zinc-700 transition-all font-sans" />
                      <input type="text" placeholder="Last Name" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3 focus:outline-none focus:border-cyan-500/50 text-white placeholder:text-zinc-700 transition-all font-sans" />
                    </div>
                    <input type="email" placeholder="Email Address" className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3 focus:outline-none focus:border-cyan-500/50 text-white placeholder:text-zinc-700 transition-all font-sans" />
                    <button className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-colors shadow-lg mt-4 font-sans uppercase tracking-[0.2em] text-[10px]">
                      Initialize Vault Access
                    </button>
                    <p className="text-[10px] text-zinc-700 text-center uppercase tracking-widest font-black mt-4">No credit card required • Infinite privacy</p>
                  </form>
                </div>
                <div className="relative flex justify-center lg:justify-end">
                  <div className="relative w-full max-w-sm bg-zinc-900/40 backdrop-blur-xl border border-white/5 p-1 px-1 rounded-[3rem] rotate-2 hover:rotate-0 transition-transform duration-700 overflow-hidden shadow-2xl">
                    <div className="bg-zinc-950 shadow-inner rounded-[2.8rem] p-16 flex flex-col items-center gap-8 relative overflow-hidden">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/10 blur-[80px] rounded-full -z-10" />
                      <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="w-32 h-32 bg-gradient-to-b from-white/10 to-transparent ring-1 ring-white/10 rounded-[2.5rem] flex items-center justify-center shadow-2xl">
                        <Shield className="w-16 h-16 text-white" strokeWidth={1} />
                      </motion.div>
                      <div className="text-center space-y-2">
                        <div className="text-white font-bold text-xl tracking-tighter">Identity Secured</div>
                        <div className="text-zinc-700 text-[10px] uppercase tracking-widest font-black italic">Hardware-Level Encryption Active</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="py-24 px-6 border-t border-zinc-900 mt-20">
              <div className="max-w-7xl mx-auto">
                <h2 className="text-center text-5xl font-black tracking-tighter mb-20 lowercase">contact us.</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { icon: UserCircle, title: 'Chat to sales', desc: 'Speak to our friendly team.', action: 'sales@keepr.io' },
                    { icon: LifeBuoy, title: 'Chat to support', desc: "We're here to help.", action: 'support@keepr.io' },
                    { icon: Phone, title: 'Call us', desc: 'Mon-Fri from 8am to 5pm.', action: '+1 (555) 000-0000' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-zinc-900/30 border border-zinc-800 rounded-[2.5rem] p-10 flex flex-col items-center text-center group hover:bg-zinc-900/50 transition-colors">
                      <div className="w-14 h-14 bg-black rounded-[1.2rem] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl">
                        <item.icon className="w-7 h-7 text-cyan-400" />
                      </div>
                      <h3 className="text-xl font-bold mb-2 lowercase tracking-tighter">{item.title}</h3>
                      <p className="text-zinc-500 mb-6 font-thin text-sm italic">{item.desc}</p>
                      <button className="text-zinc-200 hover:text-cyan-400 font-bold underline underline-offset-8 transition-colors text-[10px] uppercase tracking-widest">
                        {item.action}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        </motion.div>
      </AnimatePresence>

      <footer className="relative pt-24 pb-12 px-6 overflow-hidden border-t border-zinc-900 bg-zinc-950/20">
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
                <button className="hover:text-cyan-400 transition-colors cursor-pointer text-left">Personal Vault</button>
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
  );
}