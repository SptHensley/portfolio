"use client";

import { Environment, Grid, Lightformer } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { HUB_BOX } from "@/lib/framing";
import { ARM, STATION_IDS, STATION_LIST } from "@/lib/layout";
import { sim } from "@/lib/sim";
import { ui } from "@/lib/store";
import { CameraRig } from "./CameraRig";
import { ConveyorBelt } from "./ConveyorBelt";
import { HazardFrame, Pallet, StackLight, StationBay, hubLamp } from "./FactoryProps";
import { PortfolioCrate } from "./PortfolioCrate";
import { RobotArm } from "./RobotArm";
import { SimDriver } from "./SimDriver";

const BACKDROP = "#E5E7EB";
const HUB_X = (HUB_BOX.min[0] + HUB_BOX.max[0]) / 2;

/** Key light + shadow frustum that travel with the camera focus. */
function LightRig() {
  const light = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const l = light.current!;
    l.shadow.mapSize.set(2048, 2048);
    const cam = l.shadow.camera;
    cam.left = -7;
    cam.right = 7;
    cam.top = 6;
    cam.bottom = -6;
    cam.near = 0.5;
    cam.far = 30;
    cam.updateProjectionMatrix();
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.02;
    // Wider PCF filter kernel = soft, studio-style penumbrae.
    l.shadow.radius = 5;
  }, []);
  useFrame(() => {
    const l = light.current!;
    const fx = THREE.MathUtils.lerp(HUB_X, sim.camera.stationX, sim.camera.blend);
    l.position.set(fx + 4, 9, 6);
    l.target.position.set(fx, 0, 0);
    l.target.updateMatrixWorld();
  });
  return (
    <>
      <directionalLight ref={light} intensity={2.0} color="#fffaf0" castShadow />
      {/* Cool, shadowless fill from the left to model the arm's form. */}
      <directionalLight position={[-8, 5, 4]} intensity={0.45} color="#dbe7ff" />
    </>
  );
}

function ReadySignal() {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 3) ui.set({ ready: true });
  });
  return null;
}

export function FactoryScene() {
  return (
    <>
      {/* SimDriver must stay first: it solves IK before any visual reads it. */}
      <SimDriver />
      <CameraRig />

      <color attach="background" args={[BACKDROP]} />
      <fog attach="fog" args={[BACKDROP, 20, 46]} />
      <hemisphereLight args={["#ffffff", "#c7ccd4", 0.85]} />
      <LightRig />
      {/*
        Procedural studio environment (no HDR download): a dim cyclorama with an
        overhead softbox, two tall strip lights for crisp streak reflections on
        the clear-coated links, a front fill and a warm rim from behind.
        Lightformers aim at the origin by default.
      */}
      <Environment resolution={512} frames={1} environmentIntensity={1}>
        <color attach="background" args={["#3b3e45"]} />
        <Lightformer form="rect" intensity={3} position={[0, 8, 1]} scale={[10, 6, 1]} />
        <Lightformer form="rect" intensity={5} position={[-5, 2.5, 4]} scale={[0.7, 7, 1]} />
        <Lightformer form="rect" intensity={5} position={[5, 2.5, 4]} scale={[0.7, 7, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[0, 1.5, 9]} scale={[12, 3, 1]} />
        <Lightformer form="rect" color="#ffe6bf" intensity={1.4} position={[0, 3, -8]} scale={[10, 2.5, 1]} />
        <Lightformer form="circle" intensity={2} position={[-7, 6, -2]} scale={2.5} />
      </Environment>

      {/* Studio floor: grid lines + shadow catcher on the seamless backdrop */}
      {/*
        Floor grid. drei sizes an "infinite" grid as args × (1 + fadeDistance),
        so args 2.4 gives a ±40 m plane: the distance fade reaches zero well
        before the edge (no hard horizon line). followCamera keeps the plane
        under the camera as it pans to the far stations; the lines themselves
        stay anchored to the world.
      */}
      <Grid
        args={[2.4, 2.4]}
        position={[0, 0.001, 0]}
        infiniteGrid
        followCamera
        cellSize={0.5}
        cellThickness={0.7}
        cellColor="#c4c9d1"
        sectionSize={2.5}
        sectionThickness={1.1}
        sectionColor="#a8afba"
        fadeDistance={32}
        fadeStrength={1.6}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow renderOrder={1}>
        <planeGeometry args={[220, 90]} />
        <shadowMaterial transparent opacity={0.2} />
      </mesh>

      <RobotArm />
      <Pallet />
      {STATION_IDS.map((id) => (
        <PortfolioCrate key={id} id={id} />
      ))}
      <ConveyorBelt />
      {STATION_LIST.map((s) => (
        <StationBay key={s.id} station={s} />
      ))}

      <StackLight position={[ARM.base.x - 1.05, 0, ARM.base.z - 0.55]} getLamp={hubLamp} />
      <HazardFrame x0={ARM.base.x - 1.15} x1={0.72} z0={ARM.base.z - 0.95} z1={0.32} />

      <ReadySignal />
    </>
  );
}
