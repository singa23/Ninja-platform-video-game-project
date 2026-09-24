"use client";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { View } from "@react-three/drei";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

const EnvCtx = createContext<THREE.Texture | null>(null);

function EnvProvider({ children }: { children: ReactNode }) {
  const gl = useThree((s) => s.gl);
  const tex = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const rt = pmrem.fromScene(room, 0.035);
    pmrem.dispose();
    return rt.texture;
  }, [gl]);
  return <EnvCtx.Provider value={tex}>{children}</EnvCtx.Provider>;
}

/** Applique l'environnement studio partagé à la scène (virtuelle) d'une View. */
export function ViewEnv({ intensity = 0.72 }: { intensity?: number }) {
  const tex = useContext(EnvCtx);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.environment = tex;
    scene.environmentIntensity = intensity;
    scene.environmentRotation.set(0, 0.6, 0);
  }, [scene, tex, intensity]);
  return null;
}

/** Rendu à la demande : on redessine au défilement, au redimensionnement et après chaque
    interaction ou changement de mise en page (pas de minuterie permanente au repos). */
function Invalidator() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const timers = new Set<number>();
    const on = () => invalidate();
    // les mises en page réagissent un peu après le clic (filtres, tiroirs, transitions CSS)
    const later = () => {
      invalidate();
      for (const ms of [60, 180, 420]) {
        const id = window.setTimeout(() => {
          timers.delete(id);
          invalidate();
        }, ms);
        timers.add(id);
      }
    };
    window.addEventListener("scroll", on, { passive: true, capture: true });
    window.addEventListener("resize", later);
    for (const ev of ["pointerup", "keyup", "input", "change", "transitionend", "animationend", "hashchange"]) window.addEventListener(ev, later, { passive: true, capture: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(later) : null;
    ro?.observe(document.body);
    // démarrage : polices et mises en page asynchrones
    const boot = window.setInterval(on, 400);
    const stop = window.setTimeout(() => window.clearInterval(boot), 4000);
    document.fonts?.ready.then(later).catch(() => {});
    return () => {
      window.removeEventListener("scroll", on, { capture: true });
      window.removeEventListener("resize", later);
      for (const ev of ["pointerup", "keyup", "input", "change", "transitionend", "animationend", "hashchange"]) window.removeEventListener(ev, later, { capture: true });
      ro?.disconnect();
      window.clearInterval(boot);
      window.clearTimeout(stop);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [invalidate]);
  return null;
}

/** Efface toute la toile avant le rendu des vues (sinon traînées entre images). */
function Clear() {
  useFrame(({ gl }) => {
    gl.setScissorTest(false);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
  }, 0);
  return null;
}

export default function Stage() {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
      camera={{ position: [0, 0, 5] }}
      frameloop="demand"
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.05;
      }}
    >
      <Clear />
      <Invalidator />
      <EnvProvider>
        <View.Port />
      </EnvProvider>
    </Canvas>
  );
}
