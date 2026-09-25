"use client";
import * as THREE from "three";
import { useMemo } from "react";
import { lathe, Shadow, type ModelProps, useGeometries } from "../common";
import { speckle } from "../textures";

export default function Mug({ c, opts }: ModelProps) {
  const big = opts.cl === "35";
  const geo = useGeometries(() => {
    const body = lathe(
      [
        [0.0, 0.07],
        [0.27, 0.07],
        [0.3, 0.1],
        [0.315, 0.3],
        [0.33, 0.6],
        [0.335, 0.69],
        [0.33, 0.705],
        [0.31, 0.705],
        [0.302, 0.68],
        [0.296, 0.4],
        [0.28, 0.14],
        [0.24, 0.11],
        [0.0, 0.105],
      ],
      80,
    );
    const foot = lathe(
      [
        [0.0, 0.0],
        [0.24, 0.0],
        [0.27, 0.012],
        [0.285, 0.05],
        [0.29, 0.075],
        [0.27, 0.075],
      ],
      80,
    );
    const handle = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.3, 0.58, 0),
        new THREE.Vector3(0.44, 0.6, 0),
        new THREE.Vector3(0.53, 0.5, 0),
        new THREE.Vector3(0.54, 0.36, 0),
        new THREE.Vector3(0.47, 0.25, 0),
        new THREE.Vector3(0.3, 0.2, 0),
      ]),
      48,
      0.034,
      14,
      false,
    );
    handle.scale(1, 1, 1.35);
    return { body, foot, handle };
  }, []);
  const tex = useMemo(() => speckle(), []);
  const glaze = <meshPhysicalMaterial color={c.glaze} map={tex} roughness={0.3} clearcoat={0.8} clearcoatRoughness={0.18} side={THREE.DoubleSide} />;
  return (
    <group>
      <group scale={[1, big ? 1.18 : 1, 1]}>
        <mesh geometry={geo.body}>{glaze}</mesh>
        <mesh geometry={geo.handle}>{glaze}</mesh>
        <mesh geometry={geo.foot}>
          <meshStandardMaterial color="#c2b29a" map={tex} roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0.56, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.3, 48]} />
          <meshPhysicalMaterial color="#2a170d" roughness={0.08} clearcoat={1} />
        </mesh>
      </group>
      <Shadow scale={[1.35, 1.1]} x={0.08} opacity={0.6} />
    </group>
  );
}
