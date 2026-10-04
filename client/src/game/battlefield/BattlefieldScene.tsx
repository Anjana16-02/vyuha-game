import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import type { BattleEvent, BattleSnapshot, GraphicsQuality } from "../../../../shared/types";
import { BattleEnvironment, DustField, WindFlag } from "../environments/BattleEnvironment";
import { UnitField } from "./UnitField";
import { useGame } from "../../state/gameStore";

export function BattlefieldCanvas() {
  const snap = useGame((s) => s.snap);
  const quality = useGame((s) => (s.settings.graphics === "ultra" || s.settings.graphics === "high" ? s.settings.graphics : s.settings.graphics));
  const reduced = useGame((s) => s.settings.reducedMotion);
  if (!snap) return <div className="missing">Unable to load battle.</div>;
  return (
    <Canvas shadows dpr={quality === "low" ? 1 : [1, 1.75]} gl={{ antialias: quality !== "low", powerPreference: "high-performance" }} onCreated={({ gl }) => {
      gl.setClearColor("#111");
    }}>
      <BattleWorld snap={snap} quality={quality} reduced={reduced} />
    </Canvas>
  );
}

function BattleWorld({ snap, quality, reduced }: { snap: BattleSnapshot; quality: GraphicsQuality; reduced: boolean }) {
  const mode = useGame((s) => s.cameraMode);
  const particles = quality === "low" ? 12 : quality === "medium" ? 28 : quality === "high" ? 48 : 70;
  return (
    <>
      <PerspectiveCamera makeDefault fov={42} position={[0, 28, 36]} />
      <BattleEnvironment id={snap.environment} quality={quality} />
      <UnitField groups={snap.groups} lod={quality === "low" ? "low" : "high"} />
      <WindFlag position={[-16, 0, -22]} color="#c9a227" />
      <WindFlag position={[16, 0, -22]} color="#c9a227" />
      <WindFlag position={[-16, 0, 22]} color="#7a2a22" />
      <WindFlag position={[16, 0, 22]} color="#7a2a22" />
      <DustField count={reduced ? 8 : particles} color="#c4b08a" />
      <ArrowVolleys events={snap.events} />
      <Director snap={snap} mode={mode} reduced={reduced} />
      {mode === "player" && <OrbitControls enablePan enableRotate maxPolarAngle={Math.PI / 2.1} minDistance={8} maxDistance={70} />}
    </>
  );
}

function Director({ snap, mode, reduced }: { snap: BattleSnapshot; mode: string; reduced: boolean }) {
  const { camera } = useThree();
  const goal = useRef(new THREE.Vector3(0, 26, 34));
  const look = useRef(new THREE.Vector3(0, 0, 0));
  const shake = useRef(0);
  const lastEvent = useRef(0);
  const cinematicTimer = useRef(0);
  const cinematicMode = useRef<"none" | "cavalry" | "elephant" | "duel" | "breach">("none");

  useEffect(() => {
    const ev = snap.events[snap.events.length - 1];
    if (!ev || ev.t === lastEvent.current) return;
    lastEvent.current = ev.t;
    if (ev.type === "ELEPHANT_CHARGE" || ev.type === "FORMATION_COLLAPSE") shake.current = 0.35;
    if (ev.type === "MAJOR_DUEL") shake.current = 0.15;
    if (ev.type === "CAVALRY_CHARGE" && cinematicMode.current === "none") {
      cinematicMode.current = "cavalry";
      cinematicTimer.current = 3;
    }
    if (ev.type === "ELEPHANT_CHARGE" && cinematicMode.current === "none") {
      cinematicMode.current = "elephant";
      cinematicTimer.current = 3;
    }
    if (ev.type === "MAJOR_DUEL" && cinematicMode.current === "none") {
      cinematicMode.current = "duel";
      cinematicTimer.current = 2.5;
    }
    if (ev.type === "FORMATION_BREACH" && cinematicMode.current === "none") {
      cinematicMode.current = "breach";
      cinematicTimer.current = 2;
    }
  }, [snap.events]);

  useFrame((_, dt) => {
    const ev = snap.events[snap.events.length - 1];
    let tx = 0, ty = 26, tz = 34;
    let lx = 0, lz = 0;

    if (cinematicMode.current !== "none") {
      cinematicTimer.current -= dt;
      if (cinematicTimer.current <= 0) {
        cinematicMode.current = "none";
      } else {
        if (cinematicMode.current === "cavalry" && ev) {
          tx = ev.position.x * 0.5;
          tz = ev.position.z + 12;
          ty = 10;
          lx = ev.position.x;
          lz = ev.position.z;
        } else if (cinematicMode.current === "elephant" && ev) {
          tx = ev.position.x * 0.4;
          tz = ev.position.z + 14;
          ty = 9;
          lx = ev.position.x;
          lz = ev.position.z;
        } else if (cinematicMode.current === "duel" && ev) {
          tx = ev.position.x;
          tz = ev.position.z + 8;
          ty = 7;
          lx = ev.position.x;
          lz = ev.position.z;
        } else if (cinematicMode.current === "breach" && ev) {
          tx = ev.position.x * 0.3;
          tz = ev.position.z + 10;
          ty = 11;
          lx = ev.position.x;
          lz = ev.position.z;
        }
      }
    } else if (mode === "formation") {
      ty = 16;
      tz = 18;
    } else if (mode === "battlefield") {
      ty = 12;
      tz = 14;
    } else if (mode === "combat" && ev) {
      tx = ev.position.x;
      tz = ev.position.z + 10;
      ty = 8;
      lx = ev.position.x;
      lz = ev.position.z;
    } else if (ev && (ev.type === "ELEPHANT_CHARGE" || ev.type === "CAVALRY_CHARGE" || ev.type === "MAJOR_DUEL" || ev.type === "COMMANDER_THREATENED")) {
      tx = ev.position.x * 0.6;
      tz = ev.position.z + 14;
      ty = 12;
      lx = ev.position.x;
      lz = ev.position.z;
    }
    if (snap.phase === "final_push") {
      ty = 22;
      tz = 28;
    }
    if (snap.finished) {
      ty = 32;
      tz = 40;
    }
    const k = reduced ? 1 : 1 - Math.pow(0.08, dt);
    goal.current.lerp(new THREE.Vector3(tx, ty, tz), Math.min(1, k));
    look.current.lerp(new THREE.Vector3(lx, 0.4, lz), Math.min(1, k));
    shake.current = Math.max(0, shake.current - dt);
    const s = reduced ? 0 : shake.current;
    if (mode !== "player") {
      camera.position.lerp(goal.current, 0.05);
      camera.position.x += (Math.random() - 0.5) * s;
      camera.position.y += (Math.random() - 0.5) * s * 0.4;
      camera.lookAt(look.current);
    }
  });
  return null;
}

function ArrowVolleys({ events }: { events: BattleEvent[] }) {
  const volley = events.filter((e) => e.type === "ARCHER_VOLLEY").slice(-5);
  const arrows = useMemo(() => {
    const arr: { pos: [number, number, number]; vel: [number, number, number]; life: number; }[] = [];
    volley.forEach((e) => {
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const speed = 0.9 + Math.random() * 0.5;
        arr.push({
          pos: [e.position.x + Math.cos(angle) * 2.5, 2.5 + Math.random() * 2, e.position.z + Math.sin(angle) * 2.5],
          vel: [Math.cos(angle) * speed, 0.35, Math.sin(angle) * speed],
          life: 1,
        });
      }
    });
    return arr;
  }, [volley]);

  const ref = useRef<THREE.Group>(null);
  useFrame((s, dt) => {
    if (!ref.current) return;
    arrows.forEach((arrow, i) => {
      if (arrow.life <= 0) return;
      arrow.pos[0] += arrow.vel[0] * dt * 20;
      arrow.pos[1] += arrow.vel[1] * dt * 20;
      arrow.pos[2] += arrow.vel[2] * dt * 20;
      arrow.vel[1] -= 9.8 * dt;
      arrow.life -= dt * 2;
      const mesh = ref.current!.children[i] as THREE.Mesh;
      if (mesh) {
        mesh.position.set(arrow.pos[0], arrow.pos[1], arrow.pos[2]);
        mesh.rotation.set(Math.atan2(arrow.vel[1], Math.hypot(arrow.vel[0], arrow.vel[2])), Math.atan2(arrow.vel[0], arrow.vel[2]), 0);
        mesh.visible = arrow.life > 0;
      }
    });
  });

  return (
    <group ref={ref}>
      {arrows.map((_, i) => (
        <mesh key={i}>
          <cylinderGeometry args={[0.015, 0.015, 0.7, 6]} />
          <meshStandardMaterial color="#e8dcc0" metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}
