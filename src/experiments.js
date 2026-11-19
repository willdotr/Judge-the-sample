// Runs one experiment condition using the shared sampling module.
// The baseline population is the CSV exactly as loaded. The modified population is a separate
// in-memory copy (sorted by weekday); nothing is ever written back to data/.
// The small cache below only avoids recomputing the CURRENT results when you switch tabs;
// it is not a history of runs and is never shown.
import { population } from "./data.js";
import { repeatedSampling, conditionKey, sortedByWeekday, trueMean } from "./sampling.js";

export const baselineRows = population;
export const modifiedRows = sortedByWeekday(population);
// Recalculated from the modified copy's own rows.
export const BASELINE_TRUE_MEAN = trueMean(baselineRows);
export const MODIFIED_TRUE_MEAN = trueMean(modifiedRows);

const cache = new Map();

function rowsFor(populationName) {
  return populationName === "modified" ? modifiedRows : baselineRows;
}

export function runCondition(spec) {
  const rows = rowsFor(spec.population);
  const key = conditionKey(spec, rows.length);
  if (!cache.has(key)) {
    if (cache.size >= 24) cache.delete(cache.keys().next().value);
    cache.set(key, repeatedSampling(rows, spec));
  }
  return cache.get(key);
}

export { conditionKey };
