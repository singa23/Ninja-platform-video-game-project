"use client";
import * as THREE from "three";
import { useMemo } from "react";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Shadow, type ModelProps, useGeometries } from "../common";
import { perfumeLabel } from "../textures";

const NAMES: Record<string, string> = { "#B98A3E": "Vétiver fumé", "#8D9A4F": "Figue verte", "#D9B6C4": "Iris poudré" };

export default function Perfume({ c, opts }: ModelProps) {
  const big = opts.ml === "100";
  const geo = useGeometries(
    () => ({
      bottle: new RoundedBoxGeometry(0.62, 0.8, 0.34, 6, 0.07),
      inner: new RoundedBoxGeometry(0.58, 0.76, 0.3, 4, 0.05),
      liquid: new RoundedBoxGeometry(0.48, 0.5, 0.22, 4, 0.05),
      base: new RoundedBoxGeometry(0.56, 0.09, 0.28, 3, 0.03),
      cap: new RoundedBoxGeometry(0.3, 0.26, 0.3, 5, 0.05),
    }),
    [],
  );
  const label = useMemo(() => perfumeLabel(NAMES[c.liquid] ?? "Eau de parfum", big ? "100" : "50"), [c.liquid, big]);
  const s = big ? 1.16 : 1;
  return (
    <group>
      <group scale={s}>
        {/* Verre extra-blanc épais. La toile 3D est partagée et transparente (le béton de la page
            est derrière) : une transmission physique n'aurait rien à réfracter et rendrait blanc.
            On compose donc le verre en couches triées : faces arrière, jus, faces avant presque
            invisibles qui ne portent que les reflets, et un fond massif légèrement teinté. */}
        <mesh geometry={geo.bottle} position={[0, 0.4, 0]} renderOrder={1}>
          <meshPhysicalMaterial color="#cfe6de" transparent opacity={0.07} roughness={0.02} metalness={0} envMapIntensity={0.7} side={THREE.BackSide} depthWrite={false} />
        </mesh>
        <mesh geometry={geo.base} position={[0, 0.055, 0]} renderOrder={2}>
          <meshPhysicalMaterial color="#b9dbcf" transparent opacity={0.26} roughness={0.02} clearcoat={1} clearcoatRoughness={0.02} envMapIntensity={1.1} depthWrite={false} />
        </mesh>
        <mesh geometry={geo.liquid} position={[0, 0.352, 0]} renderOrder={3}>
          <meshPhysicalMaterial color={c.liquid} transparent opacity={0.88} roughness={0.08} clearcoat={0.6} emissive={c.liquid} emissiveIntensity={0.1} envMapIntensity={0.8} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.603, 0]} rotation-x={-Math.PI / 2} renderOrder={4}>
          <planeGeometry args={[0.47, 0.2]} />
          <meshBasicMaterial color={c.liquid} transparent opacity={0.45} depthWrite={false} />
        </mesh>
        {/* épaisseur des parois : liseré vert d'eau visible sur les arêtes */}
        <mesh geometry={geo.inner} position={[0, 0.4, 0]} renderOrder={5}>
          <meshPhysicalMaterial color="#9fcabb" transparent opacity={0.1} roughness={0.02} envMapIntensity={0.6} side={THREE.BackSide} depthWrite={false} />
        </mesh>
        <mesh geometry={geo.bottle} position={[0, 0.4, 0]} renderOrder={6}>
          <meshPhysicalMaterial
            color="#f4fbf8"
            transparent
            opacity={0.035}
            roughness={0.01}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.01}
            specularIntensity={1}
            envMapIntensity={1.5}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, 0.34, 0.1715]} renderOrder={7}>
          <planeGeometry args={[0.38, 0.19]} />
          <meshStandardMaterial map={label} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.84, 0]}>
          <cylinderGeometry args={[0.075, 0.08, 0.1, 32]} />
          <meshPhysicalMaterial color="#c9a36a" metalness={1} roughness={0.22} />
        </mesh>
        <mesh geometry={geo.cap} position={[0, 1.0, 0]}>
          <meshPhysicalMaterial color={c.cap} metalness={c.cap === "#B8925A" ? 1 : 0.2} roughness={0.28} clearcoat={0.8} />
        </mesh>
      </group>
      <Shadow scale={[1.1 * s, 0.8 * s]} opacity={0.55} />
    </group>
  );
}
