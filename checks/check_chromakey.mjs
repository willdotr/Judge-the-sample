// Checks the green-screen keying maths in src/chromaKey.js. Run: node checks/check_chromakey.mjs
import { keyAlpha, blackAlpha, alphaFor, coverageOf, coverScale, KEY_LOW, KEY_HIGH, BLACK_LOW, BLACK_HIGH } from "../src/chromaKey.js";

const results = [];
const check = (name, ok) => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); };
const px = (r, g, b) => [r, g, b, 255];

check("pure green (0,255,0) is fully removed", keyAlpha(0, 1, 0) === 0);
check("studio green (30,200,60) is removed", keyAlpha(30 / 255, 200 / 255, 60 / 255) < 0.05);
check("red, white, black and blue are fully kept", [[1, 0, 0], [1, 1, 1], [0, 0, 0], [0, 0, 1], [0.9, 0.1, 0.1]].every(([r, g, b]) => keyAlpha(r, g, b) === 1));
check("grey and a warm yellow are kept", keyAlpha(0.5, 0.5, 0.5) === 1 && keyAlpha(0.9, 0.9, 0.2) === 1);
check("a slightly greenish pixel is partly kept (soft edge)", (() => { const a = keyAlpha(0.3, 0.3 + (KEY_LOW + KEY_HIGH) / 2, 0.3); return a > 0 && a < 1; })());
check("opacity never leaves 0..1", Array.from({ length: 200 }, (_, i) => keyAlpha(Math.random(), Math.random(), Math.random())).every((a) => a >= 0 && a <= 1));
check("a frame of only green screen has coverage 0", coverageOf(new Uint8ClampedArray([...px(0, 255, 0), ...px(10, 220, 20)])) < 0.02);
check("a frame of only red has coverage 1", coverageOf(new Uint8ClampedArray([...px(230, 0, 18), ...px(230, 0, 18)])) === 1);
check("half green, half red has coverage 0.5", Math.abs(coverageOf(new Uint8ClampedArray([...px(0, 255, 0), ...px(230, 0, 18)])) - 0.5) < 0.01);
check("key thresholds are ordered and inside 0..1", 0 < KEY_LOW && KEY_LOW < KEY_HIGH && KEY_HIGH < 1);

// Black keying (used for the Challenge clip: red glass zooming into black, where black is the page underneath).
check("black mode: pure black is fully removed", blackAlpha(0, 0, 0) === 0);
check("black mode: near-black (8,8,8) is removed", blackAlpha(8 / 255, 8 / 255, 8 / 255) === 0);
check("black mode: bright red (230,0,18) is fully kept", blackAlpha(230 / 255, 0, 18 / 255) === 1);
check("black mode: dark red glass (80,0,0) is kept", blackAlpha(80 / 255, 0, 0) === 1);
check("black mode: white and green are kept (green is not removed in this mode)", blackAlpha(1, 1, 1) === 1 && blackAlpha(0, 1, 0) === 1);
check("black mode: a very dark red fades (soft edge)", (() => { const a = blackAlpha((BLACK_LOW + BLACK_HIGH) / 2, 0, 0); return a > 0 && a < 1; })());
check("black thresholds are ordered and inside 0..1", 0 < BLACK_LOW && BLACK_LOW < BLACK_HIGH && BLACK_HIGH < 1);
check("alphaFor picks the right mode", alphaFor("black", 0, 0, 0) === 0 && alphaFor("green", 0, 0, 0) === 1 && alphaFor("green", 0, 1, 0) === 0 && alphaFor("black", 0, 1, 0) === 1);
check("black mode coverage: an all-black frame is 0, an all-red frame is 1, half and half is 0.5",
  coverageOf(new Uint8ClampedArray([...px(0, 0, 0), ...px(0, 0, 0)]), "black") === 0 &&
  coverageOf(new Uint8ClampedArray([...px(230, 0, 18), ...px(230, 0, 18)]), "black") === 1 &&
  Math.abs(coverageOf(new Uint8ClampedArray([...px(0, 0, 0), ...px(230, 0, 18)]), "black") - 0.5) < 0.01);
check("default coverage mode is still green", coverageOf(new Uint8ClampedArray([...px(0, 255, 0), ...px(230, 0, 18)])) < 0.51);

// Shatter mode: lining the clip up with the screen (same crop as CSS object-fit: cover).
const near = (a, b) => Math.abs(a - b) < 1e-9;
check("coverScale: a screen wider than the video crops the video's height", (() => { const [x, y] = coverScale(1920, 800, 1280, 720); return x === 1 && near(y, (1280 / 720) / (1920 / 800)) && y < 1; })());
check("coverScale: a screen narrower than the video crops the video's width", (() => { const [x, y] = coverScale(1000, 1000, 1280, 720); return y === 1 && near(x, 1 / (1280 / 720)) && x < 1; })());
check("coverScale: a screen with the video's own shape shows all of it", (() => { const [x, y] = coverScale(1280, 720, 640, 360); return x === 1 && y === 1; })());
check("coverScale: never shows more than the whole video", [[1366, 768], [1920, 1080], [900, 1600], [500, 500]].every(([w, h]) => { const [x, y] = coverScale(w, h, 1280, 720); return x <= 1 && y <= 1 && (x === 1 || y === 1); }));

const failed = results.filter((x) => !x).length;
console.log(failed === 0 ? `\nAll ${results.length} checks passed.` : `\n${failed} check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
