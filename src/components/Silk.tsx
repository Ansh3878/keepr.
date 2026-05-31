import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Silk — flowing silk background (React Bits "Silk"), implemented with raw three.js
 * so it runs on the project's existing `three` install (no extra deps / no peer conflicts).
 */

interface SilkProps {
  speed?: number;
  scale?: number;
  color?: string;
  noiseIntensity?: number;
  rotation?: number;
  className?: string;
  style?: React.CSSProperties;
}

const hexToRgb = (hex: string): [number, number, number] => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const int = parseInt(h, 16);
  return [((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255];
};

const VERTEX_SRC = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const FRAGMENT_SRC = `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec3  uColor;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uNoiseIntensity;
uniform vec2  uResolution;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2 r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2 rot = mat2(c, -s, s, c);
  return rot * uv;
}

void main() {
  float rnd = noise(gl_FragCoord.xy);

  // Aspect-correct the UVs so the silk pattern keeps the same scale/feel on any
  // viewport. Without this, a narrow (mobile/tablet) canvas squishes the pattern
  // because UVs run 0..1 regardless of the canvas proportions. We map UVs to a
  // centered space scaled by aspect, so the pattern density is stable.
  float aspect = uResolution.x / max(uResolution.y, 1.0);
  vec2 auv = vUv - 0.5;
  if (aspect > 1.0) {
    auv.x *= aspect;      // landscape: widen X space
  } else {
    auv.y /= aspect;      // portrait: widen Y space
  }

  vec2 uv = rotateUvs(auv * uScale, uRotation);
  vec2 tex = uv * uScale;
  float tOffset = uSpeed * uTime;

  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

  float pattern = 0.6 +
    0.4 * sin(5.0 * (tex.x + tex.y +
      cos(3.0 * tex.x + 5.0 * tex.y) +
      0.02 * tOffset) +
      sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

  vec4 col = vec4(uColor, 1.0) * vec4(pattern) - rnd / 15.0 * uNoiseIntensity;
  col.a = 1.0;
  gl_FragColor = col;
}
`;

const Silk: React.FC<SilkProps> = ({
  speed = 5,
  scale = 1,
  color = '#0b2a33',
  noiseIntensity = 1.5,
  rotation = 0,
  className = '',
  style = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const threeRef = useRef<any>(null);
  const propsRef = useRef({ speed, scale, color, noiseIntensity, rotation });
  propsRef.current = { speed, scale, color, noiseIntensity, rotation };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (err) {
      console.warn('WebGL not available for Silk background:', err);
      return;
    }

    // Mobile GPUs choke on full-screen fragment shaders at high DPR. Cap the
    // pixel ratio lower on small/touch screens to keep it smooth and avoid the
    // out-of-memory crashes that show up as a frozen/black background.
    const isMobile = typeof window !== 'undefined' &&
      (window.matchMedia?.('(pointer: coarse)').matches || window.innerWidth < 768);
    const maxDpr = isMobile ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(...hexToRgb(color)) },
      uSpeed: { value: speed },
      uScale: { value: scale },
      uRotation: { value: rotation },
      uNoiseIntensity: { value: noiseIntensity },
      uResolution: { value: new THREE.Vector2(1, 1) }
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SRC,
      fragmentShader: FRAGMENT_SRC,
      uniforms
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    const setSize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      uniforms.uResolution.value.set(w, h);
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(container);

    // ── Crash hardening ──────────────────────────────────────────────────
    // 1) WebGL context can be lost on mobile (memory pressure, tab switch).
    //    Without handling it the render loop throws every frame. Stop the loop
    //    on loss and resume on restore instead of crashing.
    // 2) Pause rendering when the background is off-screen or the tab is
    //    hidden — saves battery/GPU and prevents background memory buildup.
    let raf = 0;
    let running = true;
    let visible = true;
    let contextLost = false;

    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (!running || !visible || contextLost) return;
      const p = propsRef.current;
      uniforms.uTime.value = clock.getElapsedTime();
      uniforms.uSpeed.value = p.speed;
      uniforms.uScale.value = p.scale;
      uniforms.uRotation.value = p.rotation;
      uniforms.uNoiseIntensity.value = p.noiseIntensity;
      uniforms.uColor.value.set(...hexToRgb(p.color));
      try {
        renderer.render(scene, camera);
      } catch (err) {
        // Bail out gracefully rather than spamming errors / crashing the page.
        console.warn('Silk render error, stopping background:', err);
        running = false;
      }
    };

    const onContextLost = (e: Event) => {
      e.preventDefault(); // tells the browser we'll handle restoration
      contextLost = true;
    };
    const onContextRestored = () => {
      contextLost = false;
      setSize();
    };
    canvas.addEventListener('webglcontextlost', onContextLost as EventListener, false);
    canvas.addEventListener('webglcontextrestored', onContextRestored as EventListener, false);

    const onVisibility = () => { running = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', onVisibility);

    // Pause when the hero background scrolls out of view.
    const io = new IntersectionObserver(
      (entries) => { visible = entries[0]?.isIntersecting ?? true; },
      { threshold: 0 }
    );
    io.observe(container);

    raf = requestAnimationFrame(animate);

    threeRef.current = { renderer, ro, raf, material, quad };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onContextLost as EventListener);
      canvas.removeEventListener('webglcontextrestored', onContextRestored as EventListener);
      quad.geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
      threeRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden ${className}`}
      style={style}
      aria-label="Silk animated background"
    />
  );
};

export default Silk;
