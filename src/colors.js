// Colours shared by both views.

// Sequential ramp (light = short wait, dark = long wait) for the order grid and its legend.
const STOPS = [
  [0, [247, 251, 255]],
  [0.5, [107, 174, 214]],
  [1, [8, 48, 107]],
];

export function waitColor(wait, maxWait) {
  const t = Math.max(0, Math.min(1, wait / maxWait));
  for (let i = 1; i < STOPS.length; i++) {
    const [t1, c1] = STOPS[i];
    const [t0, c0] = STOPS[i - 1];
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0);
      const c = c0.map((v, k) => Math.round(v + f * (c1[k] - v)));
      return `rgb(${c[0]},${c[1]},${c[2]})`;
    }
  }
  return "rgb(8,48,107)";
}

// One colour per weekday for the sampled dots (colour-blind-safe set).
export const WEEKDAY_COLORS = {
  Mon: "#0072b2",
  Tue: "#e69f00",
  Wed: "#009e73",
  Thu: "#cc79a7",
  Fri: "#6a3d9a",
};
