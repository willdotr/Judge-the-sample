// Shared calculation module. Every display calls these functions, so a chart can never
// silently change how the true mean or a sample estimate is computed.
// Pure JavaScript with no imports, so it also runs under Node for the automated checks.

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
export const SLOTS_PER_DAY = 20;

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

// Simple random sample: n distinct row indices (0-based) drawn without replacement,
// every set of n rows equally likely (partial Fisher-Yates shuffle). Sorted ascending.
export function simpleRandomSample(N, n, seed) {
  if (!Number.isInteger(n) || n < 1 || n > N) throw new Error(`n must be 1..${N}`);
  const rng = makeRng(seed);
  const pool = Array.from({ length: N }, (_, i) => i);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rng() * (N - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n).sort((x, y) => x - y);
}

// Position of a row in the order grid: one grid row per week, one grid column per
// (weekday, slot) in file order. Shared so the grid and its checks use one rule.
export function gridPosition(row) {
  return {
    gridRow: row.week - 1,
    gridCol: WEEKDAYS.indexOf(row.weekday) * SLOTS_PER_DAY + (row.slot - 1),
  };
}
