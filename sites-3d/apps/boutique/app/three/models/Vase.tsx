"use client";
import * as THREE from "three";
import { useMemo } from "react";
import { lathe, smoothProfile, Shadow, type ModelProps, useGeometries } from "../common";
import { speckle } from "../textures";

export default function Vase({ c, opts }: ModelProps) {
  const big = opts.taille === "grand";
  const geo = useGeometries(() => {
    const outer = smoothProfile(
      [
        [0.2, 0.0],
        [0.3, 0.07],
        [0.37, 0.26],
        [0.355, 0.5],
        [0.25, 0.74],
        [0.13, 0.88],
        [0.115, 0.95],
        [0.14, 1.0],
      ],
      90,
    ).map(([x, y], i) => [x + (i > 4 && i < 80 ? Math.sin(y * 70) * 0.0035 : 0), y] as [number, number]);
    const inner = smoothProfile(
      [
        [0.1, 0.99],
        [0.085, 0.92],
        [0.1, 0.86],
        [0.22, 0.72],
        [0.32, 0.5],
        [0.335, 0.28],
        [0.27, 0.1],
        [0.0, 0.06],
      ],
      60,
    );
    const pts: [number, number][] = [[0, 0.0], ...outer, [0.12, 1.004], ...inner];
    const body = lathe(pts, 96);
    // pied brut (grès nu)
    const foot = lathe(
      [
        [0.0, 0.0],
        [0.196, 0.0],
        [0.215, 0.012],
        [0.24, 0.03],
      ],
      96,
    );
    return { body, foot };
  }, []);
  const tex = useMemo(() => speckle(), []);
  const s = big ? 1.25 : 1;
  return (
    <group>
      <group scale={[s * 0.96, s, s * 0.96]}>
        <mesh geometry={geo.body}>
          <meshPhysicalMaterial color={c.glaze} map={tex} roughness={0.38} clearcoat={0.7} clearcoatRoughness={0.22} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={geo.foot} position={[0, 0.001, 0]}>
          <meshStandardMaterial color="#b8a88f" map={tex} roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <Shadow scale={s * 1.25} opacity={0.6} />
    </group>
  );
}
