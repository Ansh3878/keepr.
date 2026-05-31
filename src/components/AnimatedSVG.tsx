/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Minimal card illustration — a single Lucide icon with a soft cyan glow.
 * Matches the rest of the site's icon language and palette.
 */

import React from 'react';
import { Shield, ScanSearch, Zap, Lock, Box } from 'lucide-react';

export type SVGKind = 'shield' | 'scanner' | 'lightning' | 'chambers' | 'sandbox';

interface AnimatedSVGProps {
  kind: SVGKind;
}

const ICON_MAP: Record<SVGKind, React.ElementType> = {
  shield: Shield,
  scanner: ScanSearch,
  lightning: Zap,
  chambers: Lock,
  sandbox: Box
};

export const AnimatedSVG: React.FC<AnimatedSVGProps> = ({ kind }) => {
  const Icon = ICON_MAP[kind];

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Single soft cyan glow behind the icon */}
      <div className="absolute w-32 h-32 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

      {/* The icon */}
      <Icon
        className="relative z-10 text-cyan-400"
        strokeWidth={1.25}
        size={88}
        style={{ filter: 'drop-shadow(0 6px 18px rgba(6, 182, 212, 0.4))' }}
      />
    </div>
  );
};

export default AnimatedSVG;
