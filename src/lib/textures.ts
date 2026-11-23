import * as THREE from "three";

/**
 * Procedural canvas textures: warning decals, crate faces, placards, belt
 * treads, roller caps, hazard stripes and station signage. Generated once per
 * key and cached, so there are no image requests and everything stays crisp.
 */

const cache = new Map<string, THREE.CanvasTexture>();

const YELLOW = "#FACC15";
const CHARCOAL = "#18181B";

/** next/font exposes the generated family names as CSS variables on <html>. */
export function cssFontFamily(variable: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

function displayFont() {
  return cssFontFamily("--font-barlow-condensed", "Arial Narrow, Arial, sans-serif");
}

function monoFont() {
  return cssFontFamily("--font-jetbrains-mono", "ui-monospace, monospace");
}

function make(
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: { repeat?: [number, number]; anisotropy?: number } = {},
) {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = opts.anisotropy ?? 8;
  if (opts.repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  tex.needsUpdate = true;
  cache.set(key, tex);
  return tex;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight: string, family: string) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && s > 8) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

function warningTriangle(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, fill: string, ink: string) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.55);
  ctx.lineTo(size * 0.55, size * 0.42);
  ctx.lineTo(-size * 0.55, size * 0.42);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.font = `900 ${size * 0.62}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", 0, size * 0.08);
  ctx.restore();
}

/** Yellow sticker with a black header band, e.g. CAUTION / DANGER. */
export function warningDecal(kind: "CAUTION" | "DANGER") {
  return make(`decal-${kind}`, 512, 256, (ctx, w, h) => {
    const family = displayFont();
    ctx.fillStyle = YELLOW;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = CHARCOAL;
    ctx.lineWidth = 10;
    roundRect(ctx, 8, 8, w - 16, h - 16, 18);
    ctx.stroke();

    // Header band.
    ctx.fillStyle = CHARCOAL;
    roundRect(ctx, 22, 22, w - 44, 112, 10);
    ctx.fill();
    warningTriangle(ctx, 82, 78, 76, YELLOW, CHARCOAL);
    ctx.fillStyle = YELLOW;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    fitText(ctx, kind, w - 190, 96, "800", family);
    ctx.fillText(kind, 136, 82);

    ctx.fillStyle = CHARCOAL;
    ctx.textAlign = "center";
    const lines =
      kind === "CAUTION"
        ? ["KEEP HANDS CLEAR OF", "MOVING MACHINERY"]
        : ["DO NOT TOUCH THE MACHINE", "HIGH VOLTAGE // ROBOT ZONE"];
    ctx.font = `700 40px ${family}`;
    ctx.fillText(lines[0], w / 2, 168);
    ctx.font = `600 34px ${family}`;
    ctx.fillText(lines[1], w / 2, 210);
  });
}

/** Wooden crate face modelled on the reference sticker crate. */
export function crateFace() {
  return make("crate-face", 512, 512, (ctx, w) => {
    const frame = 52;
    // Outer frame.
    ctx.fillStyle = "#8B5129";
    ctx.fillRect(0, 0, w, w);
    ctx.strokeStyle = "#5E3519";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, w - 6);
    // Frame bevel highlight.
    ctx.strokeStyle = "rgba(255,210,160,0.18)";
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, w - 20, w - 20);

    // Inner planks.
    const inner = w - frame * 2;
    ctx.fillStyle = "#C8743D";
    ctx.fillRect(frame, frame, inner, inner);
    const planks = 6;
    for (let i = 0; i < planks; i++) {
      const x = frame + (inner / planks) * i;
      const shade = i % 2 === 0 ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.04)";
      ctx.fillStyle = shade;
      ctx.fillRect(x, frame, inner / planks, inner);
      ctx.strokeStyle = "#9E5528";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, frame);
      ctx.lineTo(x, frame + inner);
      ctx.stroke();
    }
    // Wood grain.
    ctx.strokeStyle = "rgba(110,55,20,0.18)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 40; i++) {
      const x = frame + ((i * 37) % inner);
      ctx.beginPath();
      ctx.moveTo(x, frame);
      ctx.bezierCurveTo(x + 6, frame + inner * 0.3, x - 6, frame + inner * 0.7, x + 3, frame + inner);
      ctx.stroke();
    }
    // Inner shadow under frame.
    ctx.strokeStyle = "rgba(60,30,10,0.45)";
    ctx.lineWidth = 6;
    ctx.strokeRect(frame + 3, frame + 3, inner - 6, inner - 6);

    // X braces.
    const brace = (x1: number, y1: number, x2: number, y2: number) => {
      ctx.save();
      ctx.lineCap = "butt";
      ctx.strokeStyle = "#8F5228";
      ctx.lineWidth = 62;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,200,150,0.22)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1 - 22, y1 + 22);
      ctx.lineTo(x2 - 22, y2 + 22);
      ctx.stroke();
      ctx.restore();
    };
    ctx.save();
    ctx.beginPath();
    ctx.rect(frame, frame, inner, inner);
    ctx.clip();
    brace(frame, frame, frame + inner, frame + inner);
    brace(frame + inner, frame, frame, frame + inner);
    ctx.restore();

    // Corner screws.
    const screw = (x: number, y: number) => {
      ctx.fillStyle = "#3B2414";
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#1C110A";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - 8, y + 6);
      ctx.lineTo(x + 8, y - 6);
      ctx.stroke();
    };
    screw(26, 26);
    screw(w - 26, 26);
    screw(26, w - 26);
    screw(w - 26, w - 26);
  });
}

/** Black stencil placard with yellow code, e.g. "01 // PROJECTS". */
export function cratePlacard(code: string, label: string) {
  return make(`placard-${code}-${label}`, 512, 192, (ctx, w, h) => {
    const family = displayFont();
    ctx.fillStyle = CHARCOAL;
    roundRect(ctx, 0, 0, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = YELLOW;
    ctx.lineWidth = 8;
    roundRect(ctx, 10, 10, w - 20, h - 20, 10);
    ctx.stroke();
    ctx.fillStyle = YELLOW;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = `800 104px ${family}`;
    ctx.fillText(code, 34, h / 2 + 4);
    const codeW = ctx.measureText(code).width;
    ctx.fillStyle = "#F4F4F5";
    const text = `// ${label}`;
    fitText(ctx, text, w - codeW - 80, 64, "700", family);
    ctx.fillText(text, 34 + codeW + 18, h / 2 + 4);
  });
}

/** Spray-painted top stencil. */
export function crateTopStencil(code: string) {
  return make(`stencil-${code}`, 256, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(24,24,27,0.82)";
    ctx.font = `800 150px ${displayFont()}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(code, w / 2, h / 2 + 8);
  });
}

/** Segmented rubber belt treads (repeats along the belt). */
export function beltTreads(repeatX: number) {
  return make(
    `treads-${repeatX}`,
    128,
    256,
    (ctx, w, h) => {
      ctx.fillStyle = "#27272A";
      ctx.fillRect(0, 0, w, h);
      // Segment groove.
      ctx.fillStyle = "#0E0E10";
      ctx.fillRect(0, 0, 10, h);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(10, 0, 3, h);
      // Cleat texture.
      ctx.fillStyle = "rgba(255,255,255,0.035)";
      for (let y = 8; y < h; y += 24) ctx.fillRect(24, y, w - 36, 8);
      // Edge guides.
      ctx.fillStyle = "#3F3F46";
      ctx.fillRect(0, 0, w, 10);
      ctx.fillRect(0, h - 10, w, 10);
    },
    { repeat: [repeatX, 1] },
  );
}

/** Roller end cap: steel disc with spokes and a yellow index tick. */
export function rollerCap() {
  return make("roller-cap", 128, 128, (ctx, w) => {
    const c = w / 2;
    ctx.clearRect(0, 0, w, w);
    const grad = ctx.createRadialGradient(c - 10, c - 10, 6, c, c, c);
    grad.addColorStop(0, "#D4D4D8");
    grad.addColorStop(1, "#71717A");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c, c, c - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#3F3F46";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "#3F3F46";
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(c + Math.cos(a) * 30, c + Math.sin(a) * 30, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#18181B";
    ctx.beginPath();
    ctx.arc(c, c, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = YELLOW;
    ctx.fillRect(c - 5, 6, 10, 30);
  });
}

/** Diagonal yellow/black hazard stripes. */
export function hazardStripes(repeatX = 1) {
  return make(
    `hazard-${repeatX}`,
    128,
    32,
    (ctx, w, h) => {
      ctx.fillStyle = YELLOW;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = CHARCOAL;
      for (let x = -h; x < w + h; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x + 16, h);
        ctx.lineTo(x + 16 + h, 0);
        ctx.lineTo(x + h, 0);
        ctx.closePath();
        ctx.fill();
      }
    },
    { repeat: [repeatX, 1] },
  );
}

/** Overhead station sign: "STATION 01" + label. */
export function stationSign(code: string, label: string) {
  return make(`sign-${code}-${label}`, 1024, 256, (ctx, w, h) => {
    const family = displayFont();
    ctx.fillStyle = YELLOW;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = CHARCOAL;
    ctx.fillRect(0, 0, 230, h);
    ctx.fillStyle = YELLOW;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `800 150px ${family}`;
    ctx.fillText(code, 115, h / 2 + 8);
    ctx.fillStyle = CHARCOAL;
    ctx.textAlign = "left";
    ctx.font = `600 40px ${monoFont()}`;
    ctx.fillText(`STATION ${code}`, 270, 62);
    fitText(ctx, label, w - 310, 120, "800", family);
    ctx.fillText(label, 266, 160);
    ctx.lineWidth = 10;
    ctx.strokeStyle = CHARCOAL;
    ctx.strokeRect(5, 5, w - 10, h - 10);
  });
}

/** Floor stencil (large painted station number). */
export function floorStencil(code: string) {
  return make(`floor-${code}`, 512, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(24,24,27,0.16)";
    ctx.font = `800 220px ${displayFont()}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`ST-${code}`, w / 2, h / 2 + 12);
  });
}

/** Small engraved ID plate for the robot base. */
export function idPlate() {
  return make("id-plate", 256, 96, (ctx, w, h) => {
    ctx.fillStyle = "#27272A";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#A1A1AA";
    ctx.font = `600 22px ${monoFont()}`;
    ctx.textBaseline = "middle";
    ctx.fillText("RX-6 // 2026-023-465", 14, 30);
    ctx.fillText("PAYLOAD 12 KG  IP67", 14, 66);
  });
}
