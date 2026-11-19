// Checks the black-background cut-out in src/silhouetteKey.js. Run: node checks/check_silhouette.mjs
import { createSilhouetteKey, BLACK_MAX, EDGE_SOFT } from "../src/silhouetteKey.js";

const results = [];
const check = (name, ok) => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); };

// Build a w x h picture from rows of characters: "." black, "#" white, "g" mid grey (hair), "d" very dark grey.
function picture(rows) {
  const h = rows.length;
  const w = rows[0].length;
  const rgba = new Uint8ClampedArray(w * h * 4);
  const value = { ".": 0, "#": 255, g: 90, d: 40 };
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const v = value[ch];
    const i = (y * w + x) * 4;
    rgba[i] = rgba[i + 1] = rgba[i + 2] = v;
    rgba[i + 3] = 255;
  }));
  return { rgba, w, h };
}
const alphaAt = (p, x, y) => p.rgba[(y * p.w + x) * 4 + 3];
const run = (rows) => { const p = picture(rows); createSilhouetteKey(p.w, p.h)(p.rgba); return p; };

// A white ring with a black hole in the middle (the hole is enclosed).
const ring = run([
  "...........",
  "...#####...",
  "...#...#...",
  "...#...#...",
  "...#####...",
  "...........",
]);
check("black background connected to the edge is removed", alphaAt(ring, 0, 0) === 0 && alphaAt(ring, 10, 5) === 0 && alphaAt(ring, 1, 3) === 0);
check("the character's own white pixels stay solid", alphaAt(ring, 5, 1) === 255 && alphaAt(ring, 3, 3) === 255);
check("black ENCLOSED inside the character stays solid (no hole punched)", alphaAt(ring, 5, 2) === 255 && alphaAt(ring, 4, 3) === 255);

// The same ring with a gap in it: the hole now connects to the outside, so it is background.
const gap = run([
  "...........",
  "...#####...",
  "...#...#...",
  "...#.......",
  "...#####...",
  "...........",
]);
check("black that connects to the outside through a gap is removed", alphaAt(gap, 5, 2) === 0 && alphaAt(gap, 4, 3) === 0);

// Dark grey parts of the character (above the black threshold) are never removed, even next to the background.
const hair = run([
  ".........",
  "..ggggg..",
  "..ggggg..",
  ".........",
]);
check("mid-grey character pixels are kept even right at the edge", alphaAt(hair, 2, 1) > 200 && alphaAt(hair, 6, 2) > 200);
check("an all-black picture becomes fully transparent", (() => { const p = run(["....", "....", "...."]); return [0, 1, 2, 3].every((x) => alphaAt(p, x, 1) === 0); })());
check("a picture with no black at the edge is fully opaque", (() => { const p = run(["###", "#.#", "###"]); return [0, 1, 2].every((x) => alphaAt(p, x, 1) === 255); })());

// Soft edge: a pixel just brighter than black, touching the background, is only partly opaque.
check("a near-black pixel touching the background is partly transparent (soft edge)", (() => {
  const w = 5, h = 3;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgba[i * 4 + 3] = 255; }
  const mid = (1 * w + 2) * 4;
  const v = Math.round(255 * BLACK_MAX * ((1 + EDGE_SOFT) / 2)); // between the two soft-edge limits
  rgba[mid] = rgba[mid + 1] = rgba[mid + 2] = v;
  createSilhouetteKey(w, h)(rgba);
  const a = rgba[mid + 3];
  return a > 0 && a < 255;
})());

// The keyer can be reused frame after frame with the same result.
check("calling it again on the same picture gives the same result (reusable buffers)", (() => {
  const a = picture(["...........", "...#####...", "...#...#...", "...#####...", "..........."]);
  const b = picture(["...........", "...#####...", "...#...#...", "...#####...", "..........."]);
  const keyer = createSilhouetteKey(a.w, a.h);
  keyer(a.rgba);
  keyer(b.rgba);
  keyer(b.rgba);
  return a.rgba.every((v, i) => v === b.rgba[i]);
})());

const failed = results.filter((x) => !x).length;
console.log(failed === 0 ? `\nAll ${results.length} checks passed.` : `\n${failed} check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
