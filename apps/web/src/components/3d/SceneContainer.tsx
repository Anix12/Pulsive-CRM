'use client';

import { Suspense, useMemo, forwardRef, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Component, type ErrorInfo } from 'react';

// A WebGL failure (blocked context, driver issue, an old/locked-down browser) must never
// take the rest of the page down with it — this scene is decorative, never load-bearing.
class Canvas3DErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[3d] scene failed to render, hiding decorative canvas', error, info);
    }
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export interface SceneContainerProps {
  children: ReactNode;
  className?: string;
  /** Caps device pixel ratio to keep the draw cost predictable on high-DPI/mobile screens. */
  maxDpr?: number;
  /** Field of view in degrees for the default perspective camera. */
  fov?: number;
}

/**
 * Shared, lightweight Canvas shell for every decorative 3D scene in the app.
 * - Purely decorative by default: pointer-events are left to the caller's wrapper (usually
 *   `pointer-events-none` so the scene never intercepts clicks meant for real UI).
 * - `frameloop="demand"` is intentionally NOT forced here since ambient idle motion needs a
 *   continuous loop; individual scenes stay cheap (low poly count, no shadows/postprocessing)
 *   so an "always" loop remains inexpensive.
 * - Antialiasing is on but capped `dpr` avoids full-resolution rendering on high-DPI displays,
 *   which is the single biggest GPU cost lever for a scene this simple.
 */
export const SceneContainer = forwardRef<HTMLDivElement, SceneContainerProps>(function SceneContainer(
  { children, className, maxDpr = 1.75, fov = 45 },
  ref,
) {
  const dpr = useMemo<[number, number]>(() => [1, maxDpr], [maxDpr]);

  return (
    <div ref={ref} className={className} aria-hidden="true">
      <Canvas3DErrorBoundary>
        <Suspense fallback={null}>
          <Canvas
            dpr={dpr}
            gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
            camera={{ position: [0, 0, 8], fov }}
            style={{ width: '100%', height: '100%' }}
          >
            {children}
          </Canvas>
        </Suspense>
      </Canvas3DErrorBoundary>
    </div>
  );
});
