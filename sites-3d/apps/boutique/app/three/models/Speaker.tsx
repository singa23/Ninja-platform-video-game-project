"use client";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { lathe, Part, Shadow, easeInOut, type ModelProps, useGeometries } from "../common";
import { knit, knitBump } from "../textures";

const H = 1.12;

export default function Speaker({ c, opts, explode }: ModelProps) {
  const geo = useGeometries(() => {
    const body = lathe(
      [
        [0.0, 0.06],
        [0.3, 0.06],
        [0.38, 0.085],
        [0.415, 0.16],
        [0.425, 0.3],
        [0.425, H - 0.14],
        [0.415, H - 0.06],
        [0.39, H - 0.02],
        [0.36, H],
      ],
      72,
    );
    const cone = lathe(
      [
        [0.03, -0.04],
        [0.08, -0.02],
        [0.15, 0.01],
        [0.17, 0.012],
      ],
      32,
    );
    const knob = new THREE.TorusGeometry(0.2, 0.022, 12, 64);
    const woofer = lathe(
      [
        [0.05, -0.06],
        [0.1, -0.045],
        [0.18, -0.015],
        [0.225, 0.0],
      ],
      48,
    );
    return { body, cone, knob, woofer };
  }, []);
  const fabricTex = useMemo(() => knit(), []);
  const bumpTex = useMemo(() => knitBump(), []);
  const fabricMat = useRef<THREE.MeshPhysicalMaterial>(null);
  useFrame(() => {
    const m = fabricMat.current;
    if (!m) return;
    const k = easeInOut(explode.current);
    m.opacity = 1 - k * 0.92;
    const tr = k > 0.001;
    // changer « transparent » modifie le shader (define OPAQUE) : il faut recompiler
    if (m.transparent !== tr) {
      m.transparent = tr;
      m.needsUpdate = true;
    }
    m.depthWrite = k < 0.5;
  });
  const dock = opts.socle === "charge";
  const lift = dock ? 0.07 : 0;

  return (
    <group>
      {dock && (
        <mesh position={[0, 0.035, 0]}>
          <cylinderGeometry args={[0.46, 0.48, 0.07, 64]} />
          <meshPhysicalMaterial color="#2A2D32" roughness={0.35} clearcoat={0.6} />
        </mesh>
      )}
      <group position={[0, lift, 0]}>
        {/* pied : reste au sol, le reste de l'enceinte s'élève en vue éclatée */}
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.33, 0.35, 0.06, 48]} />
          <meshStandardMaterial color="#141518" roughness={0.9} />
        </mesh>
        {/* haut-parleur de grave 100 mm, orienté vers le sol */}
        <Part e={explode} off={[0, 0.2, 0]}>
          <group position={[0, 0.13, 0]}>
            <mesh geometry={geo.woofer} rotation-x={Math.PI}>
              <meshPhysicalMaterial color="#2b2e33" roughness={0.55} clearcoat={0.4} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, -0.004, 0]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[0.235, 0.016, 10, 48]} />
              <meshStandardMaterial color="#0e0f11" roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.042, 0]} rotation-x={Math.PI / 2}>
              <circleGeometry args={[0.05, 32]} />
              <meshPhysicalMaterial color="#c9ccd1" metalness={1} roughness={0.3} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, 0.12, 0]}>
              <cylinderGeometry args={[0.11, 0.11, 0.07, 32]} />
              <meshPhysicalMaterial color="#8d9299" metalness={1} roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.074, 0]}>
              <cylinderGeometry args={[0.27, 0.27, 0.016, 48]} />
              <meshPhysicalMaterial color="#c79b52" metalness={0.8} roughness={0.35} />
            </mesh>
          </group>
        </Part>
        <Part e={explode} off={[0, 0.5, 0]}>
          {/* noyau interne + médiums */}
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.33, 0.33, 0.9, 32]} />
            <meshStandardMaterial color="#1a1c20" roughness={0.8} />
          </mesh>
          {[0, 1, 2].map((i) => {
            const a = (i / 3) * Math.PI * 2 + 0.5;
            return (
              <Part key={i} e={explode} off={[Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3]}>
                <group position={[Math.sin(a) * 0.33, 0.74, Math.cos(a) * 0.33]} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.sin(a), 0, Math.cos(a)))}>
                  <mesh geometry={geo.cone}>
                    <meshPhysicalMaterial color="#b9bec4" metalness={0.9} roughness={0.35} side={THREE.DoubleSide} />
                  </mesh>
                  <mesh position={[0, 0.012, 0]} rotation-x={Math.PI / 2}>
                    <torusGeometry args={[0.165, 0.012, 8, 32]} />
                    <meshStandardMaterial color="#0f1012" roughness={0.9} />
                  </mesh>
                  <mesh position={[0, -0.05, 0]}>
                    <cylinderGeometry args={[0.06, 0.06, 0.05, 20]} />
                    <meshPhysicalMaterial color="#8d9299" metalness={1} roughness={0.4} />
                  </mesh>
                </group>
              </Part>
            );
          })}
          {/* tissu */}
          <mesh geometry={geo.body}>
            <meshPhysicalMaterial ref={fabricMat} color={c.fabric} map={fabricTex} bumpMap={bumpTex} bumpScale={1.2} roughness={0.95} sheen={0.25} sheenColor={c.fabric} sheenRoughness={0.8} envMapIntensity={0.6} />
          </mesh>
          {/* couronne supérieure */}
          <Part e={explode} off={[0, 0.34, 0]}>
            <mesh position={[0, H + 0.012, 0]}>
              <cylinderGeometry args={[0.365, 0.37, 0.03, 72]} />
              <meshPhysicalMaterial color={c.cap} metalness={1} roughness={0.32} />
            </mesh>
            <mesh geometry={geo.knob} position={[0, H + 0.03, 0]} rotation-x={Math.PI / 2}>
              <meshPhysicalMaterial color={c.cap} metalness={1} roughness={0.2} />
            </mesh>
            <mesh position={[0, H + 0.029, 0]} rotation-x={-Math.PI / 2}>
              <ringGeometry args={[0.27, 0.285, 64]} />
              <meshBasicMaterial color={c.led} toneMapped={false} />
            </mesh>
            {[-1, 0, 1].map((i) => (
              <mesh key={i} position={[i * 0.075, H + 0.03, 0]}>
                <cylinderGeometry args={[0.022, 0.022, 0.01, 20]} />
                <meshPhysicalMaterial color="#1a1c20" roughness={0.4} />
              </mesh>
            ))}
          </Part>
        </Part>
      </group>
      <Shadow scale={1.3} opacity={0.6} />
    </group>
  );
}
