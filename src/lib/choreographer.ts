import gsap from "gsap";
import { factoryAudio } from "./audio";
import { worldToCyl, type CylTarget } from "./kinematics";
import {
  CONVEYOR,
  CRATE_SIZE,
  IDLE_POSE,
  SAFE_TIP_Y,
  STATIONS,
  isStationId,
  slotPosition,
  type StationId,
} from "./layout";
import { putCrateInSlot, putCrateOnBelt, sim, type Phase } from "./sim";
import { ui } from "./store";

/**
 * Deterministic pick-and-place state machine.
 *
 *   IDLE → REACHING → GRIPPING → PLACING → CONVEYING_OUT → AT_SECTION
 *        → REVERSING → REACHING → GRIPPING → PLACING → IDLE
 *
 * Every sequence is a single GSAP timeline built from known start/end poses,
 * so a given station always plays back identically. Routing is reconciled:
 * the URL holds the *desired* station, `physical` holds where the crate really
 * is, and `reconcile()` plays whichever sequence closes the gap once the
 * current one finishes (rapid Back/Forward presses can never desync).
 */

let timeline: gsap.core.Timeline | null = null;
let physical: StationId | null = null;
let desired: StationId | null = null;

const BELT_TIP_Y = CONVEYOR.beltTop + CRATE_SIZE;
const SLOT_TIP_Y = slotPosition("projects")[1] + CRATE_SIZE / 2;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function setPhase(phase: Phase, status: string, extra: Parameters<typeof ui.set>[0] = {}) {
  ui.set({ phase, status, ...extra });
}

function conveyDuration(distance: number) {
  return 1.5 + Math.abs(distance) * 0.105;
}

/**
 * Adds a tool-tip move to the timeline. Yaw and radius interpolate in
 * cylindrical space (the arm swings around its waist like a real robot) and an
 * optional sine "bump" lifts the path into a smooth arc.
 */
function move(
  tl: gsap.core.Timeline,
  from: CylTarget,
  to: CylTarget,
  duration: number,
  opts: { bump?: number; ease?: string; position?: gsap.Position } = {},
): CylTarget {
  const proxy = { t: 0 };
  const a = { ...from };
  const b = { ...to };
  const bump = opts.bump ?? 0;
  tl.to(
    proxy,
    {
      t: 1,
      duration,
      ease: opts.ease ?? "power2.inOut",
      onUpdate: () => {
        const t = proxy.t;
        sim.arm.target.yaw = a.yaw + (b.yaw - a.yaw) * t;
        sim.arm.target.r = a.r + (b.r - a.r) * t;
        sim.arm.target.y = a.y + (b.y - a.y) * t + Math.sin(Math.PI * t) * bump;
      },
    },
    opts.position,
  );
  return b;
}

function dwell(tl: gsap.core.Timeline, duration: number) {
  tl.to({}, { duration });
}

function grip(id: StationId) {
  sim.crates[id].mode = "gripped";
}

/* ── Outbound: slot → belt → station ──────────────────────────────────── */

function buildOutbound(id: StationId) {
  const station = STATIONS[id];
  const [sx, , sz] = slotPosition(id);
  const slot = worldToCyl(sx, SLOT_TIP_Y, sz);
  const drop = worldToCyl(CONVEYOR.dropX, BELT_TIP_Y, CONVEYOR.z);
  const label = `${station.code} // ${station.label}`;

  const tl = gsap.timeline({ paused: true });
  let pose: CylTarget = { ...IDLE_POSE };

  tl.call(() => {
    sim.arm.target = { ...IDLE_POSE };
    setPhase("REACHING", `REACHING FOR CRATE ${label}`, { busy: true, activeStation: id, hovered: null });
    factoryAudio.play("blip");
  });
  tl.to(sim.arm, { idleWeight: 0, duration: 0.45, ease: "sine.inOut" }, 0);

  // Swing over the crate, then descend vertically onto its top centre.
  pose = move(tl, pose, { yaw: slot.yaw, r: slot.r, y: SAFE_TIP_Y }, 1.05, { bump: 0.08, position: 0 });
  pose = move(tl, pose, { ...pose, y: SLOT_TIP_Y }, 0.7, { ease: "power2.inOut" });

  tl.call(() => {
    setPhase("GRIPPING", "VACUUM LOCK ENGAGED");
    grip(id);
    factoryAudio.play("suction");
  });
  tl.to(sim.arm, { suction: 1, duration: 0.25, ease: "power1.out" });
  dwell(tl, 0.15);

  // Lift, swing along an arc to the conveyor, lower onto the belt.
  tl.call(() => setPhase("PLACING", "TRANSFERRING TO CONVEYOR"));
  pose = move(tl, pose, { ...pose, y: SAFE_TIP_Y }, 0.55, { ease: "power2.inOut" });
  pose = move(tl, pose, { yaw: drop.yaw, r: drop.r, y: SAFE_TIP_Y }, 1.15, { bump: 0.22 });
  pose = move(tl, pose, { ...pose, y: BELT_TIP_Y }, 0.6, { ease: "power2.inOut" });

  tl.call(() => {
    putCrateOnBelt(id, CONVEYOR.dropX);
    factoryAudio.play("release");
    factoryAudio.play("clunk");
  });
  tl.to(sim.arm, { suction: 0, duration: 0.2, ease: "power1.in" });

  // Retreat to idle while the belt starts moving.
  pose = move(tl, pose, { ...pose, y: SAFE_TIP_Y + 0.12 }, 0.4, { ease: "power2.out" });
  const retreat = tl.duration();
  move(tl, pose, { ...IDLE_POSE }, 1.0, { bump: 0.05, position: retreat });
  tl.to(sim.arm, { idleWeight: 1, duration: 0.6, ease: "sine.inOut" }, retreat + 0.4);

  // Conveyor + camera pan share one tween so they stay perfectly in sync.
  const distance = station.x - CONVEYOR.dropX;
  const convey = { p: 0 };
  let s0 = 0;
  tl.call(
    () => {
      s0 = sim.belt.s;
      sim.camera.stationX = station.x;
      setPhase("CONVEYING_OUT", `CONVEYING TO STATION ${label}`);
    },
    undefined,
    retreat + 0.1,
  );
  tl.to(
    convey,
    {
      p: 1,
      duration: conveyDuration(distance),
      ease: "power2.inOut",
      onUpdate: () => {
        sim.belt.s = s0 + distance * convey.p;
        sim.camera.blend = convey.p;
      },
    },
    retreat + 0.1,
  );

  tl.eventCallback("onComplete", () => {
    timeline = null;
    physical = id;
    if (desired === id) {
      setPhase("AT_SECTION", `STATION ${label} // ONLINE`, { busy: false, panelOpen: true });
      factoryAudio.play("arrive");
    } else {
      reconcile();
    }
  });
  return tl;
}

/* ── Inbound: station → belt → slot ───────────────────────────────────── */

function buildInbound(id: StationId) {
  const station = STATIONS[id];
  const [sx, , sz] = slotPosition(id);
  const slot = worldToCyl(sx, SLOT_TIP_Y, sz);
  const drop = worldToCyl(CONVEYOR.dropX, BELT_TIP_Y, CONVEYOR.z);
  const label = `${station.code} // ${station.label}`;

  const tl = gsap.timeline({ paused: true });
  const distance = sim.crates[id].pos.x - CONVEYOR.dropX;
  const convey = { q: 0 };
  let s0 = 0;
  const conveyTime = conveyDuration(distance);

  tl.call(() => {
    s0 = sim.belt.s;
    sim.camera.stationX = station.x;
    setPhase("REVERSING", "CONVEYOR REVERSED // RETURNING TO HUB", { busy: true, panelOpen: false });
    factoryAudio.play("blip");
  });
  tl.to(convey, {
    q: 1,
    duration: conveyTime,
    ease: "power2.inOut",
    onUpdate: () => {
      sim.belt.s = s0 - distance * convey.q;
      sim.camera.blend = 1 - convey.q;
    },
  });

  // The arm pre-positions above the drop point while the belt decelerates.
  let pose: CylTarget = { ...IDLE_POSE };
  const preStart = Math.max(0.2, conveyTime - 1.1);
  tl.call(() => (sim.arm.target = { ...IDLE_POSE }), undefined, preStart);
  tl.to(sim.arm, { idleWeight: 0, duration: 0.45, ease: "sine.inOut" }, preStart);
  pose = move(tl, pose, { yaw: drop.yaw, r: drop.r, y: SAFE_TIP_Y }, 1.1, { bump: 0.06, position: preStart });

  tl.call(() => setPhase("REACHING", `RETRIEVING CRATE ${label}`), undefined, conveyTime);
  pose = move(tl, pose, { ...pose, y: BELT_TIP_Y }, 0.65, { ease: "power2.inOut", position: conveyTime + 0.05 });

  tl.call(() => {
    setPhase("GRIPPING", "VACUUM LOCK ENGAGED");
    grip(id);
    factoryAudio.play("suction");
  });
  tl.to(sim.arm, { suction: 1, duration: 0.25, ease: "power1.out" });
  dwell(tl, 0.15);

  tl.call(() => setPhase("PLACING", "RESTOCKING STAGING PALLET"));
  pose = move(tl, pose, { ...pose, y: SAFE_TIP_Y }, 0.55, { ease: "power2.inOut" });
  pose = move(tl, pose, { yaw: slot.yaw, r: slot.r, y: SAFE_TIP_Y }, 1.15, { bump: 0.22 });
  pose = move(tl, pose, { ...pose, y: SLOT_TIP_Y }, 0.65, { ease: "power2.inOut" });

  tl.call(() => {
    putCrateInSlot(id);
    factoryAudio.play("release");
    factoryAudio.play("clunk");
  });
  tl.to(sim.arm, { suction: 0, duration: 0.2, ease: "power1.in" });
  pose = move(tl, pose, { ...pose, y: SAFE_TIP_Y + 0.12 }, 0.4, { ease: "power2.out" });
  const back = tl.duration();
  move(tl, pose, { ...IDLE_POSE }, 1.0, { bump: 0.05, position: back });
  tl.to(sim.arm, { idleWeight: 1, duration: 0.6, ease: "sine.inOut" }, back + 0.4);

  tl.eventCallback("onComplete", () => {
    timeline = null;
    physical = null;
    setPhase("IDLE", "SYSTEM READY", { busy: false, activeStation: null });
    reconcile();
  });
  return tl;
}

/* ── Reconciler ───────────────────────────────────────────────────────── */

function play(tl: gsap.core.Timeline) {
  timeline = tl;
  tl.timeScale(prefersReducedMotion() ? 2.2 : 1);
  tl.play(0);
}

function reconcile() {
  if (timeline) return;
  if (physical === desired) {
    if (physical && !ui.get().panelOpen) {
      ui.set({ phase: "AT_SECTION", panelOpen: true, busy: false });
    }
    return;
  }
  if (physical) {
    play(buildInbound(physical));
    return;
  }
  if (desired) {
    play(buildOutbound(desired));
  }
}

/** Instantly parks a crate at a station (deep links). */
function teleport(id: StationId) {
  const station = STATIONS[id];
  sim.belt.s = 0;
  putCrateOnBelt(id, station.x);
  sim.camera.stationX = station.x;
  sim.camera.blend = 1;
  physical = id;
  desired = id;
  setPhase("AT_SECTION", `STATION ${station.code} // ${station.label} // ONLINE`, {
    activeStation: id,
    panelOpen: true,
    busy: false,
  });
}

/* ── URL routing (?station=projects) ──────────────────────────────────── */

interface HistoryState {
  rfStation?: StationId | null;
  rfFromHub?: boolean;
}

function readStationFromLocation(): StationId | null {
  const params = new URLSearchParams(window.location.search);
  const q = params.get("station");
  if (isStationId(q)) return q;
  const hash = window.location.hash.replace(/^#/, "");
  if (isStationId(hash)) return hash;
  return null;
}

function onPopState() {
  desired = readStationFromLocation();
  reconcile();
}

export function initRouting() {
  const initial = readStationFromLocation();
  // Normalise legacy hash links (#projects) to the query form.
  if (initial && window.location.hash) {
    window.history.replaceState(
      { ...(window.history.state ?? {}), rfStation: initial },
      "",
      `${window.location.pathname}?station=${initial}`,
    );
  }
  if (initial) teleport(initial);
  else desired = null;

  window.addEventListener("popstate", onPopState);
  return () => {
    window.removeEventListener("popstate", onPopState);
    timeline?.kill();
    timeline = null;
  };
}

/** Crate click / dispatch button. Ignored while the cell is busy. */
export function dispatchCrate(id: StationId) {
  const s = ui.get();
  if (s.busy || physical !== null || timeline) return;
  const state: HistoryState = { rfStation: id, rfFromHub: true };
  window.history.pushState({ ...(window.history.state ?? {}), ...state }, "", `?station=${id}`);
  desired = id;
  reconcile();
}

/** Reverse-conveyor button / Escape key. */
export function returnToHub() {
  const s = ui.get();
  if (!s.panelOpen || s.busy || timeline) return;
  const current = (window.history.state ?? {}) as HistoryState;
  desired = null;
  if (current.rfFromHub && current.rfStation === physical) {
    // Pop the entry we pushed so Back/Forward stay natural.
    window.history.back();
  } else {
    window.history.pushState(
      { ...(window.history.state ?? {}), rfStation: null, rfFromHub: false },
      "",
      window.location.pathname,
    );
  }
  reconcile();
}
