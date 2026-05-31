import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Classes for the inner (3D-lifted) content wrapper — put padding/flex/layout here */
  contentClassName?: string;
  /** Max tilt in degrees */
  intensity?: number;
}

/**
 * TiltCard — interactive frosted-glass card that tilts in 3D toward the cursor
 * and reveals a soft cyan spotlight that follows the pointer. Pure CSS 3D + motion,
 * no extra deps. Matches Keepr's dark / cyan theme.
 */
export const TiltCard: React.FC<TiltCardProps> = ({ children, className = '', contentClassName = '', intensity = 10 }) => {
  const ref = useRef<HTMLDivElement>(null);

  // Normalised pointer position (-0.5 .. 0.5)
  const px = useMotionValue(0);
  const py = useMotionValue(0);

  // Spotlight position in %
  const sx = useMotionValue(50);
  const sy = useMotionValue(50);

  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [intensity, -intensity]), {
    stiffness: 200,
    damping: 18
  });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-intensity, intensity]), {
    stiffness: 200,
    damping: 18
  });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    px.set(x - 0.5);
    py.set(y - 0.5);
    sx.set(x * 100);
    sy.set(y * 100);
  };

  const handleLeave = () => {
    px.set(0);
    py.set(0);
    sx.set(50);
    sy.set(50);
  };

  const spotlight = useTransform(
    [sx, sy],
    ([x, y]) =>
      `radial-gradient(circle at ${x}% ${y}%, rgba(6,182,212,0.15), transparent 55%)`
  );

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d', transformPerspective: 1000 }}
      whileHover={{ scale: 1.015 }}
      transition={{ scale: { duration: 0.2 } }}
      className={`group relative rounded-3xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl overflow-hidden transition-colors hover:border-cyan-500/40 ${className}`}
    >
      {/* Cursor-tracked spotlight */}
      <motion.div
        style={{ background: spotlight }}
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
      />
      {/* Top sheen */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent pointer-events-none" />
      {/* Content lifted in 3D space */}
      <div style={{ transform: 'translateZ(40px)' }} className={`relative h-full ${contentClassName}`}>
        {children}
      </div>
    </motion.div>
  );
};

export default TiltCard;
