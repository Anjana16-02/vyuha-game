import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function ProceduralWarrior({
  color = "#8b5a2b",
  accent = "#c9a227",
  scale = 1,
  pose = "idle",
  cloak = "#5a3a22",
  weapon = true,
}: {
  color?: string;
  accent?: string;
  scale?: number;
  pose?: "idle" | "guard" | "attack" | "victory";
  cloak?: string;
  weapon?: boolean;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!g.current) return;
    const t = s.clock.elapsedTime;
    const breathe = 1 + Math.sin(t * 1.6) * 0.025;
    g.current.scale.setScalar(scale * breathe);
    g.current.position.y = pose === "idle" ? Math.sin(t * 1.4) * 0.04 : 0.06;
    g.current.rotation.y = pose === "victory" ? t * 0.4 : Math.sin(t * 0.4) * 0.08;
    const torso = g.current.children[1] as THREE.Mesh | undefined;
    if (torso) torso.rotation.x = Math.sin(t * 1.2) * 0.04;
  });
  return (
    <group ref={g}>
      <mesh position={[0, 1.55, 0]} castShadow>
        <sphereGeometry args={[0.22, 10, 10]} />
        <meshStandardMaterial color="#d7c4a8" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.72, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.26, 0.22, 8]} />
        <meshStandardMaterial color={accent} metalness={0.5} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.05, 0]} castShadow>
        <capsuleGeometry args={[0.28, 0.55, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.1, -0.12]} rotation={[0.2, 0, 0]}>
        <coneGeometry args={[0.36, 0.9, 6]} />
        <meshStandardMaterial color={cloak} roughness={0.9} transparent opacity={0.85} />
      </mesh>
      <mesh position={[-0.38, 1.05, 0]} rotation={[0, 0, 0.4]} castShadow>
        <capsuleGeometry args={[0.08, 0.45, 3, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.38, 1.05, 0]} rotation={[0, 0, -0.25]} castShadow>
        <capsuleGeometry args={[0.08, 0.45, 3, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {weapon && (
        <mesh position={[0.52, 1.15, 0.1]} rotation={[0.2, 0, -0.4]}>
          <boxGeometry args={[0.05, 0.9, 0.05]} />
          <meshStandardMaterial color="#c8c4bc" metalness={0.7} roughness={0.3} />
        </mesh>
      )}
      <mesh position={[-0.12, 0.42, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.45, 3, 6]} />
        <meshStandardMaterial color="#3a2a1c" />
      </mesh>
      <mesh position={[0.12, 0.42, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.45, 3, 6]} />
        <meshStandardMaterial color="#3a2a1c" />
      </mesh>
    </group>
  );
}

export function ProceduralHorse({ color = "#4a3020" }: { color?: string }) {
  const r = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (!r.current) return;
    r.current.position.y = Math.sin(s.clock.elapsedTime * 2.2) * 0.05;
  });
  return (
    <group ref={r}>
      <mesh position={[0, 0.7, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.22, 0.7, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.42, 0.95, 0]}>
        <capsuleGeometry args={[0.12, 0.28, 3, 6]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
