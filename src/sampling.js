// Shared calculation module. Every display calls these functions, so a chart can never
// silently change how the true mean or a sample estimate is computed.
// Pure JavaScript with no imports, so it also runs under Node for the automated checks.

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
export const SLOTS_PER_DAY = 20;
export const STRATA_COLUMNS = ["weekday", "visit_type", "slot"];

// Parse clinic_visits.csv text into rows. The target (wait_time) is parsed as a number.
// Throws if a row is malformed, so a bad file never silently becomes NaN.
export function parseClinicCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const cols = header.split(",");
  const need = ["visit_id", "week", "weekday", "slot", "visit_type", "wait_time"];
  for (const c of need) {
    if (!cols.includes(c)) throw new Error(`Missing column: ${c}`);
  }
  return lines.map((line, i) => {
    const v = line.split(",");
    const rec = Object.fromEntries(cols.map((c, k) => [c, v[k]]));
    const row = {
      visit_id: Number(rec.visit_id),
      week: Number(rec.week),
      weekday: rec.weekday,
      slot: Number(rec.slot),
      visit_type: rec.visit_type,
      wait_time: Number(rec.wait_time),
    };
    if (
      [row.visit_id, row.week, row.slot, row.wait_time].some((x) => !Number.isFinite(x)) ||
      !WEEKDAYS.includes(row.weekday)
    ) {
      throw new Error(`Malformed row ${i + 1}: ${line}`);
    }
    return row;
  });
}

// True population mean of the target over ALL rows.
export function trueMean(rows) {
  let sum = 0;
  for (const r of rows) sum += r.wait_time;
  return sum / rows.length;
}

// Mean of the target over the rows at the given indices.
export function sampleMean(rows, indices) {
  let sum = 0;
  for (const i of indices) sum += rows[i].wait_time;
  return sum / indices.length;
}

// Seedable random number generator (mulberry32): the same seed gives the same sequence.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Draw n distinct items from `pool` without replacement (partial Fisher-Yates shuffle).
// Mutates `pool`. Every set of n items is equally likely.
function drawWithoutReplacement(pool, n, rng) {
  const M = pool.length;
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (M - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

// Simple random sample: n distinct row indices (0-based) drawn without replacement,
// every set of n rows equally likely. Sorted ascending. Estimate = sample mean.
export function simpleRandomSample(N, n, seed) {
  if (!Number.isInteger(n) || n < 1 || n > N) throw new Error(`n must be 1..${N}`);
  const rng = makeRng(seed);
  const pool = Array.from({ length: N }, (_, i) => i);
  return drawWithoutReplacement(pool, n, rng).sort((x, y) => x - y);
}

// ---- Systematic sampling with a random start, in the file's row order ----

// Whole-number interval k = N/n: rows r, r+k, r+2k, ... (r is 1-based, 1..k). Returns 0-based indices.
export function systematicRowsWhole(N, n, r) {
  const k = N / n;
  return Array.from({ length: n }, (_, j) => r - 1 + j * k);
}

// Fractional interval k = N/n, start u in (0, k]: rows ceil(u + j*k) (1-based), j = 0..n-1.
// Clamped to 1..N so floating-point rounding can never produce a row beyond N.
export function systematicRowsFractional(N, n, u) {
  const k = N / n;
  return Array.from({ length: n }, (_, j) => Math.min(N, Math.max(1, Math.ceil(u + j * k))) - 1);
}

// Draws the random start from the seed and returns the sampled rows and the design used.
export function systematicSample(N, n, seed) {
  if (!Number.isInteger(n) || n < 1 || n > N) throw new Error(`n must be 1..${N}`);
  const rng = makeRng(seed);
  const k = N / n;
  if (Number.isInteger(k)) {
    const start = 1 + Math.floor(rng() * k);
    return { design: "whole", k, start, indices: systematicRowsWhole(N, n, start) };
  }
  const start = k * (1 - rng()); // uniform on (0, k]
  return { design: "fractional", k, start, indices: systematicRowsFractional(N, n, start) };
}

// ---- Stratified sampling ----

// Groups row indices by the value of `column`, in a fixed readable order.
export function strataLevels(rows, column) {
  const map = new Map();
  rows.forEach((r, i) => {
    const key = r[column];
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(i);
  });
  let keys = [...map.keys()];
  if (column === "weekday") keys.sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
  else if (column === "slot") keys.sort((a, b) => a - b);
  else keys.sort();
  return keys.map((key) => ({ label: String(key), indices: map.get(key) }));
}

// Proportional allocation with largest-remainder rounding, at least 1 row per stratum, never more
// than the stratum size, whole numbers totalling exactly n. Throws if that is impossible.
export function allocateProportional(sizes, n) {
  const H = sizes.length;
  const N = sizes.reduce((a, b) => a + b, 0);
  if (n < H) throw new Error(`n (${n}) is smaller than the number of strata (${H})`);
  if (n > N) throw new Error(`n (${n}) is larger than the population (${N})`);
  const quota = sizes.map((s) => (n * s) / N);
  const a = quota.map((q, h) => Math.min(sizes[h], Math.max(1, Math.floor(q))));
  let total = a.reduce((x, y) => x + y, 0);
  while (total < n) {
    let best = -1;
    let bestRem = -Infinity;
    for (let h = 0; h < H; h++) {
      const rem = quota[h] - a[h];
      if (a[h] < sizes[h] && rem > bestRem) { best = h; bestRem = rem; }
    }
    a[best]++;
    total++;
  }
  while (total > n) {
    let best = -1;
    let bestRem = Infinity;
    for (let h = 0; h < H; h++) {
      const rem = quota[h] - a[h];
      if (a[h] > 1 && rem < bestRem) { best = h; bestRem = rem; }
    }
    a[best]--;
    total--;
  }
  return a;
}

// Stratified sample: proportional allocation, simple random sampling without replacement within
// each stratum. Estimate = population-weighted mean: sum over strata of (N_h / N) * (stratum sample mean).
export function stratifiedSample(rows, column, n, seed, precomputedStrata) {
  const strata = precomputedStrata || strataLevels(rows, column);
  const N = rows.length;
  const alloc = allocateProportional(strata.map((s) => s.indices.length), n);
  const rng = makeRng(seed);
  const chosen = [];
  let estimate = 0;
  const table = strata.map((s, h) => {
    const drawn = drawWithoutReplacement(s.indices.slice(), alloc[h], rng);
    chosen.push(...drawn);
    const mean = sampleMean(rows, drawn);
    const weight = s.indices.length / N;
    estimate += weight * mean;
    return { label: s.label, size: s.indices.length, weight, allocated: alloc[h], sampleMean: mean };
  });
  return { indices: chosen.sort((x, y) => x - y), estimate, table };
}

// ---- One entry point for the app ----
// Returns { method, n, seed, indices, estimate, info } or, when stratified cannot follow its rules
// at this n, { blocked: message, indices: [], estimate: null }.
export function drawSample(rows, method, n, seed, strataColumn) {
  const N = rows.length;
  if (method === "srs") {
    const indices = simpleRandomSample(N, n, seed);
    return { method, n, seed, indices, estimate: sampleMean(rows, indices), info: {} };
  }
  if (method === "systematic") {
    const s = systematicSample(N, n, seed);
    return { method, n, seed, indices: s.indices, estimate: sampleMean(rows, s.indices), info: s };
  }
  if (method === "stratified") {
    const H = strataLevels(rows, strataColumn).length;
    if (n < H) {
      return {
        method, n, seed, indices: [], estimate: null, info: { column: strataColumn, strataCount: H },
        blocked: `Stratified sampling needs at least 1 row from each of the ${H} ${strataColumn} strata, but n = ${n}. Choose n of at least ${H}, or another method.`,
      };
    }
    const s = stratifiedSample(rows, strataColumn, n, seed);
    return { method, n, seed, indices: s.indices, estimate: s.estimate, info: { column: strataColumn, table: s.table } };
  }
  throw new Error(`Unknown method: ${method}`);
}

// ---- Repeated sampling ----

export const MIN_REPS = 100;
export const MAX_REPS = 1000;

// Bias, SD and RMSE of a list of estimates against the true mean, all in the target's units.
//   bias = mean of estimates - true mean
//   SD   = spread of the estimates (divides by the number of estimates)
//   RMSE = sqrt(mean of (estimate - true mean)^2), so RMSE^2 = bias^2 + SD^2.
export function summarizeEstimates(estimates, trueMeanValue) {
  const count = estimates.length;
  let total = 0;
  for (const e of estimates) total += e;
  const meanOfEstimates = total / count;
  let spread = 0;
  let error = 0;
  for (const e of estimates) {
    spread += (e - meanOfEstimates) ** 2;
    error += (e - trueMeanValue) ** 2;
  }
  return {
    count,
    meanOfEstimates,
    bias: meanOfEstimates - trueMeanValue,
    sd: Math.sqrt(spread / count),
    rmse: Math.sqrt(error / count),
  };
}

// Modified copy for the challenge: the same appointments sorted by weekday (Mon to Fri), keeping the
// original order within each weekday. Returns NEW row objects; the original array and its rows are
// never changed. The explicit index tie-break makes the order stable.
export function sortedByWeekday(rows) {
  return rows
    .map((r, i) => ({ r: { ...r }, i }))
    .sort((a, b) => WEEKDAYS.indexOf(a.r.weekday) - WEEKDAYS.indexOf(b.r.weekday) || a.i - b.i)
    .map((x) => x.r);
}

// The four challenge results at the same total n, repetition count and seed: the chosen method
// (simple random) and the alternative (systematic), each on the baseline and on the modified copy.
export function buildChallengeSpecs({ n, reps, seed }) {
  return [
    { method: "srs", population: "baseline", n, reps, seed },
    { method: "srs", population: "modified", n, reps, seed },
    { method: "systematic", population: "baseline", n, reps, seed },
    { method: "systematic", population: "modified", n, reps, seed },
  ];
}

// Text key of everything that defines a result. Results with different keys are different
// conditions and must never be pooled or averaged together.
export function conditionKey(spec, N) {
  const exact = spec.method === "systematic" && Number.isInteger(N / spec.n);
  return [
    spec.population || "baseline",
    spec.method,
    spec.n,
    exact ? "exact" : `mc-seed${spec.seed}-reps${spec.reps}`,
    spec.method === "stratified" ? spec.strataColumn : "-",
  ].join("|");
}

// Repeated sampling for one condition: spec = { method, n, reps, seed, strataColumn }.
//  - Systematic with a whole-number interval: EXACT enumeration of all k = N/n starts
//    (no random draws, no seed, the repetition count does not apply).
//  - Everything else: MONTE CARLO. `reps` separate samples of n rows each (without replacement),
//    one estimate per sample. Each repetition's seed comes from the master seed, so the same seed
//    and settings reproduce the same estimates.
// Returns { method, n, type, seed, count, strataColumn, design, trueMean, estimates, stats }.
// With { keepSamples: true } the sampled row indices of every repetition are also returned.
export function repeatedSampling(rows, spec, { keepSamples = false } = {}) {
  const { method, n, reps, seed, strataColumn } = spec;
  const N = rows.length;
  if (!Number.isInteger(n) || n < 1 || n > N) throw new Error(`n must be 1..${N}`);
  const truth = trueMean(rows);
  const estimates = [];
  const samples = [];
  let type;
  let usedSeed;
  let design = null;

  if (method === "systematic" && Number.isInteger(N / n)) {
    const k = N / n;
    for (let r = 1; r <= k; r++) {
      const idx = systematicRowsWhole(N, n, r);
      estimates.push(sampleMean(rows, idx));
      if (keepSamples) samples.push(idx);
    }
    type = "exact";
    usedSeed = null;
    design = "whole";
  } else {
    if (!Number.isInteger(reps) || reps < MIN_REPS || reps > MAX_REPS) {
      throw new Error(`repetitions must be a whole number from ${MIN_REPS} to ${MAX_REPS}`);
    }
    const strata = method === "stratified" ? strataLevels(rows, strataColumn) : null;
    if (strata && n < strata.length) throw new Error(`n (${n}) is smaller than the number of strata (${strata.length})`);
    const master = makeRng(seed);
    for (let i = 0; i < reps; i++) {
      const repSeed = Math.floor(master() * 4294967296);
      let idx;
      let est;
      if (method === "srs") {
        idx = simpleRandomSample(N, n, repSeed);
        est = sampleMean(rows, idx);
      } else if (method === "systematic") {
        const s = systematicSample(N, n, repSeed);
        idx = s.indices;
        est = sampleMean(rows, idx);
        design = "fractional";
      } else if (method === "stratified") {
        const s = stratifiedSample(rows, strataColumn, n, repSeed, strata);
        idx = s.indices;
        est = s.estimate;
      } else {
        throw new Error(`Unknown method: ${method}`);
      }
      estimates.push(est);
      if (keepSamples) samples.push(idx);
    }
    type = "Monte Carlo";
    usedSeed = seed;
  }

  return {
    method,
    population: spec.population || "baseline",
    n,
    type,
    seed: usedSeed,
    count: estimates.length,
    strataColumn: method === "stratified" ? strataColumn : null,
    design,
    trueMean: truth,
    estimates,
    stats: summarizeEstimates(estimates, truth),
    samples: keepSamples ? samples : undefined,
  };
}

// Position of a row in the order grid: one grid row per week, one grid column per
// (weekday, slot) in file order. Shared so the grid and its checks use one rule.
export function gridPosition(row) {
  return {
    gridRow: row.week - 1,
    gridCol: WEEKDAYS.indexOf(row.weekday) * SLOTS_PER_DAY + (row.slot - 1),
  };
}
