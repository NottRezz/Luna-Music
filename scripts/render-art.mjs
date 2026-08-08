/**
 * Bakes the mockup's album-art swatches to PNG.
 *
 * The six `.art--a`…`.art--f` tiles in design/mockup/styles.css are built from
 * conic-gradient, which React Native cannot render. Rather than approximate
 * them, we render the real CSS in headless Chrome and ship the result.
 *
 * Two aspect ratios, because `.genre .art` is a wide banner while every other
 * usage is square. Baking one and stretching it would skew the cone.
 *
 * The film grain is NOT baked in: CSS tiles it at a fixed 140px regardless of
 * element size, so it is rendered once here and tiled at runtime by
 * components/aero/art.tsx. Baking it would make it vanish on a 36px row.
 *
 *   node scripts/render-art.mjs
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const OUT = resolve("assets/art");
const TMP = join(tmpdir(), "luna-art-render");

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((p) => existsSync(p));

if (!CHROME) {
  console.error("No Chrome or Edge found. Install one, or point CHROME at a binary.");
  process.exit(1);
}

/** Verbatim from design/mockup/styles.css `.art--a` … `.art--f`. */
const ART = {
  a: `radial-gradient(circle at 26% 24%, rgba(125,211,252,.95), transparent 42%),
      radial-gradient(circle at 76% 30%, rgba(167,139,250,.85), transparent 46%),
      conic-gradient(from 210deg at 52% 74%, #0ea5e9, #6366f1, #a855f7, #0ea5e9),
      linear-gradient(160deg, #0b1220, #1e3a8a)`,
  b: `radial-gradient(circle at 30% 78%, rgba(244,114,182,.9), transparent 46%),
      radial-gradient(circle at 74% 26%, rgba(253,224,71,.7), transparent 40%),
      conic-gradient(from 40deg at 60% 40%, #7c3aed, #db2777, #f97316, #7c3aed),
      linear-gradient(150deg, #2e1065, #831843)`,
  c: `radial-gradient(circle at 22% 30%, rgba(190,242,100,.85), transparent 44%),
      radial-gradient(circle at 78% 72%, rgba(45,212,191,.9), transparent 48%),
      conic-gradient(from 300deg at 40% 60%, #0f766e, #14b8a6, #a3e635, #0f766e),
      linear-gradient(160deg, #022c22, #0f766e)`,
  d: `radial-gradient(circle at 70% 24%, rgba(255,214,102,.95), transparent 44%),
      radial-gradient(circle at 24% 76%, rgba(244,63,94,.8), transparent 46%),
      conic-gradient(from 160deg at 50% 50%, #f59e0b, #ef4444, #d946ef, #f59e0b),
      linear-gradient(150deg, #431407, #7c2d12)`,
  e: `radial-gradient(circle at 50% 26%, rgba(255,255,255,.9), transparent 40%),
      radial-gradient(circle at 20% 80%, rgba(110,182,255,.9), transparent 50%),
      conic-gradient(from 250deg at 50% 60%, #1d4ed8, #38bdf8, #e0f2fe, #1d4ed8),
      linear-gradient(160deg, #0c2340, #1d4ed8)`,
  f: `radial-gradient(circle at 76% 34%, rgba(134,239,172,.9), transparent 44%),
      radial-gradient(circle at 28% 70%, rgba(56,189,248,.85), transparent 46%),
      conic-gradient(from 20deg at 46% 54%, #065f46, #10b981, #22d3ee, #065f46),
      linear-gradient(150deg, #052e16, #065f46)`,
};

/** `.art::before` — the wet-plastic highlight. Scales with the box, so it bakes. */
const GLOSS = `linear-gradient(178deg, rgba(255,255,255,.34), rgba(255,255,255,.04) 40%, rgba(0,0,0,.18))`;

const NOISE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E" +
  "%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' " +
  "stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)'/%3E%3C/svg%3E";

const page = (body) =>
  `<!doctype html><meta charset="utf-8"><style>
     html,body{margin:0;padding:0;background:transparent}
     .t{position:fixed;inset:0;background-color:#0b1220}
     .g{position:absolute;inset:0;background:${GLOSS}}
   </style>${body}`;

function shot(name, w, h, html) {
  const file = join(TMP, `${name}.html`);
  writeFileSync(file, html);
  execFileSync(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--force-device-scale-factor=1",
      `--window-size=${w},${h}`,
      `--screenshot=${join(OUT, `${name}.png`)}`,
      pathToFileURL(file).href,
    ],
    { stdio: "pipe" },
  );
  console.log(`  ${name}.png  ${w}x${h}`);
}

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

console.log("Rendering artwork with", CHROME);

for (const [key, layers] of Object.entries(ART)) {
  const tile = `<div class="t" style="background-image:${layers.replace(/\s+/g, " ")}"><div class="g"></div></div>`;
  // Square covers dock/track/hero/card/cover; wide matches `.genre .art` at 169x62.
  shot(key, 1024, 1024, page(tile));
  shot(`${key}-wide`, 1024, 376, page(tile));
}

// Grain tile, kept at authored size so runtime tiling matches CSS exactly.
shot("noise", 140, 140, page(`<div style="position:fixed;inset:0;background:url('${NOISE}')"></div>`));

rmSync(TMP, { recursive: true, force: true });
console.log(`\nDone -> ${OUT}`);
