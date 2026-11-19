// Runs one experiment condition on the baseline population using the shared sampling module.
// The small cache below only avoids recomputing the CURRENT results when you switch tabs;
// it is not a history of runs and is never shown.
import { population } from "./data.js";
import { repeatedSampling, conditionKey } from "./sampling.js";

const cache = new Map();

export function runCondition(spec) {
  const key = conditionKey(spec, population.length);
  if (!cache.has(key)) {
    if (cache.size >= 12) cache.delete(cache.keys().next().value);
    cache.set(key, repeatedSampling(population, spec));
  }
  return cache.get(key);
}

export { conditionKey };
