"use client";

import { Html } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { dispatchCrate } from "@/lib/choreographer";
import { damp } from "@/lib/kinematics";
import { CRATE_SIZE, STATIONS, type StationId } from "@/lib/layout";
import { sim } from "@/lib/sim";
import { ui, useUI } from "@/lib/store";
import { crateFace, cratePlacard, crateTopStencil } from "@/lib/textures";

const S = CRATE_SIZE;
const HALF = S / 2;

/** Industrial targeting reticle: four corner brackets that snap in on hover. */
function Reticle({ active }: { active: boolean }) {
  const group = useRef<THREE.Group>(null);
  const k = useRef(0);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#FACC15", toneMapped: false, transparent: true, opacity: 0, depthTest: false }),
    [],
  );
  useFrame((state, dt) => {
    k.current += ((active ? 1 : 0) - k.current) * damp(14, dt);
    const g = group.current!;
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.025;
    const s = (1.45 - 0.45 * k.current) * pulse;
    g.scale.set(s, s, 1);
    g.visible = k.current > 0.01;
    // All bracket meshes share one material; reach it through the scene graph.
    const first = g.children[0]?.children[0] as THREE.Mesh | undefined;
    if (first) (first.material as THREE.MeshBasicMaterial).opacity = k.current;
  });
  const arm = 0.13;
  const t = 0.018;
  const r = HALF + 0.06;
  return (
    <group ref={group} position={[0, 0, HALF + 0.02]} renderOrder={10}>
      {[
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ].map(([sx, sy], i) => (
        <group key={i} position={[sx * r, sy * r, 0]}>
          <mesh position={[-sx * (arm / 2 - t / 2), 0, 0]} material={material} renderOrder={10}>
            <planeGeometry args={[arm, t]} />
          </mesh>
          <mesh position={[0, -sy * (arm / 2 - t / 2), 0]} material={material} renderOrder={10}>
            <planeGeometry args={[t, arm]} />
          </mesh>
        </group>
      ))}
      {/* centre crosshair ticks */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0]} rotation={[0, 0, a]} material={material} renderOrder={10}>
          <planeGeometry args={[0.035, 0.008]} />
        </mesh>
      ))}
    </group>
  );
}

export function PortfolioCrate({ id }: { id: StationId }) {
  const station = STATIONS[id];
  const group = useRef<THREE.Group>(null);
  const bodyMesh = useRef<THREE.Mesh>(null);
  const lift = useRef(0);
  const glow = useRef(0);

  const hovered = useUI((s) => s.hovered === id);
  const interactive = useUI((s) => s.phase === "IDLE" && !s.busy);

  const faceMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: crateFace(),
        roughness: 0.82,
        metalness: 0,
        emissive: new THREE.Color("#FACC15"),
        emissiveIntensity: 0,
      }),
    [],
  );
  const placardMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: cratePlacard(station.code, station.label),
        roughness: 0.5,
        metalness: 0.1,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [station.code, station.label],
  );
  const stencilMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: crateTopStencil(station.code),
        transparent: true,
        roughness: 0.85,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [station.code],
  );

  // Drop hover state + cursor when the cell becomes busy.
  useEffect(() => {
    if (!interactive && ui.get().hovered === id) {
      ui.set({ hovered: null });
      document.body.style.cursor = "";
    }
  }, [interactive, id]);

  useFrame((_, dt) => {
    const c = sim.crates[id];
    const active = hovered && interactive && c.mode === "slot";
    lift.current += ((active ? 0.07 : 0) - lift.current) * damp(12, dt);
    glow.current += ((active ? 0.22 : 0) - glow.current) * damp(10, dt);
    group.current!.position.set(c.pos.x, c.pos.y + lift.current, c.pos.z);
    const body = bodyMesh.current;
    if (body) (body.material as THREE.MeshStandardMaterial).emissiveIntensity = glow.current;
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (!interactive) return;
    ui.set({ hovered: id });
    document.body.style.cursor = "pointer";
  };
  const onOut = () => {
    if (ui.get().hovered === id) ui.set({ hovered: null });
    document.body.style.cursor = "";
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!interactive) return;
    document.body.style.cursor = "";
    dispatchCrate(id);
  };

  const showTag = hovered && interactive;

  return (
    <group ref={group}>
      <mesh
        ref={bodyMesh}
        material={faceMaterial}
        castShadow
        receiveShadow
        onPointerOver={onOver}
        onPointerOut={onOut}
        onClick={onClick}
      >
        <boxGeometry args={[S, S, S]} />
      </mesh>
      <mesh position={[0, -0.01, HALF + 0.003]} material={placardMaterial}>
        <planeGeometry args={[0.42, 0.1575]} />
      </mesh>
      <mesh position={[0, HALF + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} material={stencilMaterial}>
        <planeGeometry args={[0.3, 0.3]} />
      </mesh>
      <Reticle active={showTag} />
      {showTag && (
        <Html position={[0, HALF + 0.32, 0]} center zIndexRange={[30, 20]} style={{ pointerEvents: "none" }}>
          <div className="reticle-tag">
            <span className="reticle-tag__lock">TARGET LOCK</span>
            <span>{`${station.code} // ${station.label}`}</span>
            <span className="reticle-tag__hint">CLICK TO DISPATCH ▸</span>
          </div>
        </Html>
      )}
    </group>
  );
}
