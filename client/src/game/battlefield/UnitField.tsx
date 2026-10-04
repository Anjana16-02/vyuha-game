import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { UnitGroupState } from "../../../../shared/types";

const COLORS: Record<string, string> = {
  infantry: "#6b5a3a",
  archer: "#3d6b4a",
  cavalry: "#7a3a2a",
  elephant: "#5a4a3a",
  chariot: "#8a6a2a",
  elite: "#c9a227",
};

export function UnitField({ groups, lod }: { groups: UnitGroupState[]; lod: "low" | "high" }) {
  const player = groups.filter((g) => g.side === "player" && g.count > 0);
  const ai = groups.filter((g) => g.side === "ai" && g.count > 0);
  return (
    <group>
      {groups.filter((g) => g.count > 0 && !g.isCommander).map((g) => (
        <UnitGroup key={g.id} group={g} lod={lod} />
      ))}
      {groups
        .filter((g) => g.isCommander && g.count > 0)
        .map((g) => (
          <CommanderMarker key={g.id} g={g} />
        ))}
    </group>
  );
}

function UnitGroup({ group, lod }: { group: UnitGroupState; lod: "low" | "high" }) {
  const health = group.hp / Math.max(1, group.maxHp);
  const count = group.count;
  const scale = Math.min(2.5, 0.5 + Math.log2(2 + count) * 0.15);
  const groupRef = useRef<THREE.Group>(null);
  const animPhase = useRef(0);

  useFrame((s) => {
    if (!groupRef.current) return;
    const t = s.clock.elapsedTime;
    animPhase.current = (animPhase.current + 0.1) % (Math.PI * 2);
    const marching = Math.sin(t * 4 + group.position.x) * 0.06;
    const breathing = Math.sin(t * 2) * 0.02;
    groupRef.current.position.y = 0.3 + marching + breathing;
  });

  return (
    <group ref={groupRef} position={[group.position.x, 0.3, group.position.z]} rotation={[0, group.heading, 0]}>
      {group.category === "infantry" && <InfantryUnit scale={scale} health={health} phase={animPhase.current} />}
      {group.category === "archer" && <ArcherUnit scale={scale} health={health} phase={animPhase.current} />}
      {group.category === "cavalry" && <CavalryUnit scale={scale} health={health} phase={animPhase.current} />}
      {group.category === "elephant" && <ElephantUnit scale={scale} health={health} phase={animPhase.current} />}
      {group.category === "chariot" && <ChariotUnit scale={scale} health={health} phase={animPhase.current} />}
      {group.category === "elite" && <EliteUnit scale={scale} health={health} phase={animPhase.current} />}
    </group>
  );
}

function InfantryUnit({ scale, health, phase }: { scale: number; health: number; phase: number }) {
  const legL = Math.sin(phase) * 0.15;
  const legR = Math.sin(phase + Math.PI) * 0.15;
  const armL = Math.sin(phase * 0.8) * 0.1;
  const armR = Math.sin(phase * 0.8 + Math.PI) * 0.1;

  return (
    <group scale={scale}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.4, 4, 8]} />
        <meshStandardMaterial color={COLORS.infantry} />
      </mesh>
      <mesh position={[0, 0.78, 0]} castShadow>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#d7c4a8" />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.22, 0.18, 0.08]} />
        <meshStandardMaterial color="#4a3a2a" />
      </mesh>
      <mesh position={[0.18, 0.55, 0.05]} rotation={[armL, 0, -0.3]} castShadow>
        <boxGeometry args={[0.025, 0.35, 0.025]} />
        <meshStandardMaterial color="#c9a227" metalness={0.6} />
      </mesh>
      <mesh position={[-0.18, 0.55, 0.05]} rotation={[armR, 0, 0.3]} castShadow>
        <boxGeometry args={[0.25, 0.02, 0.06]} />
        <meshStandardMaterial color="#5a3a2a" />
      </mesh>
      <mesh position={[0.06, 0.18, 0]} rotation={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.25, 6]} />
        <meshStandardMaterial color="#4a3a2a" />
      </mesh>
      <mesh position={[-0.06, 0.18, 0]} rotation={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.25, 6]} />
        <meshStandardMaterial color="#4a3a2a" />
      </mesh>
    </group>
  );
}

function ArcherUnit({ scale, health, phase }: { scale: number; health: number; phase: number }) {
  const armL = Math.sin(phase * 0.6) * 0.2;
  const armR = Math.sin(phase * 0.6 + Math.PI) * 0.2;

  return (
    <group scale={scale}>
      <mesh position={[0, 0.38, 0]} castShadow>
        <capsuleGeometry args={[0.09, 0.38, 4, 8]} />
        <meshStandardMaterial color={COLORS.archer} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#d7c4a8" />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.18, 0.16, 0.06]} />
        <meshStandardMaterial color="#3a5a3a" />
      </mesh>
      <mesh position={[0.22, 0.6, 0.08]} rotation={[armL, 0.3, -0.6]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.45, 6]} />
        <meshStandardMaterial color="#8a6a3a" />
      </mesh>
      <mesh position={[0.22, 0.75, 0.12]} rotation={[armL, 0.3, -0.6]}>
        <torusGeometry args={[0.09, 0.012, 6, 16]} />
        <meshStandardMaterial color="#6a4a2a" />
      </mesh>
      <mesh position={[-0.12, 0.3, 0.08]} rotation={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.08, 0.3, 0.04]} />
        <meshStandardMaterial color="#5a3a2a" />
      </mesh>
    </group>
  );
}

function CavalryUnit({ scale, health, phase }: { scale: number; health: number; phase: number }) {
  const horseLegs = Math.sin(phase * 2) * 0.12;

  return (
    <group scale={scale}>
      <mesh position={[0, 0.55, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[0.18, 0.5, 4, 8]} />
        <meshStandardMaterial color={COLORS.cavalry} />
      </mesh>
      <mesh position={[0, 0.45, 0.35]} castShadow>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial color="#6a5a4a" />
      </mesh>
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.11, 8, 8]} />
        <meshStandardMaterial color="#d7c4a8" />
      </mesh>
      <mesh position={[0.12, 0.72, 0.08]} rotation={[0, 0, -0.5]} castShadow>
        <boxGeometry args={[0.035, 0.32, 0.035]} />
        <meshStandardMaterial color="#c9a227" metalness={0.5} />
      </mesh>
      <mesh position={[0.06, 0.45, -0.25]} rotation={[horseLegs, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 6]} />
        <meshStandardMaterial color="#4a3a2a" />
      </mesh>
      <mesh position={[-0.06, 0.45, -0.25]} rotation={[-horseLegs, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 6]} />
        <meshStandardMaterial color="#4a3a2a" />
      </mesh>
      <mesh position={[0.06, 0.45, 0.25]} rotation={[horseLegs + Math.PI, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 6]} />
        <meshStandardMaterial color="#4a3a2a" />
      </mesh>
      <mesh position={[-0.06, 0.45, 0.25]} rotation={[-horseLegs + Math.PI, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 6]} />
        <meshStandardMaterial color="#4a3a2a" />
      </mesh>
    </group>
  );
}

function ElephantUnit({ scale, health, phase }: { scale: number; health: number; phase: number }) {
  const trunkPhase = Math.sin(phase * 0.8) * 0.15;
  const legPhase = Math.sin(phase * 1.5) * 0.08;

  return (
    <group scale={scale * 1.4}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[0.6, 0.7, 0.9]} />
        <meshStandardMaterial color={COLORS.elephant} />
      </mesh>
      <mesh position={[0, 1.6, 0.25]} castShadow>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshStandardMaterial color="#6a5a4a" />
      </mesh>
      <mesh position={[0.35, 1.3, 0.4]} rotation={[0, 0, trunkPhase]} castShadow>
        <cylinderGeometry args={[0.08, 0.15, 0.8, 6]} />
        <meshStandardMaterial color="#5a4a3a" />
      </mesh>
      <mesh position={[0.3, 0.6, 0.35]} rotation={[legPhase, 0, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.08, 0.5, 6]} />
        <meshStandardMaterial color="#4a3a2a" />
      </mesh>
      <mesh position={[-0.3, 0.6, 0.35]} rotation={[-legPhase, 0, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.08, 0.5, 6]} />
        <meshStandardMaterial color="#4a3a2a" />
      </mesh>
      <mesh position={[0.3, 0.6, -0.35]} rotation={[legPhase + Math.PI, 0, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.08, 0.5, 6]} />
        <meshStandardMaterial color="#4a3a2a" />
      </mesh>
      <mesh position={[-0.3, 0.6, -0.35]} rotation={[-legPhase + Math.PI, 0, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.08, 0.5, 6]} />
        <meshStandardMaterial color="#4a3a2a" />
      </mesh>
      <mesh position={[0, 1.4, 0.4]} castShadow>
        <capsuleGeometry args={[0.12, 0.25, 4, 6]} />
        <meshStandardMaterial color="#d7c4a8" />
      </mesh>
      <mesh position={[0.15, 1.65, 0.35]} castShadow>
        <coneGeometry args={[0.08, 0.25, 6]} />
        <meshStandardMaterial color="#4a3a2a" />
      </mesh>
    </group>
  );
}

function ChariotUnit({ scale, health, phase }: { scale: number; health: number; phase: number }) {
  const wheelRot = phase * 3;

  return (
    <group scale={scale}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.5, 0.12, 0.7]} />
        <meshStandardMaterial color={COLORS.chariot} />
      </mesh>
      <mesh position={[0.25, 0.35, 0]} rotation={[wheelRot, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.06, 8]} />
        <meshStandardMaterial color="#5a3a2a" />
      </mesh>
      <mesh position={[-0.25, 0.35, 0]} rotation={[wheelRot, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.14, 0.14, 0.06, 8]} />
        <meshStandardMaterial color="#5a3a2a" />
      </mesh>
      <mesh position={[0, 0.75, 0]} castShadow>
        <capsuleGeometry args={[0.1, 0.28, 4, 6]} />
        <meshStandardMaterial color="#d7c4a8" />
      </mesh>
      <mesh position={[0.12, 0.68, 0.08]} rotation={[0, 0, -0.3]} castShadow>
        <boxGeometry args={[0.03, 0.3, 0.03]} />
        <meshStandardMaterial color="#8a6a3a" />
      </mesh>
    </group>
  );
}

function EliteUnit({ scale, health, phase }: { scale: number; health: number; phase: number }) {
  const armL = Math.sin(phase * 0.7) * 0.12;
  const armR = Math.sin(phase * 0.7 + Math.PI) * 0.12;

  return (
    <group scale={scale * 1.25}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <capsuleGeometry args={[0.15, 0.45, 4, 8]} />
        <meshStandardMaterial color={COLORS.elite} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.98, 0]} castShadow>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial color="#d7c4a8" />
      </mesh>
      <mesh position={[0, 0.68, 0]} castShadow>
        <boxGeometry args={[0.28, 0.22, 0.1]} />
        <meshStandardMaterial color="#8a6a4a" />
      </mesh>
      <mesh position={[0.22, 0.72, 0.06]} rotation={[armL, 0, -0.4]} castShadow>
        <boxGeometry args={[0.05, 0.5, 0.05]} />
        <meshStandardMaterial color="#c9a227" metalness={0.6} />
      </mesh>
      <mesh position={[-0.16, 0.62, 0.06]} rotation={[armR, 0, 0.3]} castShadow>
        <boxGeometry args={[0.32, 0.4, 0.08]} />
        <meshStandardMaterial color="#6a5a4a" />
      </mesh>
      <mesh position={[0.08, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 6]} />
        <meshStandardMaterial color="#5a3a2a" />
      </mesh>
      <mesh position={[-0.08, 0.28, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.3, 6]} />
        <meshStandardMaterial color="#5a3a2a" />
      </mesh>
    </group>
  );
}

function CommanderMarker({ g }: { g: UnitGroupState }) {
  const r = useRef<THREE.Group>(null);
  const phase = useRef(0);

  useFrame((s) => {
    if (!r.current) return;
    const t = s.clock.elapsedTime;
    phase.current = (phase.current + 0.08) % (Math.PI * 2);
    r.current.position.set(g.position.x, 0.95 + Math.sin(t * 1.5) * 0.06, g.position.z);
    r.current.rotation.y = g.heading;
  });

  return (
    <group ref={r}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <capsuleGeometry args={[0.18, 0.55, 4, 8]} />
        <meshStandardMaterial color={g.side === "player" ? "#8b6a3a" : "#5a2a2a"} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.35, 0]} castShadow>
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshStandardMaterial color="#d7c4a8" />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[0.3, 0.25, 0.12]} />
        <meshStandardMaterial color={g.side === "player" ? "#c9a227" : "#8a2a2a"} metalness={0.5} />
      </mesh>
      <mesh position={[0.25, 1.1, 0.1]} rotation={[Math.sin(phase.current) * 0.3, 0, -0.4]} castShadow>
        <boxGeometry args={[0.06, 0.55, 0.06]} />
        <meshStandardMaterial color="#c9a227" metalness={0.6} />
      </mesh>
      <pointLight intensity={0.8} distance={8} color={g.side === "player" ? "#ffd978" : "#ff6a4a"} />
    </group>
  );
}
