'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Conceptual metaphor only — these five nodes represent the shape of the CRM (Leads,
// Deals, Calls, Tasks, Campaigns) as a decorative network, not a chart. No counts, no
// business data: real numbers live in the metric cards, never in this scene.
const NODES = [
  { color: '#6366f1', radius: 3.1, speed: 0.09, offset: 0 },
  { color: '#9333ea', radius: 2.6, speed: -0.12, offset: 1.3 },
  { color: '#10b981', radius: 3.4, speed: 0.07, offset: 2.6 },
  { color: '#f59e0b', radius: 2.4, speed: -0.1, offset: 3.9 },
  { color: '#ec4899', radius: 3.0, speed: 0.11, offset: 5.2 },
] as const;

export interface CRMOrbNetworkProps {
  /** Mutable ref updated by the caller on pointer move — read per-frame, never via React state,
   *  so pointer movement never triggers a React re-render (only the R3F render loop reacts). */
  parallax: { current: { x: number; y: number } };
  /** Mutable ref updated by the caller from the dashboard's own scroll container (see
   *  useScrollProgress) — 0 at the top, easing to 1 as the hero band scrolls past. Read
   *  per-frame and damped locally, never via React state, for the same reason as `parallax`. */
  scrollProgress: { current: number };
  /** Disables idle rotation/orbiting entirely (prefers-reduced-motion). */
  reduceMotion: boolean;
}

// Exponential-damping rate for the scroll response (higher = snappier). 4 settles in
// roughly a quarter second — quick enough to feel connected to the scroll, slow enough
// that fast/jumpy scrolling never snaps the scene.
const SCROLL_DAMP_LAMBDA = 4;
// How much the formation eases back as the hero is scrolled past — kept small and
// additive to the existing idle rotation/parallax, never overwriting them.
const SCROLL_SCALE_EASE = 0.12; // scale: 1 -> 1 - 0.12 = 0.88
const SCROLL_SINK_DISTANCE = 0.4; // world units the group settles downward

export function CRMOrbNetwork({ parallax, scrollProgress, reduceMotion }: CRMOrbNetworkProps) {
  const groupRef = useRef<THREE.Group>(null);
  const nodeRefs = useRef<(THREE.Mesh | null)[]>([]);
  const lineRefs = useRef<(THREE.Line | null)[]>([]);
  const t = useRef(0);
  const smoothedScroll = useRef(0);

  const nodeGeometry = useMemo(() => new THREE.SphereGeometry(0.28, 16, 16), []);
  const coreGeometry = useMemo(() => new THREE.IcosahedronGeometry(1.4, 1), []);

  useFrame((_, delta) => {
    if (!reduceMotion) t.current += delta;

    // Scroll-driven "settle": damp toward the latest scroll progress so fast/jumpy
    // scrolling eases smoothly rather than snapping the scene. This is the Scroll World
    // "scroll drives time" idea, borrowed natively — no video, no external pipeline —
    // as a small, separate response layered on top of the existing idle rotation and
    // pointer parallax below, never replacing them. Frozen at 0 under reduced motion
    // (the hook itself also stops tracking scroll in that case).
    if (!reduceMotion) {
      smoothedScroll.current = THREE.MathUtils.damp(smoothedScroll.current, scrollProgress.current, SCROLL_DAMP_LAMBDA, delta);
    }

    if (groupRef.current) {
      // Gentle idle drift plus pointer parallax — parallax is applied directly (not
      // accumulated) so the scene never drifts away from center when the pointer stops.
      const idleY = reduceMotion ? 0 : Math.sin(t.current * 0.15) * 0.08;
      const idleX = reduceMotion ? 0 : Math.cos(t.current * 0.1) * 0.05;
      groupRef.current.rotation.y = idleY + parallax.current.x;
      groupRef.current.rotation.x = idleX + parallax.current.y;

      // Settle response: the formation eases back slightly and sinks as the hero band
      // scrolls past — a subtle cue that the system has been seen, not a camera cut.
      const settle = smoothedScroll.current;
      const scale = 1 - settle * SCROLL_SCALE_EASE;
      groupRef.current.scale.setScalar(scale);
      groupRef.current.position.y = -settle * SCROLL_SINK_DISTANCE;
    }

    if (!reduceMotion) {
      NODES.forEach((node, i) => {
        const angle = t.current * node.speed + node.offset;
        const mesh = nodeRefs.current[i];
        if (mesh) {
          mesh.position.set(Math.cos(angle) * node.radius, Math.sin(angle * 0.6) * 0.6, Math.sin(angle) * node.radius);
        }
        const line = lineRefs.current[i];
        if (line && mesh) {
          const positions = line.geometry.attributes.position as THREE.BufferAttribute;
          positions.setXYZ(1, mesh.position.x, mesh.position.y, mesh.position.z);
          positions.needsUpdate = true;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 4, 6]} intensity={0.6} />

      {/* Central translucent core — the CRM system itself */}
      <mesh geometry={coreGeometry}>
        <meshStandardMaterial color="#818cf8" wireframe transparent opacity={0.35} />
      </mesh>
      <mesh scale={0.92}>
        <sphereGeometry args={[1.4, 24, 24]} />
        <meshStandardMaterial color="#a5b4fc" transparent opacity={0.08} />
      </mesh>

      {/* Conceptual nodes + thin connecting lines back to the core */}
      {NODES.map((node, i) => {
        const initialAngle = node.offset;
        const initial: [number, number, number] = [
          Math.cos(initialAngle) * node.radius,
          Math.sin(initialAngle * 0.6) * 0.6,
          Math.sin(initialAngle) * node.radius,
        ];
        return (
          <group key={i}>
            <mesh
              ref={(el) => { nodeRefs.current[i] = el; }}
              geometry={nodeGeometry}
              position={initial}
            >
              <meshBasicMaterial color={node.color} toneMapped={false} />
            </mesh>
            {/* `threeLine`, not `line` — R3F reserves the bare `<line>` JSX tag for the SVG
                element, since it collides with THREE.Line otherwise. */}
            <threeLine ref={(el) => { lineRefs.current[i] = el as unknown as THREE.Line; }}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array([0, 0, 0, ...initial]), 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial color={node.color} transparent opacity={0.25} />
            </threeLine>
          </group>
        );
      })}
    </group>
  );
}
