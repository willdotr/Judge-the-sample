// Automated correctness checks for src/sampling.js. Run: node checks/check_sampling.mjs
// Checks only software correctness; it reports no investigation results.
import { readFileSync } from "node:fs";
import {
  parseClinicCsv, trueMean, sampleMean, simpleRandomSample, makeRng, gridPosition,
  systematicSample, systematicRowsWhole, systematicRowsFractional,
  allocateProportional, strataLevels, stratifiedSample, drawSample, STRATA_COLUMNS,
  summarizeEstimates, repeatedSampling, conditionKey, sortedByWeekday, buildChallengeSpecs, WEEKDAYS,
} from "../src/sampling.js";
import { createHash } from "node:crypto";

const results = [];
function check(name, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  (" + detail + ")" : ""}`);
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sum = (a) => a.reduce((x, y) => x + y, 0);
const throws = (f) => { try { f(); return false; } catch { return true; } };

const text = readFileSync(new URL("../data/clinic_visits.csv", import.meta.url), "utf8");
const lineCount = text.trim().split(/\r?\n/).length - 1;
const rows = parseClinicCsv(text);
const N = rows.length;

console.log("-- Data and shared basics --");
check("every data row loaded", N === lineCount && N === 10000, `${N} rows`);
check("target parsed as finite numbers", rows.every((r) => typeof r.wait_time === "number" && Number.isFinite(r.wait_time)));
check("visit_id runs 1..N in file order", rows.every((r, i) => r.visit_id === i + 1));
check("true mean = sum / N over all rows", trueMean(rows) === sum(rows.map((r) => r.wait_time)) / N);
check("grid position matches file order for every row",
  rows.every((r, i) => { const p = gridPosition(r); return p.gridRow * 100 + p.gridCol === i; }));
check("same seed gives the same random sequence", (() => { const a = makeRng(7), b = makeRng(7); return [0, 1, 2, 3, 4].every(() => a() === b()); })());

console.log("-- Simple random sampling --");
for (const n of [1, 10, 100]) {
  const s = simpleRandomSample(N, n, 2026);
  check(`SRS n=${n}: exactly n distinct valid rows`, s.length === n && new Set(s).size === n && s.every((i) => Number.isInteger(i) && i >= 0 && i < N));
}
check("SRS same seed and settings give the same rows", same(simpleRandomSample(N, 100, 2026), simpleRandomSample(N, 100, 2026)));
check("SRS sample mean = average of sampled waits", (() => { const s = simpleRandomSample(N, 100, 2026); return sampleMean(rows, s) === sum(s.map((i) => rows[i].wait_time)) / 100; })());
check("SRS n=N returns every row once", same(simpleRandomSample(50, 50, 1), Array.from({ length: 50 }, (_, i) => i)));
check("SRS rejects n=0 and n>N", throws(() => simpleRandomSample(N, 0, 1)) && throws(() => simpleRandomSample(N, N + 1, 1)));

console.log("-- Systematic sampling --");
check("whole interval known answer (N=10, n=5, k=2, r=1)", same(systematicRowsWhole(10, 5, 1), [0, 2, 4, 6, 8]));
check("whole interval known answer (N=10, n=5, k=2, r=2)", same(systematicRowsWhole(10, 5, 2), [1, 3, 5, 7, 9]));
check("fractional known answer (N=10, n=4, k=2.5, u=1.0)", same(systematicRowsFractional(10, 4, 1.0), [0, 3, 5, 8]));
check("fractional known answer (N=10, n=4, k=2.5, u=2.5)", same(systematicRowsFractional(10, 4, 2.5), [2, 4, 7, 9]));
check("fractional known answer, last row never exceeds N", Math.max(...systematicRowsFractional(10, 4, 2.5)) === 9);
{
  const s = systematicSample(N, 100, 2026);
  check("n=100: whole-number design with k=100", s.design === "whole" && s.k === 100);
  check("n=100: start is in 1..k", Number.isInteger(s.start) && s.start >= 1 && s.start <= 100);
  check("n=100: rows follow r, r+k, r+2k, ... from the start", s.indices.every((v, j) => v === s.start - 1 + j * 100));
}
// Exact enumeration of every start: each row lies in exactly one of the k possible samples.
for (const n of [1, 10, 100]) {
  const k = N / n;
  const count = new Array(N).fill(0);
  for (let r = 1; r <= k; r++) for (const i of systematicRowsWhole(N, n, r)) count[i]++;
  check(`n=${n}: all ${k} starts together cover every row exactly once (equal inclusion probability n/N)`, count.every((c) => c === 1));
}
{
  let allOk = true;
  let fracSeen = false;
  let wholeSeen = false;
  const sizes = [1, 2, 3, 7, 9, 10, 30, 33, 99, 101, 250, 333, 999, 3333, 4999, 5000, 5001, 9999, 10000];
  for (const n of sizes) {
    for (const seed of [1, 2, 3, 2026, 99999]) {
      const s = systematicSample(N, n, seed);
      const ok = s.indices.length === n && new Set(s.indices).size === n &&
        s.indices.every((i) => Number.isInteger(i) && i >= 0 && i < N) &&
        s.indices.every((v, j) => j === 0 || v > s.indices[j - 1]) &&
        (s.design === "whole") === Number.isInteger(N / n);
      if (!ok) { allOk = false; console.log("   problem at n =", n, "seed", seed); }
      if (s.design === "fractional") fracSeen = true; else wholeSeen = true;
    }
  }
  check("systematic: exactly n distinct, increasing, in-range rows for divisors and non-divisors of N", allOk && fracSeen && wholeSeen);
  check("systematic: n=N returns every row", same(systematicSample(N, N, 5).indices, Array.from({ length: N }, (_, i) => i)));
  check("systematic: same seed and settings give the same rows", same(systematicSample(N, 30, 8).indices, systematicSample(N, 30, 8).indices));
  check("systematic: rejects n=0 and n>N", throws(() => systematicSample(N, 0, 1)) && throws(() => systematicSample(N, N + 1, 1)));
  // Extreme starts of the fractional design stay in range.
  let edgeOk = true;
  for (const n of [3, 7, 30, 33, 101]) {
    const k = N / n;
    for (const u of [Number.MIN_VALUE, 1e-9, k / 2, k - 1e-9, k]) {
      const idx = systematicRowsFractional(N, n, u);
      if (new Set(idx).size !== n || idx.some((i) => i < 0 || i >= N)) edgeOk = false;
    }
  }
  check("fractional design: extreme starts u near 0 and u = k stay in 1..N with n distinct rows", edgeOk);
}

console.log("-- Allocation --");
check("allocation known answer [50,30,20], n=10 -> [5,3,2]", same(allocateProportional([50, 30, 20], 10), [5, 3, 2]));
check("allocation known answer [5475,2469,2056], n=100 -> [55,25,20]", same(allocateProportional([5475, 2469, 2056], 100), [55, 25, 20]));
check("allocation enforces at least 1 per stratum ([1,1,98], n=5 -> [1,1,3])", same(allocateProportional([1, 1, 98], 5), [1, 1, 3]));
check("allocation never exceeds stratum size ([2,2,96], n=50)", (() => { const a = allocateProportional([2, 2, 96], 50); return a.every((x, h) => x <= [2, 2, 96][h]) && sum(a) === 50; })());
{
  let ok = true;
  for (const col of STRATA_COLUMNS) {
    const sizes = strataLevels(rows, col).map((s) => s.indices.length);
    const H = sizes.length;
    check(`${col}: strata sizes add to N`, sum(sizes) === N, `${H} strata`);
    for (const n of [H, H + 1, 10, 33, 100, 101, 999, 5000, 9999, 10000].filter((n) => n >= H)) {
      const a = allocateProportional(sizes, n);
      if (sum(a) !== n || !a.every((x, h) => Number.isInteger(x) && x >= 1 && x <= sizes[h])) { ok = false; console.log("   bad allocation", col, n, a); }
    }
    check(`${col}: n below the number of strata is rejected`, throws(() => allocateProportional(sizes, H - 1)));
  }
  check("allocations are whole numbers, >=1, <= stratum size and total exactly n for every column and many n", ok);
}

console.log("-- Stratified sampling --");
for (const col of STRATA_COLUMNS) {
  const H = strataLevels(rows, col).length;
  const n = 100 >= H ? 100 : H;
  const s = stratifiedSample(rows, col, n, 2026);
  const strata = strataLevels(rows, col);
  const chosenOk = strata.every((st, h) => {
    const inStratum = s.indices.filter((i) => rows[i][col] === (col === "slot" ? Number(st.label) : st.label));
    return inStratum.length === s.table[h].allocated;
  });
  check(`stratified on ${col}: n distinct rows, allocation per stratum matches the table`, s.indices.length === n && new Set(s.indices).size === n && chosenOk);
  check(`stratified on ${col}: weights sum to 1`, Math.abs(sum(s.table.map((t) => t.weight)) - 1) < 1e-12);
  check(`stratified on ${col}: estimate = sum of (N_h/N) x stratum sample mean`, (() => {
    let e = 0;
    for (const st of strata) {
      const picked = s.indices.filter((i) => (col === "slot" ? rows[i].slot === Number(st.label) : rows[i][col] === st.label));
      e += (st.indices.length / N) * (sum(picked.map((i) => rows[i].wait_time)) / picked.length);
    }
    return Math.abs(e - s.estimate) < 1e-9;
  })());
  check(`stratified on ${col}: same seed and settings give the same rows and estimate`, (() => {
    const t = stratifiedSample(rows, col, n, 2026);
    return same(s.indices, t.indices) && s.estimate === t.estimate;
  })());
}
check("weekday, n=100: exactly proportional allocation (20 each), so weighted mean = plain sample mean", (() => {
  const s = stratifiedSample(rows, "weekday", 100, 2026);
  return s.table.every((t) => t.allocated === 20) && Math.abs(s.estimate - sampleMean(rows, s.indices)) < 1e-9;
})());
check("visit_type, n=100: reported estimate is the population-weighted mean", (() => {
  const s = stratifiedSample(rows, "visit_type", 100, 2026);
  const w = s.table.reduce((acc, t) => acc + t.weight * t.sampleMean, 0);
  return Math.abs(w - s.estimate) < 1e-9;
})());

console.log("-- App entry point (drawSample) --");
for (const [method, col] of [["srs", "weekday"], ["systematic", "weekday"], ["stratified", "weekday"], ["stratified", "visit_type"], ["stratified", "slot"]]) {
  const a = drawSample(rows, method, 100, 2026, col);
  const b = drawSample(rows, method, 100, 2026, col);
  check(`drawSample ${method}${method === "stratified" ? "/" + col : ""}, n=100: 100 distinct rows and reproducible`,
    a.indices.length === 100 && new Set(a.indices).size === 100 && same(a.indices, b.indices) && a.estimate === b.estimate && !a.blocked);
}
check("drawSample estimate for srs/systematic is the plain sample mean", ["srs", "systematic"].every((m) => {
  const a = drawSample(rows, m, 100, 2026, "weekday");
  return a.estimate === sampleMean(rows, a.indices);
}));
check("weekday strata with n=4 is blocked with a message and no sample", (() => {
  const a = drawSample(rows, "stratified", 4, 2026, "weekday");
  return typeof a.blocked === "string" && a.indices.length === 0 && a.estimate === null;
})());
check("weekday strata with n=5 is allowed (1 row per stratum)", (() => {
  const a = drawSample(rows, "stratified", 5, 2026, "weekday");
  return !a.blocked && a.indices.length === 5 && a.info.table.every((t) => t.allocated === 1);
})());
check("slot strata: n=19 blocked, n=20 allowed", drawSample(rows, "stratified", 19, 1, "slot").blocked !== undefined && drawSample(rows, "stratified", 20, 1, "slot").blocked === undefined);
check("other methods are not blocked at n=1", ["srs", "systematic"].every((m) => drawSample(rows, m, 1, 1, "weekday").indices.length === 1));

console.log("-- Repeated sampling --");
const close = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;
const synth = (values) => values.map((v, i) => ({ visit_id: i + 1, week: 1, weekday: "Mon", slot: 1, visit_type: "A", wait_time: v }));

// Hand calculations on small synthetic populations with known answers.
{
  const s = summarizeEstimates([2, 4, 6], 3);
  check("hand calc: estimates [2,4,6], true mean 3 -> mean 4, bias 1", close(s.meanOfEstimates, 4) && close(s.bias, 1));
  check("hand calc: SD = sqrt(8/3) (divides by the number of estimates)", close(s.sd, Math.sqrt(8 / 3)));
  check("hand calc: RMSE = sqrt(11/3)", close(s.rmse, Math.sqrt(11 / 3)));
  check("RMSE^2 = bias^2 + SD^2 (hand-calc case)", close(s.rmse ** 2, s.bias ** 2 + s.sd ** 2));
  const e = summarizeEstimates([5, 5, 5, 5], 5);
  check("hand calc: identical estimates equal to the true mean -> bias 0, SD 0, RMSE 0", e.bias === 0 && e.sd === 0 && e.rmse === 0);
  const u = summarizeEstimates([7, 7, 7], 5);
  check("hand calc: identical estimates off the true mean -> bias 2, SD 0, RMSE 2", close(u.bias, 2) && u.sd === 0 && close(u.rmse, 2));

  const pop6 = synth([1, 2, 3, 4, 5, 6]); // true mean 3.5
  const ex = repeatedSampling(pop6, { method: "systematic", n: 2, reps: 100, seed: 1 }, { keepSamples: true });
  check("synthetic exact enumeration: N=6, n=2 -> k=3 starts, estimates [2.5, 3.5, 4.5]", ex.type === "exact" && same(ex.estimates, [2.5, 3.5, 4.5]));
  check("synthetic exact: bias 0, SD = sqrt(2/3), RMSE = sqrt(2/3)", close(ex.stats.bias, 0) && close(ex.stats.sd, Math.sqrt(2 / 3)) && close(ex.stats.rmse, Math.sqrt(2 / 3)));
  check("synthetic exact: the 3 starts list each start once and cover each row once",
    same(ex.samples, [[0, 3], [1, 4], [2, 5]]));
  check("exact result has no seed and its count is the number of starts", ex.seed === null && ex.count === 3);
}

// Real population.
const reps100 = repeatedSampling(rows, { method: "srs", n: 10, reps: 100, seed: 2026 }, { keepSamples: true });
check("Monte Carlo: number of estimates equals the repetition count (100)", reps100.estimates.length === 100 && reps100.count === 100 && reps100.samples.length === 100);
check("Monte Carlo SRS n=10: every repetition has 10 distinct valid rows", reps100.samples.every((s) => s.length === 10 && new Set(s).size === 10 && s.every((i) => i >= 0 && i < N)));
check("each estimate is the mean of its own repetition's rows", reps100.samples.every((s, i) => close(sampleMean(rows, s), reps100.estimates[i])));
check("Monte Carlo result carries its seed and type", reps100.type === "Monte Carlo" && reps100.seed === 2026);
{
  const big = repeatedSampling(rows, { method: "srs", n: 100, reps: 1000, seed: 5 });
  check("Monte Carlo: 1,000 repetitions give 1,000 estimates", big.estimates.length === 1000);
  const again = repeatedSampling(rows, { method: "srs", n: 100, reps: 1000, seed: 5 });
  check("same seed and settings reproduce exactly the same estimates and statistics", same(big.estimates, again.estimates) && same(big.stats, again.stats));
  check("RMSE^2 = bias^2 + SD^2 on real repeated samples", close(big.stats.rmse ** 2, big.stats.bias ** 2 + big.stats.sd ** 2, 1e-9));
  check("bias = mean of estimates - true mean", close(big.stats.bias, sum(big.estimates) / 1000 - trueMean(rows), 1e-12));
}
check("repetitions outside 100..1000 are rejected for Monte Carlo", throws(() => repeatedSampling(rows, { method: "srs", n: 10, reps: 99, seed: 1 })) && throws(() => repeatedSampling(rows, { method: "srs", n: 10, reps: 1001, seed: 1 })));
{
  const ex100 = repeatedSampling(rows, { method: "systematic", n: 100, reps: 100, seed: 1 }, { keepSamples: true });
  check("systematic n=100: exact, 100 starts, no seed", ex100.type === "exact" && ex100.count === 100 && ex100.seed === null && ex100.estimates.length === 100);
  check("systematic n=100: starts 1..100 each appear once (first row of sample j is row j)", ex100.samples.every((s, j) => s[0] === j && s.length === 100 && new Set(s).size === 100));
  check("systematic n=100: all starts together cover every row exactly once", (() => {
    const c = new Array(N).fill(0);
    for (const s of ex100.samples) for (const i of s) c[i]++;
    return c.every((v) => v === 1);
  })());
  check("exact result ignores the repetition setting", same(ex100.estimates, repeatedSampling(rows, { method: "systematic", n: 100, reps: 1000, seed: 99 }).estimates));
  check("mean of all exact estimates equals the true mean (every row appears once)", close(ex100.stats.meanOfEstimates, trueMean(rows), 1e-9));
}
{
  const st = repeatedSampling(rows, { method: "stratified", n: 100, reps: 100, seed: 7, strataColumn: "weekday" }, { keepSamples: true });
  check("stratified Monte Carlo: 100 estimates, each repetition 100 distinct rows", st.estimates.length === 100 && st.samples.every((s) => s.length === 100 && new Set(s).size === 100));
  check("stratified repeated sampling is reproducible and carries its column", same(st.estimates, repeatedSampling(rows, { method: "stratified", n: 100, reps: 100, seed: 7, strataColumn: "weekday" }).estimates) && st.strataColumn === "weekday");
  check("stratified repeated sampling with n below the number of strata is rejected", throws(() => repeatedSampling(rows, { method: "stratified", n: 4, reps: 100, seed: 1, strataColumn: "weekday" })));
  const fr = repeatedSampling(rows, { method: "systematic", n: 30, reps: 100, seed: 3 }, { keepSamples: true });
  check("systematic with a fractional interval is Monte Carlo: 100 estimates, 30 distinct rows each", fr.type === "Monte Carlo" && fr.estimates.length === 100 && fr.samples.every((s) => s.length === 30 && new Set(s).size === 30));
}
{
  const srsN1 = repeatedSampling(rows, { method: "srs", n: 1, reps: 100, seed: 11 }, { keepSamples: true });
  check("SRS n=1: 100 repetitions of 1 row, each estimate is that row's wait", srsN1.samples.every((s, i) => s.length === 1 && rows[s[0]].wait_time === srsN1.estimates[i]));
}
check("conditions that differ in any label have different keys (never pooled)", (() => {
  const base = { method: "srs", n: 100, reps: 100, seed: 1 };
  const keys = [
    conditionKey(base, N), conditionKey({ ...base, n: 10 }, N), conditionKey({ ...base, seed: 2 }, N),
    conditionKey({ ...base, reps: 1000 }, N), conditionKey({ ...base, method: "stratified", strataColumn: "weekday" }, N),
    conditionKey({ ...base, method: "stratified", strataColumn: "visit_type" }, N), conditionKey({ ...base, method: "systematic" }, N),
  ];
  return new Set(keys).size === keys.length;
})());
check("identical settings give the same key (so Experiment B can reuse A's SRS n=100)", conditionKey({ method: "srs", n: 100, reps: 100, seed: 1 }, N) === conditionKey({ method: "srs", n: 100, reps: 100, seed: 1 }, N));
check("exact systematic key ignores seed and repetitions", conditionKey({ method: "systematic", n: 100, reps: 100, seed: 1 }, N) === conditionKey({ method: "systematic", n: 100, reps: 500, seed: 9 }, N));

console.log("-- Challenge: modified copy and the four results --");
{
  const csvPath = new URL("../data/clinic_visits.csv", import.meta.url);
  const sha = () => createHash("sha256").update(readFileSync(csvPath)).digest("hex");
  const DOCUMENTED_SHA = "594c0f62bb522b383670661a531410a89ac376311c9a11a8b840110970621980"; // from data/README.md
  const before = sha();
  const snapshot = JSON.stringify(rows);

  const modified = sortedByWeekday(rows);
  const specs = buildChallengeSpecs({ n: 100, reps: 100, seed: 2026 });
  const rowsFor = (p) => (p === "modified" ? modified : rows);
  const four = specs.map((s) => repeatedSampling(rowsFor(s.population), s, { keepSamples: true }));

  check("the CSV on disk matches its documented SHA-256", before === DOCUMENTED_SHA);
  check("the CSV on disk is byte-for-byte unchanged after building the copy and running all four results", sha() === before);
  check("the baseline rows in memory are unchanged by building and sampling the copy", JSON.stringify(rows) === snapshot);
  check("the modified copy is separate (new row objects, same length)", modified.length === rows.length && modified.every((r) => !rows.includes(r)));
  check("the modified copy has exactly the same appointments (each visit_id once)", same([...modified.map((r) => r.visit_id)].sort((a, b) => a - b), rows.map((r) => r.visit_id)));
  check("the modified copy keeps every row's values", modified.every((r) => same(r, rows[r.visit_id - 1])));
  check("modified copy: weekdays are contiguous blocks Mon..Fri of 2,000 rows",
    WEEKDAYS.every((d, k) => modified.slice(k * 2000, (k + 1) * 2000).every((r) => r.weekday === d)));
  check("modified copy: original order kept within each weekday (stable sort)",
    WEEKDAYS.every((_, k) => { const block = modified.slice(k * 2000, (k + 1) * 2000); return block.every((r, i) => i === 0 || r.visit_id > block[i - 1].visit_id); }));
  check("the modified copy really is a different order from the baseline", modified.some((r, i) => r.visit_id !== i + 1));

  // True means.
  const sumOf = (rs) => rs.reduce((a, r) => a + r.wait_time, 0);
  check("modified true mean equals the mean of the modified rows (sum / N)", close(trueMean(modified), sumOf(modified) / modified.length, 1e-12));
  check("reordering alone leaves the true mean unchanged (the same sum, N and mean)", sumOf(modified) === sumOf(rows) && close(trueMean(modified), trueMean(rows), 1e-9));
  check("each result is judged against its own population's recalculated true mean",
    four.every((r, i) => close(r.trueMean, trueMean(rowsFor(specs[i].population)), 1e-12) && close(r.stats.bias, r.stats.meanOfEstimates - r.trueMean, 1e-12)));
  check("changing a value changes the recalculated true mean (and it equals the new rows' mean)", (() => {
    const changed = modified.map((r, i) => (i === 0 ? { ...r, wait_time: r.wait_time + 10 } : r));
    return close(trueMean(changed), trueMean(modified) + 10 / N, 1e-9) && close(trueMean(changed), sumOf(changed) / N, 1e-12);
  })());
  check("changing membership changes N and the recalculated true mean", (() => {
    const fewer = modified.slice(0, 9999);
    return fewer.length === 9999 && close(trueMean(fewer), sumOf(fewer) / 9999, 1e-12);
  })());

  // The four results.
  check("four results: simple random and systematic, each on baseline and modified, in that order",
    same(specs.map((s) => `${s.method}/${s.population}`), ["srs/baseline", "srs/modified", "systematic/baseline", "systematic/modified"]));
  check("all four results use the same total n, repetitions and seed", specs.every((s) => s.n === 100 && s.reps === 100 && s.seed === 2026) && four.every((r) => r.n === 100));
  check("every Monte Carlo repetition has n distinct valid rows and the estimate count equals the repetitions",
    four.filter((r) => r.type === "Monte Carlo").every((r) => r.estimates.length === 100 && r.samples.every((s) => s.length === 100 && new Set(s).size === 100 && s.every((i) => i >= 0 && i < N))));
  check("every result is labelled with its population, and the labels differ", four.map((r) => r.population).join() === "baseline,modified,baseline,modified");
  check("results with different populations have different keys (never pooled)", new Set(specs.map((s) => conditionKey(s, N))).size === 4);

  // Systematic design re-checked on the modified population.
  const sysMod = four[3];
  check("systematic on the modified copy, n=100: exact, 100 starts, no seed", sysMod.type === "exact" && sysMod.count === 100 && sysMod.seed === null);
  check("systematic on the modified copy: each start listed once, rows follow the interval, and all starts cover every row once", (() => {
    const c = new Array(N).fill(0);
    for (const s of sysMod.samples) for (const i of s) c[i]++;
    return sysMod.samples.every((s, j) => s[0] === j && s.every((v, t) => v === j + t * 100)) && c.every((v) => v === 1);
  })());
  check("systematic on the modified copy selects by position in the SORTED order (differs from baseline's rows)",
    sysMod.samples.some((s, j) => s.some((i, t) => modified[i].visit_id !== rows[four[2].samples[j][t]].visit_id)));
  {
    const sysMod30 = repeatedSampling(modified, { method: "systematic", population: "modified", n: 30, reps: 100, seed: 4 }, { keepSamples: true });
    check("systematic on the modified copy with a non-whole interval (n=30) is Monte Carlo with n distinct rows", sysMod30.type === "Monte Carlo" && sysMod30.samples.every((s) => s.length === 30 && new Set(s).size === 30));
    const pop7 = synth([1, 2, 3, 4, 5, 6, 7]);
    const pop6b = synth([1, 2, 3, 4, 5, 6]);
    check("design is re-chosen from the population's own N (N=6, n=2 exact; N=7, n=2 Monte Carlo)",
      repeatedSampling(pop6b, { method: "systematic", n: 2, reps: 100, seed: 1 }).type === "exact" &&
      repeatedSampling(pop7, { method: "systematic", n: 2, reps: 100, seed: 1 }).type === "Monte Carlo");
    check("a smaller population drawn from the modified copy re-checks its design (N=9999, n=100 is not a whole interval)",
      repeatedSampling(modified.slice(0, 9999), { method: "systematic", n: 100, reps: 100, seed: 1 }).type === "Monte Carlo");
  }

  // Simple random on the copy.
  check("simple random ignores row order: the same seed picks the same positions on both populations", same(four[0].samples, four[1].samples));
  check("...but those positions hold different appointments on the modified copy", four[1].samples.some((s, j) => s.some((i, t) => modified[i].visit_id !== rows[four[0].samples[j][t]].visit_id)));

  // Reproducibility and identities.
  const again = specs.map((s) => repeatedSampling(rowsFor(s.population), s));
  check("the same seed and settings reproduce the same numbers for all four results", four.every((r, i) => same(r.estimates, again[i].estimates) && same(r.stats, again[i].stats)));
  check("RMSE^2 = bias^2 + SD^2 for all four results", four.every((r) => close(r.stats.rmse ** 2, r.stats.bias ** 2 + r.stats.sd ** 2, 1e-9)));
  check("1,000 repetitions on the modified copy give 1,000 estimates", repeatedSampling(modified, { method: "srs", population: "modified", n: 100, reps: 1000, seed: 9 }).estimates.length === 1000);
  check("a different total n applies to all four at once (n=250: same n everywhere, systematic exact with k=40)", (() => {
    const s = buildChallengeSpecs({ n: 250, reps: 100, seed: 3 });
    const r = s.map((x) => repeatedSampling(rowsFor(x.population), x));
    return s.every((x) => x.n === 250) && r.every((x) => x.n === 250) && r[2].type === "exact" && r[2].count === 40 && r[3].count === 40;
  })());
  check("the CSV on disk is still unchanged at the end", sha() === before);
}

const failed = results.filter((x) => !x).length;
console.log(failed === 0 ? `\nAll ${results.length} checks passed.` : `\n${failed} check(s) FAILED.`);
process.exit(failed === 0 ? 0 : 1);
