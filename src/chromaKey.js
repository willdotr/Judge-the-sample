// EXTRAS: keying maths (which parts of a clip are see-through), shared by the shader and the
// "is the screen covered yet?" probe. Pure JavaScript with no imports, so it also runs under Node for the
// automated checks.
//
// Two modes:
//   "green" (default)  the green screen is removed.
//   "black"            near-black is removed instead (used for the Challenge clip, where the red shattering glass
//                      zooms into black and the black is the page underneath).

// GREEN: how strongly a pixel must be "more green than red or blue" to be removed.
// Below KEY_LOW the pixel is kept fully; above KEY_HIGH it is removed fully; in between it fades.
// Tuning: green still showing -> lower both a little. Parts of the picture vanishing -> raise both a little.
export const KEY_LOW = 0.12;
export const KEY_HIGH = 0.3;

// BLACK: how bright a pixel's brightest colour channel must be to be kept.
// At or below BLACK_LOW the pixel is removed fully; at or above BLACK_HIGH it is kept fully; in between it fades.
// Tuning: dark parts of the glass still showing as black -> raise both a little.
//         the red glass looks eaten or too see-through -> lower both a little.
export const BLACK_LOW = 0.05;
export const BLACK_HIGH = 0.2;

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// r, g, b are 0..1. Returns opacity 0 (pure green screen) to 1 (keep).
export function keyAlpha(r, g, b) {
  const greenness = g - Math.max(r, b);
  return 1 - smoothstep(KEY_LOW, KEY_HIGH, greenness);
}

// r, g, b are 0..1. Returns opacity 0 (black) to 1 (keep).
export function blackAlpha(r, g, b) {
  return smoothstep(BLACK_LOW, BLACK_HIGH, Math.max(r, g, b));
}

// Opacity of a pixel for the given mode ("green" or "black").
export function alphaFor(mode, r, g, b) {
  return mode === "black" ? blackAlpha(r, g, b) : keyAlpha(r, g, b);
}

// Average opacity (0..1) of an RGBA byte array such as ImageData.data: 1 means the frame covers everything.
export function coverageOf(rgba, mode = "green") {
  const n = rgba.length / 4;
  let sum = 0;
  for (let i = 0; i < rgba.length; i += 4) sum += alphaFor(mode, rgba[i] / 255, rgba[i + 1] / 255, rgba[i + 2] / 255);
  return sum / n;
}

// How much of a video's width and height are visible when it is stretched to COVER a screen (the same crop as
// CSS object-fit: cover). Returns [scaleX, scaleY]: multiply the distance from the screen centre by this to find
// where to look in the video. Used by the shatter mode, which draws the clip across the whole screen.
export function coverScale(screenW, screenH, videoW, videoH) {
  const screenAspect = screenW / screenH;
  const videoAspect = videoW / videoH;
  return screenAspect > videoAspect ? [1, videoAspect / screenAspect] : [screenAspect / videoAspect, 1];
}
