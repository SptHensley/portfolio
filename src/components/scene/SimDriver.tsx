"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { factoryAudio } from "@/lib/audio";
import { createJoints, damp, solveIK, toolTip, type CylTarget } from "@/lib/kinematics";
import { CRATE_SIZE, STATION_IDS } from "@/lib/layout";
import { sim } from "@/lib/sim";

/**
 * First subscriber in the frame loop: layers idle "servo breathing" and
 * cursor tracking on top of the choreographed target, solves IK, runs forward
 * kinematics for the tool tip, and moves every crate (gripped crates follow
 * the suction cups, belt crates ride the belt displacement).
 */
export function SimDriver() {
  const prevJoints = useRef(createJoints());
  const cyl = useRef<CylTarget>({ yaw: 0, r: 0, y: 0 });
  const mouse = useRef({ x: 0, y: 0 });
  const prevS = useRef(0);
  const speed = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(Math.max(delta, 1e-4), 0.05);
    sim.time += dt;
    const t = sim.time;

    mouse.current.x += (sim.mouse.x - mouse.current.x) * damp(3, dt);
    mouse.current.y += (sim.mouse.y - mouse.current.y) * damp(3, dt);

    const w = sim.arm.idleWeight;
    const tg = sim.arm.target;
    const c = cyl.current;
    c.yaw = tg.yaw + w * (mouse.current.x * 0.3 + Math.sin(t * 0.55) * 0.035);
    c.r = tg.r + w * (Math.sin(t * 0.8 + 1.3) * 0.05 + mouse.current.y * 0.08);
    c.y = tg.y + w * (Math.sin(t * 1.1) * 0.045 + mouse.current.y * 0.22);

    const j = sim.arm.joints;
    const p = prevJoints.current;
    p.j1 = j.j1;
    p.j2 = j.j2;
    p.j3 = j.j3;
    p.j5 = j.j5;
    solveIK(c, j);
    const instant =
      (Math.abs(j.j1 - p.j1) + Math.abs(j.j2 - p.j2) + Math.abs(j.j3 - p.j3) + Math.abs(j.j5 - p.j5)) / dt;
    speed.current += (instant - speed.current) * damp(10, dt);
    sim.arm.jointSpeed = sim.time < 0.2 ? 0 : speed.current;
    toolTip(j, sim.arm.tip);

    for (const id of STATION_IDS) {
      const crate = sim.crates[id];
      if (crate.mode === "gripped") {
        crate.pos.x = sim.arm.tip.x;
        crate.pos.y = sim.arm.tip.y - CRATE_SIZE / 2;
        crate.pos.z = sim.arm.tip.z;
      } else if (crate.mode === "belt") {
        crate.pos.x = sim.belt.s + crate.beltOffset;
      }
    }

    const v = (sim.belt.s - prevS.current) / dt;
    prevS.current = sim.belt.s;
    sim.belt.velocity += (v - sim.belt.velocity) * damp(12, dt);
    if (Math.abs(sim.belt.velocity) < 1e-3) sim.belt.velocity = 0;

    factoryAudio.update(sim.arm.jointSpeed, sim.belt.velocity);
  });

  return null;
}
