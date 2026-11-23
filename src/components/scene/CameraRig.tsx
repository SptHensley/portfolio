"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import {
  FOV,
  HUB_BOX,
  REGIONS,
  VIEW_DIR,
  createPose,
  fitBox,
  layoutFor,
  stationBox,
  type Region,
} from "@/lib/framing";
import { damp } from "@/lib/kinematics";
import { sim } from "@/lib/sim";

// Scratch objects (one camera rig per page).
const hub = createPose();
const station = createPose();
const pos = new THREE.Vector3();
const target = new THREE.Vector3();
const right = new THREE.Vector3();
const stackedHub: Region = { x0: 0, x1: 1, y0: 0.5, y1: 1 };

/**
 * Blends between the hub framing and the active station framing using
 * `sim.camera.blend`, which the choreographer drives from the same tween as
 * the conveyor — so the camera pans exactly in step with the crate.
 */
export function CameraRig() {
  const parallax = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    const { width: W, height: H } = state.size;
    if (W === 0 || H === 0) return;
    const mode = layoutFor(W, H);
    const fov = FOV[mode];
    if (cam.fov !== fov) cam.fov = fov;
    const aspect = W / H;

    let hubRegion = REGIONS[mode].hub;
    if (mode === "stacked") {
      // Frame the arm in whatever space the (measured) hub panel leaves below it.
      const top = THREE.MathUtils.clamp(sim.layout.hubPanelBottom + 0.015, 0.3, 0.8);
      stackedHub.x0 = hubRegion.x0;
      stackedHub.x1 = hubRegion.x1;
      stackedHub.y0 = top;
      stackedHub.y1 = hubRegion.y1;
      hubRegion = stackedHub;
    }
    fitBox(HUB_BOX, hubRegion, VIEW_DIR, fov, aspect, hub);
    fitBox(stationBox(sim.camera.stationX), REGIONS[mode].station, VIEW_DIR, fov, aspect, station);

    const b = sim.camera.blend;
    pos.lerpVectors(hub.pos, station.pos, b);
    target.lerpVectors(hub.target, station.target, b);
    const shiftX = THREE.MathUtils.lerp(hub.shiftX, station.shiftX, b);
    const shiftY = THREE.MathUtils.lerp(hub.shiftY, station.shiftY, b);

    // Intro dolly on first load.
    const intro = Math.min(sim.time / 2.6, 1);
    const k = 1 - Math.pow(1 - intro, 3);
    pos.sub(target).multiplyScalar(1 + 0.32 * (1 - k)).add(target);
    pos.y += (1 - k) * 1.2;

    // Subtle mouse parallax.
    const dt = Math.min(delta, 0.05);
    parallax.current.x += (sim.mouse.x - parallax.current.x) * damp(2.5, dt);
    parallax.current.y += (sim.mouse.y - parallax.current.y) * damp(2.5, dt);
    right.crossVectors(VIEW_DIR, THREE.Object3D.DEFAULT_UP).normalize();
    pos.addScaledVector(right, parallax.current.x * 0.18);
    pos.y += parallax.current.y * 0.1;

    cam.position.copy(pos);
    cam.lookAt(target);
    cam.setViewOffset(W, H, (-shiftX * W) / 2, (shiftY * H) / 2, W, H);
  });

  return null;
}
