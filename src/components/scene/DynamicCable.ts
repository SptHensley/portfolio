import * as THREE from "three";

/**
 * A flexible cable/hose whose ends are pinned to two moving Object3Ds.
 * Each update samples a cubic Bézier between the anchors (with tangent
 * handles expressed in each anchor's local frame) and rewrites a
 * pre-allocated tube BufferGeometry in place — no per-frame allocations.
 */

export interface CableEnd {
  object: THREE.Object3D;
  /** Anchor point in the object's local space. */
  offset: [number, number, number];
  /** Handle direction (local space) – where the cable leaves the anchor. */
  dir: [number, number, number];
  /** Handle length in metres. */
  reach: number;
}

const _p0 = new THREE.Vector3();
const _p1 = new THREE.Vector3();
const _p2 = new THREE.Vector3();
const _p3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _tmp = new THREE.Vector3();
const _pt = new THREE.Vector3();
const _tan = new THREE.Vector3();
const _n = new THREE.Vector3();
const _b = new THREE.Vector3();
const _prevN = new THREE.Vector3();

export class DynamicCable {
  readonly mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private positions: Float32Array;
  private normals: Float32Array;
  private points: THREE.Vector3[];

  constructor(
    private a: CableEnd,
    private b: CableEnd,
    private space: THREE.Object3D,
    material: THREE.Material,
    private radius = 0.028,
    private segments = 28,
    private radial = 8,
    /** Extra downward sag (metres) at the cable midpoint. */
    private sag = 0,
  ) {
    const ringCount = segments + 1;
    const vertCount = ringCount * (radial + 1);
    this.positions = new Float32Array(vertCount * 3);
    this.normals = new Float32Array(vertCount * 3);
    const indices: number[] = [];
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < radial; j++) {
        const a0 = i * (radial + 1) + j;
        const b0 = (i + 1) * (radial + 1) + j;
        indices.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
      }
    }
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("normal", new THREE.BufferAttribute(this.normals, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setIndex(indices);
    this.points = Array.from({ length: ringCount }, () => new THREE.Vector3());
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
  }

  private endpoint(end: CableEnd, outP: THREE.Vector3, outH: THREE.Vector3) {
    end.object.updateWorldMatrix(true, false);
    outP.set(...end.offset).applyMatrix4(end.object.matrixWorld);
    end.object.getWorldQuaternion(_q);
    _tmp.set(...end.dir).normalize().applyQuaternion(_q).multiplyScalar(end.reach);
    outH.copy(outP).add(_tmp);
    this.space.worldToLocal(outP);
    this.space.worldToLocal(outH);
  }

  update() {
    this.space.updateWorldMatrix(true, false);
    this.endpoint(this.a, _p0, _p1);
    this.endpoint(this.b, _p3, _p2);

    const n = this.segments;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const it = 1 - t;
      _pt
        .copy(_p0)
        .multiplyScalar(it * it * it)
        .addScaledVector(_p1, 3 * it * it * t)
        .addScaledVector(_p2, 3 * it * t * t)
        .addScaledVector(_p3, t * t * t);
      _pt.y -= Math.sin(Math.PI * t) * this.sag;
      this.points[i].copy(_pt);
    }

    let k = 0;
    for (let i = 0; i <= n; i++) {
      const p = this.points[i];
      const prev = this.points[Math.max(0, i - 1)];
      const next = this.points[Math.min(n, i + 1)];
      _tan.subVectors(next, prev).normalize();
      if (i === 0) {
        // Initial normal: any vector perpendicular to the tangent.
        _n.set(0, 1, 0);
        if (Math.abs(_tan.y) > 0.9) _n.set(1, 0, 0);
        _n.addScaledVector(_tan, -_n.dot(_tan)).normalize();
      } else {
        // Parallel transport keeps the tube from twisting.
        _n.copy(_prevN).addScaledVector(_tan, -_prevN.dot(_tan));
        if (_n.lengthSq() < 1e-8) _n.set(0, 1, 0);
        _n.normalize();
      }
      _prevN.copy(_n);
      _b.crossVectors(_tan, _n).normalize();
      for (let j = 0; j <= this.radial; j++) {
        const ang = (j / this.radial) * Math.PI * 2;
        const cx = Math.cos(ang);
        const sx = Math.sin(ang);
        const nx = cx * _n.x + sx * _b.x;
        const ny = cx * _n.y + sx * _b.y;
        const nz = cx * _n.z + sx * _b.z;
        this.normals[k] = nx;
        this.normals[k + 1] = ny;
        this.normals[k + 2] = nz;
        this.positions[k] = p.x + nx * this.radius;
        this.positions[k + 1] = p.y + ny * this.radius;
        this.positions[k + 2] = p.z + nz * this.radius;
        k += 3;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.normal.needsUpdate = true;
  }

  dispose() {
    this.geometry.dispose();
  }
}
