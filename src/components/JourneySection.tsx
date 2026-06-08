import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatedSVG, SVGKind } from './AnimatedSVG';

interface CardItem {
  id: number;
  title: string;
  description: string;
  badge?: string;
  graphic: React.ReactNode;
}

// Scene wrapper — soft cyan glow + the animated SVG illustration
const IsoScene: React.FC<{ shape: SVGKind }> = ({ shape }) => (
  <div className="relative w-full h-full flex items-center justify-center">
    {/* Ambient cyan glow - radial gradient for perfect blending */}
    <div className="absolute w-64 h-64 rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.12)_0%,rgba(6,182,212,0)_70%)] pointer-events-none" />
    <div className="absolute w-48 h-48 rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.08)_0%,rgba(6,182,212,0)_70%)] pointer-events-none" />

    {/* Animated SVG */}
    <div className="relative z-10 w-[220px] h-[220px]">
      <AnimatedSVG kind={shape} />
    </div>
  </div>
);

// A single carousel card. The OUTER layer handles the coverflow slide
// (x / scale / opacity). The INNER layer handles a cursor-tracked 3D tilt
// that ONLY engages while this card is the active (top/center) one — so
// whichever card is on top is the one that tilts toward the cursor.
interface CarouselCardProps {
  card: CardItem;
  x: number;
  scale: number;
  opacity: number;
  zIndex: number;
  isActive: boolean;
  isWrapping: boolean;
  onClick: () => void;
}

const CarouselCard: React.FC<CarouselCardProps> = ({
  card, x, scale, opacity, zIndex, isActive, isWrapping, onClick
}) => {
  const tiltRef = useRef<HTMLDivElement>(null);

  // Normalised pointer position (-0.5 .. 0.5)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  // Spotlight position in %
  const sx = useMotionValue(50);
  const sy = useMotionValue(50);

  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [9, -9]), {
    stiffness: 220,
    damping: 18
  });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), {
    stiffness: 220,
    damping: 18
  });

  const spotlight = useTransform(
    [sx, sy],
    ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(6,182,212,0.14), transparent 55%)`
  );

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive) return; // only the top card tilts
    const rect = tiltRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    mx.set(nx - 0.5);
    my.set(ny - 0.5);
    sx.set(nx * 100);
    sy.set(ny * 100);
  };

  const resetTilt = () => {
    mx.set(0);
    my.set(0);
    sx.set(50);
    sy.set(50);
  };

  // When this card stops being active, snap the tilt back to flat.
  useEffect(() => {
    if (!isActive) resetTilt();
  }, [isActive]);

  return (
    <motion.div
      key={card.id}
      style={{ zIndex, willChange: 'transform' }}
      animate={{ x, scale, opacity }}
      transition={
        isWrapping
          ? { type: 'tween', duration: 0 }
          : { type: 'tween', duration: 0.2, ease: [0.4, 0, 0.2, 1] }
      }
      onClick={onClick}
      className="absolute w-full h-[405px] md:h-[425px]"
    >
      {/* Inner 3D-tilt layer — engages only when this card is active */}
      <motion.div
        ref={tiltRef}
        onMouseMove={handleMove}
        onMouseLeave={resetTilt}
        style={
          isActive
            ? { rotateX, rotateY, transformStyle: 'preserve-3d', transformPerspective: 900 }
            : undefined
        }
        className={`relative w-full h-full rounded-[32px] cursor-pointer group flex flex-col justify-between px-6 pt-6 pb-9 md:px-8 md:pt-7 md:pb-11 select-none overflow-hidden ${isActive
          ? 'bg-zinc-900 border border-cyan-500/30 shadow-[0_25px_60px_-10px_rgba(6,182,212,0.22)]'
          : 'bg-transparent border-0 hover:opacity-90'
          }`}
      >
        {/* Cursor-tracked spotlight (active card only) */}
        {isActive && (
          <motion.div
            style={{ background: spotlight }}
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20"
          />
        )}

        {/* Visual ambient reflection glow inside cards */}
        {isActive && (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(6,182,212,0.08),transparent_50%)] pointer-events-none animate-pulse" />
        )}

        {/* Subtle top edge glow highlight to simulate the premium rim light */}
        {isActive && (
          <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent z-20" />
        )}

        {/* Card graphic viewport */}
        <div className="relative flex-1 w-full flex items-center justify-center min-h-[160px] pb-2 z-10">
          {card.graphic}

          {/* Bottom fade only — keeps the graphic legible without a hard rectangle */}
          {isActive && (
            <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none z-20" />
          )}
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
    </motion.div>
  );
};

export const JourneySection: React.FC = () => {
  const cards: CardItem[] = [
    {
      id: 1,
      title: "High-Level Security",
      description: "Protected with client-side multi-layer AES-256 encryption and advanced multi-factor credentials.",
      badge: "Cryptoguard",
      graphic: (
        <IsoScene shape="shield" />
      )
    },
    {
      id: 2,
      title: "Threat Analysis",
      description: "Real-time automated scanning and sandbox insight telemetry processed via integrated secure models.",
      badge: "Real-time AI",
      graphic: (
        <IsoScene shape="scanner" />
      )
    },
    {
      id: 3,
      title: "Fast Encryptions",
      description: "Quickly package and seal files locally inside sandboxes with zero performance lag or latency.",
      badge: "Instant Speed",
      graphic: (
        <IsoScene shape="lightning" />
      )
    },
    {
      id: 4,
      title: "Multi-Chamber Vaults",
      description: "Orchestrate multi-chamber folders locally and manage your repositories with absolute directory sovereignty.",
      badge: "Sovereign Files",
      graphic: (
        <IsoScene shape="chambers" />
      )
    },
    {
      id: 5,
      title: "Secure Sandboxes",
      description: "Decrypt and read files locally in virtual device memory. Data never touches remote cloud servers.",
      badge: "Zero-Knowledge",
      graphic: (
        <IsoScene shape="sandbox" />
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
    setPrevActiveIndex(activeIndex);
    setActiveIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleNext = () => {
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

      {/* Soft top depth gradient so the upper aurora region melts into Journey */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none" />

      {/* Background ambient lighting */}
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-950/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_30%,rgba(6,182,212,0.04),transparent_100%)] pointer-events-none" />

      {/* Soft bottom depth gradient toward footer area */}
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

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
        <div className="relative w-[300px] md:w-[350px] h-[400px] flex items-center justify-center" style={{ perspective: 1200 }}>
          {cards.map((card, idx) => {
            const { x, scale, opacity, zIndex, isActive } = getCardProps(idx);

            const prevOffset = getCardOffset(idx, prevActiveIndex);
            const currentOffset = getCardOffset(idx, activeIndex);
            const isWrapping = Math.abs(currentOffset - prevOffset) > 2;

            return (
              <CarouselCard
                key={card.id}
                card={card}
                x={x}
                scale={scale}
                opacity={opacity}
                zIndex={zIndex}
                isActive={isActive}
                isWrapping={isWrapping}
                onClick={() => {
                  if (!isActive) {
                    setPrevActiveIndex(activeIndex);
                    setActiveIndex(idx);
                  }
                }}
              />
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
