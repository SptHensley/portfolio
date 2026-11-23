import * as THREE from "three";

/**
 * Shared PBR materials (created once on the client). The arm uses clearcoated
 * physical materials so the studio environment map shows up as soft, glossy
 * highlights on the painted links and machined caps.
 */

let cached: ReturnType<typeof build> | null = null;

function build() {
  return {
    // Industrial enamel: coloured base coat + glossy clear coat.
    yellow: new THREE.MeshPhysicalMaterial({
      color: "#FACC15",
      roughness: 0.34,
      metalness: 0.08,
      clearcoat: 0.75,
      clearcoatRoughness: 0.16,
    }),
    yellowDark: new THREE.MeshPhysicalMaterial({
      color: "#EAB308",
      roughness: 0.4,
      metalness: 0.08,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
    }),
    charcoal: new THREE.MeshStandardMaterial({ color: "#18181B", roughness: 0.72, metalness: 0.35 }),
    charcoalSoft: new THREE.MeshStandardMaterial({ color: "#232327", roughness: 0.62, metalness: 0.4 }),
    capBlack: new THREE.MeshPhysicalMaterial({
      color: "#0F0F11",
      roughness: 0.28,
      metalness: 0.6,
      clearcoat: 0.5,
      clearcoatRoughness: 0.12,
    }),
    steel: new THREE.MeshStandardMaterial({ color: "#B4B4BC", roughness: 0.2, metalness: 1 }),
    steelDark: new THREE.MeshStandardMaterial({ color: "#5B5B64", roughness: 0.32, metalness: 0.95 }),
    rubber: new THREE.MeshStandardMaterial({ color: "#0B0B0C", roughness: 0.95, metalness: 0, side: THREE.DoubleSide }),
    cable: new THREE.MeshStandardMaterial({ color: "#141416", roughness: 0.45, metalness: 0.1 }),
    wood: new THREE.MeshStandardMaterial({ color: "#C89466", roughness: 0.85, metalness: 0 }),
    woodDark: new THREE.MeshStandardMaterial({ color: "#9C6B43", roughness: 0.9, metalness: 0 }),
  };
}

export function getMaterials() {
  if (!cached) cached = build();
  return cached;
}
