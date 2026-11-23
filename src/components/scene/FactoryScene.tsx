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
  }, []);
  useFrame(() => {
    const l = light.current!;
    const fx = THREE.MathUtils.lerp(HUB_X, sim.camera.stationX, sim.camera.blend);
    l.position.set(fx + 4, 9, 6);
    l.target.position.set(fx, 0, 0);
    l.target.updateMatrixWorld();
  });
  return <directionalLight ref={light} intensity={2.3} color="#ffffff" castShadow />;
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
      <hemisphereLight args={["#ffffff", "#c7ccd4", 1.05]} />
      <LightRig />
      <Environment resolution={256} frames={1} environmentIntensity={0.75}>
        <Lightformer form="rect" intensity={2.4} position={[0, 6, 4]} rotation-x={Math.PI / 2.4} scale={[14, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[-6, 3, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[6, 2, -3]} rotation-y={-Math.PI / 2} scale={[8, 2, 1]} />
        <Lightformer form="ring" intensity={0.8} position={[0, 4, -8]} scale={4} />
      </Environment>

      {/* Studio floor: grid lines + shadow catcher on the seamless backdrop */}
      <Grid
        position={[0, 0.001, 0]}
        infiniteGrid
        cellSize={0.5}
        cellThickness={0.7}
        cellColor="#c4c9d1"
        sectionSize={2.5}
        sectionThickness={1.1}
        sectionColor="#a8afba"
        fadeDistance={38}
        fadeStrength={1.4}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow renderOrder={1}>
        <planeGeometry args={[220, 90]} />
        <shadowMaterial transparent opacity={0.17} />
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
