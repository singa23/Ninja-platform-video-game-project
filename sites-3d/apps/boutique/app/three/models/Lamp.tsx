"use client";
import * as THREE from "three";
import { useMemo } from "react";
import { lathe, Rod, Shadow, type ModelProps, useGeometries } from "../common";
import { lightPool } from "../textures";

type V = THREE.Vector3Tuple;
const B: V = [0.02, 0.15, 0];
const E: V = [-0.14, 0.86, 0];
const HD: V = [0.56, 1.14, 0];
const DIR = new THREE.Vector3(0.22, -1, 0).normalize();

// Ressort de traction parallèle au bras, dans le plan médian (entre les deux tiges),
// accroché au bras par deux crochets à ses extrémités.
const T0 = 0.16;
const T1 = 0.7;
function frame(a: V, b: V) {
  const A = new THREE.Vector3(...a);
  const axis = new THREE.Vector3(...b).sub(A);
  const len = axis.length();
  axis.normalize();
  const side = new THREE.Vector3(-axis.y, axis.x, 0).normalize();
  return { A, axis, len, side };
}
function helix(a: V, b: V, off: number, turns: number, r: number) {
  const { A, axis, len, side } = frame(a, b);
  const z = new THREE.Vector3(0, 0, 1);
  const pts: THREE.Vector3[] = [];
  const n = turns * 12;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const ang = t * turns * Math.PI * 2;
    pts.push(
      A.clone()
        .add(axis.clone().multiplyScalar(len * (T0 + t * (T1 - T0))))
        .add(side.clone().multiplyScalar(off + Math.cos(ang) * r))
        .add(z.clone().multiplyScalar(Math.sin(ang) * r)),
    );
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 3, 0.0045, 6, false);
}
/** Crochets : du bras (axe, z = 0) jusqu'à l'extrémité du ressort. */
function hooks(a: V, b: V, off: number): [V, V][] {
  const { A, axis, len, side } = frame(a, b);
  return [T0 - 0.02, T1 + 0.02].map((t) => {
    const p = A.clone().add(axis.clone().multiplyScalar(len * t));
    return [p.toArray() as V, p.clone().add(side.clone().multiplyScalar(off)).toArray() as V];
  });
}
const OFF_A = 0.042;
const OFF_B = -0.04;

export default function Lamp({ c, opts }: ModelProps) {
  const warm = opts.temp !== "4000";
  const lightCol = warm ? "#FFC98A" : "#FFF3E2";
  const geo = useGeometries(() => {
    const base = lathe(
      [
        [0, 0],
        [0.33, 0],
        [0.345, 0.012],
        [0.35, 0.05],
        [0.33, 0.075],
        [0.1, 0.085],
        [0.06, 0.1],
        [0, 0.1],
      ],
      64,
    );
    const shade = lathe(
      [
        [0.215, -0.29],
        [0.21, -0.27],
        [0.17, -0.18],
        [0.1, -0.04],
        [0.07, 0.0],
        [0.045, 0.02],
      ],
      64,
    );
    const springA = helix(B, E, OFF_A, 16, 0.016);
    const springB = helix(E, HD, OFF_B, 12, 0.014);
    // le câble sort du socle par un passe-fil à l'arrière, puis court au sol
    const cable = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.2, 0.03, -0.2),
        new THREE.Vector3(-0.3, 0.022, -0.3),
        new THREE.Vector3(-0.4, 0.013, -0.38),
        new THREE.Vector3(-0.62, 0.012, -0.36),
        new THREE.Vector3(-0.95, 0.012, -0.55),
      ]),
      48,
      0.012,
      8,
      false,
    );
    return { base, shade, springA, springB, cable };
  }, []);
  const shadeQ = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), DIR), []);
  const poolTex = useMemo(() => lightPool(), []);
  const poolPos = useMemo(() => {
    const t = HD[1] / -DIR.y;
    return [HD[0] + DIR.x * t, 0.003, 0] as V;
  }, []);

  const paint = <meshPhysicalMaterial color={c.body} roughness={0.5} clearcoat={0.3} clearcoatRoughness={0.35} envMapIntensity={0.55} />;
  const jointM = <meshPhysicalMaterial color={c.joint} metalness={0.9} roughness={0.3} />;
  const steel = <meshPhysicalMaterial color="#c3c7cc" metalness={1} roughness={0.25} />;

  return (
    <group>
      <mesh geometry={geo.base}>{paint}</mesh>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.05, 32]} />
        {jointM}
      </mesh>
      <mesh geometry={geo.cable}>
        <meshStandardMaterial color="#26282c" roughness={0.9} />
      </mesh>
      {/* articulations */}
      {[B, E, HD].map((p, i) => (
        <group key={i} position={p}>
          <mesh rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.045, 0.045, 0.1, 24]} />
            {jointM}
          </mesh>
          <mesh position={[0, 0, 0.056]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.026, 0.03, 0.02, 20]} />
            {steel}
          </mesh>
        </group>
      ))}
      {/* bras (doubles tiges) */}
      {[-0.032, 0.032].map((z) => (
        <group key={z}>
          <Rod from={[B[0], B[1], z]} to={[E[0], E[1], z]} r={0.012}>
            {paint}
          </Rod>
          <Rod from={[E[0], E[1], z]} to={[HD[0], HD[1], z]} r={0.011}>
            {paint}
          </Rod>
        </group>
      ))}
      <mesh geometry={geo.springA}>{steel}</mesh>
      <mesh geometry={geo.springB}>{steel}</mesh>
      {[...hooks(B, E, OFF_A), ...hooks(E, HD, OFF_B)].map(([from, to], i) => (
        <Rod key={i} from={from} to={to} r={0.005} seg={8}>
          {steel}
        </Rod>
      ))}
      {/* traverses : le crochet s'appuie sur une barrette entre les deux tiges */}
      {[...hooks(B, E, OFF_A), ...hooks(E, HD, OFF_B)].map(([p], i) => (
        <Rod key={"x" + i} from={[p[0], p[1], -0.034]} to={[p[0], p[1], 0.034]} r={0.007} seg={10}>
          {jointM}
        </Rod>
      ))}
      {/* passe-fil */}
      <mesh position={[-0.235, 0.03, -0.235]} rotation={[Math.PI / 2, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.022, 0.026, 0.05, 16]} />
        <meshStandardMaterial color="#1b1c1f" roughness={0.7} />
      </mesh>
      {/* tête */}
      <group position={HD} quaternion={shadeQ}>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.03, 0.045, 0.06, 20]} />
          {jointM}
        </mesh>
        <mesh geometry={geo.shade}>
          <meshPhysicalMaterial color={c.body} roughness={0.5} clearcoat={0.3} envMapIntensity={0.55} side={THREE.FrontSide} />
        </mesh>
        <mesh geometry={geo.shade} scale={0.97}>
          <meshStandardMaterial color="#f4f1ea" roughness={0.6} side={THREE.BackSide} emissive={lightCol} emissiveIntensity={0.25} />
        </mesh>
        <mesh position={[0, -0.21, 0]} rotation-x={Math.PI / 2}>
          <circleGeometry args={[0.13, 40]} />
          <meshBasicMaterial color={lightCol} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0, -0.34, 0]} color={lightCol} intensity={1.2} distance={2.2} decay={2} />
      </group>
      <mesh rotation-x={-Math.PI / 2} position={poolPos}>
        <planeGeometry args={[1.0, 0.8]} />
        <meshBasicMaterial map={poolTex} color={lightCol} transparent opacity={0.55} depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <Shadow scale={1.2} opacity={0.55} />
    </group>
  );
}
