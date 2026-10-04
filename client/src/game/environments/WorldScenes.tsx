import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { DEFAULT_COMPOSITION_RATIOS } from "../../../../shared/constants";
import { COMMANDERS } from "../../../../shared/constants";
import type { VyuhaId } from "../../../../shared/types";
import { generateFormation } from "../formations/generator";
import { ProceduralHorse, ProceduralWarrior } from "../characters/ProceduralWarrior";
import { DustField, WindFlag } from "./BattleEnvironment";
import { useGame } from "../../state/gameStore";

export function WarRoomCanvas() {
  return (
    <Canvas shadows camera={{ position: [6, 5.5, 9], fov: 40 }} dpr={[1, 1.6]}>
      <color attach="background" args={["#140e0a"]} />
      <fog attach="fog" args={["#1a120c", 8, 28]} />
      <ambientLight intensity={0.28} color="#8a6a48" />
      <directionalLight position={[6, 10, 4]} intensity={1.1} color="#ffd9a0" castShadow />
      <pointLight position={[-3, 2.2, 1]} intensity={1.4} color="#ff8a3a" distance={8} />
      <pointLight position={[3, 2.2, -2]} intensity={0.8} color="#ffb24a" distance={7} />
      <hemisphereLight args={["#4a3020", "#1a100c", 0.4]} />
      <Camp />
    </Canvas>
  );
}

function Camp() {
  const commanderId = useGame((s) => s.loadout.commanderId);
  const comm = COMMANDERS.find((c) => c.id === commanderId) ?? COMMANDERS[0]!;
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    s.camera.position.x = 6 + Math.sin(t * 0.08) * 0.6;
    s.camera.position.y = 5.4 + Math.sin(t * 0.11) * 0.15;
    s.camera.lookAt(0, 1.2, 0);
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#3a2a1c" roughness={1} />
      </mesh>
      <mesh position={[0, 0.45, 0]} receiveShadow>
        <boxGeometry args={[6.4, 0.5, 4.2]} />
        <meshStandardMaterial color="#5a3c24" />
      </mesh>
      <mesh position={[0, 0.74, 0]}>
        <boxGeometry args={[5.6, 0.08, 3.4]} />
        <meshStandardMaterial color="#2a4a32" />
      </mesh>
      <WindFlag position={[-4.5, 0, -3]} color="#c9a227" />
      <WindFlag position={[4.2, 0, -3.4]} color="#8a2a22" />
      <group position={[0, 0.78, 0]}>
        <ProceduralWarrior color={comm.colors[1]} accent={comm.colors[0]} cloak={comm.colors[2]} />
      </group>
      <group position={[-2.4, 0.78, 1.4]}>
        <ProceduralWarrior color="#4a3a2a" accent="#888" pose="guard" />
      </group>
      <group position={[2.6, 0.78, 1.2]}>
        <ProceduralWarrior color="#3a2a22" accent="#aaa" pose="guard" />
      </group>
      <group position={[3.4, 0.78, -1.6]}>
        <ProceduralHorse />
      </group>
      <Torch position={[-2.8, 0, 2.2]} />
      <Torch position={[2.8, 0, 2.2]} />
      <DustField count={18} color="#c8b090" />
    </group>
  );
}

function Torch({ position }: { position: [number, number, number] }) {
  const l = useRef<THREE.PointLight>(null);
  useFrame((s) => {
    if (l.current) l.current.intensity = 1.1 + Math.sin(s.clock.elapsedTime * 11) * 0.25;
  });
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 1.6, 6]} />
        <meshStandardMaterial color="#2a1a10" />
      </mesh>
      <mesh position={[0, 1.85, 0]}>
        <coneGeometry args={[0.12, 0.3, 6]} />
        <meshStandardMaterial color="#ff9a3a" emissive="#ff6a1a" emissiveIntensity={2} />
      </mesh>
      <pointLight ref={l} position={[0, 1.9, 0]} color="#ff7a30" distance={6} />
    </group>
  );
}

export function KingdomCanvas({ level }: { level: number }) {
  const scale = level >= 20 ? 1.6 : level >= 10 ? 1.3 : level >= 5 ? 1.1 : 0.85;
  return (
    <Canvas shadows camera={{ position: [10, 8, 12], fov: 42 }}>
      <color attach="background" args={["#10161c"]} />
      <fog attach="fog" args={["#15202a", 10, 36]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[8, 12, 6]} intensity={1.1} color="#ffe6b0" castShadow />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#2e4a32" />
      </mesh>
      <mesh position={[0, 1.2 * scale, 0]} castShadow scale={scale}>
        <boxGeometry args={[4, 2.4, 4]} />
        <meshStandardMaterial color="#6a5a4a" />
      </mesh>
      <mesh position={[0, 2.8 * scale, 0]} scale={scale}>
        <boxGeometry args={[2.2, 1.6, 2.2]} />
        <meshStandardMaterial color="#5a4a3a" />
      </mesh>
      {level >= 5 && (
        <mesh position={[-5, 0.8, 1]} scale={scale}>
          <boxGeometry args={[2.4, 1.6, 2.4]} />
          <meshStandardMaterial color="#4a3a2c" />
        </mesh>
      )}
      {level >= 10 && (
        <mesh position={[5.2, 1.1, -1]} scale={scale}>
          <boxGeometry args={[3.2, 2.2, 3.2]} />
          <meshStandardMaterial color="#5c4c3c" />
        </mesh>
      )}
      <WindFlag position={[-2.2, 0, -2]} color="#c9a227" />
      <WindFlag position={[2.2, 0, -2]} color="#c9a227" />
      <group position={[-3, 0.78, 3]}>
        <ProceduralWarrior color="#4a3a2a" pose="guard" />
      </group>
      <group position={[3.2, 0.78, 2.6]}>
        <ProceduralWarrior color="#3a2c22" />
      </group>
      <DustField count={14} color="#b8c4a8" />
    </Canvas>
  );
}

export function PreviewCanvas({ commanderId }: { commanderId: string }) {
  const c = COMMANDERS.find((x) => x.id === commanderId) ?? COMMANDERS[0]!;
  return (
    <Canvas camera={{ position: [2.4, 1.8, 3.2], fov: 35 }}>
      <color attach="background" args={["#120e0c"]} />
      <fog attach="fog" args={["#1a1410", 2, 10]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 4, 2]} intensity={1.2} color="#ffe0b0" />
      <spotLight position={[-2, 3, 2]} intensity={0.6} color="#88a0ff" />
      <Turntable>
        <ProceduralWarrior color={c.colors[1]} accent={c.colors[0]} cloak={c.colors[2]} />
      </Turntable>
    </Canvas>
  );
}

function Turntable({ children }: { children: ReactNode }) {
  const r = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (r.current) r.current.rotation.y = s.clock.elapsedTime * 0.35;
  });
  return <group ref={r}>{children}</group>;
}

export function FormationPreview({ vyuha }: { vyuha: string }) {
  return (
    <Canvas camera={{ position: [0, 22, 18], fov: 40 }}>
      <color attach="background" args={["#10140e"]} />
      <fog attach="fog" args={["#1a2018", 10, 40]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[8, 14, 6]} intensity={1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#35522c" />
      </mesh>
      <FormationDots vyuha={vyuha} />
    </Canvas>
  );
}

function FormationDots({ vyuha }: { vyuha: string }) {
  const army = useGame((s) => s.loadout);
  const slots = useMemo(
    () =>
      generateFormation(
        vyuha as VyuhaId,
        army.composition ?? {
          infantry: Math.round(5000 * DEFAULT_COMPOSITION_RATIOS.infantry),
          archers: Math.round(5000 * DEFAULT_COMPOSITION_RATIOS.archers),
          cavalry: Math.round(5000 * DEFAULT_COMPOSITION_RATIOS.cavalry),
          elephants: Math.round(5000 * DEFAULT_COMPOSITION_RATIOS.elephants),
          chariots: Math.round(5000 * DEFAULT_COMPOSITION_RATIOS.chariots),
          elite: Math.round(5000 * DEFAULT_COMPOSITION_RATIOS.elite),
        },
        army.armySize,
        1,
      ),
    [vyuha, army.composition, army.armySize],
  );
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!g.current) return;
    g.current.children.forEach((ch, i) => {
      const t = slots[i];
      if (!t) return;
      ch.position.x += (t.pos.x - ch.position.x) * Math.min(1, dt * 3);
      ch.position.z += (t.pos.z - ch.position.z) * Math.min(1, dt * 3);
    });
  });
  return (
    <group ref={g}>
      {slots.map((s, i) => (
        <mesh key={i} position={[s.pos.x, 0.35, s.pos.z]}>
          <boxGeometry args={[0.7, 0.5, 0.7]} />
          <meshStandardMaterial
            color={
              s.category === "archer"
                ? "#3d6b4a"
                : s.category === "cavalry"
                  ? "#8a3a2a"
                  : s.category === "elephant"
                    ? "#5a4a3a"
                    : s.category === "elite"
                      ? "#c9a227"
                      : "#6b5a3a"
            }
          />
        </mesh>
      ))}
    </group>
  );
}
