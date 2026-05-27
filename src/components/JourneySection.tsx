import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Shield, Zap, Folder, Eye, Lock, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface CardItem {
  id: number;
  title: string;
  description: string;
  badge?: string;
  graphic: React.ReactNode;
}

export const JourneySection: React.FC = () => {
  const cards: CardItem[] = [
    {
      id: 1,
      title: "High-Level Security",
      description: "Protected with client-side multi-layer AES-256 encryption and advanced multi-factor credentials.",
      badge: "Cryptoguard",
      graphic: (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {/* Radial cyan ambient light */}
          <div className="absolute w-44 h-44 rounded-full bg-cyan-500/10 blur-2xl" />
          <div className="absolute w-32 h-32 rounded-full bg-cyan-400/5 blur-xl" />

          {/* Concentric rings/orbits */}
          <div className="absolute w-48 h-48 border border-white/5 rounded-full scale-y-[0.3] rotate-12 animate-[spin_20s_linear_infinite]" />
          <div className="absolute w-36 h-36 border border-cyan-500/10 rounded-full scale-y-[0.35] -rotate-12 animate-[spin_12s_linear_infinite]" />
          <div className="absolute w-28 h-28 border border-cyan-400/15 rounded-full scale-y-[0.4] rotate-45 animate-[spin_8s_linear_infinite]" />

          {/* Pulsing glow points */}
          <div
            className="absolute top-[30%] left-[20%] w-2 h-2 rounded-full bg-cyan-400/60"
            style={{ animation: 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite' }}
          />
          <div
            className="absolute bottom-[25%] right-[25%] w-1.5 h-1.5 rounded-full bg-cyan-400/40"
            style={{ animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
          />

          {/* 3D Shield */}
          <div className="relative z-10 scale-110 flex items-center justify-center">
            {/* Outline Shield Layer with custom drop shadow */}
            <div className="absolute text-cyan-500/10 blur-[6px] transform scale-110 select-none">
              <Shield className="w-20 h-20 fill-cyan-500/5" strokeWidth={1} />
            </div>

            {/* Front Metallic Shield Layer */}
            <div className="relative text-white drop-shadow-[0_10px_30px_rgba(6,182,212,0.25)]">
              <Shield className="w-16 h-16 fill-transparent text-zinc-100" strokeWidth={1.5} />
            </div>

            {/* Internal Core Glowing Lock Graphic */}
            <div className="absolute text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]">
              <Lock className="w-6 h-6 fill-transparent" strokeWidth={2.5} />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Threat Analysis",
      description: "Real-time automated scanning and sandbox insight telemetry processed via integrated secure models.",
      badge: "Real-time AI",
      graphic: (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {/* Radial cyan ambient light */}
          <div className="absolute w-44 h-44 rounded-full bg-cyan-500/10 blur-2xl" />

          {/* Grid Perspective Matrix */}
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_60%,transparent_100%)] rotate-12 scale-125" />

          {/* Shooting light lines/coordinates */}
          <div className="absolute w-52 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent -rotate-[15deg] translate-y-[-10px]" />
          <div className="absolute w-52 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent rotate-[30deg] translate-y-[20px]" />

          {/* Neon AI Processor Microchip */}
          <div className="relative z-10 w-20 h-20 bg-[#0c0d10]/95 rounded-2xl border border-cyan-500/20 flex items-center justify-center shadow-2xl drop-shadow-[0_10px_25px_rgba(6,182,212,0.2)]">
            {/* Pin elements extending outwards */}
            <div className="absolute -top-1.5 left-1/4 w-0.5 h-1.5 bg-cyan-500/40" />
            <div className="absolute -top-1.5 left-2/4 w-0.5 h-1.5 bg-cyan-500/40" />
            <div className="absolute -top-1.5 left-3/4 w-0.5 h-1.5 bg-cyan-500/40" />
            <div className="absolute -bottom-1.5 left-1/4 w-0.5 h-1.5 bg-cyan-500/40" />
            <div className="absolute -bottom-1.5 left-2/4 w-0.5 h-1.5 bg-cyan-500/40" />
            <div className="absolute -bottom-1.5 left-3/4 w-0.5 h-1.5 bg-cyan-500/40" />
            <div className="absolute -left-1.5 top-1/4 w-1.5 h-0.5 bg-cyan-500/40" />
            <div className="absolute -left-1.5 top-2/4 w-1.5 h-0.5 bg-cyan-500/40" />
            <div className="absolute -left-1.5 top-3/4 w-1.5 h-0.5 bg-cyan-500/40" />
            <div className="absolute -right-1.5 top-1/4 w-1.5 h-0.5 bg-cyan-500/40" />
            <div className="absolute -right-1.5 top-2/4 w-1.5 h-0.5 bg-cyan-500/40" />
            <div className="absolute -right-1.5 top-3/4 w-1.5 h-0.5 bg-cyan-500/40" />

            <div className="absolute inset-1 rounded-xl bg-cyan-500/5" />

            {/* Center glowing AI core */}
            <div className="flex flex-col items-center justify-center">
              <span className="text-[15px] font-mono font-black text-cyan-200 tracking-tight">AI</span>
              {/* Pulsing core light */}
              <div
                className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-0.5"
                style={{ animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
              />
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Fast Encryptions",
      description: "Quickly package and seal files locally inside sandboxes with zero performance lag or latency.",
      badge: "Instant Speed",
      graphic: (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {/* Radial cyan ambient light */}
          <div className="absolute w-44 h-44 rounded-full bg-cyan-500/10 blur-2xl" />

          {/* Cosmic Gravity Well / Black Hole Orbits */}
          <div className="absolute w-48 h-48 border border-white/5 rounded-full scale-y-[0.35] rotate-[25deg] animate-[spin_24s_linear_infinite]" />
          <div className="absolute w-40 h-40 border-t border-b border-cyan-500/20 rounded-full scale-y-[0.35] rotate-[25deg] animate-[spin_15s_linear_infinite]" />
          <div className="absolute w-32 h-32 border-l border-r border-cyan-400/15 rounded-full scale-y-[0.35] rotate-[25deg] animate-[spin_9s_linear_infinite]" />

          {/* Central Deep Cosmic Core */}
          <div className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center">
            {/* Outer dark border */}
            <div className="absolute inset-0 rounded-full bg-[#08090c] border border-cyan-500/20 shadow-inner overflow-hidden flex items-center justify-center">
              {/* Gravity grid background */}
              <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-cyan-500/10 to-cyan-950/10" />
              <div className="w-12 h-12 rounded-full bg-[#0d0f12] border border-white/5 shadow-2xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white fill-cyan-400/20 drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]" />
              </div>
            </div>

            {/* Orbiting particles */}
            <div
              className="absolute w-2 h-2 rounded-full bg-white top-[20%] left-[25%] shadow-[0_0_10px_#ffffff] scale-75"
              style={{ animation: 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite' }}
            />
            <div
              className="absolute w-1.5 h-1.5 rounded-full bg-[#06b6d4] bottom-[30%] right-[20%] shadow-[0_0_10px_#06b6d4]"
              style={{ animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
            />
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Multi-Chamber Vaults",
      description: "Orchestrate multi-chamber folders locally and manage your repositories with absolute directory sovereignty.",
      badge: "Sovereign Files",
      graphic: (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {/* Ambient cyan shadow */}
          <div className="absolute w-44 h-44 rounded-full bg-cyan-500/5 blur-2xl" />

          <div className="absolute w-40 h-40 border border-white/5 rounded-full scale-y-[0.25] rotate-[10deg] animate-[spin_18s_linear_infinite]" />

          {/* Isometric stack of files/folders */}
          <div className="relative z-10 translate-y-[-5px]">
            {/* Back folder */}
            <div className="absolute w-18 h-12 bg-cyan-950/10 border border-cyan-500/10 rounded-lg transform -skew-x-[24deg] rotate-[12deg] translate-x-[-15px] translate-y-[-10px] opacity-40 blur-[0.5px]" />

            {/* Middle folder */}
            <div className="absolute w-18 h-12 bg-cyan-500/5 border border-cyan-500/20 rounded-lg transform -skew-x-[24deg] rotate-[12deg] translate-x-[-5px] translate-y-[-5px] opacity-60" />

            {/* Front Main Glass Folder */}
            <div className="relative w-20 h-14 bg-[#0a0c10]/80 border border-cyan-500/20 rounded-xl transform -skew-x-[24deg] rotate-[12deg] flex flex-col justify-between p-2.5 shadow-2xl backdrop-blur-sm group-hover:border-cyan-400 transition-colors">
              <div className="flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-cyan-400 shrink-0" strokeWidth={2} />
                <div className="w-8 h-1 bg-white/10 rounded-full" />
              </div>

              <div className="flex justify-between items-center mt-2">
                <div className="w-12 h-1 bg-cyan-400/20 rounded-full" />
                <div
                  className="w-2 h-2 rounded-full bg-cyan-400"
                  style={{ animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
                />
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: "Secure Sandboxes",
      description: "Decrypt and read files locally in virtual device memory. Data never touches remote cloud servers.",
      badge: "Zero-Knowledge",
      graphic: (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {/* Radial ambient glow */}
          <div className="absolute w-44 h-44 rounded-full bg-cyan-500/5 blur-2xl" />

          {/* Light Grid Orbits */}
          <div className="absolute w-48 h-48 border border-white/5 rounded-full scale-y-[0.4] rotate-[35deg] animate-[spin_30s_linear_infinite]" />
          <div className="absolute w-36 h-36 border border-white/5 rounded-full scale-y-[0.35] rotate-[20deg]" />

          {/* Smartphone viewport representation */}
          <div className="relative z-10 w-22 h-36 bg-[#08090c]/95 border border-cyan-500/20 rounded-2xl p-2.5 shadow-2xl flex flex-col justify-between transform rotate-[18deg] -skew-x-[12deg] drop-shadow-[0_15px_30px_rgba(6,182,212,0.15)]">
            {/* Screen Notch */}
            <div className="w-8 h-1.5 bg-zinc-900 rounded-full mx-auto border-t border-b border-white/5" />

            {/* Smart visual dials/metrics */}
            <div className="flex-1 mt-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-1.5 bg-white/20 rounded" />
                <Eye className="w-2.5 h-2.5 text-cyan-400" />
              </div>

              {/* Radial scanner */}
              <div className="w-full aspect-square rounded-lg border border-dashed border-cyan-500/20 bg-cyan-500/5 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent animate-[pan_2s_infinite_linear]" />
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>

              {/* Status block */}
              <div className="bg-[#101216] p-1 rounded-md border border-white/5 flex items-center gap-1">
                <div
                  className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                  style={{ animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
                />
                <div className="w-8 h-1 bg-cyan-500/20 rounded" />
              </div>
            </div>

            {/* Bottom Indicator */}
            <div className="w-6 h-0.5 bg-zinc-700 rounded-full mx-auto mt-1" />
          </div>
        </div>
      )
    }
  ];

  const [activeIndex, setActiveIndex] = useState(1); // Set Threat Analysis as default centered
  const [prevActiveIndex, setPrevActiveIndex] = useState(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getCardOffset = (cardIdx: number, activeIdx: number) => {
    let offset = cardIdx - activeIdx;
    if (offset < -2) offset += cards.length;
    if (offset > 2) offset -= cards.length;
    return offset;
  };

  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  // Auto-play — interval is NOT recreated on every slide change (activeIndex removed from deps)
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setPrevActiveIndex(activeIndexRef.current);
      setActiveIndex((prev) => (prev + 1) % cards.length);
    }, 5500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, cards.length]);

  const handlePrev = () => {
    setIsPlaying(false);
    setPrevActiveIndex(activeIndex);
    setActiveIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleNext = () => {
    setIsPlaying(false);
    setPrevActiveIndex(activeIndex);
    setActiveIndex((prev) => (prev + 1) % cards.length);
  };

  const getCardProps = (idx: number) => {
    let offset = idx - activeIndex;

    if (offset < -2) offset += cards.length;
    if (offset > 2) offset -= cards.length;

    const isActive = offset === 0;

    let x = 0;
    let scale = 1;
    let opacity = 1;
    let zIndex = 10;

    if (offset === 0) {
      x = 0; scale = 1.15; opacity = 1; zIndex = 30;
    } else if (offset === -1) {
      x = -280; scale = 0.82; opacity = 0.45; zIndex = 20;
    } else if (offset === 1) {
      x = 280; scale = 0.82; opacity = 0.45; zIndex = 20;
    } else if (offset === -2) {
      x = -480; scale = 0.65; opacity = 0; zIndex = 10;
    } else if (offset === 2) {
      x = 480; scale = 0.65; opacity = 0; zIndex = 10;
    }

    return { x, scale, opacity, zIndex, isActive };
  };

  return (
    <section className="relative py-28 px-6 overflow-hidden text-center flex flex-col items-center">

      {/* Top gradient blend — kills the visible border line */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black to-transparent z-20 pointer-events-none" />

      {/* Bottom gradient blend — kills the visible border line */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black to-transparent z-20 pointer-events-none" />

      {/* Background ambient lighting */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-950/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,rgba(6,182,212,0.04),transparent_100%)] pointer-events-none" />

      {/* Section Headings */}
      <div className="max-w-4xl mx-auto mb-16 relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="space-y-4"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white font-sans text-center leading-tight">
            Transform Your <span className="font-serif italic font-extralight opacity-60">Crypto Journey.</span>
          </h2>
          <p className="max-w-xl mx-auto text-base text-zinc-500 font-sans leading-relaxed text-center font-light">
            Experience enhanced security, zero-knowledge encryption, and local memory sandboxing built to protect your secure peer transfers.
          </p>
        </motion.div>
      </div>

      {/* Coverflow Container — no perspective, 2D transforms only for max perf */}
      <div
        className="relative w-full max-w-5xl h-[480px] flex items-center justify-center select-none"
        onMouseEnter={() => setIsPlaying(false)}
        onMouseLeave={() => setIsPlaying(true)}
      >
        {/* Left edge gradient mask — blends card edges into background */}
        <div className="absolute inset-y-0 left-0 w-32 md:w-48 bg-gradient-to-r from-black to-transparent z-30 pointer-events-none" />
        {/* Right edge gradient mask — blends card edges into background */}
        <div className="absolute inset-y-0 right-0 w-32 md:w-48 bg-gradient-to-l from-black to-transparent z-30 pointer-events-none" />
        {/* Navigation Arrows */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 md:px-10 z-40 pointer-events-none">
          <button
            onClick={handlePrev}
            className="w-11 h-11 rounded-full bg-zinc-950/80 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/40 flex items-center justify-center text-white transition-all cursor-pointer pointer-events-auto active:scale-90 shadow-2xl group"
            title="Previous"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform text-zinc-400 hover:text-white" />
          </button>

          <button
            onClick={handleNext}
            className="w-11 h-11 rounded-full bg-zinc-950/80 hover:bg-cyan-500/15 border border-white/10 hover:border-cyan-500/40 flex items-center justify-center text-white transition-all cursor-pointer pointer-events-auto active:scale-90 shadow-2xl group"
            title="Next"
          >
            <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform text-zinc-400 hover:text-white" />
          </button>
        </div>

        {/* 3D Core Card Slider Frame */}
        <div className="relative w-[300px] md:w-[350px] h-[400px] flex items-center justify-center">
          {cards.map((card, idx) => {
            const { x, scale, opacity, zIndex, isActive } = getCardProps(idx);

            const prevOffset = getCardOffset(idx, prevActiveIndex);
            const currentOffset = getCardOffset(idx, activeIndex);
            const isWrapping = Math.abs(currentOffset - prevOffset) > 2;

            return (
              <motion.div
                key={card.id}
                style={{ zIndex, willChange: 'transform' }}
                animate={{ x, scale, opacity }}
                transition={
                  isWrapping
                    ? { type: "tween", duration: 0 }
                    : { type: "tween", duration: 0.2, ease: [0.4, 0, 0.2, 1] }
                }
                onClick={() => {
                  if (!isActive) {
                    setIsPlaying(false);
                    setPrevActiveIndex(activeIndex);
                    setActiveIndex(idx);
                  }
                }}
                className={`absolute w-full h-[405px] md:h-[425px] rounded-[32px] cursor-pointer group flex flex-col justify-between px-6 pt-6 pb-9 md:px-8 md:pt-7 md:pb-11 select-none overflow-hidden border ${isActive
                    ? 'bg-zinc-900 border-cyan-500/30 shadow-[0_25px_60px_-10px_rgba(6,182,212,0.22)]'
                    : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700 hover:opacity-75'
                  }`}
              >
                {/* Visual ambient reflection glow inside cards */}
                {isActive && (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(6,182,212,0.08),transparent_50%)] pointer-events-none animate-pulse" />
                )}

                {/* Subtle top edge glow highlight to simulate the premium rim light */}
                {isActive && (
                  <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent z-20" />
                )}

                {/* Card graphic viewport */}
                <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden min-h-[160px] pb-2 z-10">
                  {card.graphic}

                  {/* Bottom fade only — no mask, keeps GPU load minimal */}
                  <div className={`absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t pointer-events-none z-20 ${isActive ? 'from-zinc-900 to-transparent' : 'from-zinc-950 to-transparent'
                    }`} />

                  {card.badge && (
                    <span className="absolute top-2 left-2 bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5 text-[9px] font-mono tracking-wider font-bold text-zinc-300 uppercase z-30">
                      {card.badge}
                    </span>
                  )}
                </div>

                {/* Content Details - left-aligned, spacious, and seamless to match reference */}
                <div className="space-y-2 text-left pb-1 select-none z-10 mt-auto">
                  <h3 className="text-lg md:text-xl font-bold font-sans text-white group-hover:text-cyan-400 transition-colors tracking-tight">
                    {card.title}
                  </h3>
                  <p className="text-xs md:text-sm text-zinc-400 font-sans leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Sliding dots navigation control */}
      <div className="flex items-center gap-2 mt-8 relative z-30">
        {cards.map((_, idx) => (
          <button
            key={idx}
            onClick={() => {
              setIsPlaying(false);
              setPrevActiveIndex(activeIndex);
              setActiveIndex(idx);
            }}
            className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeIndex
                ? 'w-6 bg-cyan-400'
                : 'w-1.5 bg-zinc-800 hover:bg-zinc-700'
              }`}
            title={`Slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* Optimized Earth Dome planetary curve boundary mirroring the reference images */}
      <div className="relative w-full aspect-[1440/140] sm:aspect-[1440/160] md:aspect-[1440/180] lg:aspect-[1440/195] mt-24 sm:mt-32 md:mt-44 lg:mt-52 xl:mt-60 overflow-visible flex justify-center pointer-events-none select-none">

        {/* Soft atmospheric ambient glow behind the peak of the planet for perfect background blending with no downward leak */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[90%] sm:w-[80%] h-[70px] sm:h-[110px] md:h-[140px] bg-cyan-950/30 blur-[60px] sm:blur-[90px] rounded-full" />
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[60%] sm:w-[50%] h-[50px] sm:h-[80px] md:h-[100px] bg-cyan-500/15 blur-[40px] sm:blur-[60px] rounded-full" />

        {/* Vector SVG Planet Dome with mathematically sharp, anti-aliased curves */}
        <div className="absolute top-[10%] w-[130%] sm:w-[120%] md:w-[115%] lg:w-[105%] max-w-[2200px] aspect-[1440/220] overflow-visible">
          <svg
            viewBox="0 0 1440 220"
            preserveAspectRatio="xMidYMin meet"
            className="w-full h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Vibrant neon rim stroke gradient blending outwards elegantly */}
              <linearGradient id="rimGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(6, 182, 212, 0.0)" />
                <stop offset="15%" stopColor="rgba(6, 182, 212, 0.35)" />
                <stop offset="50%" stopColor="rgba(6, 182, 212, 0.95)" />
                <stop offset="85%" stopColor="rgba(6, 182, 212, 0.35)" />
                <stop offset="100%" stopColor="rgba(6, 182, 212, 0.0)" />
              </linearGradient>

              {/* Underlying deep atmospheric glow gradient inside the dome body */}
              <linearGradient id="domeFillGradient" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="rgba(4, 15, 18, 0.95)" />
                <stop offset="25%" stopColor="rgba(2, 6, 8, 1.0)" />
                <stop offset="100%" stopColor="#000000" />
              </linearGradient>

              {/* Advanced multi-stage Glow filters to prevent chromatic banding and ensure soft vectors */}
              <filter id="glowFilter" x="-50%" y="-200%" width="200%" height="500%">
                <feGaussianBlur stdDeviation="24" result="blur1" />
                <feGaussianBlur stdDeviation="10" result="blur2" />
                <feGaussianBlur stdDeviation="3" result="blur3" />
                <feMerge>
                  <feMergeNode in="blur1" />
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur3" />
                </feMerge>
              </filter>
            </defs>

            {/* --- GLOW LAYER 1: BACKSTAGE ATMOSPHERIC GLOWS (Drawn first so they are behind/below the dome body) --- */}
            {/* Ultra Wide Soft atmospheric glow */}
            <path
              d="M 0,220 C 220,75 500,0 720,0 C 940,0 1220,75 1440,220"
              stroke="url(#rimGradient)"
              strokeWidth="70"
              strokeLinecap="round"
              opacity="0.3"
              style={{ filter: "url(#glowFilter)" }}
            />

            {/* Radiant Inner Glow to amplify overall luminance */}
            <path
              d="M 0,220 C 220,75 500,0 720,0 C 940,0 1220,75 1440,220"
              stroke="url(#rimGradient)"
              strokeWidth="32"
              strokeLinecap="round"
              opacity="0.6"
              style={{ filter: "url(#glowFilter)" }}
            />

            {/* Core Glow path with subpixel blur to guarantee zero jagging or choppy outlines */}
            <path
              d="M 0,220 C 220,75 500,0 720,0 C 940,0 1220,75 1440,220"
              stroke="url(#rimGradient)"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.85"
              style={{ filter: "url(#glowFilter)" }}
            />

            {/* --- SILHOUETTE LAYER 2: SOLID DARK ECLIPSE DOME (Drawn over the glows to perfectly cut off downward light) --- */}
            {/* Extended planet body silhouette with wider and deeper padding to fully block glowing light bleed below the planetary vector rim */}
            <path
              d="M -300,220 L 0,220 C 220,75 500,0 720,0 C 940,0 1220,75 1440,220 L 1740,220 L 1740,600 L -300,600 Z"
              fill="#000000"
              stroke="none"
            />

            {/* --- DETAIL LAYER 3: CRITICAL DEFINITION RIM (Drawn on top of the dome body for sharp, pristine edge quality) --- */}
            {/* Razor-sharp vector core highlight filament for perfect high-fidelity definition */}
            <path
              d="M 0,220 C 220,75 500,0 720,0 C 940,0 1220,75 1440,220"
              stroke="url(#rimGradient)"
              strokeWidth="1.8"
              strokeLinecap="round"
              opacity="0.95"
            />
          </svg>
        </div>

      </div>

    </section>
  );
};
