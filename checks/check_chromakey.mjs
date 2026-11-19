// Checks the green-screen keying maths in src/chromaKey.js. Run: node checks/check_chromakey.mjs
import { keyAlpha, coverageOf, KEY_LOW, KEY_HIGH } from "../src/chromaKey.js";

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

const failed = results.filter((x) => !x).length;
console.log(failed === 0 ? `\nAll ${results.length} checks passed.` : `\n${failed} check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
