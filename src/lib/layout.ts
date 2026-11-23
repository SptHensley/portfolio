/**
 * Factory floor layout — every world-space constant used by the scene and the
 * choreographer lives here so the kinematics, crates, conveyor and camera
 * always agree with each other. Units are metres, Y is up, the camera looks
 * down -Z at the hub.
 */

export const STATION_IDS = ["projects", "experience", "skills", "contact"] as const;
export type StationId = (typeof STATION_IDS)[number];

export function isStationId(value: unknown): value is StationId {
  return typeof value === "string" && (STATION_IDS as readonly string[]).includes(value);
}

export interface StationDef {
  id: StationId;
  index: number;
  code: string; // "01"
  label: string; // "PROJECTS"
  /** World X of the station along the conveyor. */
  x: number;
  /** Slot index on the staging pallet (0 = closest to the arm). */
  slot: number;
}

/* ── Robot arm ─────────────────────────────────────────────────────────── */

export const ARM = {
  base: { x: -2.6, y: 0, z: -0.75 },
  /** Height of the shoulder (J2) axis above the floor. */
  shoulderHeight: 1.05,
  /** Horizontal offset of the shoulder axis from the waist (J1) axis. */
  shoulderOffset: 0.2,
  /** Upper arm: J2 → J3. */
  upperArm: 1.6,
  /** Forearm: J3 → J5 (wrist pitch). */
  forearm: 1.5,
  /** Wrist pitch axis → bottom of suction cups (tool points straight down). */
  tool: 0.5,
} as const;

/* ── Crates, pallet & conveyor ─────────────────────────────────────────── */

export const CRATE_SIZE = 0.5;
export const PALLET_HEIGHT = 0.14;
export const PALLET_Z = -0.55;
/** Crate centre X for each pallet slot (left → right). */
export const SLOT_X = [-1.65, -1.05, -0.45, 0.15] as const;

export const CONVEYOR = {
  z: 0.95,
  /** Height of the moving belt surface. */
  beltTop: 0.55,
  beltWidth: 0.86,
  minX: -31,
  maxX: 31,
  /** Where the arm drops crates onto the belt. */
  dropX: -2.0,
  rollerRadius: 0.07,
  rollerPitch: 0.42,
} as const;

/** Tool-tip height used for swinging moves (carried crate clears everything). */
export const SAFE_TIP_Y = 1.62;
/** Idle tool-tip pose in cylindrical coordinates around the waist axis. */
export const IDLE_POSE = { yaw: -0.62, r: 1.85, y: 2.0 } as const;

/* ── Stations ──────────────────────────────────────────────────────────── */

export const STATIONS: Record<StationId, StationDef> = {
  projects: { id: "projects", index: 0, code: "01", label: "PROJECTS", x: -24, slot: 0 },
  experience: { id: "experience", index: 1, code: "02", label: "EXPERIENCE", x: -12, slot: 1 },
  skills: { id: "skills", index: 2, code: "03", label: "SKILLS & LAB", x: 12, slot: 2 },
  contact: { id: "contact", index: 3, code: "04", label: "CONTACT", x: 24, slot: 3 },
};

export const STATION_LIST: StationDef[] = STATION_IDS.map((id) => STATIONS[id]);

export function slotPosition(id: StationId): [number, number, number] {
  const s = STATIONS[id];
  return [SLOT_X[s.slot], PALLET_HEIGHT + CRATE_SIZE / 2, PALLET_Z];
}

export function beltCratePosition(x: number): [number, number, number] {
  return [x, CONVEYOR.beltTop + CRATE_SIZE / 2, CONVEYOR.z];
}
