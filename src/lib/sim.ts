import {
  CONVEYOR,
  IDLE_POSE,
  STATION_IDS,
  slotPosition,
  type StationId,
} from "./layout";
import { createJoints, type CylTarget, type JointAngles, type Vec3 } from "./kinematics";

/**
 * Mutable simulation state shared by the GSAP choreographer (writer) and the
 * R3F frame loop (reader). Kept outside React so 60 fps updates never trigger
 * re-renders. Only discrete, UI-relevant changes go through the UI store.
 */

export type Phase =
  | "IDLE"
  | "REACHING"
  | "GRIPPING"
  | "PLACING"
  | "CONVEYING_OUT"
  | "AT_SECTION"
  | "REVERSING";

export type CrateMode = "slot" | "gripped" | "belt";

export interface CrateSim {
  id: StationId;
  mode: CrateMode;
  pos: Vec3;
  /** Crate X relative to belt displacement while riding the belt. */
  beltOffset: number;
}

export interface Sim {
  time: number;
  arm: {
    /** Choreographed tool-tip target (cylindrical, around the waist axis). */
    target: CylTarget;
    /** 1 = idle breathing + cursor tracking fully applied, 0 = none. */
    idleWeight: number;
    /** Solved joint angles this frame. */
    joints: JointAngles;
    /** World position of the suction-cup contact plane this frame. */
    tip: Vec3;
    /** Pneumatic vacuum level 0..1 (drives the status LED + audio). */
    suction: number;
    /** Aggregate joint angular speed (rad/s) – drives servo audio. */
    jointSpeed: number;
  };
  /** Normalised cursor position (−1..1), written by a window listener. */
  mouse: { x: number; y: number };
  crates: Record<StationId, CrateSim>;
  belt: {
    /** Cumulative belt displacement in metres (drives treads, rollers, crates). */
    s: number;
    /** Signed belt speed in m/s (derived each frame). */
    velocity: number;
  };
  camera: {
    /** 0 = hub framing, 1 = station framing. */
    blend: number;
    /** World X of the station being framed. */
    stationX: number;
  };
  /** Live HTML layout measurements the camera framing needs. */
  layout: {
    /** Bottom edge of the hub panel as a fraction of viewport height. */
    hubPanelBottom: number;
  };
}

function initialCrates(): Record<StationId, CrateSim> {
  const out = {} as Record<StationId, CrateSim>;
  for (const id of STATION_IDS) {
    const [x, y, z] = slotPosition(id);
    out[id] = { id, mode: "slot", pos: { x, y, z }, beltOffset: 0 };
  }
  return out;
}

export const sim: Sim = {
  time: 0,
  arm: {
    target: { ...IDLE_POSE },
    idleWeight: 1,
    joints: createJoints(),
    tip: { x: 0, y: 0, z: 0 },
    suction: 0,
    jointSpeed: 0,
  },
  mouse: { x: 0, y: 0 },
  crates: initialCrates(),
  belt: { s: 0, velocity: 0 },
  camera: { blend: 0, stationX: 0 },
  layout: { hubPanelBottom: 0.5 },
};

/** Places a crate on the belt at world X (keeps it riding the belt from now on). */
export function putCrateOnBelt(id: StationId, x: number) {
  const c = sim.crates[id];
  c.mode = "belt";
  c.beltOffset = x - sim.belt.s;
  c.pos.x = x;
  c.pos.y = CONVEYOR.beltTop + 0.25;
  c.pos.z = CONVEYOR.z;
}

export function putCrateInSlot(id: StationId) {
  const c = sim.crates[id];
  const [x, y, z] = slotPosition(id);
  c.mode = "slot";
  c.pos.x = x;
  c.pos.y = y;
  c.pos.z = z;
}
