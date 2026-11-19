// EXTRAS: green-screen keying maths, shared by the shader and the "is the screen covered yet?" probe.
// Pure JavaScript with no imports, so it also runs under Node for the automated checks.

// How strongly a pixel must be "more green than red or blue" to be removed.
// Below KEY_LOW the pixel is kept fully; above KEY_HIGH it is removed fully; in between it fades.
// Tuning: green still showing -> lower both a little. Parts of the picture vanishing -> raise both a little.
export const KEY_LOW = 0.12;
export const KEY_HIGH = 0.3;

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// r, g, b are 0..1. Returns opacity 0 (pure green screen) to 1 (keep).
export function keyAlpha(r, g, b) {
  const greenness = g - Math.max(r, b);
  return 1 - smoothstep(KEY_LOW, KEY_HIGH, greenness);
}

// Average opacity (0..1) of an RGBA byte array such as ImageData.data: 1 means the frame covers everything.
export function coverageOf(rgba) {
  const n = rgba.length / 4;
  let sum = 0;
  for (let i = 0; i < rgba.length; i += 4) sum += keyAlpha(rgba[i] / 255, rgba[i + 1] / 255, rgba[i + 2] / 255);
  return sum / n;
}
