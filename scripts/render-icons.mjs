/**
 * Derives every platform icon from the one master logo.
 *
 *   node scripts/render-icons.mjs
 *
 * Source of truth is assets/brand/luna-logo.png. Re-run this after changing it
 * rather than hand-editing anything in assets/images/ — the six outputs below
 * are all generated and will be overwritten.
 *
 * Same headless-Chrome technique as render-art.mjs: no image dependency to
 * install, and the browser does better resampling than a hand-rolled scaler.
 *
 * Each output has a different job:
 *
 *   icon.png          Scaled past the frame and cropped, so the artwork runs
 *                     edge to edge. iOS and Android draw their own mask; a logo
 *                     that keeps its own rounded corners ends up double-rounded,
 *                     with the platform's mask cutting a second, tighter curve.
 *
 *   android-icon-*    Adaptive icons are composited from a background and a
 *                     foreground and then masked to whatever shape the launcher
 *                     uses. Only the middle 66% is guaranteed visible, so the
 *                     foreground is inset to that safe zone.
 *
 *   monochrome        Themed icons (Android 13+) take a silhouette and recolour
 *                     it. Derived by keeping only the near-white, low-saturation
 *                     pixels, which is the note and its highlight.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const SRC = resolve('assets/brand/luna-logo.png');
const OUT = resolve('assets/images');
const TMP = join(tmpdir(), 'luna-icon-render');

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));

if (!CHROME) {
  console.error('No Chrome or Edge found. Install one, or point CHROME at a binary.');
  process.exit(1);
}
if (!existsSync(SRC)) {
  console.error(`Missing ${SRC}`);
  process.exit(1);
}

const SRC_URL = pathToFileURL(SRC).href;

/** Deep end of the logo's own ramp, for the adaptive background. */
const BG_FROM = '#3f86ee';
const BG_TO = '#12327c';

const page = (body, extraCss = '') =>
  `<!doctype html><meta charset="utf-8"><style>
     html,body{margin:0;padding:0;background:transparent;overflow:hidden}
     img,canvas{display:block}
     ${extraCss}
   </style>${body}`;

/**
 * `scale` > 1 crops: the image is drawn larger than the frame and the overflow
 * is clipped, which is how the artwork reaches the edges.
 *
 * Everything is positioned in absolute pixels from the document origin, never
 * with percentages or `inset: 0`.
 *
 * Chrome will not open a window below roughly 500x375 on Windows, so for the
 * smaller outputs the viewport is bigger than `--window-size` asks for. The
 * screenshot is still cropped to the requested size from the top-left, so
 * anything centred with `top: 50%` lands off in the middle of a viewport that
 * is not the frame being captured — which silently produced a 192px brand mark
 * containing one sliver of the logo's left edge.
 */
const at = (size, scale) => {
  const drawn = Math.round(size * scale);
  const offset = Math.round((size - drawn) / 2);
  return { drawn, offset };
};

const plain = (size, scale) => {
  const { drawn, offset } = at(size, scale);
  return page(
    `<img src="${SRC_URL}" width="${drawn}" height="${drawn}">`,
    `img{position:absolute;left:${offset}px;top:${offset}px}`,
  );
};

/**
 * Same, over an opaque ramp. The logo's own corners stay rounded no matter how
 * far it is scaled, and iOS forbids alpha in an app icon — it flattens what is
 * left to black. Painting the ramp behind fills the corners with the colour
 * they should have been.
 */
const bleed = (size, scale) => {
  const { drawn, offset } = at(size, scale);
  return page(
    `<div class="g"></div>
     <img src="${SRC_URL}" width="${drawn}" height="${drawn}">`,
    `.g{position:absolute;left:0;top:0;width:${size}px;height:${size}px;
        background:linear-gradient(160deg,${BG_FROM},${BG_TO})}
     img{position:absolute;left:${offset}px;top:${offset}px}`,
  );
};

const gradient = (size) =>
  page(
    `<div class="g"></div>`,
    `.g{position:absolute;left:0;top:0;width:${size}px;height:${size}px;
        background:linear-gradient(160deg,${BG_FROM},${BG_TO})}`,
  );

/**
 * Keep pixels that are bright and close to neutral — the white note reads as
 * ~#f5f8ff, while the blue field keeps a wide channel spread even where it is
 * lightest. Everything kept is flattened to opaque white.
 *
 * Two things also pass that test and are not the note: the bright rim around
 * the squircle, and the gloss arc across the top. Both live outside the middle
 * of the frame, so the crop below discards them before the threshold runs.
 * Numbers are fractions of the frame, measured against the note's own bounds
 * (roughly 27%–76% across, 19%–76% down).
 */
const KEEP = { x0: 0.14, x1: 0.86, y0: 0.15, y1: 0.86 };

/** Fraction of the frame the extracted note should span. Inside Android's 66%
 *  safe zone, with room so the glyph is not touching the crop. */
const NOTE_SPAN = 0.55;

/**
 * Lifts the note off the blue and recentres it.
 *
 * @param white flatten to a solid silhouette (themed icons) rather than keeping
 *              the original shading (adaptive foreground).
 *
 * The note is found by threshold, its bounding box measured, then that box is
 * scaled to `NOTE_SPAN` and centred — so the glyph is optically centred in the
 * output rather than inheriting wherever it happened to sit in the source.
 */
const note = (size, white) =>
  page(
    `<canvas id="c" width="${size}" height="${size}"></canvas>
     <script>
       const img = new Image();
       img.onload = () => {
         const N = ${size};
         const K = ${JSON.stringify(KEEP)};

         const off = document.createElement('canvas');
         off.width = N; off.height = N;
         const ox = off.getContext('2d', { willReadFrequently: true });
         ox.drawImage(img, 0, 0, N, N);

         const d = ox.getImageData(0, 0, N, N);
         const p = d.data;
         let minX = N, minY = N, maxX = 0, maxY = 0, found = false;

         for (let i = 0; i < p.length; i += 4) {
           const px = (i / 4) % N, py = Math.floor((i / 4) / N);
           const inside =
             px > K.x0 * N && px < K.x1 * N && py > K.y0 * N && py < K.y1 * N;
           const r = p[i], g = p[i + 1], b = p[i + 2], a = p[i + 3];
           const min = Math.min(r, g, b);
           const spread = Math.max(r, g, b) - min;

           // Ramps rather than a hard cut. A binary test leaves the glyph edge
           // aliased, which is very visible on a curved stem at icon sizes;
           // grading the alpha across the transition antialiases it for free.
           const bright = Math.min(1, Math.max(0, (min - 208) / 32));
           const neutral = Math.min(1, Math.max(0, (34 - spread) / 18));
           const alpha = inside && a > 40 ? bright * neutral : 0;

           if (alpha > 0.5) {
             if (px < minX) minX = px;
             if (px > maxX) maxX = px;
             if (py < minY) minY = py;
             if (py > maxY) maxY = py;
             found = true;
           }
           ${white ? 'p[i] = p[i + 1] = p[i + 2] = 255;' : ''}
           p[i + 3] = Math.round(alpha * 255);
         }
         ox.putImageData(d, 0, 0);

         if (found) {
           const w = maxX - minX + 1, h = maxY - minY + 1;
           const scale = Math.min((N * ${NOTE_SPAN}) / w, (N * ${NOTE_SPAN}) / h);
           const dw = w * scale, dh = h * scale;
           const x = document.getElementById('c').getContext('2d');
           x.drawImage(off, minX, minY, w, h, (N - dw) / 2, (N - dh) / 2, dw, dh);
         }
         document.title = 'ready';
       };
       img.src = ${JSON.stringify(SRC_URL)};
     <\/script>`,
  );

function shot(name, size, html) {
  const file = join(TMP, `${name}.html`);
  writeFileSync(file, html);
  execFileSync(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      // Canvas reads pixels back from a file:// image, which is cross-origin
      // without this and would throw a security error instead of drawing.
      '--allow-file-access-from-files',
      // Without this the screenshot is composited onto opaque white and every
      // transparent corner comes out solid.
      '--default-background-color=00000000',
      '--virtual-time-budget=4000',
      `--window-size=${size},${size}`,
      `--screenshot=${join(OUT, `${name}.png`)}`,
      pathToFileURL(file).href,
    ],
    { stdio: 'pipe' },
  );
  console.log(`  ${name}.png  ${size}x${size}`);
}

mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

console.log('Rendering icons from', SRC);

// Bleed past the frame, over a matching ramp so the corners are never empty.
shot('icon', 1024, bleed(1024, 1.14));

// Adaptive icons composite foreground over background, then mask. The note
// alone is the foreground; the ramp it used to sit on becomes the background.
shot('android-icon-foreground', 1024, note(1024, false));
shot('android-icon-background', 1024, gradient(1024));
shot('android-icon-monochrome', 1024, note(1024, true));

// Splash is drawn at 200px wide (app.json); render larger and let it scale down.
shot('splash-icon', 512, plain(512, 1));
shot('favicon', 64, plain(64, 1));

// In-app brand mark. The master is ~2 MB, which is absurd to ship for a 27dp
// orb in the app bar; 192px still covers it at 3x.
shot('brand-mark', 192, plain(192, 1));

rmSync(TMP, { recursive: true, force: true });
console.log(`\nDone -> ${OUT}`);
