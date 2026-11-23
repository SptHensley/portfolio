"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CONVEYOR } from "@/lib/layout";
import { sim } from "@/lib/sim";
import { beltTreads, hazardStripes, rollerCap } from "@/lib/textures";
import { getMaterials } from "./materials";

/**
 * Long horizontal belt conveyor that links the hub to every station.
 * The belt treads (scrolling texture) and the roller end-caps (rotating
 * texture) are both driven by the single belt displacement `sim.belt.s`, so
 * they reverse automatically when the belt runs backwards.
 */

const LENGTH = CONVEYOR.maxX - CONVEYOR.minX;
const TREAD_REPEAT = Math.round(LENGTH / 0.32);
/** Exact tread pitch so texture repeats line up with metres of belt travel. */
const TREAD_PITCH = LENGTH / TREAD_REPEAT;
const CENTER_X = (CONVEYOR.maxX + CONVEYOR.minX) / 2;
const RAIL_Z = CONVEYOR.beltWidth / 2 + 0.045;
const ROLLER_Y = CONVEYOR.beltTop - CONVEYOR.rollerRadius - 0.004;
const ROLLER_COUNT = Math.floor(LENGTH / CONVEYOR.rollerPitch);
const LEG_SPACING = 2.4;
const LEG_COUNT = Math.floor(LENGTH / LEG_SPACING) + 1;

export function ConveyorBelt() {
  const m = getMaterials();
  const rollers = useRef<THREE.InstancedMesh>(null);
  const caps = useRef<THREE.InstancedMesh>(null);
  const legs = useRef<THREE.InstancedMesh>(null);

  const beltMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: beltTreads(TREAD_REPEAT),
        roughness: 0.92,
        metalness: 0.05,
      }),
    [],
  );
  const capMaterial = useMemo(() => {
    const map = rollerCap();
    map.center.set(0.5, 0.5);
    return new THREE.MeshStandardMaterial({ map, roughness: 0.35, metalness: 0.7, transparent: true, alphaTest: 0.5 });
  }, []);
  const hazardMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ map: hazardStripes(Math.round(LENGTH / 0.5)), roughness: 0.6 }),
    [],
  );

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < ROLLER_COUNT; i++) {
      const x = CONVEYOR.minX + CONVEYOR.rollerPitch * (i + 0.5);
      dummy.position.set(x, ROLLER_Y, CONVEYOR.z);
      dummy.rotation.set(Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      rollers.current!.setMatrixAt(i, dummy.matrix);
      dummy.position.set(x, ROLLER_Y, CONVEYOR.z + RAIL_Z + 0.032);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      caps.current!.setMatrixAt(i, dummy.matrix);
    }
    rollers.current!.instanceMatrix.needsUpdate = true;
    caps.current!.instanceMatrix.needsUpdate = true;

    let k = 0;
    for (let i = 0; i < LEG_COUNT; i++) {
      const x = CONVEYOR.minX + 0.3 + i * LEG_SPACING;
      for (const side of [1, -1]) {
        dummy.position.set(x, 0.17, CONVEYOR.z + side * RAIL_Z);
        dummy.updateMatrix();
        legs.current!.setMatrixAt(k++, dummy.matrix);
      }
    }
    legs.current!.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(() => {
    const s = sim.belt.s;
    // Both textures come from the module-level texture cache (shared instances).
    beltTreads(TREAD_REPEAT).offset.x = -s / TREAD_PITCH;
    rollerCap().rotation = s / CONVEYOR.rollerRadius;
  });

  const z = CONVEYOR.z;
  const top = CONVEYOR.beltTop;

  return (
    <group>
      {/* Belt surface */}
      <mesh position={[CENTER_X, top, z]} rotation={[-Math.PI / 2, 0, 0]} material={beltMaterial} receiveShadow>
        <planeGeometry args={[LENGTH, CONVEYOR.beltWidth]} />
      </mesh>
      {/* Belt underside / return run */}
      <mesh position={[CENTER_X, top - 0.16, z]} material={m.charcoal}>
        <boxGeometry args={[LENGTH, 0.02, CONVEYOR.beltWidth]} />
      </mesh>

      {/* Rollers + spinning end caps */}
      <instancedMesh ref={rollers} args={[undefined, undefined, ROLLER_COUNT]} material={m.steelDark}>
        <cylinderGeometry args={[CONVEYOR.rollerRadius, CONVEYOR.rollerRadius, CONVEYOR.beltWidth + 0.06, 16]} />
      </instancedMesh>
      <instancedMesh ref={caps} args={[undefined, undefined, ROLLER_COUNT]} material={capMaterial}>
        <circleGeometry args={[CONVEYOR.rollerRadius * 0.95, 24]} />
      </instancedMesh>

      {/* Side rails: upper (with safety-yellow lip) and lower */}
      {[1, -1].map((side) => (
        <group key={side} position={[CENTER_X, 0, z + side * RAIL_Z]}>
          <mesh position={[0, top + 0.03, 0]} material={m.charcoal} castShadow receiveShadow>
            <boxGeometry args={[LENGTH, 0.07, 0.05]} />
          </mesh>
          <mesh position={[0, top + 0.068, 0]} material={side === 1 ? hazardMaterial : m.yellow}>
            <boxGeometry args={[LENGTH, 0.008, 0.052]} />
          </mesh>
          <mesh position={[0, 0.37, 0]} material={m.charcoal} castShadow receiveShadow>
            <boxGeometry args={[LENGTH, 0.07, 0.05]} />
          </mesh>
        </group>
      ))}

      {/* Legs */}
      <instancedMesh ref={legs} args={[undefined, undefined, LEG_COUNT * 2]} material={m.charcoalSoft} castShadow>
        <boxGeometry args={[0.07, 0.34, 0.07]} />
      </instancedMesh>

      {/* End drums */}
      {[CONVEYOR.minX, CONVEYOR.maxX].map((x) => (
        <mesh key={x} position={[x, top - 0.08, z]} rotation={[Math.PI / 2, 0, 0]} material={m.charcoal}>
          <cylinderGeometry args={[0.09, 0.09, CONVEYOR.beltWidth + 0.14, 24]} />
        </mesh>
      ))}
    </group>
  );
}
