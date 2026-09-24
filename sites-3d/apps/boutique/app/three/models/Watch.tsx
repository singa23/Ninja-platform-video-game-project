"use client";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { lathe, Part, Shadow, type ModelProps, useGeometries } from "../common";
import { WatchFace } from "../textures";

const CY = 0.7; // centre du boîtier

function strapCurve() {
  const pts: THREE.Vector3[] = [];
  const ry = 0.68;
  const rz = 0.5;
  const zc = -0.58;
  const th0 = 0.92;
  pts.push(new THREE.Vector3(0, CY + 0.545, -0.06));
  for (let i = 0; i <= 28; i++) {
    const th = th0 + (i / 28) * (Math.PI * 2 - 2 * th0);
    pts.push(new THREE.Vector3(0, CY + ry * Math.sin(th), zc + rz * Math.cos(th)));
  }
  pts.push(new THREE.Vector3(0, CY - 0.545, -0.06));
  return new THREE.CatmullRomCurve3(pts, false, "centripetal");
}

export default function Watch({ c, opts, explode, live = true }: ModelProps) {
  const titane = opts.boitier === "titane";
  const caseColor = titane ? "#8E9196" : "#C4C8CE";
  const face = useMemo(() => new WatchFace(c.accent), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => face.setAccent(c.accent), [c.accent, face]);
  useEffect(() => () => face.tex.dispose(), [face]);
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && face.draw(true));
    return () => {
      alive = false;
    };
  }, [face]);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      const before = face.last;
      face.draw();
      if (face.last !== before) invalidate();
    }, 250);
    return () => window.clearInterval(id);
  }, [live, face, invalidate]);

  const geo = useGeometries(() => {
    const caseG = lathe(
      [
        [0, -0.12],
        [0.36, -0.12],
        [0.44, -0.105],
        [0.495, -0.07],
        [0.518, -0.02],
        [0.52, 0.03],
        [0.51, 0.07],
        [0.48, 0.085],
        [0.44, 0.085],
      ],
      72,
    );
    const bezel = lathe(
      [
        [0.43, 0.08],
        [0.495, 0.08],
        [0.505, 0.1],
        [0.495, 0.125],
        [0.47, 0.135],
        [0.44, 0.135],
        [0.428, 0.12],
        [0.43, 0.08],
      ],
      72,
    );
    const sensor = lathe(
      [
        [0, -0.2],
        [0.12, -0.195],
        [0.22, -0.17],
        [0.3, -0.13],
        [0.34, -0.12],
      ],
      48,
    );
    const curve = strapCurve();
    // Section du bracelet : avec extrudePath, shape.x suit la normale de Frenet (ici l'axe X,
    // donc la largeur du bracelet) et shape.y la binormale (radiale, donc l'épaisseur).
    const shape = new THREE.Shape();
    const w = 0.19; // demi-largeur (bracelet 22 mm)
    const th = 0.032; // demi-épaisseur
    const r = 0.026;
    shape.moveTo(-w + r, -th);
    shape.lineTo(w - r, -th);
    shape.quadraticCurveTo(w, -th, w, -th + r * 0.6);
    shape.lineTo(w, th - r * 0.6);
    shape.quadraticCurveTo(w, th, w - r, th);
    shape.lineTo(-w + r, th);
    shape.quadraticCurveTo(-w, th, -w, th - r * 0.6);
    shape.lineTo(-w, -th + r * 0.6);
    shape.quadraticCurveTo(-w, -th, -w + r, -th);
    const strap = new THREE.ExtrudeGeometry(shape, { steps: 140, curveSegments: 4, bevelEnabled: false, extrudePath: curve });
    strap.computeVertexNormals();
    // trous du bracelet
    const holes: { p: THREE.Vector3; q: THREE.Quaternion }[] = [];
    const center = new THREE.Vector3(0, CY, -0.58);
    for (let i = 0; i < 7; i++) {
      const u = 0.62 + i * 0.03;
      const p = curve.getPointAt(u);
      const out = p.clone().sub(center).setX(0).normalize();
      holes.push({ p: p.clone().add(out.clone().multiplyScalar(0.031)), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), out) });
    }
    const keeperP = curve.getPointAt(0.3);
    const keeperT = curve.getTangentAt(0.3);
    const keeper = new RoundedBoxGeometry(0.43, 0.075, 0.1, 3, 0.02);
    const lug = new RoundedBoxGeometry(0.07, 0.2, 0.12, 3, 0.028);
    const battery = new RoundedBoxGeometry(0.56, 0.05, 0.44, 3, 0.02);
    return { caseG, bezel, sensor, strap, holes, keeperP, keeperT, keeper, lug, battery };
  }, []);

  const ticks = useMemo(() => {
    const arr: { p: [number, number, number]; r: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      arr.push({ p: [Math.cos(a) * 0.468, Math.sin(a) * 0.468, 0.133], r: a });
    }
    return arr;
  }, []);

  const keeperQ = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), geo.keeperT), [geo]);

  const metal = <meshPhysicalMaterial color={caseColor} metalness={1} roughness={titane ? 0.34 : 0.26} clearcoat={0.3} envMapIntensity={1.2} />;
  const buttons: [number, boolean][] = [
    [0.52, true],
    [-0.52, false],
    [Math.PI - 0.52, false],
    [Math.PI, false],
    [Math.PI + 0.52, false],
  ];

  return (
    <group>
      <Part e={explode} off={[0, 0, -0.74]}>
        <mesh geometry={geo.strap}>
          <meshPhysicalMaterial color={c.strap} roughness={0.78} envMapIntensity={0.55} />
        </mesh>
        {geo.holes.map((h, i) => (
          <mesh key={i} position={h.p} quaternion={h.q}>
            <cylinderGeometry args={[0.022, 0.022, 0.012, 16]} />
            <meshStandardMaterial color="#08090b" roughness={0.9} />
          </mesh>
        ))}
        <mesh geometry={geo.keeper} position={geo.keeperP} quaternion={keeperQ}>
          <meshPhysicalMaterial color={c.strap} roughness={0.7} envMapIntensity={0.55} />
        </mesh>
        {/* pompes (barrettes) aux deux extrémités */}
        {[1, -1].map((s) => (
          <mesh key={s} position={[0, CY + s * 0.5, -0.05]} rotation-z={Math.PI / 2}>
            <cylinderGeometry args={[0.014, 0.014, 0.46, 12]} />
            <meshPhysicalMaterial color="#b9bdc2" metalness={1} roughness={0.25} />
          </mesh>
        ))}
      </Part>

      <group position={[0, CY, 0]} rotation={[0, 0, 0]}>
        {/* boîtier */}
        <mesh geometry={geo.caseG} rotation-x={Math.PI / 2}>
          {metal}
        </mesh>
        {[
          [0.235, 0.47],
          [-0.235, 0.47],
          [0.235, -0.47],
          [-0.235, -0.47],
        ].map(([x, y], i) => (
          <mesh key={i} geometry={geo.lug} position={[x, y, -0.035]}>
            {metal}
          </mesh>
        ))}
        {/* lunette */}
        <Part e={explode} off={[0, 0, 0.46]}>
          <mesh geometry={geo.bezel} rotation-x={Math.PI / 2}>
            <meshPhysicalMaterial color={titane ? "#6F7277" : "#2A2D32"} metalness={0.9} roughness={0.3} clearcoat={0.6} />
          </mesh>
          {ticks.map((tk, i) => (
            <mesh key={i} position={tk.p} rotation-z={tk.r}>
              <boxGeometry args={[i % 3 === 0 ? 0.05 : 0.03, 0.008, 0.004]} />
              <meshBasicMaterial color={i === 0 ? c.accent : "#e8eaec"} toneMapped={false} />
            </mesh>
          ))}
        </Part>
        {/* écran */}
        <Part e={explode} off={[0, 0, 0.25]}>
          <mesh position={[0, 0, 0.088]}>
            <circleGeometry args={[0.43, 72]} />
            <meshBasicMaterial map={face.tex} toneMapped={false} />
          </mesh>
        </Part>
        {/* verre */}
        <Part e={explode} off={[0, 0, 0.7]}>
          <mesh position={[0, 0, 0.128]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.435, 0.435, 0.012, 72]} />
            <meshPhysicalMaterial color="#ffffff" transparent opacity={0.12} roughness={0.02} metalness={0} clearcoat={1} envMapIntensity={2.5} depthWrite={false} />
          </mesh>
        </Part>
        {/* boutons */}
        {buttons.map(([a, accent], i) => (
          <Part key={i} e={explode} off={[Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0]}>
            <mesh position={[Math.cos(a) * 0.535, Math.sin(a) * 0.535, 0.0]} rotation-z={a - Math.PI / 2}>
              <cylinderGeometry args={[0.042, 0.042, 0.07, 20]} />
              <meshPhysicalMaterial color={accent ? c.accent : caseColor} metalness={accent ? 0.2 : 1} roughness={0.3} />
            </mesh>
          </Part>
        ))}
        {/* batterie (visible en vue éclatée) */}
        <Part e={explode} off={[0, 0, -0.28]}>
          <mesh geometry={geo.battery} position={[0, 0, -0.05]} rotation-x={Math.PI / 2}>
            <meshPhysicalMaterial color="#9aa0a6" metalness={0.8} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, -0.023]}>
            <planeGeometry args={[0.3, 0.12]} />
            <meshBasicMaterial color={c.accent} toneMapped={false} />
          </mesh>
        </Part>
        {/* capteur optique */}
        <Part e={explode} off={[0, 0, -0.44]}>
          <mesh geometry={geo.sensor} rotation-x={Math.PI / 2}>
            <meshPhysicalMaterial color="#111316" roughness={0.15} clearcoat={1} />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.07, Math.sin(a) * 0.07, -0.201]} rotation-y={Math.PI}>
                <circleGeometry args={[0.018, 16]} />
                <meshBasicMaterial color="#3dff8a" toneMapped={false} />
              </mesh>
            );
          })}
        </Part>
      </group>
      <Shadow scale={[1.0, 1.5]} z={-0.6} opacity={0.6} />
    </group>
  );
}
