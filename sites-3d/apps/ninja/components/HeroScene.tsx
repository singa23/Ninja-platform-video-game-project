"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard } from "@react-three/drei";
import * as THREE from "three";
import VoxelNinja from "./VoxelNinja";
import {
  bambooTexture, leafTexture, glowTexture, moonTexture, neonSignTexture, neonKanjiTexture, groundTexture, rng,
} from "./textures";
import minotaurImg from "@/assets/minautor.png";
import birdImg from "@/assets/bird.png";
import bird2Img from "@/assets/bird2.png";
import missileImg from "@/assets/missile.png";
import fireImg from "@/assets/fire.png";

const FOG = new THREE.Color("#0d1428");
const pathX = (z: number) => Math.sin(z * 0.07) * 1.3;

// Uniforme de temps partagé par tous les shaders « vent »
const windUniform = { value: 0 };

function useTex<T>(make: () => T) {
  return useMemo(make, []); // eslint-disable-line react-hooks/exhaustive-deps
}

function useImageTexture(src: string) {
  const [t, setT] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    const l = new THREE.TextureLoader();
    let alive = true;
    l.load(src, (tx) => {
      tx.colorSpace = THREE.SRGBColorSpace;
      if (alive) setT(tx);
    });
    return () => { alive = false; };
  }, [src]);
  return t;
}

/** Injecte un balancement dans le vertex shader (après la matrice d'instance). */
function windify(mat: THREE.Material, amp = 0.35) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = windUniform;
    shader.vertexShader = "uniform float uWind;\n" + shader.vertexShader.replace(
      "#include <project_vertex>",
      `vec4 mvPosition = vec4( transformed, 1.0 );
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      float hh = clamp(mvPosition.y / 14.0, 0.0, 1.0);
      mvPosition.x += sin(uWind * 0.7 + mvPosition.z * 0.25) * hh * hh * ${amp.toFixed(2)};
      mvPosition.z += cos(uWind * 0.55 + mvPosition.x * 0.3) * hh * hh * ${(amp * 0.6).toFixed(2)};
      mvPosition = modelViewMatrix * mvPosition;
      gl_Position = projectionMatrix * mvPosition;`,
    );
  };
  return mat;
}

// ---------------------------------------------------------------- Forêt
function Bamboo({ count, leafCount }: { count: number; leafCount: number }) {
  const stalks = useRef<THREE.InstancedMesh>(null);
  const leaves = useRef<THREE.InstancedMesh>(null);
  const bTex = useTex(() => { const t = bambooTexture(); t.repeat.set(1, 3); return t; });
  const lTex = useTex(leafTexture);
  const stalkMat = useTex(() => windify(new THREE.MeshLambertMaterial({ map: bTex })));
  const leafMat = useTex(() => windify(new THREE.MeshLambertMaterial({ map: lTex, alphaTest: 0.5, side: THREE.DoubleSide }), 0.45));

  useEffect(() => {
    const r = rng(1234);
    const m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), e = new THREE.Euler();
    const c = new THREE.Color();
    const tops: { x: number; z: number; h: number }[] = [];
    let i = 0, guard = 0;
    while (i < count && guard++ < count * 20) {
      const z = 16 - r() * 118;
      const side = r() > 0.5 ? 1 : -1;
      const spread = Math.pow(r(), 1.4) * 17;
      const x = pathX(z) + side * (1.9 + spread);
      if (z > -5 && Math.abs(x - pathX(z)) < 3.2) continue; // clairière du héros
      if (Math.abs(z + 27) < 2.2 && Math.abs(x) < 3.4) continue; // torii
      const h = 10 + r() * 7;
      const rad = 0.07 + r() * 0.1;
      p.set(x, h / 2 - 0.2, z);
      e.set((r() - 0.5) * 0.08, r() * 6, (r() - 0.5) * 0.08);
      q.setFromEuler(e);
      s.set(rad, h, rad);
      m.compose(p, q, s);
      stalks.current!.setMatrixAt(i, m);
      c.setHSL(0.3 + r() * 0.08, 0.25 + r() * 0.2, 0.35 + r() * 0.3);
      stalks.current!.setColorAt(i, c);
      tops.push({ x, z, h });
      i++;
    }
    stalks.current!.count = i;
    stalks.current!.instanceMatrix.needsUpdate = true;
    if (stalks.current!.instanceColor) stalks.current!.instanceColor.needsUpdate = true;
    for (let j = 0; j < leafCount; j++) {
      const t = tops[Math.floor(r() * tops.length)];
      const y = t.h * (0.45 + r() * 0.55);
      const a = r() * Math.PI * 2, d = 0.3 + r() * 0.8;
      p.set(t.x + Math.cos(a) * d, y, t.z + Math.sin(a) * d);
      e.set(-0.4 + r() * 0.8, a, 0.3 + r() * 0.5);
      q.setFromEuler(e);
      const sc = 1.4 + r() * 1.4;
      s.set(sc, sc, sc);
      m.compose(p, q, s);
      leaves.current!.setMatrixAt(j, m);
      c.setHSL(0.36 + r() * 0.1, 0.3 + r() * 0.2, 0.25 + r() * 0.35);
      leaves.current!.setColorAt(j, c);
    }
    leaves.current!.instanceMatrix.needsUpdate = true;
    if (leaves.current!.instanceColor) leaves.current!.instanceColor.needsUpdate = true;
  }, [count, leafCount]);

  return (
    <>
      <instancedMesh ref={stalks} args={[undefined, stalkMat, count]} frustumCulled={false}>
        <cylinderGeometry args={[1, 1.1, 1, 7, 1, true]} />
      </instancedMesh>
      <instancedMesh ref={leaves} args={[undefined, leafMat, leafCount]} frustumCulled={false}>
        <planeGeometry args={[1, 1]} />
      </instancedMesh>
    </>
  );
}

// ---------------------------------------------------------------- Pétales
const petalVert = /* glsl */ `
  attribute vec4 aSeed;
  uniform float uTime; uniform vec3 uCam; uniform vec3 uBox;
  varying vec2 vUv; varying float vDist; varying float vShade;
  mat3 rot(vec3 a){
    float cx=cos(a.x),sx=sin(a.x),cy=cos(a.y),sy=sin(a.y),cz=cos(a.z),sz=sin(a.z);
    return mat3(cy*cz, cy*sz, -sy, sx*sy*cz-cx*sz, sx*sy*sz+cx*cz, sx*cy, cx*sy*cz+sx*sz, cx*sy*sz-sx*cz, cx*cy);
  }
  void main(){
    vUv = uv;
    float sp = 0.45 + aSeed.w * 0.5;
    vec3 base = aSeed.xyz * uBox;
    float t = uTime * sp;
    vec3 p;
    p.y = uCam.y - uBox.y * 0.45 + mod(base.y - t * 1.1, uBox.y);
    float drift = t * 0.6 + sin(t * 1.3 + aSeed.x * 20.0) * 0.8;
    p.x = uCam.x + mod(base.x + drift - uCam.x + uBox.x * 0.5, uBox.x) - uBox.x * 0.5;
    p.z = uCam.z - 2.0 + mod(base.z + sin(t + aSeed.y * 9.0) * 0.5 - uCam.z, uBox.z) - uBox.z * 0.5;
    mat3 R = rot(vec3(t * 1.7 + aSeed.x * 6.3, t * 1.1 + aSeed.y * 6.3, aSeed.z * 6.3));
    vec3 local = R * (position * (0.07 + aSeed.w * 0.05));
    vShade = 0.6 + 0.4 * abs((R * vec3(0.0, 0.0, 1.0)).y);
    vec4 mv = viewMatrix * vec4(p + local, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const petalFrag = /* glsl */ `
  uniform vec3 uFog; uniform float uDensity;
  varying vec2 vUv; varying float vDist; varying float vShade;
  void main(){
    vec2 q = vUv * 2.0 - 1.0;
    float notch = smoothstep(0.0, 0.25, abs(q.x) + (1.0 - q.y) * 0.9 - 0.05);
    float d = length(vec2(q.x * 1.5, q.y * 0.9 + 0.1));
    if (d > 1.0 || (q.y > 0.7 && abs(q.x) < 0.14)) discard;
    vec3 col = mix(vec3(1.0, 0.86, 0.9), vec3(0.95, 0.55, 0.66), d) * vShade;
    float f = 1.0 - exp(-uDensity * uDensity * vDist * vDist);
    gl_FragColor = vec4(mix(col, uFog, f * 0.85), 1.0);
    #include <colorspace_fragment>
  }
`;

function Petals({ count, reduced }: { count: number; reduced: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geo = useMemo(() => {
    const g = new THREE.InstancedBufferGeometry();
    const plane = new THREE.PlaneGeometry(1, 1);
    g.index = plane.index;
    g.setAttribute("position", plane.getAttribute("position"));
    g.setAttribute("uv", plane.getAttribute("uv"));
    const seeds = new Float32Array(count * 4);
    const r = rng(77);
    for (let i = 0; i < seeds.length; i++) seeds[i] = r();
    g.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 4));
    g.instanceCount = count;
    return g;
  }, [count]);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(18, 12, 22) },
    uFog: { value: FOG.clone() }, uDensity: { value: 0.045 },
  }), []);
  useFrame((s, dt) => {
    uniforms.uTime.value += dt * (reduced ? 0.15 : 1);
    uniforms.uCam.value.copy(s.camera.position);
  });
  return (
    <mesh geometry={geo} frustumCulled={false}>
      <shaderMaterial ref={mat} vertexShader={petalVert} fragmentShader={petalFrag} uniforms={uniforms} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ---------------------------------------------------------------- Brume
const mistFrag = /* glsl */ `
  uniform float uTime; uniform vec3 uColor; uniform float uAlpha;
  varying vec2 vUv;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
  float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<3;i++){ v+=a*n(p); p*=2.03; a*=0.5; } return v; }
  void main(){
    vec2 p = vUv * vec2(6.0, 2.0) + vec2(uTime * 0.04, 0.0);
    float m = fbm(p + vec2(0.0, uTime * 0.03));
    float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x) * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.45, vUv.y);
    gl_FragColor = vec4(uColor, smoothstep(0.35, 0.85, m) * edge * uAlpha);
  }
`;
const mistVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;

function Mist({ reduced }: { reduced: boolean }) {
  const layers = useMemo(() => {
    const r = rng(8);
    return Array.from({ length: 7 }, (_, i) => ({
      z: 6 - i * 12 - r() * 4, y: 0.6 + r() * 0.9, x: pathX(-i * 10) + (r() - 0.5) * 3, w: 26 + r() * 10,
      u: { uTime: { value: r() * 100 }, uColor: { value: new THREE.Color(i % 3 === 2 ? "#4a5f8c" : "#7d8fb8") }, uAlpha: { value: 0.32 } },
    }));
  }, []);
  useFrame((_, dt) => { if (!reduced) layers.forEach((l) => (l.u.uTime.value += dt)); });
  return (
    <>
      {layers.map((l, i) => (
        <mesh key={i} position={[l.x, l.y, l.z]} renderOrder={2}>
          <planeGeometry args={[l.w, 4.5]} />
          <shaderMaterial vertexShader={mistVert} fragmentShader={mistFrag} uniforms={l.u} transparent depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- Ciel, lune, étoiles
function Sky() {
  const moon = useTex(moonTexture);
  const glow = useTex(() => glowTexture());
  const uniforms = useMemo(() => ({}), []);
  const stars = useMemo(() => {
    const r = rng(99);
    const pos = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
      const th = r() * Math.PI * 2, ph = Math.acos(r() * 0.9);
      const R = 180;
      pos[i * 3] = Math.sin(ph) * Math.cos(th) * R;
      pos[i * 3 + 1] = Math.cos(ph) * R;
      pos[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * R - 40;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  return (
    <group>
      <mesh scale={220}>
        <sphereGeometry args={[1, 32, 16]} />
        <shaderMaterial side={THREE.BackSide} depthWrite={false} fog={false} uniforms={uniforms}
          vertexShader={`varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
          fragmentShader={`varying vec3 vP; void main(){
            float y = vP.y;
            vec3 top = vec3(0.02, 0.03, 0.07);
            vec3 mid = vec3(0.07, 0.10, 0.19);
            vec3 hor = vec3(0.16, 0.12, 0.22);
            vec3 c = mix(hor, mid, smoothstep(-0.05, 0.18, y));
            c = mix(c, top, smoothstep(0.18, 0.7, y));
            float m = pow(max(dot(vP, normalize(vec3(-0.06, 0.2, -1.0))), 0.0), 24.0);
            c += vec3(0.45, 0.42, 0.5) * m * 0.5;
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`} />
      </mesh>
      <points geometry={stars}>
        <pointsMaterial size={0.9} sizeAttenuation color="#cfd8ff" fog={false} transparent opacity={0.8} />
      </points>
      {/* lune placée dans la trouée du sentier : visible dès l'accueil, entre les cannes */}
      <group position={[-8, 26, -130]}>
        <mesh>
          <planeGeometry args={[64, 64]} />
          <meshBasicMaterial map={glow} color="#8fa0d8" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </mesh>
        <mesh position={[0, 0, 0.5]}>
          <circleGeometry args={[9, 48]} />
          <meshBasicMaterial map={moon} fog={false} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

// ---------------------------------------------------------------- Sol, chemin, lanternes
function Ground() {
  const tx = useTex(() => { const t = groundTexture(); t.repeat.set(24, 24); return t; });
  const stones = useRef<THREE.InstancedMesh>(null);
  const N = 80;
  useEffect(() => {
    const r = rng(5);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < N; i++) {
      const z = 3 - i * 1.25;
      e.set(0, r() * 3, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(pathX(z) + (i % 2 ? 0.28 : -0.28), -0.02, z), q, new THREE.Vector3(0.5 + r() * 0.15, 0.1, 0.42 + r() * 0.1));
      stones.current!.setMatrixAt(i, m);
    }
    stones.current!.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.1, -40]}>
        <planeGeometry args={[160, 180]} />
        <meshLambertMaterial map={tx} color="#6f7f8f" />
      </mesh>
      <instancedMesh ref={stones} args={[undefined, undefined, N]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshLambertMaterial color="#3a4150" flatShading />
      </instancedMesh>
    </>
  );
}

function Lanterns() {
  const glow = useTex(() => glowTexture());
  const spots = [[-8, -1], [-17, 1], [-37, -1], [-47, 1], [-58, -1], [-69, 1]];
  return (
    <>
      {spots.map(([z, s], i) => {
        const x = pathX(z) + s * 1.7;
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.2, 0.28, 0.5, 6]} /><meshLambertMaterial color="#4a4f5a" /></mesh>
            <mesh position={[0, 0.75, 0]}><cylinderGeometry args={[0.08, 0.1, 0.6, 6]} /><meshLambertMaterial color="#4a4f5a" /></mesh>
            <mesh position={[0, 1.2, 0]}><boxGeometry args={[0.36, 0.34, 0.36]} /><meshBasicMaterial color="#ffc27a" toneMapped={false} /></mesh>
            <mesh position={[0, 1.52, 0]} rotation-y={Math.PI / 4}><coneGeometry args={[0.42, 0.3, 4]} /><meshLambertMaterial color="#3a3f4a" /></mesh>
            <Billboard position={[0, 1.2, 0]}>
              <mesh><planeGeometry args={[2.4, 2.4]} /><meshBasicMaterial map={glow} color="#ff9a4a" transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
            </Billboard>
          </group>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------- Torii néon
function Torii() {
  const glow = useTex(() => glowTexture());
  const kanji = useTex(neonKanjiTexture);
  const fire = useImageTexture(fireImg.src);
  const flames = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = flames.current;
    if (!g) return;
    g.children.forEach((c, i) => {
      const t = clock.elapsedTime * 9 + i * 2;
      c.scale.set(1 + Math.sin(t) * 0.06, 1 + Math.sin(t * 1.3) * 0.1, 1);
    });
  });
  const shu = "#c43a22";
  const neon = <meshBasicMaterial color="#5ff2e4" toneMapped={false} />;
  return (
    <group position={[pathX(-27), 0, -27]}>
      {[-2.2, 2.2].map((x) => (
        <group key={x}>
          <mesh position={[x, 2.6, 0]}><cylinderGeometry args={[0.19, 0.22, 5.4, 12]} /><meshLambertMaterial color={shu} /></mesh>
          <mesh position={[x, 0.15, 0]}><cylinderGeometry args={[0.3, 0.3, 0.3, 12]} /><meshLambertMaterial color="#111" /></mesh>
          <mesh position={[x * 0.9, 2.6, 0.22]}><boxGeometry args={[0.03, 4.8, 0.03]} />{neon}</mesh>
        </group>
      ))}
      <mesh position={[0, 5.45, 0]}><boxGeometry args={[6.6, 0.32, 0.55]} /><meshLambertMaterial color="#141414" /></mesh>
      <mesh position={[0, 5.15, 0]}><boxGeometry args={[6.0, 0.28, 0.45]} /><meshLambertMaterial color={shu} /></mesh>
      <mesh position={[0, 4.95, 0.24]}><boxGeometry args={[6.0, 0.035, 0.035]} />{neon}</mesh>
      <mesh position={[0, 4.2, 0]}><boxGeometry args={[5.2, 0.22, 0.26]} /><meshLambertMaterial color={shu} /></mesh>
      <mesh position={[0, 4.2, 0.14]}><boxGeometry args={[5.2, 0.03, 0.03]} />{neon}</mesh>
      <mesh position={[0, 4.68, 0.1]}><planeGeometry args={[0.7, 0.7]} /><meshBasicMaterial map={kanji} toneMapped={false} /></mesh>
      <mesh position={[0, 4.68, 0.05]}><planeGeometry args={[3.5, 3.5]} /><meshBasicMaterial map={glow} color="#3fe0d0" transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
      {/* braseros */}
      <group ref={flames}>
        {fire && [-3.3, 3.3].map((x) => (
          <Billboard key={x} position={[x, 1.55, 0.6]}>
            <mesh><planeGeometry args={[1.1, 0.85]} /><meshBasicMaterial map={fire} transparent alphaTest={0.05} depthWrite={false} toneMapped={false} /></mesh>
          </Billboard>
        ))}
      </group>
      {[-3.3, 3.3].map((x) => (
        <group key={x} position={[x, 0, 0.6]}>
          <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.05, 0.08, 1.2, 6]} /><meshLambertMaterial color="#222" /></mesh>
          <mesh position={[0, 1.22, 0]}><cylinderGeometry args={[0.36, 0.2, 0.2, 10]} /><meshLambertMaterial color="#2a2a2a" /></mesh>
          <Billboard position={[0, 1.6, 0]}><mesh><planeGeometry args={[3, 3]} /><meshBasicMaterial map={glow} color="#ff7a2a" transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh></Billboard>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- Enseigne et rocher du héros
function HeroSet({ reduced, pointer }: { reduced: boolean; pointer: { x: number; y: number } }) {
  const sign = useTex(neonSignTexture);
  const glow = useTex(() => glowTexture());
  const signMat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (!signMat.current || reduced) return;
    const t = clock.elapsedTime;
    // grésillement du néon
    const flick = Math.sin(t * 40) > 0.97 || (t % 7 > 6.7 && Math.sin(t * 90) > 0) ? 0.35 : 1;
    signMat.current.color.setScalar(flick);
  });
  return (
    <group>
      <mesh position={[0, 0.25, 0]} scale={[1.1, 0.55, 0.9]}>
        <dodecahedronGeometry args={[1, 1]} />
        <meshLambertMaterial color="#262c38" flatShading />
      </mesh>
      <VoxelNinja reduced={reduced} pointer={pointer} />
      <group position={[1.75, 0, -2.3]}>
        <mesh position={[-0.42, 2.2, 0]}><boxGeometry args={[0.08, 4.4, 0.08]} /><meshLambertMaterial color="#1a1d26" /></mesh>
        <mesh position={[0, 4.3, 0]}><boxGeometry args={[0.95, 0.06, 0.06]} /><meshLambertMaterial color="#1a1d26" /></mesh>
        <mesh position={[0, 2.35, 0.03]}>
          <planeGeometry args={[0.62, 3.5]} />
          <meshBasicMaterial ref={signMat} map={sign} toneMapped={false} />
        </mesh>
        <mesh position={[0, 2.35, -0.02]}>
          <planeGeometry args={[4, 6]} />
          <meshBasicMaterial map={glow} color="#ff4a2a" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        <pointLight position={[0, 2.4, 0.8]} color="#ff5a3c" intensity={10} distance={7} decay={1.5} />
      </group>
      {/* contre-jour cyan sur le ninja */}
      <pointLight position={[-1.1, 2.0, -1.2]} color="#3fe0d0" intensity={20} distance={6} decay={1.4} />
      <pointLight position={[1.0, 1.9, -0.9]} color="#ff5a3c" intensity={8} distance={4} decay={1.4} />
      {/* lumière d'appoint froide et douce, de face, pour lire la tenue */}
      <pointLight position={[-0.8, 1.6, 2.4]} color="#b9c8ff" intensity={5} distance={5} decay={1.4} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <circleGeometry args={[2.6, 32]} />
        <meshBasicMaterial map={glow} color="#3fe0d0" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- Les ennemis de l'empereur (décor)
function Enemies({ reduced }: { reduced: boolean }) {
  const mino = useImageTexture(minotaurImg.src);
  const b1 = useImageTexture(birdImg.src);
  const b2 = useImageTexture(bird2Img.src);
  const miss = useImageTexture(missileImg.src);
  const glow = useTex(() => glowTexture());
  const birds = useRef<THREE.Group>(null);
  const missile = useRef<THREE.Group>(null);
  const minoRef = useRef<THREE.Group>(null);
  const birdMats = useRef<THREE.MeshBasicMaterial[]>([]);
  const acc = useRef(0);
  useFrame((_, dt) => {
    acc.current += Math.min(dt, 0.1);
    const t = reduced ? 3 : acc.current;
    birds.current?.children.forEach((c, i) => {
      const a = t * 0.35 + i * 2.6;
      c.position.set(Math.cos(a) * 6, 6.5 + Math.sin(a * 2) * 0.8 + i, -44 - i * 8 + Math.sin(a) * 4);
      c.scale.x = Math.sin(a) > 0 ? -1 : 1;
    });
    const flap = Math.floor(t * 8) % 2;
    birdMats.current.forEach((m) => { if (m && b1 && b2) m.map = flap ? b2 : b1; });
    if (missile.current) {
      const k = ((t * 0.12) % 1);
      missile.current.position.set(-40 + k * 80, 15 + Math.sin(k * 6) * 1.5, -78);
    }
    if (minoRef.current) minoRef.current.position.y = 1.55 + Math.abs(Math.sin(t * 2.2)) * 0.06;
  });
  return (
    <>
      {mino && (
        <group ref={minoRef} position={[pathX(-53) - 3, 1.55, -53]}>
          <Billboard>
            <mesh><planeGeometry args={[1.8, 3.15]} /><meshBasicMaterial map={mino} transparent alphaTest={0.4} color="#b9a5a5" /></mesh>
            <mesh position={[-0.18, 1.02, 0.02]}><planeGeometry args={[0.6, 0.6]} /><meshBasicMaterial map={glow} color="#ff2a1a" transparent depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>
          </Billboard>
        </group>
      )}
      <group ref={birds}>
        {[0, 1].map((i) => (
          <Billboard key={i}>
            <mesh>
              <planeGeometry args={[1.3, 0.95]} />
              <meshBasicMaterial ref={(m) => { if (m) birdMats.current[i] = m; }} map={b1} transparent alphaTest={0.4} color="#c9a0a8" />
            </mesh>
          </Billboard>
        ))}
      </group>
      {miss && (
        <group ref={missile}>
          <Billboard>
            <mesh><planeGeometry args={[2.4, 1.5]} /><meshBasicMaterial map={miss} transparent alphaTest={0.4} fog={false} color="#8a8fa0" /></mesh>
            <mesh position={[-1.8, 0, -0.05]}><planeGeometry args={[3.5, 1.2]} /><meshBasicMaterial map={glow} color="#ff7a3a" transparent opacity={0.8} depthWrite={false} fog={false} blending={THREE.AdditiveBlending} /></mesh>
          </Billboard>
        </group>
      )}
    </>
  );
}

// ---------------------------------------------------------------- Château de l'empereur
function Fortress() {
  const r = rng(4);
  const windows = useMemo(() => {
    const out: [number, number, number, string][] = [];
    for (let lvl = 0; lvl < 5; lvl++) {
      const w = 9 - lvl * 1.5;
      for (let i = 0; i < 6 - lvl; i++) out.push([-w / 2 + 0.8 + (i * (w - 1.6)) / Math.max(1, 5 - lvl), 2 + lvl * 3.3, w / 2 + 0.05, r() > 0.7 ? "#ff5a3c" : "#5ff2e4"]);
    }
    return out;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <group position={[-6, 4, -112]}>
      {[0, 1, 2, 3, 4].map((lvl) => {
        const w = 9 - lvl * 1.5;
        return (
          <group key={lvl} position={[0, lvl * 3.3, 0]}>
            <mesh position={[0, 1.4, 0]}><boxGeometry args={[w, 2.8, w]} /><meshBasicMaterial color="#0b1020" fog={false} /></mesh>
            <mesh position={[0, 3.0, 0]} rotation-y={Math.PI / 4}><coneGeometry args={[w * 0.95, 1.3, 4]} /><meshBasicMaterial color="#070a14" fog={false} /></mesh>
          </group>
        );
      })}
      {windows.map(([x, y, z, c], i) => (
        <mesh key={i} position={[x, y, z]}><planeGeometry args={[0.35, 0.9]} /><meshBasicMaterial color={c} fog={false} toneMapped={false} /></mesh>
      ))}
      <mesh position={[0, 30, 0]}><boxGeometry args={[0.12, 60, 0.12]} /><meshBasicMaterial color="#5ff2e4" fog={false} transparent opacity={0.35} /></mesh>
      <mesh position={[0, -3, 0]}><boxGeometry args={[40, 8, 24]} /><meshBasicMaterial color="#070a14" fog={false} /></mesh>
    </group>
  );
}

// ---------------------------------------------------------------- Caméra pilotée par le défilement
type Key = { pos: THREE.Vector3; look: THREE.Vector3 };
const keyCache = new Map<boolean, Key[]>();
/** Clés de caméra, calculées une fois par orientation (pas d'allocation par image). */
function keysFor(aspect: number): Key[] {
  const wide = aspect > 1.05;
  const hit = keyCache.get(wide);
  if (hit) return hit;
  const keys = buildKeys(wide);
  keyCache.set(wide, keys);
  return keys;
}
function buildKeys(wide: boolean): Key[] {
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  return [
    wide ? { pos: v(-1.0, 1.85, 6.2), look: v(-1.75, 1.5, 0) } : { pos: v(0.3, 2.6, 7.6), look: v(0.5, 2.3, 0) },
    { pos: v(-0.9, 2.4, -5), look: v(0.6, 2.8, -24) },
    { pos: v(pathX(-17) + 0.8, 1.7, -17), look: v(-1.8, 2.4, -44) },
    { pos: v(pathX(-36), 2.2, -36), look: v(0.5, 3.2, -70) },
    { pos: v(pathX(-50), 3.2, -50), look: v(0, 6, -100) },
    { pos: v(pathX(-58), 6.5, -58), look: v(4, 14, -130) },
  ];
}

function CameraRig({ pointer, reduced }: { pointer: { x: number; y: number }; reduced: boolean }) {
  const { camera, size } = useThree();
  const cur = useRef<{ pos: THREE.Vector3; look: THREE.Vector3 } | null>(null);
  const tops = useRef<number[]>([]);
  const target = useMemo(() => ({ pos: new THREE.Vector3(), look: new THREE.Vector3() }), []);
  useEffect(() => {
    const measure = () => {
      tops.current = Array.from(document.querySelectorAll<HTMLElement>("[data-cam]")).map((el) => el.getBoundingClientRect().top + window.scrollY);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = size.width / size.height > 1.05 ? 42 : 58;
    cam.updateProjectionMatrix();
  }, [camera, size]);

  useFrame((state, dt) => {
    // temps accumulé (la pause de la Canvas remet clock.elapsedTime à zéro)
    if (!reduced) windUniform.value += Math.min(dt, 0.1);
    const keys = keysFor(size.width / size.height);
    const y = window.scrollY;
    const T = tops.current;
    let i = 0;
    while (i < T.length - 1 && y >= T[i + 1]) i++;
    const span = i < T.length - 1 ? T[i + 1] - T[i] : 1;
    let f = i < T.length - 1 ? THREE.MathUtils.clamp((y - T[i]) / span, 0, 1) : 0;
    f = f * f * (3 - 2 * f);
    const a = keys[Math.min(i, keys.length - 1)], b = keys[Math.min(i + 1, keys.length - 1)];
    target.pos.lerpVectors(a.pos, b.pos, f);
    target.look.lerpVectors(a.look, b.look, f);
    target.pos.x += pointer.x * 0.35;
    target.pos.y += pointer.y * 0.2;
    if (!cur.current) cur.current = { pos: target.pos.clone(), look: target.look.clone() };
    const k = reduced ? 1 : 1 - Math.exp(-dt * 3.2);
    cur.current.pos.lerp(target.pos, k);
    cur.current.look.lerp(target.look, k);
    camera.position.copy(cur.current.pos);
    camera.lookAt(cur.current.look);
  });
  return null;
}

// ---------------------------------------------------------------- Scène
export default function HeroScene({ paused }: { paused: boolean }) {
  const [reduced, setReduced] = useState(false);
  const [mobile, setMobile] = useState(false);
  const pointer = useMemo(() => ({ x: 0, y: 0 }), []);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    setMobile(window.innerWidth < 760 || matchMedia("(pointer: coarse)").matches);
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [pointer]);

  return (
    <Canvas
      dpr={[1, mobile ? 1.5 : 2]}
      frameloop={paused ? "never" : "always"}
      camera={{ position: [0, 2, 7], fov: 42, near: 0.1, far: 500 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      onCreated={({ scene, gl }) => {
        scene.fog = new THREE.FogExp2(FOG, 0.042);
        scene.background = FOG.clone();
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
      }}
    >
      <hemisphereLight args={["#6b7fb5", "#0a0e1a", 1.5]} />
      <directionalLight position={[20, 26, -120]} intensity={1.6} color="#cdd6ff" />
      <directionalLight position={[-6, 8, 10]} intensity={0.9} color="#9fb2ff" />
      <Sky />
      <Fortress />
      <Ground />
      <Bamboo count={mobile ? 300 : 560} leafCount={mobile ? 340 : 800} />
      <Lanterns />
      <Torii />
      <HeroSet reduced={reduced} pointer={pointer} />
      <Enemies reduced={reduced} />
      <Mist reduced={reduced} />
      <Petals count={mobile ? 450 : 1400} reduced={reduced} />
      <CameraRig pointer={pointer} reduced={reduced} />
    </Canvas>
  );
}
