"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { CONVEYOR, PALLET_HEIGHT, PALLET_Z, SLOT_X, type StationDef } from "@/lib/layout";
import { sim } from "@/lib/sim";
import { ui } from "@/lib/store";
import { floorStencil, hazardStripes, stationSign } from "@/lib/textures";
import { getMaterials } from "./materials";

/* ── Stack light (andon tower) ────────────────────────────────────────── */

type Lamp = "red" | "amber" | "green" | "blue" | "off";
const LAMP_COLORS: Record<Exclude<Lamp, "off">, string> = {
  red: "#EF4444",
  amber: "#F59E0B",
  green: "#22C55E",
  blue: "#22D3EE",
};

export function StackLight({
  position,
  getLamp,
  scale = 1,
}: {
  position: [number, number, number];
  getLamp: () => { lamp: Lamp; blink?: boolean };
  scale?: number;
}) {
  const m = getMaterials();
  const lamps = useMemo(
    () =>
      (["red", "amber", "green", "blue"] as const).map(
        (c) =>
          new THREE.MeshStandardMaterial({
            color: LAMP_COLORS[c],
            emissive: new THREE.Color(LAMP_COLORS[c]),
            emissiveIntensity: 0,
            transparent: true,
            opacity: 0.9,
            roughness: 0.2,
            toneMapped: false,
          }),
      ),
    [],
  );
  useFrame((state) => {
    const { lamp, blink } = getLamp();
    const on = !blink || Math.sin(state.clock.elapsedTime * 9) > -0.2;
    (["red", "amber", "green", "blue"] as const).forEach((c, i) => {
      const lit = lamp === c && on;
      lamps[i].emissiveIntensity = lit ? 2.2 : 0.04;
      lamps[i].opacity = lit ? 1 : 0.55;
    });
  });
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.03, 0]} material={m.charcoal} castShadow>
        <cylinderGeometry args={[0.12, 0.14, 0.06, 24]} />
      </mesh>
      <mesh position={[0, 0.6, 0]} material={m.steelDark} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 1.1, 12]} />
      </mesh>
      {lamps.map((mat, i) => (
        <mesh key={i} position={[0, 1.55 - i * 0.13, 0]} material={mat}>
          <cylinderGeometry args={[0.07, 0.07, 0.12, 24]} />
        </mesh>
      ))}
      <mesh position={[0, 1.15, 0]} material={m.charcoal}>
        <cylinderGeometry args={[0.075, 0.075, 0.06, 24]} />
      </mesh>
      <mesh position={[0, 1.64, 0]} material={m.charcoal}>
        <cylinderGeometry args={[0.06, 0.075, 0.05, 24]} />
      </mesh>
    </group>
  );
}

/* ── Floor tape rectangle ─────────────────────────────────────────────── */

export function HazardFrame({
  x0,
  x1,
  z0,
  z1,
  width = 0.08,
}: {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  width?: number;
}) {
  const w = x1 - x0;
  const d = z1 - z0;
  const matH = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: hazardStripes(Math.max(1, Math.round(w / 0.5))),
        roughness: 0.7,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    [w],
  );
  const matV = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: hazardStripes(Math.max(1, Math.round(d / 0.5))),
        roughness: 0.7,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    [d],
  );
  const y = 0.004;
  return (
    <group>
      {[z0, z1].map((z) => (
        <mesh key={`h${z}`} position={[(x0 + x1) / 2, y, z]} rotation={[-Math.PI / 2, 0, 0]} material={matH} receiveShadow>
          <planeGeometry args={[w + width, width]} />
        </mesh>
      ))}
      {[x0, x1].map((x) => (
        <mesh key={`v${x}`} position={[x, y, (z0 + z1) / 2]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} material={matV} receiveShadow>
          <planeGeometry args={[d - width, width]} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Staging pallet ───────────────────────────────────────────────────── */

export function Pallet() {
  const m = getMaterials();
  const x0 = SLOT_X[0] - 0.42;
  const x1 = SLOT_X[SLOT_X.length - 1] + 0.42;
  const len = x1 - x0;
  const cx = (x0 + x1) / 2;
  const depth = 0.72;
  const markMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#FACC15", toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    [],
  );
  return (
    <group position={[cx, 0, PALLET_Z]}>
      {/* Top deck boards */}
      {[-0.3, -0.15, 0, 0.15, 0.3].map((z) => (
        <mesh key={z} position={[0, PALLET_HEIGHT - 0.0125, z]} material={m.wood} castShadow receiveShadow>
          <boxGeometry args={[len, 0.025, 0.12]} />
        </mesh>
      ))}
      {/* Stringers */}
      {[-0.3, 0, 0.3].map((z) => (
        <mesh key={z} position={[0, 0.07, z]} material={m.woodDark} castShadow receiveShadow>
          <boxGeometry args={[len - 0.04, 0.09, 0.1]} />
        </mesh>
      ))}
      {/* Bottom boards */}
      {[-len / 2 + 0.08, 0, len / 2 - 0.08].map((x) => (
        <mesh key={x} position={[x, 0.0125, 0]} material={m.wood} receiveShadow>
          <boxGeometry args={[0.14, 0.025, depth]} />
        </mesh>
      ))}
      {/* Slot outline marks (where crates are restocked) */}
      {SLOT_X.map((sx) => (
        <group key={sx} position={[sx - cx, PALLET_HEIGHT + 0.001, 0]}>
          {[
            [0, 0.29, 0.6, 0.014],
            [0, -0.29, 0.6, 0.014],
            [0.29, 0, 0.014, 0.6],
            [-0.29, 0, 0.014, 0.6],
          ].map(([x, z, w, d], i) => (
            <mesh key={i} position={[x, 0, z]} rotation={[-Math.PI / 2, 0, 0]} material={markMaterial}>
              <planeGeometry args={[w, d]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ── Station bay: cantilever scanner gantry, signage, beacon ──────────── */

export function StationBay({ station }: { station: StationDef }) {
  const m = getMaterials();
  const laser = useRef<THREE.Mesh>(null);
  const signMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ map: stationSign(station.code, station.label), roughness: 0.5, metalness: 0.05 }),
    [station.code, station.label],
  );
  const stencilMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ map: floorStencil(station.code), transparent: true, depthWrite: false }),
    [station.code],
  );
  const laserMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#22D3EE",
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );

  const postZ = CONVEYOR.z - CONVEYOR.beltWidth / 2 - 0.45;
  const headY = 1.55;

  useFrame((state) => {
    const s = ui.get();
    const parked = s.activeStation === station.id && s.panelOpen;
    const t = state.clock.elapsedTime;
    const beam = laser.current;
    if (!beam) return;
    (beam.material as THREE.MeshBasicMaterial).opacity = parked ? 0.28 + Math.sin(t * 8) * 0.08 : 0;
    beam.visible = parked;
    beam.position.x = station.x + Math.sin(t * 1.6) * 0.18;
  });

  const lamp = () => {
    const s = ui.get();
    if (s.activeStation !== station.id) return { lamp: "off" as const };
    if (s.panelOpen) return { lamp: "green" as const };
    return { lamp: "amber" as const, blink: true };
  };

  return (
    <group>
      {/* Post */}
      <mesh position={[station.x - 0.55, 1.1, postZ]} material={m.charcoal} castShadow receiveShadow>
        <boxGeometry args={[0.14, 2.2, 0.14]} />
      </mesh>
      <mesh position={[station.x - 0.55, 0.02, postZ]} material={m.charcoalSoft} receiveShadow>
        <boxGeometry args={[0.4, 0.04, 0.4]} />
      </mesh>
      {/* Cantilever arm over the belt */}
      <mesh position={[station.x - 0.55, headY + 0.12, (postZ + CONVEYOR.z) / 2 + 0.05]} material={m.yellow} castShadow>
        <boxGeometry args={[0.12, 0.1, CONVEYOR.z - postZ + 0.2]} />
      </mesh>
      {/* Scanner head */}
      <mesh position={[station.x - 0.2, headY, CONVEYOR.z]} material={m.charcoal} castShadow>
        <boxGeometry args={[0.8, 0.12, 0.3]} />
      </mesh>
      <mesh position={[station.x - 0.2, headY - 0.065, CONVEYOR.z]} material={m.yellowDark}>
        <boxGeometry args={[0.7, 0.012, 0.18]} />
      </mesh>
      <mesh ref={laser} position={[station.x, (headY + CONVEYOR.beltTop) / 2, CONVEYOR.z]} material={laserMaterial}>
        <planeGeometry args={[0.02, headY - CONVEYOR.beltTop - 0.06]} />
      </mesh>
      {/* Overhead sign */}
      <group position={[station.x + 0.25, 2.45, postZ - 0.02]}>
        <mesh material={m.charcoal} castShadow>
          <boxGeometry args={[2.15, 0.6, 0.05]} />
        </mesh>
        <mesh position={[0, 0, 0.027]} material={signMaterial}>
          <planeGeometry args={[2.08, 0.52]} />
        </mesh>
      </group>
      <mesh position={[station.x - 0.55, 2.18, postZ]} material={m.charcoal}>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
      </mesh>
      {/* Rail-mounted sensors */}
      {[1, -1].map((side) => (
        <mesh
          key={side}
          position={[station.x + 0.36, CONVEYOR.beltTop + 0.11, CONVEYOR.z + side * (CONVEYOR.beltWidth / 2 + 0.045)]}
          material={m.yellow}
          castShadow
        >
          <boxGeometry args={[0.06, 0.1, 0.06]} />
        </mesh>
      ))}
      {/* Equipment cabinet */}
      <group position={[station.x + 1.35, 0, postZ - 0.15]}>
        <mesh position={[0, 0.65, 0]} material={m.charcoalSoft} castShadow receiveShadow>
          <boxGeometry args={[0.75, 1.3, 0.42]} />
        </mesh>
        <mesh position={[0, 0.9, 0.212]} material={m.charcoal}>
          <planeGeometry args={[0.5, 0.3]} />
        </mesh>
        <mesh position={[0.28, 0.62, 0.23]} material={m.yellow}>
          <boxGeometry args={[0.03, 0.18, 0.03]} />
        </mesh>
      </group>
      <StackLight position={[station.x + 1.55, 1.3, postZ - 0.15]} getLamp={lamp} scale={0.7} />
      {/* Floor marking */}
      <mesh position={[station.x, 0.003, postZ - 0.95]} rotation={[-Math.PI / 2, 0, 0]} material={stencilMaterial}>
        <planeGeometry args={[2.2, 1.1]} />
      </mesh>
      <HazardFrame x0={station.x - 1.4} x1={station.x + 2.0} z0={postZ - 0.55} z1={postZ + 0.35} />
    </group>
  );
}

/** Hub andon light reflecting the state machine. */
export function hubLamp(): { lamp: Lamp; blink?: boolean } {
  const s = ui.get();
  if (s.phase === "IDLE") return { lamp: "green" };
  if (s.phase === "AT_SECTION") return { lamp: "blue" };
  if (s.phase === "GRIPPING" || sim.arm.suction > 0.5) return { lamp: "blue", blink: true };
  return { lamp: "amber", blink: true };
}
