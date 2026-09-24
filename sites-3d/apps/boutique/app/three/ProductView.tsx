"use client";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, View } from "@react-three/drei";
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type MutableRefObject, type ReactNode } from "react";
import type { OrbitControls as OrbitImpl } from "three-stdlib";
import type { Product, Variant } from "../data";
import { ViewEnv } from "./Stage";
import { easeInOut, reducedMotion, useExplode, type ModelProps } from "./common";

const EXPLODE_YAW = 0.5;
import Watch from "./models/Watch";
import Headphones from "./models/Headphones";
import Speaker from "./models/Speaker";
import Lamp from "./models/Lamp";
import Chair from "./models/Chair";
import Vase from "./models/Vase";
import Perfume from "./models/Perfume";
import Glasses from "./models/Glasses";
import Mug from "./models/Mug";

const MODELS: Record<string, ComponentType<ModelProps>> = {
  cadence: Watch,
  aria: Headphones,
  orbe: Speaker,
  bras: Lamp,
  pli: Chair,
  galet: Vase,
  brume: Perfume,
  axe: Glasses,
  fil: Mug,
};

/** Caméra selon le mode : la visionneuse et le héros prennent plus de recul. */
export function camFor(product: Product, mode: "card" | "viewer" | "hero") {
  const base = mode === "card" ? product.card : product.cam;
  const k = mode === "viewer" ? 1.5 : mode === "hero" ? 1.38 : 1;
  const pos = base.pos.map((v, i) => base.target[i] + (v - base.target[i]) * k) as [number, number, number];
  return { pos, target: base.target, fov: base.fov };
}

export type ProductViewProps = {
  product: Product;
  variant: Variant;
  opts: Record<string, string>;
  mode: "card" | "viewer" | "hero";
  hovered?: boolean;
  visible?: boolean;
  exploded?: boolean;
  autoRotate?: boolean;
  interactive?: boolean;
  resetKey?: number;
  hotspotRefs?: MutableRefObject<Record<string, HTMLElement | null>>;
  className?: string;
  /** Suspend l'animation continue (héros sous un tiroir ouvert) sans masquer le rendu. */
  still?: boolean;
};

function Lights() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} color="#fff6ec" />
      <directionalLight position={[-4, 2, -3]} intensity={0.9} color="#cfe0ff" />
    </>
  );
}

function Turntable({
  mode,
  hovered,
  e,
  groupRef,
  track,
  live,
  children,
}: {
  mode: ProductViewProps["mode"];
  hovered?: boolean;
  e: MutableRefObject<number>;
  groupRef: MutableRefObject<THREE.Group | null>;
  track: MutableRefObject<HTMLElement | null>;
  live: boolean;
  children: ReactNode;
}) {
  const g = groupRef;
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [hovered, invalidate]);
  // héros : on n'anime (et ne redessine en continu) que s'il est à l'écran et non recouvert
  const onScreen = useRef(true);
  useEffect(() => {
    if (mode !== "hero" || typeof IntersectionObserver === "undefined") return;
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver(([en]) => {
      onScreen.current = en.isIntersecting;
      if (en.isIntersecting) invalidate();
    });
    io.observe(el);
    return () => io.disconnect();
  }, [mode, track, invalidate]);
  const liveRef = useRef(live);
  liveRef.current = live;
  useEffect(() => {
    if (live) invalidate();
  }, [live, invalidate]);
  const v = useRef(0);
  const rm = useRef(false);
  useEffect(() => {
    rm.current = reducedMotion();
  }, []);
  useFrame((state, dt) => {
    if (!g.current) return;
    const d = Math.min(dt, 0.1);
    // vue éclatée : on présente l'objet de trois quarts pour lire l'empilement des pièces
    const yaw = -EXPLODE_YAW * easeInOut(e.current);
    if (mode === "card") {
      const target = hovered ? (rm.current ? 0.6 : 1.7) : 0;
      v.current = THREE.MathUtils.damp(v.current, target, 3, d);
      if (v.current < 0.002 && !hovered) {
        v.current = 0;
        return;
      }
      g.current.rotation.y += v.current * d;
      state.invalidate();
    } else if (mode === "hero") {
      const sway = rm.current ? 0 : Math.sin(state.clock.elapsedTime * 0.25) * 0.5 * (1 - easeInOut(e.current) * 0.7);
      g.current.rotation.y = sway + yaw;
      // l'empilement éclaté est plus long : on recule légèrement l'objet pour qu'il tienne dans le cadre
      const k = easeInOut(e.current);
      g.current.scale.setScalar(1 - 0.2 * k);
      g.current.position.set(-0.12 * k, 0.1 * k, 0);
      if (!rm.current && liveRef.current && onScreen.current) state.invalidate();
    } else {
      g.current.rotation.y = yaw;
      g.current.scale.setScalar(1 - 0.14 * easeInOut(e.current));
    }
  });
  return (
    <group ref={g} rotation-y={mode === "card" ? -0.35 : 0}>
      {children}
    </group>
  );
}

function CardCamera({ target }: { target: THREE.Vector3Tuple }) {
  const camera = useThree((s) => s.camera);
  useLayoutEffect(() => {
    camera.lookAt(...target);
  }, [camera, target]);
  return null;
}

function Controls({ track, product, mode, autoRotate, resetKey }: { track: MutableRefObject<HTMLElement | null>; product: Product; mode: ProductViewProps["mode"]; autoRotate?: boolean; resetKey?: number }) {
  const ctl = useRef<OrbitImpl>(null);
  const camera = useThree((s) => s.camera);
  const cam = camFor(product, mode);
  const dist = new THREE.Vector3(...cam.pos).distanceTo(new THREE.Vector3(...cam.target));
  useEffect(() => {
    if (!ctl.current || resetKey === undefined) return;
    camera.position.set(...cam.pos);
    ctl.current.target.set(...cam.target);
    ctl.current.update();
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => setEl(track.current), [track]);
  if (!el) return null;
  const hero = mode === "hero";
  return (
    <OrbitControls
      ref={ctl}
      domElement={el}
      target={cam.target}
      enablePan={false}
      enableZoom={!hero}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.7}
      minDistance={dist * 0.55}
      maxDistance={dist * 1.45}
      minPolarAngle={0.25}
      maxPolarAngle={Math.PI / 2 - 0.02}
      autoRotate={autoRotate}
      autoRotateSpeed={0.9}
    />
  );
}

function Hotspots({ product, refs, e, groupRef }: { product: Product; refs: MutableRefObject<Record<string, HTMLElement | null>>; e: MutableRefObject<number>; groupRef: MutableRefObject<THREE.Group | null> }) {
  const camera = useThree((s) => s.camera);
  const v = useRef(new THREE.Vector3());
  const c = useRef(new THREE.Vector3());
  useFrame(() => {
    const k = easeInOut(e.current);
    const m = groupRef.current?.matrixWorld;
    for (const h of product.hotspots) {
      const el = refs.current[h.id];
      if (!el || !el.parentElement) continue;
      const w = el.parentElement.clientWidth;
      const hgt = el.parentElement.clientHeight;
      v.current.set(...h.p);
      if (h.off) v.current.set(h.p[0] + h.off[0] * k, h.p[1] + h.off[1] * k, h.p[2] + h.off[2] * k);
      if (m) v.current.applyMatrix4(m);
      const dHot = camera.position.distanceTo(v.current);
      c.current.set(...product.cam.target);
      c.current.y = v.current.y;
      const dCenter = camera.position.distanceTo(c.current);
      v.current.project(camera);
      const x = (v.current.x * 0.5 + 0.5) * w;
      const y = (-v.current.y * 0.5 + 0.5) * hgt;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.dataset.behind = dHot > dCenter + 0.05 ? "1" : "0";
      // la bulle s'ouvre du côté où elle tient dans la visionneuse
      const card = el.lastElementChild as HTMLElement | null;
      const cw = (card?.offsetWidth ?? 200) + 24;
      el.dataset.side = x + cw > w && x - cw >= -8 ? "l" : x + cw > w && x > w / 2 ? "l" : "r";
    }
  });
  return null;
}

export default function ProductView(props: ProductViewProps) {
  const { product, variant, opts, mode, hovered, visible = true, exploded = false, autoRotate, interactive, resetKey, hotspotRefs, className, still } = props;
  const track = useRef<HTMLElement | null>(null);
  const cam = camFor(product, mode);
  const Model = MODELS[product.id];
  return (
    <View ref={track as never} className={className} visible={visible}>
      <ViewEnv />
      <PerspectiveCamera makeDefault position={cam.pos} fov={cam.fov} near={0.05} far={40} />
      {!interactive && <CardCamera target={cam.target} />}
      <Lights />
      <ExplodeScene product={product} Model={Model} c={variant.c} opts={opts} exploded={exploded} live={visible} still={still} mode={mode} hovered={hovered} hotspotRefs={hotspotRefs} track={track} />
      {interactive && <Controls track={track} product={product} mode={mode} autoRotate={autoRotate} resetKey={resetKey} />}
    </View>
  );
}

function ExplodeScene({
  product,
  Model,
  c,
  opts,
  exploded,
  live,
  mode,
  hovered,
  hotspotRefs,
  track,
  still,
}: {
  still?: boolean;
  track: MutableRefObject<HTMLElement | null>;
  product: Product;
  Model: ComponentType<ModelProps>;
  c: Record<string, string>;
  opts: Record<string, string>;
  exploded: boolean;
  live: boolean;
  mode: ProductViewProps["mode"];
  hovered?: boolean;
  hotspotRefs?: MutableRefObject<Record<string, HTMLElement | null>>;
}) {
  const e = useExplode(exploded);
  const groupRef = useRef<THREE.Group | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
    const id = setTimeout(() => invalidate(), 120);
    return () => clearTimeout(id);
  }, [c, opts, live, invalidate]);
  return (
    <>
      <Turntable mode={mode} hovered={hovered} e={e} groupRef={groupRef} track={track} live={live && !still}>
        <Model c={c} opts={opts} explode={e} live={live} />
      </Turntable>
      {hotspotRefs && <Hotspots product={product} refs={hotspotRefs} e={e} groupRef={groupRef} />}
    </>
  );
}
