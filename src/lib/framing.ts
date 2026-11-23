import * as THREE from "three";
import { CONVEYOR } from "./layout";

/**
 * Responsive camera framing. Instead of hard-coding camera positions per
 * breakpoint, each view declares (a) a world-space box that must be visible
 * and (b) the screen region it should occupy (leaving room for the HTML
 * overlay). `fitBox` solves the camera distance so every box corner lands in
 * the region, then applies an off-axis lens shift so the box is centred in it.
 */

export type LayoutMode = "wide" | "stacked";

export function layoutFor(width: number, height: number): LayoutMode {
  return width >= 760 && width / height >= 1.15 ? "wide" : "stacked";
}

export interface Region {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export interface Box {
  min: [number, number, number];
  max: [number, number, number];
}

export interface CamPose {
  pos: THREE.Vector3;
  target: THREE.Vector3;
  /** Lens shift in NDC units. */
  shiftX: number;
  shiftY: number;
}

export const VIEW_DIR = new THREE.Vector3(-0.17, -0.38, -1).normalize();

export const FOV: Record<LayoutMode, number> = { wide: 30, stacked: 40 };

export const HUB_BOX: Box = {
  min: [-3.4, 0, -1.2],
  max: [0.5, 2.8, CONVEYOR.z + 0.15],
};

export function stationBox(x: number): Box {
  return {
    min: [x - 1.0, 0.2, 0.0],
    max: [x + 1.2, 2.75, CONVEYOR.z + 0.4],
  };
}

export const REGIONS: Record<LayoutMode, { hub: Region; station: Region }> = {
  wide: {
    hub: { x0: 0.02, x1: 0.55, y0: 0.12, y1: 0.93 },
    station: { x0: 0.03, x1: 0.4, y0: 0.16, y1: 0.92 },
  },
  stacked: {
    hub: { x0: 0.04, x1: 0.96, y0: 0.5, y1: 0.97 },
    station: { x0: 0.08, x1: 0.92, y0: 0.08, y1: 0.33 },
  },
};

export function createPose(): CamPose {
  return { pos: new THREE.Vector3(), target: new THREE.Vector3(), shiftX: 0, shiftY: 0 };
}

const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _center = new THREE.Vector3();
const _corner = new THREE.Vector3();
const WORLD_UP = new THREE.Vector3(0, 1, 0);

export function fitBox(
  box: Box,
  region: Region,
  viewDir: THREE.Vector3,
  fovDeg: number,
  aspect: number,
  out: CamPose,
  minDist = 4,
) {
  _right.crossVectors(viewDir, WORLD_UP).normalize();
  _up.crossVectors(_right, viewDir).normalize();
  _center.set(
    (box.min[0] + box.max[0]) / 2,
    (box.min[1] + box.max[1]) / 2,
    (box.min[2] + box.max[2]) / 2,
  );
  const tanV = Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2);
  const tanH = tanV * aspect;
  const hw = region.x1 - region.x0;
  const hh = region.y1 - region.y0;

  let dist = minDist;
  for (let i = 0; i < 8; i++) {
    _corner.set(
      i & 1 ? box.max[0] : box.min[0],
      i & 2 ? box.max[1] : box.min[1],
      i & 4 ? box.max[2] : box.min[2],
    );
    _corner.sub(_center);
    const xr = Math.abs(_corner.dot(_right));
    const yu = Math.abs(_corner.dot(_up));
    const zf = _corner.dot(viewDir);
    dist = Math.max(dist, xr / (hw * tanH) - zf, yu / (hh * tanV) - zf);
  }

  out.target.copy(_center);
  out.pos.copy(_center).addScaledVector(viewDir, -dist);
  out.shiftX = region.x0 + region.x1 - 1;
  out.shiftY = 1 - (region.y0 + region.y1);
  return out;
}
