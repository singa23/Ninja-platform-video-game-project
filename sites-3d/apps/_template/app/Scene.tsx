"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, MeshTransmissionMaterial, ContactShadows, Lightformer, Environment } from "@react-three/drei";

export default function Scene() {
  return (
    <Canvas camera={{ position: [0, 1, 4] }} style={{ height: "100vh" }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 5, 2]} intensity={2} />
      <Environment resolution={256}>
        <Lightformer intensity={4} position={[0, 5, -5]} scale={[10, 5, 1]} />
      </Environment>
      <mesh>
        <torusKnotGeometry args={[0.8, 0.3, 200, 32]} />
        <MeshTransmissionMaterial thickness={0.5} color="#9cf" />
      </mesh>
      <ContactShadows position={[0, -1.3, 0]} opacity={0.5} blur={2} />
      <OrbitControls />
    </Canvas>
  );
}
