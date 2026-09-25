"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import ninja1 from "@/assets/ninjaplayer.png";
import ninja2 from "@/assets/ninjaplayer2.png";
import { loadPixels, spritesToVoxels, VoxelCell } from "./voxel";
import { rng } from "./textures";

const V = 0.085; // taille d'un voxel

/**
 * Le sprite est presque noir : on relève les valeurs sombres vers l'indigo de la palette
 * pour que la silhouette se lise de nuit, et on repère les pixels à faire briller
 * (bandeau rouge, peau autour des yeux, lame, mains, pieds).
 */
function grade(rgb: string): { hex: string; glow: number } {
  const m = rgb.match(/\d+/g)!.map(Number);
  const [r, g, b] = m;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const sat = max ? (max - min) / max : 0;
  if (r > 150 && g < 70 && b < 70) return { hex: "#e0240e", glow: 0.55 }; // bandeau
  if (r > 200 && g > 150 && b > 100 && r - b > 40 && lum > 0.6) return { hex: rgb, glow: 0.55 }; // peau / yeux
  if (sat > 0.45 && lum > 0.4) return { hex: rgb, glow: 0.45 }; // pieds dorés
  if (lum > 0.7) return { hex: rgb, glow: 0.35 }; // lame, mains
  if (lum < 0.04) return { hex: "#161d33", glow: 0 }; // contour noir → encre indigo
  if (lum < 0.1) return { hex: "#2a2230", glow: 0 }; // brun très sombre
  if (lum < 0.3) return { hex: "#3b4868", glow: 0.03 }; // tenue gris foncé → bleu nuit
  return { hex: rgb, glow: 0 };
}

function glowify(mat: THREE.MeshStandardMaterial) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = "attribute float aGlow;\nvarying float vGlow;\n" + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvGlow = aGlow;");
    sh.fragmentShader = "varying float vGlow;\n" + sh.fragmentShader.replace(
      "#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vGlow * 1.6;",
    );
  };
  return mat;
}

/** Le ninja du jeu, reconstruit en voxels à partir de ses deux sprites. */
export default function VoxelNinja({ reduced, pointer }: { reduced: boolean; pointer: { x: number; y: number } }) {
  const [data, setData] = useState<{ cells: VoxelCell[]; w: number; h: number } | null>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const group = useRef<THREE.Group>(null);
  // temps accumulé via dt : la Canvas peut être mise en pause (frameloop « never »),
  // ce qui remet clock.elapsedTime à zéro ; on ne doit pas relancer l'assemblage.
  const time = useRef(0);
  const frameRef = useRef(-1);
  const mat = useMemo(() => glowify(new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.05 })), []);
  const graded = useMemo(() => data?.cells.map((c) => c.colors.map((col) => (col ? grade(col) : null))) ?? [], [data]);
  const glowAttr = useMemo(() => (data ? new THREE.InstancedBufferAttribute(new Float32Array(data.cells.length), 1) : null), [data]);

  useEffect(() => {
    let alive = true;
    Promise.all([loadPixels(ninja1.src), loadPixels(ninja2.src)])
      .then((frames) => alive && setData(spritesToVoxels(frames)))
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const scatter = useMemo(() => {
    if (!data) return [];
    const r = rng(42);
    return data.cells.map(() => new THREE.Vector3((r() - 0.5) * 3.2, r() * 2.6 + 0.4, (r() - 0.5) * 2.4 + 0.8));
  }, [data]);

  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3(), e: new THREE.Euler(), c: new THREE.Color() }), []);

  useFrame((_, dt) => {
    if (!data || !mesh.current || !group.current) return;
    time.current += Math.min(dt, 0.5);
    const t = time.current;
    const age = t;
    const DUR = reduced ? 0 : 1.3;
    const assembling = age < DUR + 0.6;
    const frame = reduced ? 0 : Math.floor(t * 2.2) % 2;
    if (assembling || frame !== frameRef.current) {
      const { m, p, q, s, e, c } = tmp;
      data.cells.forEach((cell, i) => {
        const gr = graded[i][frame] ?? null;
        const col = gr ? gr.hex : null;
        const tx = (cell.gx - data.w / 2) * V, ty = cell.gy * V;
        let k = 1;
        if (DUR > 0) {
          const delay = (cell.gy / data.h) * 0.45 + ((i * 37) % 11) * 0.01;
          k = THREE.MathUtils.clamp((age - delay) / (DUR - 0.55), 0, 1);
          k = 1 - Math.pow(1 - k, 3);
        }
        const from = scatter[i];
        p.set(THREE.MathUtils.lerp(from.x, tx, k), THREE.MathUtils.lerp(from.y, ty, k), THREE.MathUtils.lerp(from.z, 0, k));
        e.set((1 - k) * (i % 7), (1 - k) * (i % 5), 0);
        q.setFromEuler(e);
        const sc = col ? 1 : 0;
        s.set(V * 1.004 * sc, V * 1.004 * sc, V * cell.depth * sc);
        m.compose(p, q, s);
        mesh.current!.setMatrixAt(i, m);
        if (col) { c.set(col); mesh.current!.setColorAt(i, c); }
        if (glowAttr) glowAttr.setX(i, gr ? gr.glow : 0);
      });
      mesh.current.instanceMatrix.needsUpdate = true;
      if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
      if (glowAttr) glowAttr.needsUpdate = true;
      frameRef.current = assembling ? -1 : frame;
    }
    // respiration + parallaxe
    const g = group.current;
    g.position.y = 0.72 + (reduced ? 0 : Math.sin(t * 1.6) * 0.03);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, -0.12 + pointer.x * 0.35, 4, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -pointer.y * 0.12, 4, dt);
  });

  return (
    <group ref={group} position={[0, 0.72, 0]}>
      {data && (
        <instancedMesh ref={mesh} args={[undefined, mat, data.cells.length]} castShadow={false}>
          <boxGeometry args={[1, 1, 1]}>
            {glowAttr && <primitive attach="attributes-aGlow" object={glowAttr} />}
          </boxGeometry>
        </instancedMesh>
      )}
    </group>
  );
}
