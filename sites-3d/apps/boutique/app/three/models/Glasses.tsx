"use client";
import * as THREE from "three";
import { useMemo, type ReactNode } from "react";
import { Shadow, type ModelProps, useGeometries } from "../common";
import { tortoise } from "../textures";

function rrect(s: THREE.Path | THREE.Shape, w: number, h: number, r: number, cx = 0, cy = 0, ccw = false) {
  const x = cx - w / 2;
  const y = cy - h / 2;
  // bas plus arrondi que le haut : forme « pantos » légère
  const rb = r * 1.35;
  if (!ccw) {
    s.moveTo(x + r, y + h);
    s.lineTo(x + w - r, y + h);
    s.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
    s.lineTo(x + w, y + rb);
    s.quadraticCurveTo(x + w, y, x + w - rb, y);
    s.lineTo(x + rb, y);
    s.quadraticCurveTo(x, y, x, y + rb);
    s.lineTo(x, y + h - r);
    s.quadraticCurveTo(x, y + h, x + r, y + h);
  } else {
    s.moveTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + rb);
    s.quadraticCurveTo(x, y, x + rb, y);
    s.lineTo(x + w - rb, y);
    s.quadraticCurveTo(x + w, y, x + w, y + rb);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
  }
}

function Bar({ from, to, w, h, children }: { from: THREE.Vector3Tuple; to: THREE.Vector3Tuple; w: number; h: number; children: ReactNode }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const d = b.clone().sub(a);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.clone().normalize());
  // UV à la même échelle que la face (sinon le motif écaille paraît zoomé sur les branches)
  const geo = useGeometries(() => {
    const g = new THREE.BoxGeometry(w, h, len);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getZ(i) * 1.4 + 0.3, pos.getY(i) * 1.4 + pos.getX(i) + 0.5);
    uv.needsUpdate = true;
    return g;
  }, [w, h, len]);
  return (
    <mesh geometry={geo} position={a.clone().add(b).multiplyScalar(0.5)} quaternion={q}>
      {children}
    </mesh>
  );
}

const LW = 0.46;
const LH = 0.36;
const T = 0.036;
const CX = 0.33;
const CY = 0.25;
const FZ = 0.33;

export default function Glasses({ c, opts }: ModelProps) {
  const geo = useGeometries(() => {
    const rim = new THREE.Shape();
    rrect(rim, LW + T * 2, LH + T * 2, 0.15, 0, 0);
    const hole = new THREE.Path();
    rrect(hole, LW, LH, 0.125, 0, 0, true);
    rim.holes.push(hole);
    const rimG = new THREE.ExtrudeGeometry(rim, { depth: 0.028, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.007, bevelSegments: 3, curveSegments: 14 });
    rimG.translate(0, 0, -0.014);
    const pos = rimG.attributes.position as THREE.BufferAttribute;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = pos.getX(i) * 1.4;
      uv[i * 2 + 1] = pos.getY(i) * 1.4 + pos.getZ(i);
    }
    rimG.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    const lensS = new THREE.Shape();
    rrect(lensS, LW + 0.01, LH + 0.01, 0.13, 0, 0);
    const lens = new THREE.ExtrudeGeometry(lensS, { depth: 0.01, bevelEnabled: false, curveSegments: 10 });
    lens.translate(0, 0, -0.005);
    const bridge = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([new THREE.Vector3(-0.11, 0.08, 0), new THREE.Vector3(-0.05, 0.115, 0.012), new THREE.Vector3(0.05, 0.115, 0.012), new THREE.Vector3(0.11, 0.08, 0)]),
      20,
      0.017,
      10,
      false,
    );
    return { rimG, lens, bridge };
  }, []);
  const tex = useMemo(() => tortoise(), []);
  const clear = c.clear === "1";
  const frame = (
    <meshPhysicalMaterial
      color={c.frame}
      map={c.tex === "ecaille" ? tex : null}
      roughness={0.18}
      clearcoat={1}
      clearcoatRoughness={0.05}
      transparent={clear}
      opacity={clear ? 0.55 : 1}
      depthWrite={!clear}
    />
  );
  const blue = opts.verres === "bleue";
  return (
    <group rotation-y={-0.12}>
      <group position={[0, CY, FZ]}>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * CX, 0, 0]}>
            <mesh geometry={geo.rimG}>{frame}</mesh>
            <mesh geometry={geo.lens}>
              <meshPhysicalMaterial color={blue ? "#e8f0ff" : "#1f2a26"} transparent opacity={blue ? 0.18 : 0.72} roughness={0.02} metalness={0.1} clearcoat={1} envMapIntensity={2} depthWrite={false} />
            </mesh>
          </group>
        ))}
        <mesh geometry={geo.bridge}>{frame}</mesh>
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh position={[s * (CX + LW / 2 + T - 0.01), 0.1, -0.04]}>
              <boxGeometry args={[0.036, 0.06, 0.05]} />
              {frame}
            </mesh>
            <mesh position={[s * (CX + LW / 2 + T + 0.005), 0.1, -0.07]}>
              <cylinderGeometry args={[0.009, 0.009, 0.07, 12]} />
              <meshPhysicalMaterial color="#c9ccd1" metalness={1} roughness={0.2} />
            </mesh>
          </group>
        ))}
      </group>
      {[-1, 1].map((s) => {
        const x = s * (CX + LW / 2 + T + 0.005);
        return (
          <group key={s}>
            <Bar from={[x, CY + 0.1, FZ - 0.08]} to={[x + s * 0.03, CY + 0.07, -0.5]} w={0.02} h={0.036}>
              {frame}
            </Bar>
            <Bar from={[x + s * 0.03, CY + 0.075, -0.49]} to={[x + s * 0.03, 0.03, -0.66]} w={0.019} h={0.032}>
              {frame}
            </Bar>
          </group>
        );
      })}
      <Shadow scale={[1.7, 1.4]} z={-0.1} opacity={0.4} />
    </group>
  );
}
