import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Send, ShieldAlert, ShieldCheck, Zap, Globe, Cpu, Camera, ArrowRight, Loader2, X } from 'lucide-react';
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

  useEffect(() => {
    socketRef.current = io('http://localhost:3001');

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
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (logs.length > 0 && isDetonating) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [logs, isDetonating]);

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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <section className="relative pt-40 pb-20 px-6 min-h-screen overflow-hidden">
      {/* Background Atmosphere */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-cyan-500/[0.05] blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-cyan-500/[0.03] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16 space-y-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] mx-auto"
          >
            <Zap className="w-3 h-3 fill-cyan-400" /> AI Link Detonator Sandbox
          </motion.div>
          <motion.h1 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="text-6xl md:text-8xl font-black tracking-tighter text-white"
          >
            Zero Trust <span className="text-cyan-500 italic font-serif font-light">Exploration.</span>
          </motion.h1>
          <motion.p 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="text-zinc-500 max-w-2xl mx-auto font-medium"
          >
            Execute suspicious links in a hardened cloud environment. Captured, analyzed, and neutralized by Gemini 1.5 Pro.
          </motion.p>
        </div>

        {/* Input Chamber */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-3xl mx-auto mb-16"
        >
          <form onSubmit={handleDetonate} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative flex bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden p-2">
              <div className="flex-grow flex items-center px-4">
                <Globe className="w-5 h-5 text-zinc-600 mr-3" />
                <input 
                  type="url" 
                  required
                  placeholder="https://suspected-target.io/login"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-transparent text-zinc-300 py-4 focus:outline-none placeholder:text-zinc-700 font-mono text-sm"
                />
              </div>
              <button 
                disabled={isDetonating}
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-600 text-black px-8 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:shadow-none flex items-center gap-2"
              >
                {isDetonating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                {isDetonating ? 'Detonating...' : 'Detonate'}
              </button>
            </div>
          </form>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Detonation Chamber (Logs) */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-black/80 rounded-[2rem] border border-zinc-900 backdrop-blur-xl overflow-hidden flex flex-col h-[500px] shadow-2xl"
          >
            <div className="bg-zinc-900/50 px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Sandbox.stdout</span>
              </div>
              <div className="flex gap-1.5 text-zinc-800">
                <div className="w-2 h-2 rounded-full bg-red-500/20" />
                <div className="w-2 h-2 rounded-full bg-orange-500/20" />
                <div className="w-2 h-2 rounded-full bg-green-500/20" />
              </div>
            </div>
            <div className="p-6 flex-grow overflow-y-auto font-mono text-[11px] space-y-2 custom-scrollbar">
              {!logs.length && (
                <div className="text-zinc-800 italic">Waiting for target acquisition...</div>
              )}
              {logs.map((log, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-zinc-700 shrink-0 select-none">{i + 1}</span>
                  <span className={log.includes('successfully') || log.includes('complete') ? 'text-cyan-400' : 'text-zinc-400'}>
                    {log}
                  </span>
                </div>
              ))}
              {isDetonating && (
                <div className="flex gap-3 items-center">
                   <span className="text-zinc-700 shrink-0 select-none">{logs.length + 1}</span>
                   <span className="text-cyan-500/50 animate-pulse">Running diagnostic heuristics...</span>
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>
          </motion.div>

          {/* Visual Evidence Area */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="bg-zinc-950 rounded-[2rem] border border-zinc-900 p-8 h-[500px] flex flex-col items-center justify-center relative overflow-hidden group">
               <AnimatePresence mode="wait">
                {screenshot ? (
                  <motion.div 
                    key="screenshot"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full h-full flex flex-col"
                  >
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-4 flex items-center gap-2">
                       <Camera className="w-3 h-3" /> Visual Evidence Capture
                    </div>
                    <div className="flex-grow rounded-xl overflow-hidden border border-zinc-800 bg-black">
                       <img src={`data:image/png;base64,${screenshot}`} alt="Detonation Screenshot" className="w-full h-full object-contain" />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center space-y-6"
                  >
                    <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mx-auto border border-zinc-800 shadow-inner">
                       {isDetonating ? <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" /> : <ShieldAlert className="w-8 h-8 text-zinc-700" />}
                    </div>
                    <div>
                      <h3 className="text-white font-bold tracking-tight">Neutral Ground</h3>
                      <p className="text-zinc-600 text-sm italic font-serif">Awaiting visual heuristics transmission.</p>
                    </div>
                  </motion.div>
                )}
               </AnimatePresence>

               {/* Analysis Overlay */}
               <AnimatePresence>
                {analysis && (
                  <motion.div 
                    layout
                    transition={{ layout: { type: "spring", bounce: 0.1, duration: 0.6 } }}
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    onClick={() => !isAnalysisExpanded && setIsAnalysisExpanded(true)}
                    className={`absolute ${isAnalysisExpanded ? 'inset-4 p-8 flex flex-col z-40 bg-black/95' : 'inset-x-4 bottom-4 p-6 z-20 cursor-pointer bg-black/90'} border border-white/10 rounded-2xl backdrop-blur-2xl shadow-2xl transition-colors hover:bg-black/100 overflow-hidden`}
                  >
                    <motion.div layout className="flex items-start justify-between mb-4">
                       <motion.div layout>
                          <motion.div layout className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-1 ${analysis.riskScore > 50 ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                             {analysis.riskScore > 50 ? <ShieldAlert className="w-2.5 h-2.5" /> : <ShieldCheck className="w-2.5 h-2.5" />}
                             {analysis.verdict}
                          </motion.div>
                          <motion.h4 layout className={`text-white font-black uppercase tracking-tighter transition-all duration-500 ${isAnalysisExpanded ? 'text-3xl mb-4' : 'text-xl'}`}>PHISHING ANALYSIS</motion.h4>
                       </motion.div>
                       <motion.div layout className="flex items-start gap-6">
                         <motion.div layout className="text-right">
                            <motion.div layout className={`font-black text-white transition-all duration-500 ${isAnalysisExpanded ? 'text-4xl' : 'text-2xl'}`}>{analysis.riskScore}</motion.div>
                            <motion.div layout className="text-[8px] font-black text-zinc-600 uppercase tracking-widest leading-none">Risk Score</motion.div>
                         </motion.div>
                         <AnimatePresence>
                           {isAnalysisExpanded && (
                             <motion.button 
                               initial={{ opacity: 0, scale: 0.8 }}
                               animate={{ opacity: 1, scale: 1 }}
                               exit={{ opacity: 0, scale: 0.8 }}
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setIsAnalysisExpanded(false);
                               }}
                               className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                             >
                               <X className="w-5 h-5 text-zinc-400 hover:text-white" />
                             </motion.button>
                           )}
                         </AnimatePresence>
                       </motion.div>
                    </motion.div>
                    <motion.div layout className="relative flex-grow overflow-hidden">
                      <AnimatePresence mode="popLayout">
                        <motion.div
                          key={isAnalysisExpanded ? 'expanded' : 'collapsed'}
                          initial={{ opacity: 0, filter: 'blur(4px)' }}
                          animate={{ opacity: 1, filter: 'blur(0px)' }}
                          exit={{ opacity: 0, filter: 'blur(4px)' }}
                          transition={{ duration: 0.3 }}
                          className={`text-zinc-400 italic font-serif leading-relaxed ${isAnalysisExpanded ? 'text-base h-full overflow-y-auto mb-8 pr-4' : 'text-xs mb-4 line-clamp-3'}`}
                        >
                          {analysis.reason}
                        </motion.div>
                      </AnimatePresence>
                    </motion.div>
                    <motion.div layout className="h-1.5 bg-zinc-900 rounded-full overflow-hidden shrink-0 mt-auto">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${analysis.riskScore}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full ${analysis.riskScore > 50 ? 'bg-red-500' : 'bg-cyan-500'}`}
                       />
                    </motion.div>
                  </motion.div>
                )}
               </AnimatePresence>

               {error && (
                 <div className="absolute inset-5 bg-red-500/90 flex items-center justify-center rounded-2xl p-8 text-center backdrop-blur-sm z-30">
                    <div className="space-y-4">
                       <ShieldAlert className="w-12 h-12 text-white mx-auto" />
                       <h3 className="text-white font-black text-2xl uppercase tracking-tighter">DETONATION FAILED</h3>
                       <p className="text-white/80 text-sm font-mono">{error}</p>
                       <button onClick={() => setError(null)} className="bg-white text-red-500 px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">Retry</button>
                    </div>
                 </div>
               )}
            </div>
          </motion.div>
        </div>

        {/* Feature Cards */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
           {[
             { icon: Cpu, name: 'Cloud Isolated', desc: 'Puppeteer node running in a sandboxed AWS Lambda container.' },
             { icon: Globe, name: 'Neutral IP', desc: 'Target link sees a generic data center fingerprint, not yours.' },
             { icon: Zap, name: 'Gemini Heuristics', desc: 'AI analyzes visual patterns to detect brand impersonation.' }
           ].map((feat, i) => (
             <motion.div 
              key={feat.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + (i * 0.1) }}
              className="p-6 bg-zinc-950 border border-zinc-900 rounded-2xl"
             >
                <feat.icon className="w-5 h-5 text-zinc-400 mb-3" />
                <h3 className="text-white font-bold text-sm mb-1">{feat.name}</h3>
                <p className="text-zinc-600 text-xs leading-relaxed">{feat.desc}</p>
             </motion.div>
           ))}
        </div>
      </div>
    </section>
  );
};
