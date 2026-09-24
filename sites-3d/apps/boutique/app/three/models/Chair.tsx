"use client";
import * as THREE from "three";
import { useMemo } from "react";
import { Rod, Shadow, type ModelProps, useGeometries } from "../common";
import { woodGrain } from "../textures";

const W = 0.9; // largeur de la coque

/** Coque continue assise + dossier : profil latéral épaissi puis extrudé en largeur. */
function shellGeometry() {
  const spine = new THREE.SplineCurve(
    [
      [0.44, 0.405],
      [0.4, 0.45],
      [0.3, 0.465],
      [0.0, 0.455],
      [-0.26, 0.44],
      [-0.36, 0.47],
      [-0.4, 0.56],
      [-0.42, 0.72],
      [-0.46, 0.88],
      [-0.48, 0.94],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
  );
  const pts = spine.getSpacedPoints(60);
  const th = 0.022;
  const top: THREE.Vector2[] = [];
  const bot: THREE.Vector2[] = [];
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const t = b.clone().sub(a).normalize();
    const n = new THREE.Vector2(-t.y, t.x);
    top.push(p.clone().add(n.clone().multiplyScalar(th)));
    bot.push(p.clone().add(n.clone().multiplyScalar(-th)));
  });
  const shape = new THREE.Shape([...top, ...bot.reverse()]);
  const g = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 3, curveSegments: 1, steps: 1 });
  g.translate(0, 0, -W / 2);
  g.rotateY(-Math.PI / 2);
  // UV simples pour le fil du bois
  const pos = g.attributes.position as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) * 1.1 + 0.5;
    uv[i * 2 + 1] = (pos.getY(i) - pos.getZ(i)) * 1.1;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

export default function Chair({ c, opts }: ModelProps) {
  const geo = useGeometries(() => shellGeometry());
  const grain = useMemo(() => woodGrain(), []);
  const lacquer = c.lacquer === "1";
  const steelLegs = opts.pied === "acier";
  const wood = (
    <meshPhysicalMaterial
      color={c.wood}
      map={lacquer ? null : grain}
      roughness={lacquer ? 0.25 : 0.55}
      clearcoat={lacquer ? 1 : 0.2}
      clearcoatRoughness={lacquer ? 0.08 : 0.5}
    />
  );
  const legMat = steelLegs ? <meshPhysicalMaterial color="#1c1e21" metalness={0.7} roughness={0.35} clearcoat={0.4} /> : lacquer ? wood : <meshPhysicalMaterial color={c.wood} map={grain} roughness={0.5} clearcoat={0.2} />;
  const legs: [THREE.Vector3Tuple, THREE.Vector3Tuple][] = [
    [[0.33, 0.43, 0.3], [0.4, 0, 0.38]],
    [[-0.33, 0.43, 0.3], [-0.4, 0, 0.38]],
    [[0.33, 0.42, -0.24], [0.4, 0, -0.34]],
    [[-0.33, 0.42, -0.24], [-0.4, 0, -0.34]],
  ];
  return (
    <group>
      <mesh geometry={geo}>{wood}</mesh>
      {/* chants apparents (liseré de plis) */}
      {legs.map(([a, b], i) => (
        <Rod key={i} from={a} to={b} r={steelLegs ? 0.012 : 0.017} r2={steelLegs ? 0.012 : 0.024} seg={20}>
          {legMat}
        </Rod>
      ))}
      {/* traverses sous l'assise */}
      {[0.3, -0.24].map((z) => (
        <mesh key={z} position={[0, 0.405, z]}>
          <boxGeometry args={[0.7, 0.035, 0.05]} />
          {legMat}
        </mesh>
      ))}
      <mesh position={[0.33, 0.405, 0.03]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[0.56, 0.035, 0.04]} />
        {legMat}
      </mesh>
      <mesh position={[-0.33, 0.405, 0.03]} rotation-y={Math.PI / 2}>
        <boxGeometry args={[0.56, 0.035, 0.04]} />
        {legMat}
      </mesh>
      <Shadow scale={[1.3, 1.4]} opacity={0.5} />
    </group>
  );
}
