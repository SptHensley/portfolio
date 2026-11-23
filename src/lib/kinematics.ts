import { ARM } from "./layout";

/**
 * Analytical inverse kinematics for the 6-axis arm.
 *
 * Joint conventions (all radians, matching the Three.js hierarchy in RobotArm):
 *   J1  waist yaw            – rotation.y of the turret (local +X = arm "forward")
 *   J2  shoulder pitch       – absolute angle of the upper arm above horizontal
 *   J3  elbow pitch          – forearm angle relative to the upper arm
 *   J4  forearm roll         – held at 0 so the arm stays planar (closed-form IK)
 *   J5  wrist pitch          – tool angle relative to the forearm
 *   J6  flange roll          – counter-rotates J1 so the gripper stays square
 *                              to the world (crate edges stay aligned)
 *
 * The tool is constrained to point straight down (world −Y), which turns the
 * 6-DOF problem into: yaw from atan2, then a planar 2-link solve for the wrist
 * centre, then wrist pitch = −90° − (J2 + J3).
 */

export interface JointAngles {
  j1: number;
  j2: number;
  j3: number;
  j4: number;
  j5: number;
  j6: number;
}

/** Tool-tip target in cylindrical coordinates around the waist axis. */
export interface CylTarget {
  yaw: number;
  r: number;
  /** Absolute world height of the suction-cup contact plane. */
  y: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export function createJoints(): JointAngles {
  return { j1: 0, j2: 0, j3: 0, j4: 0, j5: 0, j6: 0 };
}

const EPS = 1e-4;

/** Converts a world point into a cylindrical target around the arm base. */
export function worldToCyl(x: number, y: number, z: number): CylTarget {
  const dx = x - ARM.base.x;
  const dz = z - ARM.base.z;
  return { yaw: Math.atan2(-dz, dx), r: Math.hypot(dx, dz), y };
}

/**
 * Solves joint angles for a downward-pointing tool tip. Unreachable targets are
 * clamped to the nearest reachable point along the same ray, so the solver
 * never produces NaN and the arm never "snaps".
 * Returns false when clamping was required.
 */
export function solveIK(target: CylTarget, out: JointAngles): boolean {
  const L1 = ARM.upperArm;
  const L2 = ARM.forearm;

  // Wrist-centre position in the arm's vertical plane, relative to the shoulder.
  let px = target.r - ARM.shoulderOffset;
  let py = target.y + ARM.tool - ARM.shoulderHeight;

  let reachable = true;
  let dist = Math.hypot(px, py);
  const maxReach = L1 + L2 - 1e-3;
  const minReach = Math.abs(L1 - L2) + 0.05;
  if (dist > maxReach) {
    const k = maxReach / dist;
    px *= k;
    py *= k;
    dist = maxReach;
    reachable = false;
  } else if (dist < minReach) {
    const k = minReach / Math.max(dist, EPS);
    px = dist < EPS ? minReach : px * k;
    py = dist < EPS ? 0 : py * k;
    dist = minReach;
    reachable = false;
  }

  const cosQ3 = clamp((dist * dist - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
  // Elbow-up solution: forearm bends "down" relative to the upper arm.
  const q3 = -Math.acos(cosQ3);
  const q2 = Math.atan2(py, px) - Math.atan2(L2 * Math.sin(q3), L1 + L2 * Math.cos(q3));
  // Keep the tool vertical: J2 + J3 + J5 = −90°.
  const q5 = -Math.PI / 2 - q2 - q3;

  out.j1 = target.yaw;
  out.j2 = q2;
  out.j3 = q3;
  out.j4 = 0;
  out.j5 = q5;
  out.j6 = target.yaw;
  return reachable;
}

/** Forward kinematics: world position of the tool tip (suction-cup plane). */
export function toolTip(j: JointAngles, out: Vec3): Vec3 {
  const a1 = j.j2;
  const a2 = a1 + j.j3;
  const a3 = a2 + j.j5;
  const planarX =
    ARM.shoulderOffset + ARM.upperArm * Math.cos(a1) + ARM.forearm * Math.cos(a2) + ARM.tool * Math.cos(a3);
  const planarY =
    ARM.shoulderHeight + ARM.upperArm * Math.sin(a1) + ARM.forearm * Math.sin(a2) + ARM.tool * Math.sin(a3);
  out.x = ARM.base.x + planarX * Math.cos(j.j1);
  out.y = planarY;
  out.z = ARM.base.z - planarX * Math.sin(j.j1);
  return out;
}

export function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Frame-rate independent exponential smoothing factor. */
export function damp(lambda: number, dt: number) {
  return 1 - Math.exp(-lambda * dt);
}
