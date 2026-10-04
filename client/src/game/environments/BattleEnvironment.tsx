import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ENVIRONMENTS } from "../../../../shared/constants";
import type { EnvironmentId, GraphicsQuality } from "../../../../shared/types";

export function BattleEnvironment({
  id,
  quality,
}: {
  id: EnvironmentId;
  quality: GraphicsQuality;
}) {
  const env = ENVIRONMENTS[id];
  const grass = quality === "low" ? 80 : quality === "medium" ? 150 : 250;
  const trees = quality === "low" ? 6 : quality === "medium" ? 12 : 18;
  const rocks = quality === "low" ? 8 : quality === "medium" ? 16 : 24;
  const blades = useMemo(() => {
    const arr: { p: [number, number, number]; s: number; r: number }[] = [];
    for (let i = 0; i < grass; i++) {
      arr.push({
        p: [(Math.random() - 0.5) * 90, 0, (Math.random() - 0.5) * 90],
        s: 0.4 + Math.random() * 0.8,
        r: Math.random() * Math.PI,
      });
    }
    return arr;
  }, [grass, id]);

  const treePositions = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < trees; i++) {
      const angle = (i / trees) * Math.PI * 2;
      const radius = 32 + Math.random() * 18;
      arr.push([Math.cos(angle) * radius, 0, Math.sin(angle) * radius]);
    }
    return arr;
  }, [trees]);

  const rockPositions = useMemo(() => {
    const arr: [number, number, number, number, number, number][] = [];
    for (let i = 0; i < rocks; i++) {
      arr.push([
        (Math.random() - 0.5) * 70,
        0,
        (Math.random() - 0.5) * 70,
        0.5 + Math.random() * 1.5,
        0.3 + Math.random() * 0.8,
        0.4 + Math.random() * 0.6,
      ]);
    }
    return arr;
  }, [rocks]);

  const campPositions = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const radius = 45 + Math.random() * 8;
      arr.push([Math.cos(angle) * radius, 0, Math.sin(angle) * radius]);
    }
    return arr;
  }, []);

  return (
    <group>
      <color attach="background" args={[env.skyTop]} />
      <fog attach="fog" args={[env.fog, env.fogNear, env.fogFar]} />
      <hemisphereLight args={[env.skyTop, env.groundDark, 0.55]} />
      <ambientLight intensity={0.35} color={env.ambient} />
      <directionalLight
        position={env.sun}
        intensity={env.dirIntensity}
        color={env.dirColor}
        castShadow={quality !== "low"}
        shadow-mapSize-width={quality === "ultra" ? 2048 : 1024}
        shadow-mapSize-height={quality === "ultra" ? 2048 : 1024}
      />
      <BattlefieldGround env={env} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[18, 42, 48]} />
        <meshStandardMaterial color={env.groundDark} transparent opacity={0.35} />
      </mesh>
      {id === "royal_valley" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[12, 0.04, -6]}>
          <planeGeometry args={[8, 70]} />
          <meshStandardMaterial color="#3a6a88" transparent opacity={0.7} />
        </mesh>
      )}
      {id === "moonlit_ruins" &&
        [-18, 16, 22].map((x, i) => (
          <mesh key={x} position={[x, 1.4, -20 + i * 8]} castShadow>
            <boxGeometry args={[2.2, 2.8, 2.2]} />
            <meshStandardMaterial color="#2a3038" />
          </mesh>
        ))}
      {treePositions.map((pos, i) => (
        <BattleTree key={i} position={pos} />
      ))}
      {rockPositions.map((pos, i) => (
        <BattleRock key={i} position={[pos[0], pos[1], pos[2]]} scale={[pos[3], pos[4], pos[5]]} />
      ))}
      {campPositions.map((pos, i) => (
        <BattleCamp key={i} position={pos} />
      ))}
      {blades.map((b, i) => (
        <mesh key={i} position={b.p} rotation={[0, b.r, 0]}>
          <coneGeometry args={[0.05, b.s, 3]} />
          <meshStandardMaterial color={env.ground} />
        </mesh>
      ))}
      <SkyDome top={env.skyTop} bottom={env.skyBottom} />
      {id === "stormfront" && <Lightning />}
      <DistantBattlefield />
    </group>
  );
}

function BattlefieldGround({ env }: { env: typeof ENVIRONMENTS[keyof typeof ENVIRONMENTS] }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[160, 160, 64, 64]} />
        <meshStandardMaterial color={env.ground} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[160, 160, 32, 32]} />
        <meshStandardMaterial color={env.groundDark} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function BattleTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.4, 3, 8]} />
        <meshStandardMaterial color="#4a3a2a" />
      </mesh>
      <mesh position={[0, 3.5, 0]} castShadow>
        <coneGeometry args={[2, 3, 8]} />
        <meshStandardMaterial color="#3a5a3a" />
      </mesh>
    </group>
  );
}

function BattleRock({ position, scale }: { position: [number, number, number]; scale: [number, number, number] }) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#5a5a5a" roughness={0.9} />
    </mesh>
  );
}

function BattleCamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[2, 0.4, 2]} />
        <meshStandardMaterial color="#3a3a2a" />
      </mesh>
      <mesh position={[0, 0.9, 0]} castShadow>
        <coneGeometry args={[1, 1.5, 6]} />
        <meshStandardMaterial color="#6a4a3a" />
      </mesh>
      <mesh position={[0, 1.6, 0.6]} castShadow>
        <pointLight intensity={0.8} distance={4} color="#ff8a3a" />
      </mesh>
    </group>
  );
}

function SkyDome({ top, bottom }: { top: string; bottom: string }) {
  const geo = useMemo(() => new THREE.SphereGeometry(120, 16, 12), []);
  const mat = useMemo(() => {
    const c = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        top: { value: new THREE.Color(top) },
        bottom: { value: new THREE.Color(bottom) },
      },
      vertexShader: `varying vec3 v; void main(){ v=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; varying vec3 v; void main(){ float f=clamp(v.y*0.5+0.5,0.0,1.0); gl_FragColor=vec4(mix(bottom,top,f),1.0); }`,
    });
    return c;
  }, [top, bottom]);
  return <mesh geometry={geo} material={mat} />;
}

function Lightning() {
  const l = useRef<THREE.PointLight>(null);
  useFrame((s) => {
    if (!l.current) return;
    const pulse = Math.sin(s.clock.elapsedTime * 9.3) > 0.97 ? 8 : 0;
    l.current.intensity = pulse;
  });
  return <pointLight ref={l} position={[10, 18, -8]} color="#dfefff" />;
}

export function WindFlag({ position, color }: { position: [number, number, number]; color: string }) {
  const m = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (!m.current) return;
    const t = s.clock.elapsedTime;
    m.current.rotation.y = Math.sin(t * 2.1 + position[0]) * 0.25;
    m.current.scale.x = 1 + Math.sin(t * 3 + position[2]) * 0.08;
  });
  return (
    <group position={position}>
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 2.8, 6]} />
        <meshStandardMaterial color="#4a3a28" />
      </mesh>
      <mesh ref={m} position={[0.45, 2.3, 0]}>
        <planeGeometry args={[1.1, 0.55]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export function DustField({ count, color }: { count: number; color: string }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () => Array.from({ length: count }, () => ({ x: (Math.random() - 0.5) * 70, z: (Math.random() - 0.5) * 70, s: Math.random() * Math.PI * 2, y: Math.random() })),
    [count],
  );
  useFrame((st) => {
    if (!ref.current) return;
    const t = st.clock.elapsedTime;
    seeds.forEach((p, i) => {
      dummy.position.set(p.x + Math.sin(t * 0.3 + p.s) * 4, 0.4 + (p.y + t * 0.15) % 3, p.z + Math.cos(t * 0.25 + p.s) * 3);
      dummy.scale.setScalar(0.4 + p.y);
      dummy.updateMatrix();
      ref.current!.setMatrixAt(i, dummy.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.35, 6, 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
    </instancedMesh>
  );
}

function DistantBattlefield() {
  const soldiers = useMemo(() => {
    const arr: { pos: [number, number, number]; rot: number; }[] = [];
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const radius = 55 + Math.random() * 10;
      arr.push({
        pos: [Math.cos(angle) * radius, 0.8, Math.sin(angle) * radius],
        rot: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  const groupRef = useRef<THREE.Group>(null);

  useFrame((s) => {
    if (!groupRef.current) return;
    const t = s.clock.elapsedTime;
    soldiers.forEach((soldier, i) => {
      const mesh = groupRef.current!.children[i] as THREE.Mesh;
      if (mesh) {
        const marchOffset = Math.sin(t * 0.5 + soldier.pos[0]) * 0.5;
        mesh.position.set(soldier.pos[0] + Math.cos(soldier.rot) * marchOffset, soldier.pos[1], soldier.pos[2] + Math.sin(soldier.rot) * marchOffset);
        mesh.rotation.y = soldier.rot + t * 0.2;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {soldiers.map((soldier, i) => (
        <mesh key={i} position={soldier.pos} rotation={[0, soldier.rot, 0]}>
          <capsuleGeometry args={[0.08, 0.25, 4, 6]} />
          <meshStandardMaterial color="#4a3a2a" transparent opacity={0.6} />
        </mesh>
      ))}
    </group>
  );
}
