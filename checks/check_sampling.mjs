// Automated correctness checks for src/sampling.js. Run: node checks/check_sampling.mjs
// Checks only software correctness; it reports no investigation results.
import { readFileSync } from "node:fs";
import {
  parseClinicCsv, trueMean, sampleMean, simpleRandomSample, makeRng, gridPosition, WEEKDAYS,
} from "../src/sampling.js";

const results = [];
function check(name, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
}

const text = readFileSync(new URL("../data/clinic_visits.csv", import.meta.url), "utf8");
const lineCount = text.trim().split(/\r?\n/).length - 1;
const rows = parseClinicCsv(text);
const N = rows.length;

check("every data row loaded", N === lineCount && N === 10000, `${N} rows`);
check("target parsed as finite numbers", rows.every((r) => typeof r.wait_time === "number" && Number.isFinite(r.wait_time)));
check("visit_id runs 1..N in file order", rows.every((r, i) => r.visit_id === i + 1));

let sum = 0;
for (const r of rows) sum += r.wait_time;
check("true mean = sum / N over all rows", trueMean(rows) === sum / N, `sum ${sum}`);

check("grid position matches file order for every row",
  rows.every((r, i) => { const p = gridPosition(r); return p.gridRow * 100 + p.gridCol === i; }));
check("weekdays are all valid", rows.every((r) => WEEKDAYS.includes(r.weekday)));

const s1 = simpleRandomSample(N, 100, 2026);
check("sample has exactly 100 rows", s1.length === 100);
check("sample has 100 distinct rows", new Set(s1).size === 100);
check("sample indices are valid rows", s1.every((i) => Number.isInteger(i) && i >= 0 && i < N));
const s2 = simpleRandomSample(N, 100, 2026);
check("same seed and settings give the same rows", JSON.stringify(s1) === JSON.stringify(s2));
const r1 = makeRng(7), r2 = makeRng(7);
check("same seed gives the same random sequence", [0, 1, 2, 3, 4].every(() => r1() === r2()));

let m = 0;
for (const i of s1) m += rows[i].wait_time;
check("sample mean = average of the 100 sampled waits", sampleMean(rows, s1) === m / 100);
check("n = N sample is the whole population", simpleRandomSample(50, 50, 1).length === 50
  && new Set(simpleRandomSample(50, 50, 1)).size === 50);
check("invalid n is rejected", (() => { try { simpleRandomSample(N, 0, 1); return false; } catch { return true; } })());

const failed = results.filter((x) => !x).length;
console.log(failed === 0 ? `\nAll ${results.length} checks passed.` : `\n${failed} check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
