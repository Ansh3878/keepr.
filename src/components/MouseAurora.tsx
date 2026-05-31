/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

interface MouseAuroraProps {
  /**
   * Layout strategy:
   *   "fill"     — fills the entire positioned parent (top:0; bottom:0). Use this to
   *                bound the aurora to a specific page region.
   *   "fixed"    — covers the entire viewport and stays put while scrolling.
   *   "absolute" — anchored to the top of the parent with an explicit `height`.
   */
  position?: 'fill' | 'fixed' | 'absolute';
  /** Height when position="absolute". Ignored otherwise. */
  height?: string;
  /** Glow color (rgba/hex). Defaults to brand cyan with low alpha. */
  color?: string;
  /** Diameter of the glow blob. Defaults to 700px. */
  size?: number;
  /** Show the subtle grid behind the aurora. */
  grid?: boolean;
  /** Show a soft fade-to-black at the bottom edge for clean hand-off to next section. */
  fade?: boolean;
}

/**
 * MouseAurora — a soft cursor-tracking glow used as a page background accent.
 *
 * Listens on the window so the cursor influences the glow even while hovering child
 * content. Pointer-events are disabled, so it never blocks UI.
 *
 * The aurora's position is computed in element-local coordinates, which means it
 * follows the cursor naturally as you scroll through the bounded region.
 */
export const MouseAurora: React.FC<MouseAuroraProps> = ({
  position = 'fill',
  height = '110vh',
  color = 'rgba(6, 182, 212, 0.10)',
  size = 700,
  grid = false,
  fade
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isFixed = position === 'fixed';
  const isFill = position === 'fill';
  const showFade = fade ?? !isFixed; // fade by default when bounded

  // Touch devices have no cursor — tracking pointer movement is pointless and
  // the constant repaint of a huge blurred blob is a real perf/battery cost
  // (and a jank/crash source on weaker mobile GPUs). Detect once.
  const isTouch = typeof window !== 'undefined' &&
    (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const sx = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 60, damping: 20, mass: 0.6 });

  const left = useTransform(sx, v => `${v}px`);
  const top = useTransform(sy, v => `${v}px`);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    // Center the glow before pointer moves so the page doesn't open at 0,0
    const rect0 = el.getBoundingClientRect();
    mx.set(rect0.width / 2);
    my.set(Math.min(rect0.height / 3, 400));

    // On touch devices, leave the glow centered and skip the listener entirely.
    if (isTouch) return;

    const handle = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      mx.set(e.clientX - rect.left);
      my.set(e.clientY - rect.top);
    };

    window.addEventListener('pointermove', handle, { passive: true });
    return () => window.removeEventListener('pointermove', handle);
  }, [mx, my, isTouch]);

  // Container styling — fill, fixed-viewport, or banded
  const containerClass = isFixed
    ? 'fixed inset-0'
    : isFill
      ? 'absolute inset-0'
      : 'absolute inset-x-0 top-0';

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className={`${containerClass} overflow-hidden pointer-events-none z-0`}
      style={!isFixed && !isFill ? { height } : undefined}
    >
      {/* Optional grid backdrop */}
      {grid && (
        <div
          className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,#000_40%,transparent_100%)]"
        />
      )}

      {/* Cursor-following aurora */}
      <motion.div
        style={{
          left,
          top,
          width: size,
          height: size,
          background: color,
          filter: 'blur(140px)',
          x: '-50%',
          y: '-50%'
        }}
        className="absolute rounded-full"
      />

      {/* Soft depth gradients at top and bottom so the aurora region
          melts into adjacent sections instead of showing a hard seam. */}
      {showFade && (
        <>
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black via-black/70 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/70 to-transparent pointer-events-none" />
        </>
      )}
    </div>
  );
};

export default MouseAurora;
