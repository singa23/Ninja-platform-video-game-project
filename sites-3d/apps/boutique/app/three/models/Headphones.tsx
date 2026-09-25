"use client";
import * as THREE from "three";
import { useMemo } from "react";
import { lathe, Part, Shadow, type ModelProps, useGeometries } from "../common";

const CUP_Y = 0.46;

function Side({ s, c, velours, explode, geo }: { s: 1 | -1; c: Record<string, string>; velours: boolean; explode: ModelProps["explode"]; geo: ReturnType<typeof useGeo> }) {
  return (
    <group>
      {/* étrier + tige coulissante */}
      <Part e={explode} off={[s * 0.34, 0.2, 0]}>
        <mesh geometry={geo.yoke} position={[s * 0.63, CUP_Y, 0]} rotation={[0, Math.PI / 2, 0]}>
          <meshPhysicalMaterial color={c.metal} metalness={1} roughness={0.28} />
        </mesh>
        <mesh position={[s * 0.63, CUP_Y + 0.5, 0]}>
          <cylinderGeometry args={[0.016, 0.016, 0.16, 12]} />
          <meshPhysicalMaterial color="#c9ccd1" metalness={1} roughness={0.18} />
        </mesh>
      </Part>
      {/* coque */}
      <Part e={explode} off={[s * 0.42, 0, 0]}>
        <group position={[s * 0.62, CUP_Y, 0]} rotation-z={s * -Math.PI / 2} scale={[1, 1, 1.14]}>
          <mesh geometry={geo.cup}>
            <meshPhysicalMaterial color={c.shell} roughness={0.42} clearcoat={0.5} clearcoatRoughness={0.3} />
          </mesh>
        </group>
        <group position={[s * 0.765, CUP_Y, 0]} rotation-z={s * -Math.PI / 2} scale={[1, 1, 1.14]}>
          <mesh>
            <cylinderGeometry args={[0.24, 0.25, 0.02, 48]} />
            <meshPhysicalMaterial color={c.shell} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.005, 0]} rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.255, 0.011, 10, 64]} />
            <meshPhysicalMaterial color={c.metal} metalness={1} roughness={0.22} />
          </mesh>
        </group>
      </Part>
      {/* transducteur */}
      <Part e={explode} off={[s * 0.2, 0, 0]}>
        <group position={[s * 0.54, CUP_Y, 0]} rotation-z={s * Math.PI / 2}>
          <mesh geometry={geo.driver}>
            <meshPhysicalMaterial color="#d9d4c7" roughness={0.55} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 0.005, 0]}>
            <cylinderGeometry args={[0.25, 0.25, 0.01, 40]} />
            <meshPhysicalMaterial color="#2a2d32" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0.045, 0]}>
            <sphereGeometry args={[0.05, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshPhysicalMaterial color="#c79b52" metalness={1} roughness={0.25} />
          </mesh>
        </group>
      </Part>
      {/* coussinet */}
      <Part e={explode} off={[s * -0.04, 0, 0]}>
        <mesh position={[s * 0.49, CUP_Y, 0]} rotation-y={Math.PI / 2} scale={[1.14, 1, 1]}>
          <torusGeometry args={[0.24, 0.075, 20, 56]} />
          <meshPhysicalMaterial color={c.cushion} roughness={velours ? 1 : 0.5} sheen={velours ? 1 : 0.2} sheenRoughness={0.6} sheenColor={velours ? "#ffffff" : "#888888"} clearcoat={velours ? 0 : 0.25} />
        </mesh>
      </Part>
    </group>
  );
}

function useGeo() {
  return useGeometries(() => {
    const cup = lathe(
      [
        [0.3, -0.1],
        [0.31, -0.1],
        [0.345, -0.07],
        [0.355, 0.0],
        [0.345, 0.08],
        [0.31, 0.12],
        [0.26, 0.14],
        [0.0, 0.14],
      ],
      64,
    );
    const driver = lathe(
      [
        [0.04, 0.04],
        [0.12, 0.02],
        [0.22, -0.02],
        [0.25, -0.02],
      ],
      40,
    );
    const yoke = new THREE.TorusGeometry(0.43, 0.022, 12, 48, Math.PI);
    return { cup, driver, yoke };
  }, []);
}

export default function Headphones({ c, opts, explode }: ModelProps) {
  const velours = opts.coussinets === "velours";
  const geo = useGeo();
  const band = useGeometries(() => {
    const g = new THREE.TorusGeometry(0.63, 0.028, 16, 96, Math.PI);
    g.scale(1, 1, 2.8);
    const pad = new THREE.TorusGeometry(0.585, 0.034, 16, 80, 2.1);
    pad.rotateZ((Math.PI - 2.1) / 2);
    pad.scale(1, 1, 2.1);
    return { g, pad };
  }, []);
  return (
    <group>
      <Part e={explode} off={[0, 0.34, 0]}>
        <mesh geometry={band.g} position={[0, CUP_Y + 0.52, 0]}>
          <meshPhysicalMaterial color={c.band} roughness={0.5} clearcoat={0.4} />
        </mesh>
        <mesh geometry={band.pad} position={[0, CUP_Y + 0.52, 0]}>
          <meshPhysicalMaterial color={c.cushion} roughness={velours ? 1 : 0.55} sheen={velours ? 1 : 0.2} sheenColor="#ffffff" />
        </mesh>
      </Part>
      <Side s={1} c={c} velours={velours} explode={explode} geo={geo} />
      <Side s={-1} c={c} velours={velours} explode={explode} geo={geo} />
      <Shadow scale={[2.4, 1.1]} opacity={0.5} />
    </group>
  );
}
