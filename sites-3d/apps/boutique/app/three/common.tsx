"use client";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from "react";
import { blobShadow } from "./textures";

export type ModelProps = {
  c: Record<string, string>;
  opts: Record<string, string>;
  explode: MutableRefObject<number>;
  live?: boolean;
};

export const reducedMotion = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Valeur 0..1 amortie vers la cible (vue éclatée). */
export function useExplode(target: boolean) {
  // animation basée sur le temps réel (indépendante du nombre d'images par seconde)
  const v = useRef(0);
  const anim = useRef({ from: 0, t0: 0 });
  const DUR = 1100;
  useFrame((state) => {
    const t = target ? 1 : 0;
    if (v.current === t) return;
    const k = Math.min(1, (performance.now() - anim.current.t0) / DUR);
    v.current = k >= 1 ? t : anim.current.from + (t - anim.current.from) * k;
    state.invalidate();
  });
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    anim.current = { from: v.current, t0: performance.now() };
    invalidate();
  }, [target, invalidate]);
  return v;
}

/** Groupe qui se décale de `off` × explode. */
export function Part({ e, off, children, rot }: { e: MutableRefObject<number>; off: [number, number, number]; rot?: [number, number, number]; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!g.current) return;
    const k = easeInOut(e.current);
    g.current.position.set(off[0] * k, off[1] * k, off[2] * k);
    if (rot) g.current.rotation.set(rot[0] * k, rot[1] * k, rot[2] * k);
  });
  return <group ref={g}>{children}</group>;
}

/** Libère les BufferGeometry créées à la main (useMemo) : R3F ne dispose que ce qu'il construit lui-même. */
export function disposeGeometries(o: unknown) {
  if (o instanceof THREE.BufferGeometry) o.dispose();
  else if (Array.isArray(o)) o.forEach(disposeGeometries);
  else if (o && typeof o === "object") for (const v of Object.values(o)) if (v instanceof THREE.BufferGeometry || Array.isArray(v)) disposeGeometries(v);
}

/** useMemo de géométries + dispose au démontage (ou quand les dépendances changent). */
export function useGeometries<T>(factory: () => T, deps: unknown[] = []): T {
  const v = useMemo(factory, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => disposeGeometries(v), [v]);
  return v;
}

export function lathe(points: [number, number][], segments = 64) {
  const g = new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments);
  g.computeVertexNormals();
  return g;
}

/** Profil lissé (spline) pour lathe. */
export function smoothProfile(points: [number, number][], n = 48): [number, number][] {
  const curve = new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y)));
  return curve.getPoints(n).map((p) => [Math.max(0, p.x), p.y]);
}

/** Cylindre orienté entre deux points. */
export function Rod({ from, to, r = 0.02, r2, children, seg = 16 }: { from: THREE.Vector3Tuple; to: THREE.Vector3Tuple; r?: number; r2?: number; seg?: number; children: ReactNode }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const d = b.clone().sub(a);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    return { pos: a.clone().add(b).multiplyScalar(0.5), quat: q, len: d.length() };
  }, [from, to]);
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[r2 ?? r, r, len, seg]} />
      {children}
    </mesh>
  );
}

export function Shadow({ scale = 1.6, opacity = 0.55, x = 0, z = 0 }: { scale?: number | [number, number]; opacity?: number; x?: number; z?: number }) {
  const tex = useMemo(() => blobShadow(), []);
  const s = Array.isArray(scale) ? scale : [scale, scale];
  return (
    <mesh rotation-x={-Math.PI / 2} position={[x, 0.001, z]} renderOrder={-1}>
      <planeGeometry args={[s[0], s[1]]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
