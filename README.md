# Robotics Portfolio — Factory Cell

An interactive, robotics-themed portfolio built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, **React Three Fiber / drei** and **GSAP**. A 6-axis industrial arm (analytical IK, 4-cup vacuum gripper) picks crates off a staging pallet, places them on a conveyor and ships them, with the camera following, to the Projects, Experience, Skills & Lab and Contact stations.

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (what Vercel runs)
```

## Make it yours

All personal content lives in **`src/data/portfolio.ts`**:

| Field | Used for |
| --- | --- |
| `name`, `callsign`, `title`, `location`, `availability`, `bio` | Hub heading, HMI bio frame, top bar |
| `socials` | Hub links and the Contact station (`/resume.pdf` expects a file at `public/resume.pdf`) |
| `projects` | Station 01: cards with optional `highlights`, `liveUrl` / `githubUrl` |
| `experience`, `education` | Station 02 timeline (`end: "PRESENT"` / `current: true` highlights the active entry) |
| `skillGroups`, `labTitle`, `lab` | Station 03 capability matrix (add `level: 0–100` to a skill to show a bar) and the table below it |
| `contact.formEndpoint` | Optional Formspree/Basin/Getform URL; when empty, the form opens a prefilled email instead |
| `seo` | Page `<title>` and meta description |

## How it works

```
src/
  data/portfolio.ts          ← content config
  lib/
    layout.ts                ← every world-space constant (arm, pallet, conveyor, stations)
    kinematics.ts            ← analytical IK + forward kinematics
    choreographer.ts         ← GSAP state machine + URL routing/reconciler
    sim.ts / store.ts        ← mutable 60 fps sim state / tiny UI store
    framing.ts               ← responsive "fit box into screen region" camera solver
    audio.ts                 ← Web Audio synth (servo whine, conveyor hum, vacuum hiss)
    textures.ts              ← procedural canvas textures (decals, crate faces, signage)
  components/
    ClientApp.tsx            ← next/dynamic(..., { ssr: false }) boundary
    FactoryExperience.tsx    ← <Canvas> + HTML overlay
    scene/                   ← RobotArm, ConveyorBelt, PortfolioCrate, FactoryScene, CameraRig, …
    stations/                ← Projects/Experience/Skills/Contact station UIs
    ui/                      ← TopBar (SOUND toggle), HubPanel, TelemetryHUD, StationOverlay, ReverseConveyorButton
```

- **State machine:** `IDLE → REACHING → GRIPPING → PLACING → CONVEYING_OUT → AT_SECTION → REVERSING → (REACHING → GRIPPING → PLACING) → IDLE`. Each sequence is one GSAP timeline built from known poses, so it plays back the same way every time. Navigation inputs are locked while a timeline runs.
- **IK:** waist yaw comes from `atan2`, shoulder and elbow from a closed-form two-link solve for the wrist centre, and the wrist pitch keeps the tool pointing at world −Y (`J2 + J3 + J5 = −90°`). J6 counter-rotates J1 so the gripper stays square to the crate. Tool paths are tweened in cylindrical coordinates around the waist, which gives natural swinging arcs.
- **Conveyor and camera sync:** a single tween drives the belt displacement (treads, roller caps, crate position) and the camera blend, so the pan stays in step with the box.
- **Routing:** `?station=projects|experience|skills|contact` (legacy `#projects` hashes are normalised). Deep links open directly at the station. Back/Forward and the Reverse button feed a reconciler that plays whichever sequence is needed once the current one finishes, so rapid history clicks can't desync the scene.
- **Keyboard:** `1`–`4` dispatch a crate and `Esc` reverses the conveyor. Every crate also has an accessible HTML dispatch button.

## Deploying to Vercel

Push to GitHub and import the repo in Vercel; no configuration is needed. All Three.js, WebGL and Web Audio code is behind `next/dynamic` with `ssr: false` inside a Client Component, so `next build` prerenders the page statically without touching `window`.
