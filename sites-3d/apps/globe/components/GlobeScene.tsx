"use client";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { PORTS, PORT_BY_CODE, ROUTES } from "./data";
import { landPoints } from "./landDots";
import { useGlobe } from "./store";

const C = {
  abysse: new THREE.Color("#061019"),
  marine: new THREE.Color("#0E2C40"),
  ecume: new THREE.Color("#D8E4E3"),
  lagon: new THREE.Color("#44C9C1"),
  balise: new THREE.Color("#FF5B1F"),
  ambre: new THREE.Color("#F2B33D"),
};

const DEG = Math.PI / 180;
export function latLonToVec(lat: number, lon: number, r = 1) {
  const la = lat * DEG, lo = lon * DEG;
  return new THREE.Vector3(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo));
}
// Positions unitaires des ports, calculées une fois (aucune allocation par frame)
const PORT_VEC: Record<string, THREE.Vector3> = Object.fromEntries(PORTS.map((p) => [p.code, latLonToVec(p.lat, p.lon)]));
// Rayon angulaire de capture d'un port (≈ 3°) : on retient le port le plus proche du point visé
const PICK_COS = Math.cos(3.2 * (Math.PI / 180));
const _v = new THREE.Vector3();
const yawFor = (lon: number) => -Math.PI / 2 - lon * DEG;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function useReducedMotion() {
  const [r, setR] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setR(m.matches);
    const f = () => setR(m.matches);
    m.addEventListener?.("change", f);
    return () => m.removeEventListener?.("change", f);
  }, []);
  return r;
}

/* ---------- Océan : dégradé + fresnel + graticule ---------- */
const oceanVS = /* glsl */ `
varying vec3 vN; varying vec3 vP;
void main(){ vP = position; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const oceanFS = /* glsl */ `
uniform vec3 uDeep; uniform vec3 uRim; uniform vec3 uLine;
varying vec3 vN; varying vec3 vP;
float grid(float v, float step){ float x = v/step; float d = abs(fract(x-0.5)-0.5)/fwidth(x); return 1.0 - min(d, 1.0); }
void main(){
  vec3 n = normalize(vN);
  float facing = max(dot(n, vec3(0.0,0.0,1.0)), 0.0);
  float fres = pow(1.0 - facing, 2.2);
  float light = 0.55 + 0.45 * max(dot(n, normalize(vec3(-0.45, 0.55, 0.7))), 0.0);
  vec3 col = uDeep * light;
  col = mix(col, uRim, fres * 0.75);
  vec3 p = normalize(vP);
  float lat = asin(clamp(p.y, -1.0, 1.0));
  float lon = atan(p.z, p.x);
  float g = max(grid(lat, 0.2617994), grid(lon, 0.2617994)) * (1.0 - smoothstep(0.93, 1.0, abs(p.y)));
  col += uLine * g * 0.10 * (0.4 + facing);
  gl_FragColor = vec4(col, 1.0);
}`;

/* ---------- Atmosphère fresnel (face arrière, additive) ---------- */
const atmoVS = /* glsl */ `
varying vec3 vN; varying vec3 vV;
void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const atmoFS = /* glsl */ `
uniform vec3 uColor; uniform float uPower; uniform float uStrength;
varying vec3 vN; varying vec3 vV;
void main(){
  float f = dot(normalize(vN), normalize(vV));
  float i = pow(clamp(0.62 + f, 0.0, 1.0), uPower) * uStrength;
  gl_FragColor = vec4(uColor * i, i);
}`;

/* ---------- Sillages animés sur les arcs ---------- */
const arcVS = /* glsl */ `
varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const arcFS = /* glsl */ `
uniform float uHead; uniform vec3 uColor; uniform vec3 uHot; uniform float uLit;
varying vec2 vUv;
void main(){
  float d = vUv.x - uHead;
  float trail = d <= 0.0 ? exp(d * 9.0) : 0.0;
  float base = 0.3 + uLit * 0.4;
  float a = base + trail * 0.95;
  vec3 col = mix(uColor, uHot, pow(trail, 3.0));
  gl_FragColor = vec4(col * a, a);
}`;

type Arc = { from: string; to: string; curve: THREE.CatmullRomCurve3; geo: THREE.TubeGeometry; mat: THREE.ShaderMaterial; speed: number; offset: number };

function buildArcs(): Arc[] {
  return ROUTES.map(([a, b], i) => {
    const pa = PORT_BY_CODE[a], pb = PORT_BY_CODE[b];
    const va = latLonToVec(pa.lat, pa.lon), vb = latLonToVec(pb.lat, pb.lon);
    const ang = va.angleTo(vb);
    const h = 0.015 + 0.09 * (ang / Math.PI);
    const pts: THREE.Vector3[] = [];
    const N = 48;
    const qa = new THREE.Quaternion();
    const axis = new THREE.Vector3().crossVectors(va, vb).normalize();
    for (let k = 0; k <= N; k++) {
      const t = k / N;
      qa.setFromAxisAngle(axis, ang * t);
      const p = va.clone().applyQuaternion(qa).multiplyScalar(1.004 + h * Math.sin(Math.PI * t));
      pts.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 72, 0.0042, 5, false);
    const mat = new THREE.ShaderMaterial({
      vertexShader: arcVS,
      fragmentShader: arcFS,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uHead: { value: 0 }, uColor: { value: C.lagon.clone() }, uHot: { value: new THREE.Color("#ffffff") }, uLit: { value: 0 } },
    });
    return { from: a, to: b, curve, geo, mat, speed: 0.03 / (0.25 + ang), offset: (i * 0.37) % 1 };
  });
}

function LandDots({ mobile }: { mobile: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => landPoints(mobile ? 1.35 : 1.05), [mobile]);
  const count = data.length / 2;
  const geo = useMemo(() => new THREE.CircleGeometry(mobile ? 0.0068 : 0.0054, 6), [mobile]);
  useEffect(() => () => geo.dispose(), [geo]);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const lat = data[i * 2], lon = data[i * 2 + 1];
      const p = latLonToVec(lat, lon, 1.0025);
      o.position.copy(p);
      o.lookAt(p.clone().multiplyScalar(2));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      // légère variation : les côtes et hautes latitudes plus pâles
      const r = Math.random();
      col.copy(C.ecume).lerp(C.lagon, 0.25 + r * 0.3).multiplyScalar(0.55 + r * 0.35 + Math.abs(lat) / 400);
      m.setColorAt(i, col);
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [data, count]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, count]} frustumCulled={false}>
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function Ships({ arcs, clock }: { arcs: Arc[]; clock: React.MutableRefObject<number> }) {
  const hull = useRef<THREE.InstancedMesh>(null);
  const glow = useRef<THREE.InstancedMesh>(null);
  const o = useMemo(() => new THREE.Object3D(), []);
  const hullGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(0.011, 0.007, 0.036);
    return g;
  }, []);
  const glowGeo = useMemo(() => new THREE.SphereGeometry(0.012, 10, 8), []);
  useEffect(() => () => { hullGeo.dispose(); glowGeo.dispose(); }, [hullGeo, glowGeo]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const tan = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const h = hull.current, gl = glow.current;
    if (!h || !gl) return;
    arcs.forEach((a, i) => {
      const t = (clock.current * a.speed + a.offset) % 1;
      a.mat.uniforms.uHead.value = t;
      a.curve.getPointAt(Math.min(t, 0.999), tmp);
      a.curve.getTangentAt(Math.min(t, 0.999), tan);
      o.position.copy(tmp);
      o.up.copy(tmp).normalize();
      o.lookAt(look.copy(tmp).add(tan));
      const s = Math.min(1, Math.sin(Math.PI * t) * 6);
      o.scale.setScalar(Math.max(0.001, s));
      o.updateMatrix();
      h.setMatrixAt(i, o.matrix);
      gl.setMatrixAt(i, o.matrix);
    });
    h.instanceMatrix.needsUpdate = true;
    gl.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={hull} args={[hullGeo, undefined, arcs.length]} frustumCulled={false}>
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={glow} args={[glowGeo, undefined, arcs.length]} frustumCulled={false}>
        <meshBasicMaterial color={C.lagon} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </>
  );
}

function PortMarker({ code, facingRef }: { code: string; facingRef: React.MutableRefObject<Record<string, number>> }) {
  const p = PORT_BY_CODE[code];
  const pos = useMemo(() => latLonToVec(p.lat, p.lon, 1.004), [p]);
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize()), [pos]);
  const ring = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const label = useRef<HTMLDivElement>(null);
  const selected = useGlobe((s) => s.selected === code);
  const hovered = useGlobe((s) => s.hovered === code);
  const phase = useMemo(() => Math.random() * 2, []);
  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * 0.6 + phase) % 1;
    if (ring.current) {
      const s = 1 + t * (selected ? 3.2 : 2.2);
      ring.current.scale.set(s, s, s);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = (1 - t) * (selected ? 0.9 : 0.55);
    }
    if (core.current) {
      const k = selected || hovered ? 1.6 : 1;
      core.current.scale.lerp(_v.setScalar(k), 0.2);
    }
    if (label.current) {
      const f = facingRef.current[code] ?? 0;
      label.current.style.opacity = f > 0.2 ? "1" : "0";
    }
  });
  return (
    <group position={pos} quaternion={quat}>
      <mesh ref={core}>
        <circleGeometry args={[0.013, 20]} />
        <meshBasicMaterial color={selected ? "#ffffff" : C.balise} toneMapped={false} />
      </mesh>
      <mesh ref={ring} position={[0, 0, 0.001]}>
        <ringGeometry args={[0.014, 0.018, 28]} />
        <meshBasicMaterial color={C.balise} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {(selected || hovered) && (
        <Html position={[0, 0, 0.02]} center zIndexRange={[3, 1]} style={{ pointerEvents: "none" }}>
          <div ref={label} className={"globe-label" + (selected ? " is-sel" : "")}>
            <b>{p.name}</b>
            <span>{p.code}</span>
          </div>
        </Html>
      )}
    </group>
  );
}

function Globe({ reduced, mobile }: { reduced: boolean; mobile: boolean }) {
  const { gl, camera, size } = useThree();
  const pitchG = useRef<THREE.Group>(null);
  const yawG = useRef<THREE.Group>(null);
  const scaleG = useRef<THREE.Group>(null);
  const arcs = useMemo(buildArcs, []);
  // Décalage du globe quand le panneau de port le recouvre (desktop / tablette)
  const frame = useRef({ x: 0, scale: 1 });
  const clock = useRef(0);
  const facing = useRef<Record<string, number>>({});
  const selected = useGlobe((s) => s.selected);
  const setReady = useGlobe((s) => s.setReady);
  const st = useRef({
    yaw: yawFor(28), pitch: 0.36, vYaw: 0, vPitch: 0, dragging: false, lastX: 0, lastY: 0, idle: 99,
    target: null as null | { yaw: number; pitch: number },
  });

  const oceanMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: oceanVS, fragmentShader: oceanFS,
    uniforms: { uDeep: { value: C.marine.clone().multiplyScalar(0.85) }, uRim: { value: new THREE.Color("#1B5D6E") }, uLine: { value: C.lagon.clone() } },
  }), []);
  const atmoMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: atmoVS, fragmentShader: atmoFS, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color("#3FB8C8") }, uPower: { value: 5.0 }, uStrength: { value: 1.3 } },
  }), []);
  const haloMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: atmoVS,
    fragmentShader: /* glsl */ `uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
      void main(){ float f = 1.0 - max(dot(normalize(vN), normalize(vV)), 0.0); float i = pow(f, 3.5) * 0.9; gl_FragColor = vec4(uColor * i, i); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color("#5FD6D0") } },
  }), []);

  // Libération GPU au démontage
  useEffect(() => () => {
    arcs.forEach((a) => { a.geo.dispose(); a.mat.dispose(); });
    oceanMat.dispose(); atmoMat.dispose(); haloMat.dispose();
  }, [arcs, oceanMat, atmoMat, haloMat]);

  // Sélection au plus proche : un seul lancer de rayon sur l'océan, puis le port le plus proche du point visé
  const pick = (point: THREE.Vector3) => {
    if (!yawG.current) return null;
    const local = yawG.current.worldToLocal(_v.copy(point)).normalize();
    let best: string | null = null, bestDot = PICK_COS;
    for (const p of PORTS) {
      if ((facing.current[p.code] ?? 0) <= 0.12) continue;
      const d = PORT_VEC[p.code].dot(local);
      if (d > bestDot) { bestDot = d; best = p.code; }
    }
    return best;
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (st.current.dragging) return;
    const code = pick(e.point);
    const g = useGlobe.getState();
    if (g.hovered !== code) g.hover(code);
    gl.domElement.style.cursor = code ? "pointer" : "";
  };
  const onOut = () => { useGlobe.getState().hover(null); gl.domElement.style.cursor = ""; };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return;
    const code = pick(e.point);
    if (code) { e.stopPropagation(); useGlobe.getState().select(code); }
  };

  // Glisser + inertie (souris / doigt)
  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "pan-y";
    const s = st.current;
    const down = (e: PointerEvent) => {
      s.dragging = true; s.lastX = e.clientX; s.lastY = e.clientY; s.vYaw = 0; s.vPitch = 0; s.target = null; s.idle = 0;
      el.style.cursor = "grabbing";
    };
    const move = (e: PointerEvent) => {
      if (!s.dragging) return;
      const k = 3.2 / Math.max(300, el.clientHeight);
      const dx = (e.clientX - s.lastX) * k, dy = (e.clientY - s.lastY) * k;
      s.lastX = e.clientX; s.lastY = e.clientY;
      s.yaw += dx; s.vYaw = dx;
      if (e.pointerType === "mouse") { s.pitch = THREE.MathUtils.clamp(s.pitch + dy, -0.9, 0.9); s.vPitch = dy; }
      s.idle = 0;
    };
    const up = () => { s.dragging = false; el.style.cursor = ""; };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [gl]);

  // Centrage sur le port sélectionné
  useEffect(() => {
    if (!selected) return;
    const p = PORT_BY_CODE[selected];
    const s = st.current;
    s.target = { yaw: s.yaw + wrap(yawFor(p.lon) - s.yaw), pitch: THREE.MathUtils.clamp(p.lat * DEG * 0.85, -0.8, 0.8) };
    s.vYaw = 0; s.vPitch = 0; s.idle = 0;
  }, [selected]);

  useEffect(() => {
    const f = frame.current;
    if (!selected) { f.x = 0; f.scale = 1; return; }
    let raf = 0, tries = 0;
    const measure = () => {
      const panel = document.querySelector<HTMLElement>("[data-testid=port-panel]");
      if (!panel) { if (tries++ < 30) raf = requestAnimationFrame(measure); return; }
      if (getComputedStyle(panel).position !== "absolute") { f.x = 0; f.scale = 1; return; }
      const cr = gl.domElement.getBoundingClientRect();
      const pr = panel.getBoundingClientRect();
      const aspect = cr.width / cr.height;
      const unitsPerPx = (2 * (1.2 / Math.min(1, aspect))) / cr.height;
      const copy = document.querySelector<HTMLElement>(".hero-copy h1");
      // bord droit du titre, en px relatifs à la canvas (0 si le titre n'empiète pas)
      const copyRight = copy ? Math.max(0, copy.getBoundingClientRect().right - cr.left) : 0;
      const free = pr.left - cr.left - 12;
      let scale = 0.9, center = free / 2, radiusPx = 0;
      for (let sc = 0.9; sc >= 0.69; sc -= 0.05) {
        scale = sc;
        radiusPx = (sc * 1.12) / unitsPerPx; // globe + atmosphère
        const minC = Math.max(radiusPx, copyRight + radiusPx + 16);
        const maxC = free - radiusPx;
        center = Math.min(Math.max(free / 2, minC), Math.max(minC, maxC));
        if (minC <= maxC) break;
      }
      const shiftPx = Math.max(0, cr.width / 2 - center);
      f.x = -shiftPx * unitsPerPx;
      f.scale = shiftPx > 0 ? scale : 1;
    };
    raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [selected, size, gl]);

  // Point d'accroche QA / accessibilité : coordonnées écran d'un port
  useEffect(() => {
    const w = window as unknown as { __sillage?: unknown };
    w.__sillage = {
      // vrai quand le globe a fini de pivoter / se décaler (utile au QA, le rendu logiciel étant lent)
      settled() {
        const g = scaleG.current, f = frame.current;
        return !!g && !st.current.target && !st.current.dragging && Math.abs(g.position.x - f.x) < 0.002 && Math.abs(g.scale.x - f.scale) < 0.002 && Math.abs(st.current.vYaw) < 1e-4;
      },
      portScreen(code: string) {
        const p = PORT_BY_CODE[code];
        if (!p || !yawG.current) return null;
        const v = PORT_VEC[code].clone().multiplyScalar(1.004);
        yawG.current.localToWorld(v);
        const f = facing.current[code] ?? 0;
        v.project(camera);
        const r = gl.domElement.getBoundingClientRect();
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, facing: f };
      },
    };
    setReady();
    return () => { delete w.__sillage; };
  }, [camera, gl, setReady]);

  // Cadrage : le globe tient dans la vue quel que soit le ratio
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / size.height;
    const fit = 1.2 / Math.tan((cam.fov * DEG) / 2) / Math.min(1, aspect);
    cam.position.set(0, 0, fit);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size]);

  const tmp = useMemo(() => new THREE.Vector3(), []);
  const camDir = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const s = st.current;
    if (!reduced) clock.current += dt;
    else if (clock.current === 0) clock.current = 7.3;
    s.idle += dt;
    if (!s.dragging) {
      if (s.target) {
        const k = 1 - Math.pow(0.02, dt);
        s.yaw += (s.target.yaw - s.yaw) * k;
        s.pitch += (s.target.pitch - s.pitch) * k;
        if (Math.abs(s.target.yaw - s.yaw) < 0.002 && Math.abs(s.target.pitch - s.pitch) < 0.002) s.target = null;
      } else {
        const damp = Math.pow(0.05, dt);
        s.vYaw *= damp; s.vPitch *= damp;
        s.yaw += s.vYaw; s.pitch = THREE.MathUtils.clamp(s.pitch + s.vPitch, -0.9, 0.9);
        if (!reduced && s.idle > 2.5 && !selected) s.yaw += dt * 0.06 * Math.min(1, (s.idle - 2.5) / 2);
      }
    }
    if (yawG.current) yawG.current.rotation.y = s.yaw;
    if (pitchG.current) pitchG.current.rotation.x = s.pitch;
    if (scaleG.current) {
      const g = scaleG.current, f = frame.current;
      const k = reduced ? 1 : 1 - Math.pow(0.12, dt);
      g.scale.setScalar(g.scale.x + (f.scale - g.scale.x) * k);
      g.position.x += (f.x - g.position.x) * k;
    }
    // orientation de chaque port vers la caméra
    camDir.copy(camera.position).normalize();
    for (const p of PORTS) {
      tmp.copy(PORT_VEC[p.code]);
      yawG.current?.localToWorld(tmp);
      facing.current[p.code] = tmp.normalize().dot(camDir);
    }
    // arcs liés au port sélectionné en surbrillance
    for (const a of arcs) {
      const lit = selected && (a.from === selected || a.to === selected) ? 1 : 0;
      a.mat.uniforms.uLit.value += (lit - a.mat.uniforms.uLit.value) * 0.1;
      a.mat.uniforms.uColor.value.copy(lit ? C.ambre : C.lagon);
    }
  });

  return (
    <group ref={scaleG} scale={reduced ? 1 : 0.82}>
      <mesh material={haloMat} scale={1.001}>
        <sphereGeometry args={[1, 64, 48]} />
      </mesh>
      <mesh material={atmoMat} scale={1.16}>
        <sphereGeometry args={[1, 64, 48]} />
      </mesh>
      <group ref={pitchG}>
        <group ref={yawG}>
          <mesh material={oceanMat} onPointerMove={onMove} onPointerOut={onOut} onClick={onClick}>
            <sphereGeometry args={[1, 96, 64]} />
          </mesh>
          <LandDots mobile={mobile} />
          {arcs.map((a, i) => (
            <mesh key={i} geometry={a.geo} material={a.mat} renderOrder={2} />
          ))}
          <Ships arcs={arcs} clock={clock} />
          {PORTS.map((p) => (
            <PortMarker key={p.code} code={p.code} facingRef={facing} />
          ))}
        </group>
      </group>
    </group>
  );
}

export default function GlobeScene() {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setMobile(window.matchMedia("(max-width: 700px)").matches);
    const el = wrapRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "80px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={wrapRef} className="globe-canvas" data-testid="globe">
      <Canvas
        dpr={[1, 2]}
        frameloop={visible ? "always" : "never"}
        camera={{ position: [0, 0, 3.6], fov: 36, near: 0.1, far: 20 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onPointerMissed={() => useGlobe.getState().hover(null)}
      >
        <Globe reduced={reduced} mobile={mobile} />
      </Canvas>
    </div>
  );
}
