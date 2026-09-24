"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { PLANETS, heliocentric, orbitPoints } from "./data";
import { loadMoonTexture, loadPlanetTextures, prioritizeTexture, ringTexture, type PlanetTextures } from "./textures";
import { atmoFrag, atmoVert, haloFrag, haloVert, ringFrag, ringVert, starFrag, starVert, sunFrag, sunVert } from "./shaders";
import { DAYS_MAX, DAYS_MIN, daysPerSecond, moonDirAt, introDistance, labelEls, layoutMode, lmix, mapDistance, mapRadius, moonDistance, moonLabel, prefersReducedMotion, realOverview, sim, ui, updatePositions, useStore } from "./sim";

const isSmall = () => typeof window !== "undefined" && Math.min(window.innerWidth, window.innerHeight) < 600;
const REDUCED = { v: false };
const TAN = Math.tan((42 / 2) * Math.PI / 180);

/* ——— Horloge de simulation ——— */
function SimDriver() {
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.25);
    sim.days += dt * daysPerSecond();
    if (sim.days < DAYS_MIN || sim.days > DAYS_MAX) {
      sim.days = Math.min(DAYS_MAX, Math.max(DAYS_MIN, sim.days));
      if (!useStore.getState().paused) useStore.setState({ paused: true });
    }
    const target = useStore.getState().scale === "reelle" ? 1 : 0;
    const k = REDUCED.v ? 1 : 1 - Math.exp(-dt * 1.8);
    sim.blend += (target - sim.blend) * k;
    if (Math.abs(target - sim.blend) < 0.0005) sim.blend = target;
    updatePositions();
  }, -2);
  return null;
}

/* ——— Fond étoilé : suit la caméra, toujours derrière tout ——— */
function Stars() {
  const ref = useRef<THREE.Points>(null);
  const { camera, gl } = useThree();
  const geo = useMemo(() => {
    const n = isSmall() ? 2600 : 5200;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n);
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    // plan galactique approximatif (incliné de ~60° sur l'écliptique)
    const gal = new THREE.Vector3(0.2, 0.87, 0.45).normalize();
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      v.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
      if (i % 3 === 0) { v.projectOnPlane(gal).normalize().addScaledVector(gal, (rnd() - 0.5) * 0.28 * rnd()); }
      v.normalize();
      pos.set([v.x, v.y, v.z], i * 3);
      const temp = rnd();
      const c = temp < 0.15 ? [0.7, 0.8, 1] : temp > 0.88 ? [1, 0.82, 0.62] : [1, 0.97, 0.92];
      const b = 0.25 + Math.pow(rnd(), 3) * 0.95;
      col.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
      size[i] = 0.8 + Math.pow(rnd(), 6) * 2.8;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
    return g;
  }, []);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: starVert, fragmentShader: starFrag, uniforms: { uPixelRatio: { value: gl.getPixelRatio() } },
    blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true,
  }), [gl]);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  useFrame(() => {
    const p = ref.current; if (!p) return;
    const cam = camera as THREE.PerspectiveCamera;
    p.position.copy(cam.position);
    p.scale.setScalar(cam.far * 0.5);
  });
  return <points ref={ref} geometry={geo} material={mat} renderOrder={-10} frustumCulled={false} />;
}

/* ——— Soleil : sphère à bruit animé + halo ——— */
function Sun() {
  const mesh = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const sunMat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: sunVert, fragmentShader: sunFrag, uniforms: { uTime: { value: 0 } }, toneMapped: false }), []);
  const haloMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: haloVert, fragmentShader: haloFrag, uniforms: { uTime: { value: 0 }, uCore: { value: 0.2 }, uStrength: { value: 1 } },
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false,
  }), []);
  const select = useStore((s) => s.select);
  useEffect(() => () => { sunMat.dispose(); haloMat.dispose(); }, [sunMat, haloMat]);
  useFrame(({ clock }) => {
    const t = REDUCED.v ? 12 : clock.elapsedTime;
    sunMat.uniforms.uTime.value = t;
    haloMat.uniforms.uTime.value = t;
    const r = sim.sunRadius;
    mesh.current?.scale.setScalar(r);
    if (halo.current) {
      const dist = camera.position.length();
      const S = Math.max(r * 9, dist * 0.09);
      halo.current.scale.setScalar(S);
      haloMat.uniforms.uCore.value = Math.min(0.6, (r * 2) / S);
      haloMat.uniforms.uStrength.value = r * 9 >= dist * 0.09 ? 1 : 0.85;
      halo.current.quaternion.copy(camera.quaternion);
    }
  });
  return (
    <group>
      <mesh ref={mesh} material={sunMat} onClick={(e) => { e.stopPropagation(); select(null); }}>
        <sphereGeometry args={[1, 64, 32]} />
      </mesh>
      <mesh ref={halo} material={haloMat} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
}

function atmosphere(color: string, power: number, intensity: number) {
  return new THREE.ShaderMaterial({
    vertexShader: atmoVert, fragmentShader: atmoFrag,
    uniforms: { uColor: { value: new THREE.Color(color) }, uPower: { value: power }, uIntensity: { value: intensity } },
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
  });
}
const ATMO: Record<string, [string, number, number, number]> = {
  mercure: ["#000000", 1, 0, 1.0],
  venus: ["#ffd9a0", 4.0, 0.55, 1.02],
  terre: ["#5aa8ff", 3.4, 1.3, 1.035],
  mars: ["#ff9a6a", 4.5, 0.35, 1.02],
  jupiter: ["#000000", 1, 0, 1.0],
  saturne: ["#000000", 1, 0, 1.0],
  uranus: ["#aef3ff", 3.4, 0.6, 1.03],
  neptune: ["#6f9cff", 3.4, 0.8, 1.03],
};

const SPIN_CAP = 0.12;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/* ——— Ombre des anneaux sur le globe (Saturne, Uranus) ——— */
type RingShadow = { uRCenter: { value: THREE.Vector3 }; uRNormal: { value: THREE.Vector3 }; uRScale: { value: number }; uRInner: { value: number }; uROuter: { value: number }; uRMap: { value: THREE.Texture } };
function addRingShadow(mat: THREE.MeshStandardMaterial, u: RingShadow) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRW;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvRW = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vRW;\nuniform vec3 uRCenter; uniform vec3 uRNormal; uniform float uRScale; uniform float uRInner; uniform float uROuter; uniform sampler2D uRMap;")
      .replace("#include <opaque_fragment>", `#include <opaque_fragment>
      {
        vec3 Ls = normalize(-vRW);
        float den = dot(Ls, uRNormal);
        if (abs(den) > 1e-4) {
          float tt = dot(uRCenter - vRW, uRNormal) / den;
          if (tt > 0.0) {
            float rr = length(vRW + Ls * tt - uRCenter) / uRScale;
            float uu = (rr - uRInner) / (uROuter - uRInner);
            if (uu > 0.0 && uu < 1.0) gl_FragColor.rgb *= 1.0 - texture2D(uRMap, vec2(uu, 0.5)).a * 0.88;
          }
        }
      }`);
  };
  mat.customProgramCacheKey = () => "ringshadow";
}

/* ——— Planète ——— */
function PlanetBody({ i, hi }: { i: number; hi: boolean }) {
  const p = PLANETS[i];
  const group = useRef<THREE.Group>(null);
  const tiltRef = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const lastDays = useRef(sim.days);
  const angle = useRef(0);
  const select = useStore((s) => s.select);
  // teinte unie d'abord, texture procédurale dès qu'elle est prête (générée par tranches, hors du fil critique)
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: p.color, roughness: p.id === "terre" ? 1 : 0.92, metalness: 0 }), [p.id, p.color]);
  const [tex, setTex] = useState<PlanetTextures | null>(null);
  useEffect(() => {
    let alive = true;
    loadPlanetTextures(p.id, hi).then((t) => {
      if (!alive) { t.map.dispose(); t.rough?.dispose(); t.clouds?.dispose(); return; }
      setTex(t);
    });
    return () => { alive = false; };
  }, [p.id, hi]);
  useEffect(() => {
    if (!tex) return;
    mat.map = tex.map; mat.roughnessMap = tex.rough ?? null;
    // géantes très claires : albédo un peu réduit pour ne pas saturer au tone mapping (terminateur plus doux)
    mat.color.set(p.id === "jupiter" ? "#c4c4c4" : p.id === "saturne" ? "#dadada" : "#ffffff");
    mat.needsUpdate = true;
    return () => { tex.map.dispose(); tex.rough?.dispose(); tex.clouds?.dispose(); };
  }, [tex, mat, p.id]);
  const cloudMat = useMemo(() => tex?.clouds ? new THREE.MeshStandardMaterial({ map: tex.clouds, transparent: true, depthWrite: false, roughness: 1 }) : null, [tex]);
  const atmo = ATMO[p.id];
  const atmoMat = useMemo(() => atmosphere(atmo[0], atmo[1], atmo[2]), [atmo]);
  const ringKind = p.id === "saturne" ? "saturne" : p.id === "uranus" ? "uranus" : null;
  const ring = useMemo(() => {
    if (!ringKind) return null;
    // rayons en unités de rayon moyen de la planète (Saturne : équatorial 60 268 km / moyen 58 232 km)
    const k = ringKind === "saturne" ? 60268 / 58232 : 25559 / 25362;
    const inner = (ringKind === "saturne" ? 1.239 : 1.64) * k, outer = (ringKind === "saturne" ? 2.27 : 2.02) * k;
    const geo = new THREE.RingGeometry(inner, outer, hi ? 160 : 96, 1);
    const map = ringTexture(ringKind);
    const m = new THREE.ShaderMaterial({
      vertexShader: ringVert, fragmentShader: ringFrag, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uMap: { value: map }, uInner: { value: inner }, uOuter: { value: outer }, uCenter: { value: new THREE.Vector3() }, uRadius: { value: 1 } },
    });
    const shadow: RingShadow = { uRCenter: { value: new THREE.Vector3() }, uRNormal: { value: new THREE.Vector3(0, 1, 0) }, uRScale: { value: 1 }, uRInner: { value: inner }, uROuter: { value: outer }, uRMap: { value: map } };
    return { geo, m, map, shadow };
  }, [ringKind, hi]);
  useEffect(() => { if (ring) addRingShadow(mat, ring.shadow); }, [ring, mat]);
  useEffect(() => () => { mat.dispose(); }, [mat]);
  useEffect(() => () => { cloudMat?.dispose(); }, [cloudMat]);
  useEffect(() => () => { atmoMat.dispose(); }, [atmoMat]);
  useEffect(() => () => { if (ring) { ring.geo.dispose(); ring.m.dispose(); ring.map.dispose(); } }, [ring]);
  const tilt = (p.tiltDeg * Math.PI) / 180;
  const seg = hi ? 64 : 40;
  const q = useMemo(() => new THREE.Quaternion(), []);
  const { camera, size } = useThree();
  const vis = useRef(1);
  const pv = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dtRaw) => {
    const g = group.current; if (!g) return;
    g.position.copy(sim.planetPos[i]);
    // un astre voisin qui passe en gros plan sous le rail, la barre haute ou la fiche s'efface
    const f = useStore.getState().focus;
    let want = 1;
    if (f !== null && f !== i) {
      const dist = camera.position.distanceTo(sim.planetPos[i]);
      const pr = (sim.planetRadius[i] * (ringKind ? 2.3 : 1) * size.height) / 2 / (Math.max(dist, 1e-6) * TAN);
      if (pr > 12) {
        pv.copy(sim.planetPos[i]).project(camera);
        const x = (pv.x + 1) * 0.5 * size.width, y = (1 - pv.y) * 0.5 * size.height;
        if (pv.z < 1 && ui.obstacles.some((o) => x + pr > o.l && x - pr < o.r && y + pr > o.t && y - pr < o.b)) want = 0;
      }
    }
    vis.current += (want - vis.current) * (REDUCED.v ? 1 : 1 - Math.exp(-Math.min(dtRaw, 0.25) * 6));
    g.visible = vis.current > 0.02;
    g.scale.setScalar(sim.planetRadius[i] * Math.max(0.02, vis.current));
    // rotation propre : réelle quand elle reste lisible, plafonnée sinon.
    // Une inclinaison > 90° (Vénus, Uranus) retourne déjà l'axe : la période négative ne doit pas être comptée deux fois.
    const dd = sim.days - lastDays.current; lastDays.current = sim.days;
    const P = (p.tiltDeg > 90 ? Math.abs(p.rotationHours) : p.rotationHours) / 24;
    let delta = (2 * Math.PI * dd) / P;
    const capped = Math.abs(delta) > SPIN_CAP;
    if (capped) delta = Math.sign(delta) * SPIN_CAP;
    angle.current += delta;
    if (p.id === "terre" && !capped) {
      const gmst = ((280.46061837 + 360.98564736629 * sim.days) * Math.PI) / 180;
      angle.current += wrap(gmst - angle.current) * 0.08;
    }
    if (spin.current) spin.current.rotation.y = angle.current;
    if (cloudRef.current) cloudRef.current.rotation.y = angle.current * 1.02 + sim.days * 0.02;
    if (ring) {
      ring.m.uniforms.uCenter.value.copy(sim.planetPos[i]); ring.m.uniforms.uRadius.value = sim.planetRadius[i];
      ring.shadow.uRCenter.value.copy(sim.planetPos[i]); ring.shadow.uRScale.value = sim.planetRadius[i];
      if (tiltRef.current) { tiltRef.current.getWorldQuaternion(q); ring.shadow.uRNormal.value.set(0, 1, 0).applyQuaternion(q); }
    }
  });

  return (
    <group ref={group}>
      <group ref={tiltRef} rotation-x={-tilt}>
        <mesh
          ref={spin} material={mat}
          onClick={(e) => { e.stopPropagation(); select(i); }}
          onPointerOver={() => { document.body.style.cursor = "pointer"; }}
          onPointerOut={() => { document.body.style.cursor = ""; }}
        >
          <sphereGeometry args={[1, seg, seg / 2]} />
        </mesh>
        {cloudMat && (
          <mesh ref={cloudRef} material={cloudMat} scale={1.012}>
            <sphereGeometry args={[1, seg, seg / 2]} />
          </mesh>
        )}
        {ring && <mesh geometry={ring.geo} material={ring.m} rotation-x={-Math.PI / 2} renderOrder={1} />}
      </group>
      {atmo[2] > 0 && (
        <mesh material={atmoMat} scale={atmo[3]}>
          <sphereGeometry args={[1, seg, seg / 2]} />
        </mesh>
      )}
    </group>
  );
}

/* ——— Lune : verrouillée par effet de marée ——— */
function Moon({ hi }: { hi: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let alive = true;
    loadMoonTexture(hi).then((t) => { if (alive) setTex(t); else t.dispose(); });
    return () => { alive = false; };
  }, [hi]);
  useEffect(() => () => { tex?.dispose(); }, [tex]);
  const earth = useMemo(() => new THREE.Vector3(), []);
  const { camera, size } = useThree();
  const pv = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const g = ref.current; if (!g) return;
    g.position.copy(sim.moonPos);
    g.scale.setScalar(sim.moonRadius);
    const f = useStore.getState().focus;
    let show = true;
    if (f !== null && f !== 2) {
      const pr = (sim.moonRadius * size.height) / 2 / (Math.max(camera.position.distanceTo(sim.moonPos), 1e-6) * TAN);
      pv.copy(sim.moonPos).project(camera);
      const x = (pv.x + 1) * 0.5 * size.width, y = (1 - pv.y) * 0.5 * size.height;
      if (pr > 10 && ui.obstacles.some((o) => x + pr > o.l && x - pr < o.r && y + pr > o.t && y - pr < o.b)) show = false;
    }
    g.visible = show;
    earth.copy(sim.planetPos[2]);
    g.lookAt(earth);
  });
  return (
    <group ref={ref}>
      <mesh rotation-y={-Math.PI / 2}>
        <sphereGeometry args={[1, 40, 20]} />
        {tex ? <meshStandardMaterial key="t" map={tex} roughness={1} /> : <meshStandardMaterial key="c" color="#8f8c86" roughness={1} />}
      </mesh>
    </group>
  );
}

/* ——— Ceinture principale d'astéroïdes ——— */
function AsteroidBelt() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const count = isSmall() ? 700 : 1600;
  const data = useMemo(() => {
    let s = 42;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const arr = [];
    for (let i = 0; i < count; i++) {
      let a = 2.2 + rnd() * 1.1;
      // lacunes de Kirkwood (résonances 3:1, 5:2, 7:3 avec Jupiter)
      while ([2.5, 2.82, 2.95].some((g) => Math.abs(a - g) < 0.03)) a = 2.2 + rnd() * 1.1;
      arr.push({
        a, e: rnd() * 0.08, inc: (rnd() * rnd() * 14 * Math.PI) / 180, node: rnd() * Math.PI * 2, peri: rnd() * Math.PI * 2,
        M0: rnd() * Math.PI * 2, n: (2 * Math.PI) / (365.25 * Math.pow(a, 1.5)), km: 4 + Math.pow(rnd(), 5) * 450,
        rx: rnd() * 6, ry: rnd() * 6, sq: 0.6 + rnd() * 0.5, vis: 0,
      });
      const last = arr[arr.length - 1];
      last.vis = 0.62 + Math.pow(last.km / 454, 0.3) * 0.75;
    }
    return arr;
  }, [count]);
  const m = useMemo(() => new THREE.Object3D(), []);
  const last = useRef({ d: NaN, b: NaN, cx: NaN, cy: NaN, cz: NaN });
  const { camera, size } = useThree();
  useFrame(() => {
    const im = ref.current; if (!im) return;
    // rayon (unités scène, à distance 1 de la caméra) d'un rocher de ~1,1 px CSS
    const pxK = (2.2 * TAN) / Math.max(200, size.height);
    const cp = camera.position, L = last.current;
    if (Math.abs(L.d - sim.days) < 0.05 && L.b === sim.blend && Math.abs(L.cx - cp.x) + Math.abs(L.cy - cp.y) + Math.abs(L.cz - cp.z) < 1e-3) return;
    last.current = { d: sim.days, b: sim.blend, cx: cp.x, cy: cp.y, cz: cp.z };
    // les rochers proches de la caméra s'effacent : en vue rapprochée d'une planète, pas de « débris » au premier plan
    const f = useStore.getState().focus;
    const view = f === null ? 0 : cp.distanceTo(sim.planetPos[f]);
    const fadeIn = view * 1.5, fadeOut = view * 4;
    for (let i = 0; i < data.length; i++) {
      const o = data[i];
      const M = o.M0 + o.n * sim.days;
      const E = M + o.e * Math.sin(M);
      const xp = o.a * (Math.cos(E) - o.e), yp = o.a * Math.sin(E);
      const cw = Math.cos(o.peri), sw = Math.sin(o.peri), cO = Math.cos(o.node), sO = Math.sin(o.node), cI = Math.cos(o.inc), sI = Math.sin(o.inc);
      const x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
      const y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
      const z = sw * sI * xp + cw * sI * yp;
      const r = Math.hypot(x, y, z);
      const k = mapDistance(r) / r;
      m.position.set(x * k, z * k, -y * k);
      m.rotation.set(o.rx + sim.days * 0.01, o.ry, 0);
      const dc = Math.hypot(m.position.x - cp.x, m.position.y - cp.y, m.position.z - cp.z);
      // échelle lisible : taille apparente plancher (≈ 2 à 4 px) pour que la ceinture se lise comme une bande
      const szL = Math.max(0.006 + o.km / 22000, dc * pxK * o.vis * (view > 0 ? 0.6 : 1));
      let sz = Math.exp(Math.log(szL) * (1 - sim.blend) + Math.log(mapRadius(o.km, 1) * 40) * sim.blend);
      if (view > 0) {
        const k2 = Math.min(1, Math.max(0, (dc - fadeIn) / (fadeOut - fadeIn)));
        sz *= k2 * k2 * (3 - 2 * k2);
      }
      m.scale.set(sz, sz * o.sq, sz);
      m.updateMatrix();
      im.setMatrixAt(i, m.matrix);
    }
    im.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#b9ab94" emissive="#4b4136" roughness={1} flatShading />
    </instancedMesh>
  );
}

/* ——— Orbites ——— */
function Orbits() {
  const focus = useStore((s) => s.focus);
  const lines = useMemo(() => PLANETS.map((p) => {
    const au = orbitPoints(p.el, sim.days, 360);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(au.length), 3));
    const m = new THREE.LineBasicMaterial({ color: "#d4a657", transparent: true, opacity: 0.28, depthWrite: false });
    return { au, g, m, line: new THREE.Line(g, m) };
  }), []);
  const last = useRef(NaN);
  useEffect(() => () => { lines.forEach((l) => { l.g.dispose(); l.m.dispose(); }); }, [lines]);
  useEffect(() => {
    lines.forEach((l, i) => {
      const on = focus === i;
      l.m.color.set(on ? PLANETS[i].color : "#d4a657");
      l.m.opacity = on ? 0.85 : focus === null ? 0.32 : 0.18;
    });
  }, [focus, lines]);
  useFrame(() => {
    if (last.current === sim.blend) return;
    last.current = sim.blend;
    for (const l of lines) {
      const arr = l.g.attributes.position.array as Float32Array;
      for (let j = 0; j < l.au.length; j += 3) {
        const x = l.au[j], y = l.au[j + 1], z = l.au[j + 2];
        const r = Math.hypot(x, y, z);
        const k = mapDistance(r) / r;
        arr[j] = x * k; arr[j + 1] = y * k; arr[j + 2] = z * k;
      }
      l.g.attributes.position.needsUpdate = true;
      l.g.computeBoundingSphere();
    }
  });
  return <group>{lines.map((l, i) => <primitive key={i} object={l.line} />)}</group>;
}

/* ——— Mesure de l'interface : zone libre pour cadrer la scène, obstacles pour les étiquettes ——— */
type Rect = { l: number; t: number; r: number; b: number };
function rectOf(sel: string): Rect | null {
  const el = document.querySelector(sel) as HTMLElement | null;
  if (!el) return null;
  const cs = getComputedStyle(el);
  if (cs.visibility === "hidden" || cs.display === "none") return null;
  const b = el.getBoundingClientRect();
  if (b.width < 1 || b.height < 1) return null;
  return { l: b.left, t: b.top, r: b.right, b: b.bottom };
}
function measureLayout(W: number, H: number) {
  const mode = layoutMode();
  const top = rectOf(".top"), rail = rectOf(".rail"), bottom = rectOf(".bottom"), panel = rectOf(".panel"), note = rectOf(".scalenote");
  let l = 16, t = 16, r = W - 16, b = H - 16;
  if (mode === "wide") {
    if (rail) l = rail.r + 20;
    if (top) t = top.b + 12;
    if (bottom) b = bottom.t - 12;
    if (panel) r = panel.l - 20;
  } else if (mode === "phone") {
    t = Math.max(top?.b ?? 0, bottom?.b ?? 0) + 10;
    b = (panel ? panel.t : rail ? rail.t : H) - 10;
  } else {
    t = Math.max(top?.b ?? 0, rail?.b ?? 0) + 8;
    if (bottom) b = bottom.t - 8;
    if (panel) r = panel.l - 14;
  }
  if (r - l < 80) { l = 16; r = W - 16; }
  if (b - t < 80) { t = 16; b = H - 16; }
  ui.mode = mode; ui.W = W; ui.H = H;
  ui.free = { l, t, r, b };
  ui.obstacles = [top, rail, bottom, panel, note].filter(Boolean) as Rect[];
  ui.stamp++;
}
function LayoutProbe() {
  const { size } = useThree();
  const n = useRef(0);
  useFrame(() => {
    if (n.current++ % 10 !== 0) return;
    measureLayout(size.width, size.height);
  }, -3);
  useEffect(() => { measureLayout(size.width, size.height); }, [size.width, size.height]);
  // fiche dépliée / repliée, sélection : on remesure dès que le DOM a changé, sans attendre 10 images
  const sheetOpen = useStore((s) => s.sheetOpen);
  const focus = useStore((s) => s.focus);
  useEffect(() => {
    const id = requestAnimationFrame(() => measureLayout(size.width, size.height));
    return () => cancelAnimationFrame(id);
  }, [sheetOpen, focus, size.width, size.height]);
  return null;
}

/* ——— Étiquettes : éléments DOM hors Canvas, projetés à chaque image, sans chevauchement ——— */
const CANDIDATES: [number, number][] = [[1, 0], [-1, 0], [1, -16], [1, 16], [-1, -16], [-1, 16], [1, -32], [1, 32]];
const overlap = (a: Rect, b: Rect) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
function LabelDriver() {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  const widths = useRef<number[]>([]);
  useFrame(() => {
    const st = useStore.getState();
    if (st.intro) return;
    const W = size.width, H = size.height;
    const placed: Rect[] = [];
    const items: { i: number; x: number; y: number; z: number }[] = [];
    const showFocused = sim.blend > 0.5;
    for (let i = 0; i < PLANETS.length; i++) {
      const el = labelEls[i]; if (!el) continue;
      v.copy(sim.planetPos[i]).project(camera);
      items.push({ i, x: (v.x + 1) * 0.5 * W, y: (1 - v.y) * 0.5 * H, z: v.z });
    }
    // les planètes proches de la caméra (grandes à l'écran) passent d'abord
    items.sort((a, b) => a.z - b.z);
    // 1er passage : anneaux-repères (ils sont prioritaires sur les noms)
    const meta = items.map((it) => {
      const dist = camera.position.distanceTo(sim.planetPos[it.i]);
      const pr = (sim.planetRadius[it.i] * (PLANETS[it.i].id === "saturne" ? 1.6 : 1) * H) / 2 / (Math.max(dist, 1e-6) * TAN);
      // anneau-repère autour des petits disques ; en vue rapprochée, un voisin assez gros garde seulement son nom
      const ring = pr < (st.focus === null ? 26 : 9) ? Math.max(12, 2 * pr + 8) : 0;
      const half = ring ? ring / 2 : pr;
      let visible = it.z < 1 && it.x > -20 && it.x < W + 20 && it.y > -20 && it.y < H + 20;
      if (st.focus === it.i && !showFocused) visible = false;
      const dot: Rect = { l: it.x - half, t: it.y - half, r: it.x + half, b: it.y + half };
      if (visible && ring && ui.obstacles.some((o) => overlap(o, dot))) visible = false;
      return { ring, half, visible, dot };
    });
    // disques et anneaux-repères visibles : aucun nom ne se pose dessus (ni la Lune sur la Terre)
    meta.forEach((m, k) => { if (m.visible || (st.focus === items[k].i && items[k].z < 1)) placed.push(m.dot); });
    // le Soleil aussi (cœur du disque, sans le halo)
    v.set(0, 0, 0).project(camera);
    if (v.z < 1) {
      const sd = camera.position.length();
      const sr = (sim.sunRadius * H) / 2 / (Math.max(sd, 1e-6) * TAN) * 0.9;
      const sx = (v.x + 1) * 0.5 * W, sy = (1 - v.y) * 0.5 * H;
      if (sr > 3) placed.push({ l: sx - sr, t: sy - sr, r: sx + sr, b: sy + sr });
    }
    // 2e passage : noms, décalés verticalement en cas de collision
    items.forEach((it, k) => {
      const el = labelEls[it.i]!;
      const m = meta[k];
      const name = el.lastElementChild as HTMLElement | null;
      if (!widths.current[it.i]) widths.current[it.i] = (name?.offsetWidth ?? 60) + 4;
      const w = widths.current[it.i];
      let visible = m.visible, dy = 0, dx = 0;
      if (visible) {
        let ok = false;
        const h72 = m.half * 0.72;
        const nx = it.x + h72 + 4, ny = it.y - h72 - 15;
        // à droite d'abord, puis à gauche à la même hauteur (le nom reste collé à son astre), puis décalé
        for (const [side, off] of CANDIDATES) {
          const l = side > 0 ? nx : it.x - h72 - 4 - w;
          const box: Rect = { l, t: ny + off, r: l + w, b: ny + 15 + off };
          if (box.r > W - 4 || box.l < 4 || box.t < 4 || box.b > H - 4) continue;
          if (placed.some((p) => p !== m.dot && overlap(p, box)) || ui.obstacles.some((o) => overlap(o, box))) continue;
          dy = off; dx = l - nx; ok = true; placed.push(box); break;
        }
        visible = ok;
      }
      el.style.transform = `translate3d(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px, 0)`;
      el.style.setProperty("--dy", `${dy}px`);
      el.style.setProperty("--dx", `${dx.toFixed(1)}px`);
      el.style.setProperty("--s", `${m.ring.toFixed(1)}px`);
      el.style.setProperty("--h", `${(m.half * 0.72).toFixed(1)}px`);
      el.classList.toggle("is-hidden", !visible);
      el.classList.toggle("no-ring", !m.ring);
    });
    const me = moonLabel.el;
    if (me) {
      v.copy(sim.moonPos).project(camera);
      const x = (v.x + 1) * 0.5 * W, y = (1 - v.y) * 0.5 * H;
      me.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      const box: Rect = { l: x - 7, t: y - 17, r: x + 60, b: y + 7 };
      const inside = box.l > 4 && box.r < W - 4 && box.t > 4 && box.b < H - 4;
      const vis = st.focus === 2 && v.z < 1 && inside && !ui.obstacles.some((o) => overlap(o, box)) && !placed.some((p) => overlap(p, box));
      me.classList.toggle("is-hidden", !vis);
    }
  }, 0); // priorité 0 : après la caméra (-0.5) ; une priorité > 0 couperait le rendu automatique
  return null;
}

/* ——— Cadrage ——— */
const _cam = new THREE.PerspectiveCamera(42, 1, 0.01, 1e7);
const _v = new THREE.Vector3();
/** Plus petite distance (le long de dir, cible = Soleil) qui garde tous les points dans la zone libre. */
function fitPoints(pts: THREE.Vector3[], rad: number[], dir: THREE.Vector3, W: number, H: number, fr: Rect, ox = 0, oy = 0) {
  const hw = (fr.r - fr.l) / 2, hh = (fr.b - fr.t) / 2;
  _cam.aspect = W / H; _cam.clearViewOffset(); _cam.updateProjectionMatrix();
  let lo = 4, hi = 20000;
  for (let it = 0; it < 26; it++) {
    const d = Math.sqrt(lo * hi);
    _cam.position.copy(dir).multiplyScalar(d); _cam.lookAt(0, 0, 0); _cam.updateMatrixWorld();
    let ok = true;
    for (let i = 0; i < pts.length && ok; i++) {
      _v.copy(pts[i]).project(_cam);
      if (_v.z > 1 || _v.z < -1) { ok = false; break; }
      const x = (_v.x * W) / 2 - ox, y = (-_v.y * H) / 2 - oy;
      const pr = (rad[i] * H) / 2 / (Math.max(1e-3, _cam.position.distanceTo(pts[i])) * TAN);
      // marge à droite pour l'étiquette, au-dessus pour son nom
      if (x - pr - 12 < -hw || x + pr + 84 > hw || y - pr - 22 < -hh || y + pr + 12 > hh) ok = false;
    }
    if (ok) hi = d; else lo = d;
  }
  return hi;
}
/** Centre (px, depuis le centre de l'écran) de la boîte englobante des points vus depuis dir à la distance d. */
function bboxCenter(pts: THREE.Vector3[], dir: THREE.Vector3, d: number, W: number, H: number) {
  _cam.aspect = W / H; _cam.clearViewOffset(); _cam.updateProjectionMatrix();
  _cam.position.copy(dir).multiplyScalar(d); _cam.lookAt(0, 0, 0); _cam.updateMatrixWorld();
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) {
    _v.copy(p).project(_cam);
    const x = (_v.x * W) / 2, y = (-_v.y * H) / 2;
    x0 = Math.min(x0, x - 12); x1 = Math.max(x1, x + 84); y0 = Math.min(y0, y - 22); y1 = Math.max(y1, y + 12);
  }
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, hx: (x1 - x0) / 2, hy: (y1 - y0) / 2 };
}
/** Meilleure direction de vue d'ensemble (azimut, élévation) et sa distance, calculées en échelle lisible. */
function fitOverview(W: number, H: number, fr: Rect, dirOut: THREE.Vector3 | null, fixedDir?: THREE.Vector3) {
  // positions en échelle lisible (indépendantes du mélange en cours)
  const pts: THREE.Vector3[] = [new THREE.Vector3()], rad: number[] = [3];
  PLANETS.forEach((p, i) => {
    const q = sim.planetPos[i];
    const k = mapDistance(realAU(i), 0) / (q.length() || 1);
    pts.push(q.clone().multiplyScalar(k));
    rad.push(mapRadius(p.radiusKm, 0));
  });
  const dir = new THREE.Vector3();
  if (fixedDir) dir.copy(fixedDir);
  else {
    let best = Infinity;
    const d = new THREE.Vector3();
    // élévations croissantes, légèrement pénalisées : on garde une vue rasante si elle suffit
    // en portrait, l'écran est limité en largeur : à distance égale, une vue plus plongeante remplit mieux la hauteur
    const opts = H > W ? [[0.55, 1], [0.78, 0.93], [1.0, 0.87], [1.2, 0.82]] : [[0.55, 1], [0.78, 1.05], [1.0, 1.1], [1.2, 1.16]];
    for (const [el, pen] of opts) {
      for (let a = 0; a < 24; a++) {
        const az = (a / 24) * Math.PI * 2;
        d.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
        const dist = fitPoints(pts, rad, d, W, H, fr) * pen;
        if (dist < best) { best = dist; dir.copy(d); }
      }
    }
    dirOut?.copy(dir);
  }
  // recentrage sur la boîte englobante (le Soleil n'est pas forcément au milieu), en deux passes
  let d = fitPoints(pts, rad, dir, W, H, fr), c = { x: 0, y: 0, hx: 0, hy: 0 };
  for (let k = 0; k < 2; k++) {
    c = bboxCenter(pts, dir, d, W, H);
    d = fitPoints(pts, rad, dir, W, H, fr, c.x, c.y);
  }
  c = bboxCenter(pts, dir, d, W, H);
  // s'il reste du jeu dans la zone libre, on rapproche le Soleil du centre : les orbites remplissent
  // alors l'espace de façon équilibrée (utile en portrait, où la largeur limite le cadrage)
  const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
  const sx = Math.max(0, (fr.r - fr.l) / 2 - c.hx - 6), sy = Math.max(0, (fr.b - fr.t) / 2 - c.hy - 6);
  return { d, ox: clamp(0, c.x - sx, c.x + sx), oy: clamp(0, c.y - sy, c.y + sy) };
}
const _h: [number, number, number] = [0, 0, 0];
function realAU(i: number) { heliocentric(PLANETS[i].el, sim.days, _h); return Math.hypot(_h[0], _h[1], _h[2]); }

/* ——— Caméra : vol en douceur puis suivi ——— */
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const { camera, size } = useThree();
  const focus = useStore((s) => s.focus);
  const intro = useStore((s) => s.intro);
  const jump = useStore((s) => s.jump);
  useEffect(() => { if (focus !== null) prioritizeTexture(PLANETS[focus].id); }, [focus]);
  const fly = useRef({ active: false, t: 0, dur: 2, needsFit: false, fromTarget: new THREE.Vector3(), fromOffset: new THREE.Vector3(), toDir: new THREE.Vector3() });
  const prevRef = useRef(0);
  const refS = useRef(0);
  const ov = useRef({ d: 120, ox: 0, oy: 0, stamp: -1, frames: 0 });
  const view = useRef({ x: 0, y: 0, init: false });
  const tmp = useMemo(() => ({ a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3() }), []);
  const portrait = size.width < size.height;

  /** Distance de cadrage d'une planète pour la zone libre (w × h px). */
  const planetDist = (f: number, fr: Rect) => {
    const H = size.height;
    const w = Math.max(60, fr.r - fr.l), h = Math.max(60, fr.b - fr.t);
    const R = sim.planetRadius[f];
    const id = PLANETS[f].id;
    const fit = (radius: number, k: number, span = Math.min(w, h)) => (radius * H) / (k * span * TAN);
    let d = fit(R, id === "terre" ? 0.5 : 0.6);
    if (id === "saturne") d = Math.max(d, fit(R * 2.35, 0.86, w), fit(R * 1.25, 0.86, h));
    if (id === "uranus") d = Math.max(d, fit(R * 2.1, 0.9, w));
    // échelle réelle : on recule pour montrer le vide (Terre : toute l'orbite de la Lune)
    if (sim.blend > 0) {
      const far = id === "terre" ? fit(moonDistance(sim.blend) * 1.15, 0.9) : d * 3.2;
      d = lmix(d, Math.max(d, far), sim.blend);
    }
    return d;
  };
  const refDist = (f: number | null) => {
    if (useStore.getState().intro) return introDistance(sim.blend, portrait);
    if (f === null) return lmix(ov.current.d, realOverview(portrait), sim.blend);
    return planetDist(f, ui.free);
  };

  // position initiale
  useEffect(() => {
    updatePositions();
    const d = introDistance(sim.blend, portrait);
    camera.position.set(d * 0.42, d * 0.5, d * 0.76);
    prevRef.current = d; refS.current = d;
    camera.lookAt(0, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastJump = useRef(jump);
  useEffect(() => {
    const c = controls.current; if (!c) return;
    if (intro) return;
    const f = fly.current;
    const jumped = lastJump.current !== jump;
    lastJump.current = jump;
    f.active = true; f.t = 0; f.dur = REDUCED.v ? 0.001 : jumped ? 1.4 : focus === null ? 2.2 : 2.4;
    f.fromTarget.copy(c.target);
    if (jumped) {
      // saut de date : la cible est déjà ailleurs, on la rejoint sans traverser le système
      updatePositions();
      f.fromTarget.copy(focus === null ? tmp.c.set(0, 0, 0) : sim.planetPos[focus]);
      f.fromOffset.copy(camera.position).sub(c.target);
      c.target.copy(f.fromTarget);
      camera.position.copy(f.fromTarget).add(f.fromOffset);
    }
    f.fromOffset.copy(camera.position).sub(c.target);
    f.needsFit = focus === null;
    if (focus === null) {
      f.toDir.set(0.42, 0.52, 0.74).normalize();
    } else {
      const toSun = tmp.a.copy(sim.planetPos[focus]).negate().setY(0).normalize();
      const id = PLANETS[focus].id;
      if (id === "saturne") {
        // vue placée par rapport au plan des anneaux (et non de l'écliptique), côté éclairé,
        // assez loin du Soleil pour voir l'ombre du globe sur les anneaux
        const t = (PLANETS[focus].tiltDeg * Math.PI) / 180;
        const n = tmp.b.set(0, Math.cos(t), -Math.sin(t));
        const sunDir = tmp.d.copy(sim.planetPos[focus]).negate().normalize();
        if (n.dot(sunDir) < 0) n.negate();
        toSun.applyAxisAngle(new THREE.Vector3(0, 1, 0), 1.15);
        toSun.addScaledVector(n, -toSun.dot(n)).normalize();
        f.toDir.copy(toSun).multiplyScalar(Math.cos(0.42)).addScaledVector(n, Math.sin(0.42)).normalize();
      } else if (id === "terre") {
        // Terre : angle de vue choisi pour écarter la Lune du disque (ni devant, ni derrière le globe)
        const up = tmp.b.set(0, 1, 0);
        // la Lune avance de 13° par jour : on regarde où elle sera à l'arrivée et pendant les jours qui suivent
        const dps = Math.min(7, Math.abs(daysPerSecond()));
        const t0 = sim.days + daysPerSecond() * f.dur;
        const dirs = [0, 1, 2, 3, 4].map((k) => moonDirAt(t0 + Math.sign(daysPerSecond() || 1) * k * Math.max(dps, 0.3), new THREE.Vector3()));
        const cand = new THREE.Vector3();
        let best = Infinity, bestA = 0.95;
        for (const a of [0.95, 0.7, 1.2, 0.45, 1.45, 0.2, 1.7]) {
          cand.copy(toSun).applyAxisAngle(up, a).setY(0.3).normalize();
          const score = Math.max(...dirs.map((m) => Math.abs(cand.dot(m)))) + Math.abs(a - 0.95) * 0.12;
          if (score < best) { best = score; bestA = a; }
        }
        toSun.applyAxisAngle(up, bestA);
        f.toDir.copy(toSun).setY(0.3).normalize();
      } else {
        toSun.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.95);
        f.toDir.copy(toSun).setY(0.3).normalize();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, intro, jump]);

  useFrame((_, dtRaw) => {
    const c = controls.current; if (!c) return;
    const cam = camera as THREE.PerspectiveCamera;
    const dt = Math.min(dtRaw, 0.25);
    const st = useStore.getState();
    const f = fly.current;
    const W = size.width, H = size.height;
    if (ui.stamp === 0) measureLayout(W, H);
    // vue d'ensemble : direction et distance ajustées aux positions du jour
    if (!st.intro && focus === null) {
      if (f.needsFit) {
        measureLayout(W, H);
        Object.assign(ov.current, fitOverview(W, H, ui.free, f.toDir));
        f.needsFit = false; ov.current.stamp = ui.stamp; ov.current.frames = 0;
      } else if (!f.active && ov.current.frames++ % 30 === 0) {
        const dir = tmp.d.copy(cam.position).sub(c.target).normalize();
        Object.assign(ov.current, fitOverview(W, H, ui.free, null, dir));
      }
    }
    const target = focus === null ? tmp.c.set(0, 0, 0) : tmp.c.copy(sim.planetPos[focus]);
    const rawRef = refDist(focus);
    // lissage (ouverture de la fiche, redimensionnement) en échelle logarithmique
    if (!(refS.current > 0) || f.active) refS.current = rawRef;
    else refS.current = Math.exp(Math.log(refS.current) + (Math.log(rawRef) - Math.log(refS.current)) * (1 - Math.exp(-dt * 6)));
    const ref = refS.current;
    if (f.active) {
      f.t += dt / f.dur;
      const e = ease(Math.min(f.t, 1));
      const tgt = tmp.a.copy(f.fromTarget).lerp(target, e);
      const fromLen = f.fromOffset.length();
      const len = Math.exp(Math.log(fromLen) + (Math.log(ref) - Math.log(fromLen)) * e);
      const dir = tmp.b.copy(f.fromOffset).normalize().lerp(f.toDir, e).normalize();
      c.target.copy(tgt);
      cam.position.copy(tgt).addScaledVector(dir, len);
      if (f.t >= 1) f.active = false;
      c.enabled = !f.active;
    } else {
      const off = tmp.a.copy(cam.position).sub(c.target);
      if (prevRef.current > 0) off.multiplyScalar(ref / prevRef.current);
      c.target.copy(target);
      cam.position.copy(target).add(off);
      c.enabled = true;
    }
    prevRef.current = ref;
    cam.lookAt(c.target);
    const dist = cam.position.distanceTo(c.target);
    c.minDistance = focus === null ? sim.sunRadius * 2.5 : sim.planetRadius[focus] * 1.35;
    c.maxDistance = Math.max(ref, lmix(ov.current.d, realOverview(portrait), sim.blend)) * 6;
    c.autoRotate = st.intro && !REDUCED.v;
    // plans de découpe adaptés à l'échelle
    cam.near = Math.min(Math.max(dist * 0.02, 1e-4), 2);
    cam.far = Math.min(cam.near * 1e6, 5e5);
    // décalage de cadrage : centre la cible dans la zone libre de l'interface
    let vx = 0, vy = 0;
    if (st.intro) {
      if (ui.mode === "phone") vy = H * 0.2; else vx = -W * 0.2;
    } else {
      vx = W / 2 - (ui.free.l + ui.free.r) / 2;
      vy = H / 2 - (ui.free.t + ui.free.b) / 2;
      // vue d'ensemble : décalage de la boîte englobante, ramené à la distance réelle de la caméra
      if (focus === null && sim.blend < 0.999) {
        const k = (ov.current.d / Math.max(dist, 1e-6)) * (1 - sim.blend);
        vx += ov.current.ox * k; vy += ov.current.oy * k;
      }
    }
    const kk = view.current.init ? 1 - Math.exp(-dt * 5) : 1;
    view.current.init = true;
    view.current.x += (vx - view.current.x) * kk;
    view.current.y += (vy - view.current.y) * kk;
    cam.setViewOffset(W, H, view.current.x, view.current.y, W, H);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }, -0.5);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      rotateSpeed={0.6}
      zoomSpeed={0.8}
      autoRotateSpeed={0.35}
    />
  );
}

export default function Scene() {
  const hi = !isSmall();
  useEffect(() => {
    REDUCED.v = prefersReducedMotion();
    if (REDUCED.v) useStore.setState({ paused: true });
  }, []);
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ fov: 42, near: 0.1, far: 5000, position: [40, 45, 70] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => undefined}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#04060b"]} />
      <ambientLight intensity={0.055} />
      <pointLight position={[0, 0, 0]} intensity={3.2} decay={0} color="#fff3e2" />
      <LayoutProbe />
      <SimDriver />
      <Stars />
      <Sun />
      {PLANETS.map((p, i) => <PlanetBody key={p.id} i={i} hi={hi} />)}
      <Moon hi={hi} />
      <AsteroidBelt />
      <Orbits />
      <CameraRig />
      <LabelDriver />
    </Canvas>
  );
}
