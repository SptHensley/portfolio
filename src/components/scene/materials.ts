import * as THREE from "three";

/** Shared PBR materials (created once on the client). */

let cached: ReturnType<typeof build> | null = null;

function build() {
  return {
    yellow: new THREE.MeshStandardMaterial({ color: "#FACC15", roughness: 0.38, metalness: 0.12 }),
    yellowDark: new THREE.MeshStandardMaterial({ color: "#EAB308", roughness: 0.45, metalness: 0.1 }),
    charcoal: new THREE.MeshStandardMaterial({ color: "#18181B", roughness: 0.82, metalness: 0.25 }),
    charcoalSoft: new THREE.MeshStandardMaterial({ color: "#232327", roughness: 0.7, metalness: 0.3 }),
    capBlack: new THREE.MeshStandardMaterial({ color: "#0F0F11", roughness: 0.35, metalness: 0.55 }),
    steel: new THREE.MeshStandardMaterial({ color: "#A1A1AA", roughness: 0.32, metalness: 0.9 }),
    steelDark: new THREE.MeshStandardMaterial({ color: "#52525B", roughness: 0.4, metalness: 0.85 }),
    rubber: new THREE.MeshStandardMaterial({ color: "#0B0B0C", roughness: 0.95, metalness: 0, side: THREE.DoubleSide }),
    cable: new THREE.MeshStandardMaterial({ color: "#141416", roughness: 0.55, metalness: 0.1 }),
    wood: new THREE.MeshStandardMaterial({ color: "#C89466", roughness: 0.85, metalness: 0 }),
    woodDark: new THREE.MeshStandardMaterial({ color: "#9C6B43", roughness: 0.9, metalness: 0 }),
  };
}

export function getMaterials() {
  if (!cached) cached = build();
  return cached;
}
