"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ARM } from "@/lib/layout";
import { sim } from "@/lib/sim";
import { idPlate, warningDecal } from "@/lib/textures";
import { DynamicCable, type CableEnd } from "./DynamicCable";
import { getMaterials } from "./materials";

/**
 * 6-axis industrial arm. Every link is modelled along its local +X axis so the
 * joint rotations map 1:1 onto the analytical IK in lib/kinematics.ts:
 *   turret.rotation.y = J1, shoulder.rotation.z = J2, elbow.rotation.z = J3,
 *   roll.rotation.x = J4, wrist.rotation.z = J5, flange.rotation.x = J6.
 */

const SHOULDER_LOCAL_Y = ARM.shoulderHeight - 0.31; // turret sits at y = 0.31

/** Cylinder whose axis is local Z (joint housings, servo caps). */
function ZCyl({
  r,
  depth,
  material,
  position,
  segments = 40,
}: {
  r: number;
  depth: number;
  material: THREE.Material;
  position?: [number, number, number];
  segments?: number;
}) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]} material={material}>
      <cylinderGeometry args={[r, r, depth, segments]} />
    </mesh>
  );
}

/** Cylinder whose axis is local X (flange, stems, roll ring). */
function XCyl({
  r,
  length,
  material,
  position,
  segments = 28,
}: {
  r: number;
  length: number;
  material: THREE.Material;
  position?: [number, number, number];
  segments?: number;
}) {
  return (
    <mesh position={position} rotation={[0, 0, -Math.PI / 2]} material={material}>
      <cylinderGeometry args={[r, r, length, segments]} />
    </mesh>
  );
}

/** Servo joint cap: black disc + steel hub, mirrored on both sides. */
function ServoCaps({ r, halfDepth, position = [0, 0, 0] }: { r: number; halfDepth: number; position?: [number, number, number] }) {
  const m = getMaterials();
  return (
    <group position={position}>
      {[1, -1].map((side) => (
        <group key={side} position={[0, 0, side * halfDepth]}>
          <ZCyl r={r} depth={0.045} material={m.capBlack} />
          <ZCyl r={r * 0.82} depth={0.055} material={m.charcoal} />
          <ZCyl r={r * 0.32} depth={0.07} material={m.steel} />
        </group>
      ))}
    </group>
  );
}

function Decal({
  kind,
  size,
  position,
  flip = false,
}: {
  kind: "CAUTION" | "DANGER";
  size: [number, number];
  position: [number, number, number];
  flip?: boolean;
}) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: warningDecal(kind),
        roughness: 0.45,
        metalness: 0.05,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [kind],
  );
  return (
    <mesh position={position} rotation={[0, flip ? Math.PI : 0, 0]} material={material}>
      <planeGeometry args={size} />
    </mesh>
  );
}

function chamferedPlate(w: number, d: number, c: number, h: number, bevel: number) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + c, -d / 2);
  s.lineTo(w / 2 - c, -d / 2);
  s.lineTo(w / 2, -d / 2 + c);
  s.lineTo(w / 2, d / 2 - c);
  s.lineTo(w / 2 - c, d / 2);
  s.lineTo(-w / 2 + c, d / 2);
  s.lineTo(-w / 2, d / 2 - c);
  s.lineTo(-w / 2, -d / 2 + c);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: h,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, bevel, 0);
  return g;
}

function suctionCupGeometry() {
  const pts = [
    new THREE.Vector2(0.016, 0),
    new THREE.Vector2(0.02, 0.018),
    new THREE.Vector2(0.03, 0.04),
    new THREE.Vector2(0.046, 0.06),
    new THREE.Vector2(0.058, 0.074),
    new THREE.Vector2(0.06, 0.08),
  ];
  const g = new THREE.LatheGeometry(pts, 28);
  g.rotateZ(-Math.PI / 2); // lathe axis Y → tool axis X
  return g;
}

export function RobotArm() {
  const m = getMaterials();
  const root = useRef<THREE.Group>(null);
  const base = useRef<THREE.Group>(null);
  const turret = useRef<THREE.Group>(null);
  const shoulder = useRef<THREE.Group>(null);
  const elbow = useRef<THREE.Group>(null);
  const roll = useRef<THREE.Group>(null);
  const wrist = useRef<THREE.Group>(null);
  const flange = useRef<THREE.Group>(null);
  const cables = useRef<DynamicCable[]>([]);
  const ledMesh = useRef<THREE.Mesh>(null);

  const plateGeom = useMemo(() => chamferedPlate(1.6, 1.45, 0.22, 0.11, 0.025), []);
  const cupGeom = useMemo(() => suctionCupGeometry(), []);
  const ledMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#0f172a",
        emissive: new THREE.Color("#22D3EE"),
        emissiveIntensity: 0,
        roughness: 0.3,
        toneMapped: false,
      }),
    [],
  );
  const plateMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ map: idPlate(), roughness: 0.6, metalness: 0.4 }),
    [],
  );

  // Shadows for every mesh + build the dynamic cable harness once refs exist.
  useLayoutEffect(() => {
    const r = root.current!;
    r.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    const end = (object: THREE.Object3D, offset: CableEnd["offset"], dir: CableEnd["dir"], reach: number): CableEnd => ({
      object,
      offset,
      dir,
      reach,
    });

    const list: DynamicCable[] = [];
    // Base connector → turret (crosses J1).
    [-0.07, 0.07].forEach((dz) => {
      list.push(
        new DynamicCable(
          end(base.current!, [-0.62, 0.22, -0.38 + dz], [0, 1, 0.25], 0.32),
          end(turret.current!, [-0.47, 0.2, dz], [-1, 0.15, 0], 0.32),
          r,
          m.cable,
          0.026,
          24,
          8,
        ),
      );
    });
    // Turret → upper arm (crosses J2), routed behind the shoulder.
    [-0.07, 0, 0.07].forEach((dz, i) => {
      list.push(
        new DynamicCable(
          end(turret.current!, [-0.3, 0.64, dz], [0, 1, 0], 0.32 + i * 0.04),
          end(shoulder.current!, [0.42, 0.2, dz], [-1, 0.15, 0], 0.42 + i * 0.03),
          r,
          m.cable,
          0.024,
          28,
          8,
        ),
      );
    });
    // Elbow loop (crosses J3).
    [-0.06, 0.06].forEach((dz) => {
      list.push(
        new DynamicCable(
          end(shoulder.current!, [1.28, 0.2, dz], [1, 0.55, 0], 0.32),
          end(elbow.current!, [0.3, 0.15, dz], [-1, 0.55, 0], 0.32),
          r,
          m.cable,
          0.022,
          28,
          8,
        ),
      );
    });
    // Vacuum hose: forearm → gripper valve (crosses J5 + J6).
    list.push(
      new DynamicCable(
        end(roll.current!, [0.42, 0.12, 0.06], [1, 0.9, 0.2], 0.22),
        end(flange.current!, [0.07, 0.1, 0.0], [-1, 0.8, 0], 0.22),
        r,
        m.cable,
        0.016,
        24,
        8,
      ),
    );

    list.forEach((c) => r.add(c.mesh));
    cables.current = list;
    return () => {
      list.forEach((c) => {
        r.remove(c.mesh);
        c.dispose();
      });
      cables.current = [];
    };
  }, [m.cable]);

  useFrame(() => {
    const j = sim.arm.joints;
    turret.current!.rotation.y = j.j1;
    shoulder.current!.rotation.z = j.j2;
    elbow.current!.rotation.z = j.j3;
    roll.current!.rotation.x = j.j4;
    wrist.current!.rotation.z = j.j5;
    flange.current!.rotation.x = j.j6;
    // Both LEDs share one material, so updating it through either mesh is enough.
    const led = ledMesh.current?.material as THREE.MeshStandardMaterial | undefined;
    if (led) {
      const v = sim.arm.suction;
      led.emissiveIntensity = v * 3.2;
      led.color.setRGB(0.06 + v * 0.1, 0.09 + v * 0.5, 0.16 + v * 0.6);
    }
    for (const c of cables.current) c.update();
  });

  return (
    <group ref={root} position={[ARM.base.x, ARM.base.y, ARM.base.z]}>
      {/* ── Static base ─────────────────────────────────────────────── */}
      <group ref={base}>
        <mesh geometry={plateGeom} material={m.charcoal} />
        {[
          [0.64, 0.58],
          [-0.64, 0.58],
          [0.64, -0.58],
          [-0.64, -0.58],
          [0.0, 0.62],
          [0.0, -0.62],
        ].map(([x, z], i) => (
          <group key={i} position={[x, 0.16, z]}>
            <mesh material={m.steelDark}>
              <cylinderGeometry args={[0.055, 0.055, 0.012, 20]} />
            </mesh>
            <mesh position={[0, 0.025, 0]} material={m.steel}>
              <cylinderGeometry args={[0.035, 0.035, 0.04, 6]} />
            </mesh>
          </group>
        ))}
        {/* Pedestal */}
        <mesh position={[0, 0.235, 0]} material={m.charcoalSoft}>
          <cylinderGeometry args={[0.52, 0.58, 0.15, 48]} />
        </mesh>
        <mesh position={[0, 0.3, 0]} material={m.steelDark}>
          <cylinderGeometry args={[0.53, 0.53, 0.02, 48]} />
        </mesh>
        {/* Cable connector box + ID plate */}
        <RoundedBox args={[0.26, 0.16, 0.3]} radius={0.03} position={[-0.62, 0.22, -0.38]} material={m.charcoalSoft} />
        <mesh position={[0.45, 0.16, 0.6]} rotation={[-Math.PI / 2, 0, 0]} material={plateMaterial}>
          <planeGeometry args={[0.36, 0.135]} />
        </mesh>
      </group>

      {/* ── J1: waist turret ───────────────────────────────────────── */}
      <group ref={turret} position={[0, 0.31, 0]}>
        <mesh position={[0, 0.15, 0]} material={m.charcoal}>
          <cylinderGeometry args={[0.5, 0.5, 0.3, 48]} />
        </mesh>
        <mesh position={[0, 0.02, 0]} material={m.steelDark}>
          <cylinderGeometry args={[0.505, 0.505, 0.03, 48]} />
        </mesh>
        {/* Cable guard loop */}
        <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, Math.PI * 0.35]} material={m.charcoal}>
          <torusGeometry args={[0.62, 0.026, 10, 48, Math.PI * 1.3]} />
        </mesh>
        {/* Yellow shoulder housing */}
        <RoundedBox args={[0.8, 0.38, 0.72]} radius={0.07} smoothness={4} position={[0, 0.48, 0]} material={m.yellow} />
        <mesh position={[-0.39, 0.56, 0]} material={m.charcoal}>
          <boxGeometry args={[0.08, 0.44, 0.58]} />
        </mesh>
        {/* Shoulder cheeks */}
        {[1, -1].map((side) => (
          <group key={side} position={[0, 0, side * 0.235]}>
            <RoundedBox args={[0.56, 0.46, 0.12]} radius={0.04} position={[0.12, 0.56, 0]} material={m.yellow} />
            <ZCyl r={0.29} depth={0.12} material={m.yellow} position={[ARM.shoulderOffset, SHOULDER_LOCAL_Y, 0]} />
          </group>
        ))}
        <ServoCaps r={0.22} halfDepth={0.3} position={[ARM.shoulderOffset, SHOULDER_LOCAL_Y, 0]} />

        {/* ── J2: shoulder → upper arm ─────────────────────────────── */}
        <group ref={shoulder} position={[ARM.shoulderOffset, SHOULDER_LOCAL_Y, 0]}>
          <ZCyl r={0.2} depth={0.3} material={m.yellow} />
          <RoundedBox
            args={[ARM.upperArm, 0.34, 0.3]}
            radius={0.07}
            smoothness={4}
            position={[ARM.upperArm / 2, 0, 0]}
            material={m.yellow}
          />
          <mesh position={[ARM.upperArm / 2, -0.185, 0]} material={m.charcoal}>
            <boxGeometry args={[ARM.upperArm - 0.35, 0.05, 0.24]} />
          </mesh>
          {[1, -1].map((side) => (
            <mesh key={side} position={[ARM.upperArm / 2 + 0.05, -0.118, side * 0.151]} material={m.charcoal}>
              <boxGeometry args={[1.05, 0.05, 0.006]} />
            </mesh>
          ))}
          <Decal kind="CAUTION" size={[0.46, 0.23]} position={[0.84, 0.035, 0.1515]} />
          <Decal kind="CAUTION" size={[0.46, 0.23]} position={[0.84, 0.035, -0.1515]} flip />
          {[0.42, 1.28].map((x) => (
            <mesh key={x} position={[x, 0.19, 0]} material={m.charcoal}>
              <boxGeometry args={[0.07, 0.05, 0.22]} />
            </mesh>
          ))}
          {[-0.06, 0, 0.06].map((z) => (
            <XCyl key={z} r={0.022} length={0.9} material={m.cable} position={[0.85, 0.2, z]} segments={10} />
          ))}

          {/* ── J3: elbow → forearm ───────────────────────────────── */}
          <group ref={elbow} position={[ARM.upperArm, 0, 0]}>
            <ZCyl r={0.21} depth={0.4} material={m.yellow} />
            <ServoCaps r={0.16} halfDepth={0.21} />
            <RoundedBox args={[0.36, 0.26, 0.26]} radius={0.05} position={[-0.25, 0.05, 0]} material={m.yellow} />
            <mesh position={[-0.44, 0.05, 0]} material={m.charcoal}>
              <boxGeometry args={[0.04, 0.22, 0.22]} />
            </mesh>
            <RoundedBox args={[0.84, 0.27, 0.25]} radius={0.06} smoothness={4} position={[0.42, 0, 0]} material={m.yellow} />
            <mesh position={[0.45, -0.142, 0]} material={m.charcoal}>
              <boxGeometry args={[0.6, 0.04, 0.18]} />
            </mesh>
            <Decal kind="DANGER" size={[0.42, 0.21]} position={[0.46, 0.0, 0.1265]} />
            <Decal kind="DANGER" size={[0.42, 0.21]} position={[0.46, 0.0, -0.1265]} flip />

            {/* ── J4: forearm roll ────────────────────────────────── */}
            <group ref={roll} position={[0.82, 0, 0]}>
              <XCyl r={0.135} length={0.05} material={m.charcoal} position={[0.02, 0, 0]} />
              <RoundedBox args={[0.64, 0.22, 0.21]} radius={0.05} smoothness={4} position={[0.34, 0, 0]} material={m.yellowDark} />

              {/* ── J5: wrist pitch ─────────────────────────────── */}
              <group ref={wrist} position={[ARM.forearm - 0.82, 0, 0]}>
                <ZCyl r={0.13} depth={0.26} material={m.yellow} />
                <ServoCaps r={0.1} halfDepth={0.14} />

                {/* ── J6: flange roll + 4-cup vacuum gripper ──────── */}
                <group ref={flange} position={[0.14, 0, 0]}>
                  <XCyl r={0.085} length={0.06} material={m.capBlack} position={[0.03, 0, 0]} />
                  <XCyl r={0.055} length={0.04} material={m.steel} position={[0.08, 0, 0]} />
                  {/* H-bracket */}
                  <mesh position={[0.115, 0, 0]} material={m.charcoal}>
                    <boxGeometry args={[0.03, 0.36, 0.06]} />
                  </mesh>
                  {[0.15, -0.15].map((y) => (
                    <mesh key={y} position={[0.115, y, 0]} material={m.charcoal}>
                      <boxGeometry args={[0.03, 0.06, 0.38]} />
                    </mesh>
                  ))}
                  {/* Valve block + pneumatic status LEDs */}
                  <mesh position={[0.07, 0.1, 0]} material={m.charcoalSoft}>
                    <boxGeometry args={[0.06, 0.08, 0.09]} />
                  </mesh>
                  {[0.047, -0.047].map((z, i) => (
                    <mesh key={z} ref={i === 0 ? ledMesh : undefined} position={[0.07, 0.1, z]} material={ledMaterial}>
                      <sphereGeometry args={[0.016, 16, 12]} />
                    </mesh>
                  ))}
                  {/* Stems, spring collars, suction cups */}
                  {[
                    [0.15, 0.15],
                    [0.15, -0.15],
                    [-0.15, 0.15],
                    [-0.15, -0.15],
                  ].map(([y, z], i) => (
                    <group key={i} position={[0, y, z]}>
                      <XCyl r={0.013} length={0.15} material={m.steel} position={[0.205, 0, 0]} segments={12} />
                      <XCyl r={0.026} length={0.035} material={m.charcoal} position={[0.15, 0, 0]} segments={16} />
                      <mesh geometry={cupGeom} position={[0.28, 0, 0]} material={m.rubber} />
                    </group>
                  ))}
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
