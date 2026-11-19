// Checks the leading-silence finder in src/audioTrim.js. Run: node checks/check_audiotrim.mjs
import { leadingSilenceSeconds, leadingSilenceOfChannels } from "../src/audioTrim.js";

const results = [];
const check = (name, ok) => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); };
const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;
const rate = 1000; // 1000 samples per second makes the numbers easy to read

const tone = (silent, loud) => Float32Array.from([...Array(silent).fill(0), ...Array(loud).fill(0.5)]);

check("100 silent samples at 1000 Hz, keeping 3 ms: skips 0.097 s", near(leadingSilenceSeconds(tone(100, 50), rate), 0.097));
check("a sound that starts straight away skips nothing", leadingSilenceSeconds(tone(0, 50), rate) === 0);
check("a sound starting within the kept lead-in skips nothing (never negative)", leadingSilenceSeconds(tone(2, 50), rate) === 0);
check("an all-silent clip is left alone", leadingSilenceSeconds(new Float32Array(500), rate) === 0);
check("an empty clip is left alone", leadingSilenceSeconds(new Float32Array(0), rate) === 0);
check("quiet noise below the threshold counts as silence", (() => { const a = Float32Array.from([...Array(80).fill(0.005), ...Array(50).fill(0.5)]); return near(leadingSilenceSeconds(a, rate), 0.077); })());
check("never skips more than the maximum (0.6 s by default)", near(leadingSilenceSeconds(tone(900, 50), rate), 0.6));
check("a custom maximum is respected", near(leadingSilenceSeconds(tone(900, 50), rate, 0.01, 0.003, 0.2), 0.2));
check("with two channels the earliest sound wins", near(leadingSilenceOfChannels([tone(200, 50), tone(50, 50)], rate), 0.047));
check("a silent channel does not make the skip zero", near(leadingSilenceOfChannels([new Float32Array(300), tone(120, 50)], rate), 0.117));
check("all channels silent: skips nothing", leadingSilenceOfChannels([new Float32Array(10), new Float32Array(10)], rate) === 0);

const failed = results.filter((x) => !x).length;
console.log(failed === 0 ? `\nAll ${results.length} checks passed.` : `\n${failed} check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
