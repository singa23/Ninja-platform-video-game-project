"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useDojo, GAME_LENGTH } from "./dojoStore";
import { sfx } from "./sfx";
import { floorTexture, glowTexture, shojiTexture, strawTexture, targetTexture, rng } from "./textures";
import enemyImg from "@/assets/enemy.png";
import enemy2Img from "@/assets/enemy2.png";
import birdImg from "@/assets/bird.png";
import bird2Img from "@/assets/bird2.png";

type Kind = "target" | "coin" | "oni" | "bird";
type Ent = {
  kind: Kind; alive: boolean; gen: number; pos: THREE.Vector3; vel: THREE.Vector3; radius: number;
  t: number; // âge dans l'état courant
  state: "hidden" | "live" | "dying";
  // paramètres de mouvement
  a: number; b: number; c: number; d: number; base: THREE.Vector3;
  spin: number; obj: THREE.Object3D | null;
  killedGen: number; // génération tuée (un shuriken arrivé après n'est pas un raté)
};
type Proj = {
  active: boolean; from: THREE.Vector3; to: THREE.Vector3; t: number; dur: number;
  ent: Ent | null; gen: number; offset: THREE.Vector3; stuck: boolean; stuckT: number; stuckEnt: Ent | null; stuckGen: number;
  obj: THREE.Object3D | null; bull: boolean;
};

const WALL_Z = -6;
const R = rng(2024);
const rand = (a: number, b: number) => a + R() * (b - a);

function makeEnt(kind: Kind, radius: number): Ent {
  return {
    kind, alive: false, gen: 0, pos: new THREE.Vector3(0, -10, 0), vel: new THREE.Vector3(), radius, t: 0, state: "hidden",
    a: 0, b: 0, c: 0, d: 0, base: new THREE.Vector3(), spin: 0, obj: null, killedGen: -1,
  };
}

function shurikenGeometry() {
  const s = new THREE.Shape();
  const P = 4, ro = 0.2, ri = 0.055;
  for (let i = 0; i < P * 2; i++) {
    const a = (i / (P * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? ro : ri;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
  }
  s.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.028, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.01, bevelSegments: 1 });
  g.center();
  return g;
}

function coinGeometry() {
  const s = new THREE.Shape();
  s.absarc(0, 0, 0.3, 0, Math.PI * 2, false);
  const h = new THREE.Path();
  h.moveTo(-0.08, -0.08); h.lineTo(-0.08, 0.08); h.lineTo(0.08, 0.08); h.lineTo(0.08, -0.08); h.closePath();
  s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 24 });
  g.center();
  return g;
}

function useImg(src: string) {
  return useMemo(() => {
    const t = new THREE.TextureLoader().load(src);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [src]);
}

function World({ reticle }: { reticle: React.MutableRefObject<{ x: number; y: number } | null> }) {
  const { camera, gl, size } = useThree();
  const shoji = useMemo(shojiTexture, []);
  const floor = useMemo(() => { const t = floorTexture(); t.repeat.set(3, 3); return t; }, []);
  const tgt = useMemo(targetTexture, []);
  const straw = useMemo(() => { const t = strawTexture(); t.repeat.set(3, 1); return t; }, []);
  const glow = useMemo(() => glowTexture(), []);
  const oniA = useImg(enemyImg.src), oniB = useImg(enemy2Img.src);
  const birdA = useImg(birdImg.src), birdB = useImg(bird2Img.src);
  const shurikenGeo = useMemo(shurikenGeometry, []);
  const coinGeo = useMemo(coinGeometry, []);
  const targetMats = useMemo(() => [
    new THREE.MeshStandardMaterial({ map: straw, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ map: tgt, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: "#5b4630" }),
  ], [straw, tgt]);

  const ents = useMemo(() => [
    ...Array.from({ length: 4 }, () => makeEnt("target", 0.56)),
    ...Array.from({ length: 6 }, () => makeEnt("coin", 0.36)),
    ...Array.from({ length: 2 }, () => makeEnt("oni", 0.55)),
    makeEnt("bird", 0.55),
  ], []);
  const projs = useMemo<Proj[]>(() => Array.from({ length: 14 }, () => ({
    active: false, from: new THREE.Vector3(), to: new THREE.Vector3(), t: 0, dur: 0.2, ent: null, gen: 0, offset: new THREE.Vector3(),
    stuck: false, stuckT: 0, stuckEnt: null, stuckGen: 0, obj: null, bull: false,
  })), []);

  // Étincelles
  const SPARKS = 180;
  const sparkMesh = useRef<THREE.InstancedMesh | null>(null);
  const sparks = useMemo(() => Array.from({ length: SPARKS }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, max: 1, s: 1 })), []);
  const sparkIdx = useRef(0);
  const shake = useRef(0);
  const clockRef = useRef({ elapsed: 0, lastSec: -1, spawnCoin: 1, spawnOni: 4, spawnBird: 7, cd: 0, lastTick: 3 });
  const phaseRef = useRef(useDojo.getState().phase);
  const runRef = useRef(useDojo.getState().runId);
  const tmp = useMemo(() => ({ v: new THREE.Vector3(), v2: new THREE.Vector3(), m: new THREE.Matrix4(), q: new THREE.Quaternion(), c: new THREE.Color(), ray: new THREE.Raycaster() }), []);
  const camBase = useMemo(() => new THREE.Vector3(0, 1.75, 6.2), []);
  const narrow = useRef(1);
  const lookY = useRef(1.75);

  useEffect(() => useDojo.subscribe((s) => {
    if (s.runId !== runRef.current) {
      runRef.current = s.runId;
      const c = clockRef.current;
      c.elapsed = 0; c.spawnCoin = 0.6; c.spawnOni = 3.5; c.spawnBird = 6; c.cd = 0; c.lastSec = -1; c.lastTick = 4;
      projs.forEach((p) => { p.active = false; p.stuck = false; if (p.obj) p.obj.visible = false; });
    }
    phaseRef.current = s.phase;
  }), [projs]);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const portrait = size.width / size.height < 0.9;
    narrow.current = THREE.MathUtils.clamp(size.width / size.height / 1.5, 0.55, 1);
    // portrait : champ plus serré, visée un peu relevée pour agrandir les cibles et remplir le cadre
    lookY.current = portrait ? 2.7 : 1.75;
    cam.fov = portrait ? 47 : 50;
    camBase.set(0, portrait ? 1.8 : 1.75, portrait ? 7.4 : 6.2);
    cam.position.copy(camBase);
    cam.lookAt(0, lookY.current, -2);
    cam.updateProjectionMatrix();
  }, [camera, size, camBase]);

  const burst = (p: THREE.Vector3, color: string, n: number, speed = 3) => {
    for (let i = 0; i < n; i++) {
      const idx = sparkIdx.current++ % SPARKS;
      const s = sparks[idx];
      s.p.copy(p);
      s.v.set(rand(-1, 1), rand(-0.4, 1.4), rand(-0.3, 1)).normalize().multiplyScalar(speed * rand(0.4, 1.2));
      s.life = s.max = rand(0.35, 0.8);
      s.s = rand(0.025, 0.06);
      sparkMesh.current?.setColorAt(idx, tmp.c.set(color));
    }
    if (sparkMesh.current?.instanceColor) sparkMesh.current.instanceColor.needsUpdate = true;
  };

  const toScreen = (p: THREE.Vector3) => {
    const v = tmp.v2.copy(p).project(camera);
    return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
  };

  // ---------------------------------------------------------------- lancer
  const throwAt = (nx: number, ny: number) => {
    const phase = phaseRef.current;
    if (phase === "countdown") return;
    const c = clockRef.current;
    const now = performance.now();
    if (now - c.cd < 90) return;
    c.cd = now;
    const p = projs.find((q) => !q.active && !q.stuck) || projs.find((q) => !q.active) || projs[0];
    tmp.ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
    const ray = tmp.ray.ray;
    // Les cibles déjà visées par un shuriken en vol passent après les autres : un double tap
    // rapide sur la même cible ne doit pas casser le combo.
    const claimed = new Set(projs.filter((q) => q.active && q.ent).map((q) => q.ent));
    let best: Ent | null = null, bestT = Infinity, bestC: Ent | null = null, bestCT = Infinity;
    for (const e of ents) {
      // une cible abattue il y a un instant reste « visée » : le second shuriken ne compte pas comme raté
      const justKilled = e.state === "dying" && e.t < 0.4 && e.killedGen === e.gen;
      if (e.state !== "live" && !justKilled) continue;
      const oc = tmp.v.copy(ray.origin).sub(e.pos);
      const b = oc.dot(ray.direction);
      const cc = oc.lengthSq() - (e.radius * 1.15) ** 2;
      const disc = b * b - cc;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t <= 0) continue;
      if (claimed.has(e) || justKilled) { if (t < bestCT) { bestCT = t; bestC = e; } }
      else if (t < bestT) { bestT = t; best = e; }
    }
    if (!best && bestC) { best = bestC; bestT = bestCT; }
    p.active = true; p.stuck = false; p.stuckEnt = null; p.t = 0; p.bull = false;
    p.from.set(0.55, -0.55, -0.4).applyQuaternion(camera.quaternion).add(camera.position);
    if (best) {
      const hitPoint = ray.at(bestT, new THREE.Vector3());
      p.ent = best; p.gen = best.gen;
      p.offset.copy(hitPoint).sub(best.pos);
      if (best.kind === "target") {
        const planar = Math.hypot(p.offset.x, p.offset.y);
        p.bull = planar < 0.17;
        p.offset.z = 0.08;
      }
      p.to.copy(hitPoint);
    } else {
      p.ent = null;
      // mur du fond ou sol
      const tWall = (WALL_Z + 0.02 - ray.origin.z) / ray.direction.z;
      const tFloor = ray.direction.y < 0 ? (0.01 - ray.origin.y) / ray.direction.y : Infinity;
      const tt = Math.min(tWall > 0 ? tWall : Infinity, tFloor, 40);
      p.to.copy(ray.at(tt, new THREE.Vector3()));
    }
    p.dur = Math.max(0.12, p.from.distanceTo(p.to) / 30);
    if (p.obj) { p.obj.visible = true; p.obj.position.copy(p.from); }
    if (phase === "playing") useDojo.getState().throwOne();
    if (useDojo.getState().sound) sfx("throw");
  };

  useEffect(() => {
    const w = window as unknown as { __dojoAim?: () => { x: number; y: number; kind: string }[] };
    w.__dojoAim = () => {
      const r = gl.domElement.getBoundingClientRect();
      const claimed = new Set(projs.filter((p) => p.active && p.ent).map((p) => p.ent));
      return ents.filter((e) => e.state === "live" && !claimed.has(e)).map((e) => {
        const v = e.pos.clone().project(camera);
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, kind: e.kind };
      }).filter((p) => p.x > r.left + 8 && p.x < r.right - 8 && p.y > r.top + 70 && p.y < r.bottom - 8);
    };
    return () => { delete w.__dojoAim; };
  }, [gl, camera, ents, projs]);

  useEffect(() => {
    const el = gl.domElement;
    const onDown = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = -((e.clientY - r.top) / r.height) * 2 + 1;
      reticle.current = { x: nx, y: ny };
      throwAt(nx, ny);
    };
    const onKey = (e: Event) => {
      const d = (e as CustomEvent<{ x: number; y: number; snap?: boolean }>).detail;
      let nx = d.x, ny = d.y;
      if (d.snap) {
        // aide à la visée clavier : le tir s'aimante sur la cible vivante la plus proche du réticule
        const claimed = new Set(projs.filter((p) => p.active && p.ent).map((p) => p.ent));
        const R2 = Math.max(120, Math.min(size.width, size.height) * 0.45);
        let best = Infinity;
        for (const en of ents) {
          if (en.state !== "live" || claimed.has(en)) continue;
          const v = tmp.v2.copy(en.pos).project(camera);
          if (v.z > 1) continue;
          const dx = ((v.x - d.x) / 2) * size.width, dy = ((v.y - d.y) / 2) * size.height;
          const dist = Math.hypot(dx, dy);
          if (dist < R2 && dist < best) { best = dist; nx = v.x; ny = v.y; }
        }
      }
      reticle.current = { x: d.x, y: d.y };
      throwAt(nx, ny);
    };
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("dojo-throw", onKey);
    return () => { el.removeEventListener("pointerdown", onDown); window.removeEventListener("dojo-throw", onKey); };
  });

  // ---------------------------------------------------------------- spawns
  const spawn = (e: Ent, difficulty: number) => {
    e.gen++; e.state = "live"; e.t = 0; e.alive = true;
    if (e.obj) { e.obj.visible = true; e.obj.rotation.set(0, 0, 0); e.obj.scale.setScalar(1); }
    if (e.kind === "target") {
      const idx = ents.filter((x) => x.kind === "target").indexOf(e);
      const lanes = [[1.0, -2.4], [2.1, -3.4], [3.0, -4.4], [1.6, -1.6]];
      const [y, z] = lanes[idx % 4];
      e.base.set(0, y, z);
      e.a = rand(1.6, 3.4) * narrow.current; // amplitude
      e.b = rand(0.7, 1.3) * (1 + difficulty * 0.9) * (R() > 0.5 ? 1 : -1); // vitesse angulaire
      e.c = R() * Math.PI * 2;
      e.d = idx === 3 ? rand(0.2, 0.5) : 0; // oscillation verticale
    } else if (e.kind === "coin") {
      const side = R() > 0.5 ? 1 : -1;
      const W = narrow.current;
      e.pos.set(side * rand(2.8, 4.2) * W, -0.4, rand(-3.6, -1.2));
      e.vel.set(-side * rand(1.4, 3.0) * W, rand(6.2, 7.6), 0);
      e.spin = rand(5, 9);
    } else if (e.kind === "oni") {
      e.base.set(rand(-3.4, 3.4) * narrow.current, 0, -3.05);
      e.a = Math.max(0.75, 1.25 - difficulty * 0.5); // durée visible
    } else if (e.kind === "bird") {
      const side = R() > 0.5 ? 1 : -1;
      e.base.set(side * 6.5 * narrow.current, rand(3.0, 3.8), -4.2);
      e.a = -side * rand(2.4, 3.2) * (0.5 + narrow.current * 0.5);
    }
  };

  const kill = (e: Ent, p: Proj) => {
    e.state = "dying"; e.t = 0; e.killedGen = e.gen;
    const st = useDojo.getState();
    const scr = toScreen(e.pos);
    const playing = phaseRef.current === "playing";
    const color = e.kind === "coin" ? "#f2b84b" : e.kind === "target" ? "#e8452c" : e.kind === "oni" ? "#ff3b3b" : "#ff9ab0";
    burst(tmp.v.copy(e.pos).add(p.offset), color, e.kind === "coin" ? 26 : 18, e.kind === "coin" ? 4 : 3);
    burst(tmp.v.copy(e.pos).add(p.offset), "#fff6e0", 8, 2);
    shake.current = 0.07;
    if (st.sound) sfx(e.kind === "coin" ? "gold" : e.kind === "oni" ? "oni" : "hit");
    if (!playing) return;
    if (e.kind === "target") st.hit(p.bull ? 150 : 100, scr.x, scr.y, p.bull ? "PLEIN CENTRE" : "", "hit");
    else if (e.kind === "coin") st.hit(150, scr.x, scr.y, "PIÈCE", "gold");
    else if (e.kind === "oni") st.hit(250, scr.x, scr.y, "ONI", "oni");
    else st.hit(300, scr.x, scr.y, "OISEAU", "oni");
  };

  // ---------------------------------------------------------------- boucle
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const c = clockRef.current;
    const st = useDojo.getState();
    const phase = phaseRef.current;

    if (phase === "countdown") {
      c.elapsed += Math.min(rawDt, 0.25);
      const left = 3 - Math.floor(c.elapsed / 0.65);
      if (left !== c.lastTick) { c.lastTick = left; if (left > 0 && st.sound) sfx("tick"); }
      if (left !== st.countdown && left > 0) useDojo.setState({ countdown: left });
      if (c.elapsed >= 1.95) { c.elapsed = 0; st.go(); }
    } else if (phase === "playing") {
      c.elapsed += Math.min(rawDt, 0.25);
      const left = Math.max(0, GAME_LENGTH - c.elapsed);
      const tenth = Math.ceil(left * 10) / 10;
      if (tenth !== st.timeLeft) st.tick(tenth);
      if (left <= 0) { st.finish(); if (st.sound) sfx("gong"); }
    }
    const playing = phase === "playing";
    const difficulty = playing ? c.elapsed / GAME_LENGTH : 0.15;
    const T = state.clock.elapsedTime;

    // Apparitions
    if (phase !== "countdown") {
      c.spawnCoin -= dt; c.spawnOni -= dt; c.spawnBird -= dt;
      if (c.spawnCoin <= 0) {
        const e = ents.find((x) => x.kind === "coin" && x.state === "hidden");
        if (e) spawn(e, difficulty);
        if (playing && difficulty > 0.6 && R() > 0.5) { const e2 = ents.find((x) => x.kind === "coin" && x.state === "hidden"); if (e2) spawn(e2, difficulty); }
        c.spawnCoin = playing ? rand(1.0, 1.7) * (1 - difficulty * 0.45) : 2.4;
      }
      if (c.spawnOni <= 0) {
        const e = ents.find((x) => x.kind === "oni" && x.state === "hidden");
        if (e) spawn(e, difficulty);
        c.spawnOni = playing ? rand(1.8, 3.0) * (1 - difficulty * 0.4) : 4;
      }
      if (c.spawnBird <= 0) {
        const e = ents.find((x) => x.kind === "bird" && x.state === "hidden");
        if (e) spawn(e, difficulty);
        c.spawnBird = playing ? rand(5, 8) : 9;
      }
    }
    for (const e of ents) if (e.kind === "target" && e.state === "hidden") spawn(e, difficulty);

    // Entités
    for (const e of ents) {
      e.t += dt;
      const o = e.obj;
      if (e.state === "hidden") { if (o) o.visible = false; continue; }
      if (e.kind === "target") {
        if (e.state === "live") {
          e.c += e.b * dt * (playing ? 1 : 0.6);
          e.pos.set(e.base.x + Math.sin(e.c) * e.a, e.base.y + Math.sin(e.c * 2.3) * e.d, e.base.z);
          if (o) { o.position.copy(e.pos); o.rotation.set(0, Math.sin(e.c) * 0.25, 0); }
        } else {
          if (o) { o.rotation.x = -Math.min(1.5, e.t * 5); o.position.y = e.pos.y - e.t * e.t * 4; }
          if (e.t > 0.7) e.state = "hidden";
        }
      } else if (e.kind === "coin") {
        if (e.state === "live") {
          e.vel.y -= 7.5 * dt;
          e.pos.addScaledVector(e.vel, dt);
          if (o) { o.position.copy(e.pos); o.rotation.y += e.spin * dt; o.rotation.x = 0.3; }
          if (e.pos.y < -1.2 && e.vel.y < 0) { e.state = "hidden"; }
        } else {
          if (o) o.scale.setScalar(Math.max(0, 1 - e.t * 6));
          if (e.t > 0.2) e.state = "hidden";
        }
      } else if (e.kind === "oni") {
        let y = 0;
        if (e.state === "live") {
          const up = 0.18, stay = e.a;
          if (e.t < up) y = e.t / up;
          else if (e.t < up + stay) y = 1;
          else if (e.t < up * 2 + stay) y = 1 - (e.t - up - stay) / up;
          else { e.state = "hidden"; }
          y = 1 - Math.pow(1 - y, 2);
          e.pos.set(e.base.x, -0.1 + y * 1.45, e.base.z);
          if (o) {
            o.position.copy(e.pos);
            const mesh = o.children[0] as THREE.Mesh;
            (mesh.material as THREE.MeshBasicMaterial).map = Math.floor(T * 6) % 2 ? oniB : oniA;
            o.rotation.z = Math.sin(T * 10) * 0.05;
          }
        } else {
          if (o) { o.rotation.z += dt * 14; o.position.y += dt * 3; o.position.z += dt * 2; o.scale.setScalar(Math.max(0, 1 - e.t * 2)); }
          if (e.t > 0.5) e.state = "hidden";
        }
      } else if (e.kind === "bird") {
        if (e.state === "live") {
          e.pos.set(e.base.x + e.a * e.t, e.base.y + Math.sin(e.t * 3) * 0.35, e.base.z);
          if (o) {
            o.position.copy(e.pos);
            o.scale.x = e.a > 0 ? -1 : 1;
            const mesh = o.children[0] as THREE.Mesh;
            (mesh.material as THREE.MeshBasicMaterial).map = Math.floor(T * 10) % 2 ? birdB : birdA;
          }
          if (Math.abs(e.pos.x) > 7.2 * narrow.current && e.t > 1) e.state = "hidden";
        } else {
          if (o) { o.rotation.z += dt * 10; o.position.y -= dt * 5; }
          if (e.t > 0.6) e.state = "hidden";
        }
      }
      if (o) o.visible = e.state !== "hidden";
    }

    // Projectiles
    for (const p of projs) {
      const o = p.obj;
      if (!o) continue;
      if (p.active) {
        p.t += dt;
        if (p.ent && p.ent.gen === p.gen && p.ent.state === "live") p.to.copy(p.ent.pos).add(p.offset);
        const k = Math.min(1, p.t / p.dur);
        o.position.lerpVectors(p.from, p.to, k);
        o.position.y += Math.sin(k * Math.PI) * 0.12;
        o.rotation.set(-1.2, 0, T * 40);
        if (k >= 1) {
          p.active = false;
          if (p.ent && p.ent.gen === p.gen && p.ent.state === "live") {
            kill(p.ent, p);
            if (p.ent.kind === "target") { p.stuck = true; p.stuckEnt = p.ent; p.stuckGen = p.ent.gen; p.stuckT = 0; }
            else { o.visible = false; }
          } else {
            // raté : se plante dans le mur ou le sol — sauf si un autre shuriken a déjà eu la cible
            const stolen = !!p.ent && p.ent.killedGen === p.gen;
            if (p.ent) {
              const tWall = WALL_Z + 0.03;
              const dir = tmp.v.copy(p.to).sub(p.from).normalize();
              const tt = (tWall - p.to.z) / dir.z;
              if (tt > 0 && tt < 30) p.to.addScaledVector(dir, tt);
              o.position.copy(p.to);
              p.ent = null;
            }
            p.stuck = true; p.stuckEnt = null; p.stuckT = 0;
            burst(o.position, "#d9c9a8", 6, 1.5);
            // doublé sur une cible déjà abattue : ni raté ni lancer compté dans la précision
            if (phaseRef.current === "playing" && stolen) useDojo.setState((s0) => ({ throws: Math.max(s0.hits, s0.throws - 1) }));
            if (phaseRef.current === "playing" && !stolen) {
              useDojo.getState().miss();
              const s = toScreen(o.position);
              useDojo.getState().pushPopup(s.x, s.y, "raté", "miss");
            }
            if (useDojo.getState().sound) sfx("wall");
          }
          if (!p.active && p.stuck) o.rotation.set(-0.15 + (p.stuckEnt ? 0 : 0.3), 0.2, T * 3);
        }
      } else if (p.stuck) {
        p.stuckT += dt;
        if (p.stuckEnt) {
          if (p.stuckEnt.gen !== p.stuckGen || p.stuckEnt.state === "hidden") { p.stuck = false; o.visible = false; }
          else if (p.stuckEnt.obj) {
            // suit la cible qui tombe
            o.position.copy(p.stuckEnt.obj.position).add(p.offset);
          }
        } else if (p.stuckT > 2.6) { p.stuck = false; o.visible = false; }
      } else o.visible = false;
    }

    // Étincelles
    const sm = sparkMesh.current;
    if (sm) {
      for (let i = 0; i < SPARKS; i++) {
        const s = sparks[i];
        if (s.life > 0) {
          s.life -= dt;
          s.v.y -= 6 * dt;
          s.p.addScaledVector(s.v, dt);
        }
        const sc = s.life > 0 ? s.s * (s.life / s.max) : 0;
        tmp.m.compose(s.p, tmp.q.setFromAxisAngle(tmp.v.set(0.3, 1, 0.2).normalize(), T * 8 + i), tmp.v2.set(sc, sc, sc));
        sm.setMatrixAt(i, tmp.m);
      }
      sm.instanceMatrix.needsUpdate = true;
    }

    // Caméra : léger balancement + secousse
    shake.current = Math.max(0, shake.current - dt * 0.5);
    const sh = shake.current;
    const aim = reticle.current;
    camera.position.set(
      camBase.x + (aim ? aim.x * 0.12 : Math.sin(T * 0.3) * 0.1) + (R() - 0.5) * sh,
      camBase.y + (aim ? aim.y * 0.06 : 0) + (R() - 0.5) * sh,
      camBase.z,
    );
    camera.lookAt(0, lookY.current, -2);
  });

  return (
    <>
      <color attach="background" args={["#120e18"]} />
      <fog attach="fog" args={["#120e18", 9, 22]} />
      <ambientLight intensity={0.55} color="#b8a6d8" />
      <hemisphereLight args={["#ffd9a8", "#1b1422", 0.7]} />
      <directionalLight position={[0, 5, 6]} intensity={1.3} color="#fff0dc" />
      <pointLight position={[0, 3.2, -4.5]} intensity={18} distance={10} decay={1.5} color="#ffc98a" />
      <pointLight position={[-4, 1.2, -2]} intensity={7} distance={7} decay={1.5} color="#3fe0d0" />
      <pointLight position={[4, 1.2, -2]} intensity={7} distance={7} decay={1.5} color="#ff5a3c" />

      {/* mur du fond, sol, piliers */}
      <mesh position={[0, 3.2, WALL_Z]}>
        <planeGeometry args={[16, 8]} />
        <meshLambertMaterial map={shoji} emissive="#ffffff" emissiveMap={shoji} emissiveIntensity={0.35} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -1]}>
        <planeGeometry args={[18, 16]} />
        <meshStandardMaterial map={floor} roughness={0.55} metalness={0.05} />
      </mesh>
      {[-5.6, 5.6].map((x) => (
        <mesh key={x} position={[x, 3, -3]}><boxGeometry args={[0.45, 6, 0.45]} /><meshStandardMaterial color="#2a1a14" /></mesh>
      ))}
      <mesh position={[0, 6, -3]}><boxGeometry args={[12, 0.4, 0.45]} /><meshStandardMaterial color="#2a1a14" /></mesh>
      {/* néons verticaux sur la face intérieure des piliers (loin du HUD) */}
      {[-5.34, 5.34].map((x) => (
        <mesh key={x} position={[x, 2.6, -2.76]}><boxGeometry args={[0.04, 4.6, 0.04]} /><meshBasicMaterial color="#5ff2e4" toneMapped={false} /></mesh>
      ))}
      {/* muret derrière lequel surgissent les oni */}
      <mesh position={[0, 0.42, -2.75]}><boxGeometry args={[9.6, 0.84, 0.3]} /><meshStandardMaterial color="#3b2419" roughness={0.8} /></mesh>
      <mesh position={[0, 0.86, -2.75]}><boxGeometry args={[9.8, 0.06, 0.4]} /><meshStandardMaterial color="#c43a22" /></mesh>
      {/* rails des cibles */}
      {[[1.0, -2.4], [2.1, -3.4], [3.0, -4.4]].map(([y, z], i) => (
        <mesh key={i} position={[0, y - 0.72, z]}><boxGeometry args={[9, 0.05, 0.05]} /><meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.4} /></mesh>
      ))}

      {/* entités */}
      {ents.map((e, i) => {
        const ref = (o: THREE.Object3D | null) => { e.obj = o; };
        if (e.kind === "target")
          return (
            <group key={i} ref={ref} visible={false}>
              <mesh rotation-x={Math.PI / 2} material={targetMats}><cylinderGeometry args={[0.56, 0.56, 0.16, 32]} /></mesh>
              <mesh position={[0, -0.45, -0.1]}><boxGeometry args={[0.06, 0.55, 0.06]} /><meshStandardMaterial color="#3b2419" /></mesh>
            </group>
          );
        if (e.kind === "coin")
          return (
            <group key={i} ref={ref} visible={false}>
              <mesh geometry={coinGeo}><meshStandardMaterial color="#f2b84b" metalness={0.85} roughness={0.28} emissive="#6b4210" emissiveIntensity={0.6} /></mesh>
              <mesh position={[0, 0, -0.05]}><planeGeometry args={[1.3, 1.3]} /><meshBasicMaterial map={glow} color="#f2b84b" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
            </group>
          );
        if (e.kind === "oni")
          return (
            <group key={i} ref={ref} visible={false}>
              <mesh><planeGeometry args={[1.0, 1.1]} /><meshBasicMaterial map={oniA} transparent alphaTest={0.3} /></mesh>
            </group>
          );
        return (
          <group key={i} ref={ref} visible={false}>
            <mesh><planeGeometry args={[1.25, 0.9]} /><meshBasicMaterial map={birdA} transparent alphaTest={0.3} /></mesh>
          </group>
        );
      })}
      {projs.map((p, i) => (
        <mesh key={i} ref={(o) => { p.obj = o; }} geometry={shurikenGeo} visible={false}>
          <meshStandardMaterial color="#c9d2dc" metalness={0.9} roughness={0.25} emissive="#223" />
        </mesh>
      ))}
      <instancedMesh ref={(m) => {
        sparkMesh.current = m;
        if (m && !m.instanceColor) { const c = new THREE.Color("#fff"); for (let i = 0; i < SPARKS; i++) m.setColorAt(i, c); }
      }} args={[undefined, undefined, SPARKS]} frustumCulled={false}>
        <tetrahedronGeometry args={[1, 0]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
    </>
  );
}

export default function DojoScene({ active }: { active: boolean }) {
  const reticle = useRef<{ x: number; y: number } | null>(null);
  const [mobile, setMobile] = useState(false);
  useEffect(() => { setMobile(window.innerWidth < 760); }, []);
  return (
    <Canvas
      dpr={[1, mobile ? 1.5 : 2]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 1.75, 6.2], fov: 50 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}
      data-testid="dojo-canvas"
    >
      <World reticle={reticle} />
    </Canvas>
  );
}
