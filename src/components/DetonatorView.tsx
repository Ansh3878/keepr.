import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Terminal,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Globe,
  Camera,
  Loader2,
  X,
  AlertTriangle,
  Link as LinkIcon
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';

interface DetonatorAnalysis {
  riskScore: number;
  verdict: string;
  reason: string;
}

export const DetonatorView = () => {
  const [url, setUrl] = useState('');
  const [isDetonating, setIsDetonating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DetonatorAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAnalysisExpanded && textRef.current) {
      textRef.current.scrollTop = 0;
    }
  }, [isAnalysisExpanded]);

  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on('log', (msg: string) => {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    });

    socketRef.current.on('screenshot', (base64: string) => {
      setScreenshot(base64);
    });

    socketRef.current.on('analysis', (data: DetonatorAnalysis) => {
      setAnalysis(data);
      setIsDetonating(false);
    });

    socketRef.current.on('error', (msg: string) => {
      setError(msg);
      setIsDetonating(false);
    });

    return () => {
      socketRef.current?.removeAllListeners();
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (logs.length > 0 && isDetonating) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [logs, isDetonating]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleDetonate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLogs([]);
    setScreenshot(null);
    setAnalysis(null);
    setError(null);
    setIsDetonating(true);

    socketRef.current?.emit('detonate-link', { url });
  };

  const reset = () => {
    setLogs([]);
    setScreenshot(null);
    setAnalysis(null);
    setError(null);
    setIsAnalysisExpanded(false);
  };

  const hasResults = logs.length > 0 || screenshot || analysis || isDetonating;

  return (
    <section className="relative pt-32 pb-20 px-6 min-h-screen overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-b from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(255,255,255,0.08)]">
            Detonate any <span className="font-serif italic font-extralight bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent opacity-60">link.</span>
          </h1>
        </motion.div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="max-w-3xl mx-auto mb-8"
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(103,232,249,0.06)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_50%,transparent_100%)] opacity-40" />

            <form onSubmit={handleDetonate} className="relative z-10">
              <label className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-black mb-3 block">
                Target URL
              </label>
              <div className="relative">
                <Globe className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  type="url"
                  required
                  placeholder="https://suspected-target.example/login"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-zinc-200 font-mono text-sm focus:border-cyan-500/50 outline-none transition-colors placeholder:text-zinc-600"
                />
              </div>

              <button
                type="submit"
                disabled={isDetonating || !url}
                className="w-full mt-5 group bg-white text-black px-7 py-4 rounded-2xl text-sm font-black uppercase tracking-[0.2em] hover:bg-zinc-200 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-[0_0_24px_rgba(255,255,255,0.12)] flex items-center justify-center gap-2"
              >
                {isDetonating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Detonating
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" strokeWidth={3} />
                    Detonate URL
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>

        {/* Results — terminal + visual */}
        <AnimatePresence>
          {hasResults && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              {/* Terminal */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] overflow-hidden flex flex-col h-[480px]">
                <div className="bg-zinc-900/60 px-5 py-3 border-b border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">
                      sandbox.stdout
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-zinc-700" />
                    <div className="w-2 h-2 rounded-full bg-zinc-700" />
                    <div className={`w-2 h-2 rounded-full ${isDetonating ? 'bg-cyan-400 animate-pulse' : 'bg-zinc-700'}`} />
                  </div>
                </div>
                <div className="p-5 flex-grow overflow-y-auto font-mono text-[11px] space-y-1.5 custom-scrollbar leading-relaxed">
                  {!logs.length && !isDetonating && (
                    <div className="text-zinc-700 italic">No log output yet.</div>
                  )}
                  {logs.map((log, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-zinc-700 shrink-0 select-none w-6 text-right">{i + 1}</span>
                      <span
                        className={
                          log.includes('successfully') || log.includes('complete')
                            ? 'text-cyan-400'
                            : 'text-zinc-400'
                        }
                      >
                        {log}
                      </span>
                    </div>
                  ))}
                  {isDetonating && (
                    <div className="flex gap-3 items-center">
                      <span className="text-zinc-700 shrink-0 select-none w-6 text-right">
                        {logs.length + 1}
                      </span>
                      <span className="text-cyan-400/60 animate-pulse">running diagnostics…</span>
                    </div>
                  )}
                  <div ref={terminalEndRef} />
                </div>
              </div>

              {/* Visual */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] p-5 h-[480px] flex flex-col items-center justify-center relative overflow-hidden">
                <AnimatePresence mode="wait">
                  {screenshot ? (
                    <motion.div
                      key="screenshot"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full h-full flex flex-col"
                    >
                      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-3 flex items-center gap-2">
                        <Camera className="w-3 h-3" /> Visual capture
                      </div>
                      <div className="flex-grow rounded-xl overflow-hidden border border-zinc-800 bg-black">
                        <img
                          src={`data:image/png;base64,${screenshot}`}
                          alt="Detonation screenshot"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="placeholder"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center space-y-5"
                    >
                      <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto">
                        {isDetonating ? (
                          <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
                        ) : (
                          <Camera className="w-7 h-7 text-zinc-600" strokeWidth={1.5} />
                        )}
                      </div>
                      <div>
                        <h3 className="text-white font-bold tracking-tight">
                          {isDetonating ? 'Capturing page' : 'Awaiting capture'}
                        </h3>
                        <p className="text-zinc-500 text-xs mt-1">
                          {isDetonating
                            ? 'The sandbox is rendering the target.'
                            : 'A screenshot will appear here when ready.'}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Analysis overlay (collapsed pill, expandable) */}
                <AnimatePresence>
                  {analysis && (
                    <motion.div
                      initial={{ opacity: 0, y: 60 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        height: isAnalysisExpanded ? 'calc(100% - 24px)' : '172px',
                      }}
                      style={{ padding: '20px' }}
                      exit={{ opacity: 0, y: 60 }}
                      transition={{
                        duration: 0.4,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      onClick={() => !isAnalysisExpanded && setIsAnalysisExpanded(true)}
                      className={`absolute inset-x-3 bottom-3 border ${
                        analysis.riskScore > 50 ? 'border-red-500/30' : 'border-cyan-500/30'
                      } rounded-2xl backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden bg-zinc-950 ${
                        isAnalysisExpanded ? 'z-40' : 'z-20 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 mb-3 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border ${
                              analysis.riskScore > 50
                                ? 'bg-red-500/10 border-red-500/30'
                                : 'bg-cyan-500/10 border-cyan-500/30'
                            }`}
                          >
                            {analysis.riskScore > 50 ? (
                              <ShieldAlert className="w-4 h-4 text-red-400" />
                            ) : (
                              <ShieldCheck className="w-4 h-4 text-cyan-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div
                              className="text-[9px] uppercase tracking-[0.25em] font-black text-zinc-500 mb-0.5"
                            >
                              Verdict
                            </div>
                            <h4
                              className="text-white font-bold tracking-tight text-base truncate"
                            >
                              {analysis.verdict}
                            </h4>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div
                              className={`font-black tracking-tighter leading-none text-2xl ${
                                analysis.riskScore > 50 ? 'text-red-400' : 'text-cyan-400'
                              }`}
                            >
                              {analysis.riskScore}
                            </div>
                            <div
                              className="text-[9px] uppercase tracking-widest text-zinc-600 font-black mt-0.5"
                            >
                              Risk score
                            </div>
                          </div>
                          <motion.div
                            initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                            animate={{
                              width: isAnalysisExpanded ? 32 : 0,
                              opacity: isAnalysisExpanded ? 1 : 0,
                              marginLeft: isAnalysisExpanded ? 12 : 0,
                            }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden shrink-0 flex items-center justify-center"
                          >
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setIsAnalysisExpanded(false);
                              }}
                              className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </motion.div>
                        </div>
                      </div>

                      <div className="h-1 bg-zinc-900 rounded-full overflow-hidden mb-3 shrink-0">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${analysis.riskScore}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full ${
                            analysis.riskScore > 50
                              ? 'bg-gradient-to-r from-red-500 to-red-400'
                              : 'bg-gradient-to-r from-cyan-500 to-cyan-300'
                          }`}
                        />
                      </div>

                      <div className="relative w-full flex-grow overflow-hidden mt-2">
                        <div
                          ref={textRef}
                          style={{
                            maskImage: isAnalysisExpanded
                              ? 'none'
                              : 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
                            WebkitMaskImage: isAnalysisExpanded
                              ? 'none'
                              : 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
                          }}
                          className={`text-zinc-400 leading-relaxed font-sans text-xs w-full h-full ${
                            isAnalysisExpanded
                              ? 'overflow-y-auto pr-2 custom-scrollbar'
                              : 'overflow-hidden'
                          }`}
                        >
                          {analysis.reason}
                        </div>
                      </div>

                      <motion.div
                        initial={false}
                        animate={{
                          height: isAnalysisExpanded ? 0 : 20,
                          opacity: isAnalysisExpanded ? 0 : 1,
                          marginTop: isAnalysisExpanded ? 0 : 8,
                        }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="text-[9px] text-zinc-600 uppercase tracking-widest font-black shrink-0 overflow-hidden"
                      >
                        Tap to expand
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto mt-6 px-5 py-4 rounded-2xl bg-red-500/5 border border-red-500/20 flex items-start gap-3"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-red-400 text-sm font-bold mb-1">Detonation failed</div>
                <div className="text-zinc-400 text-xs leading-relaxed">{error}</div>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-[10px] uppercase tracking-widest font-black text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors shrink-0"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reset action when results are present */}
        {(analysis || screenshot) && !isDetonating && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={reset}
              className="px-6 py-2.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <LinkIcon className="w-3 h-3" /> Detonate another
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
