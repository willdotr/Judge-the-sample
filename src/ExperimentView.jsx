import { makeRng } from "./sampling.js";

const METHOD_NAME = { srs: "Simple random", systematic: "Systematic", stratified: "Stratified" };

const STRIP_W = 520;
const STRIP_H = 104;
const SM = { left: 14, right: 14, top: 8, bottom: 26 };
const BAR_W = 330;
const COLORS = { bias: "#b45309", sd: "#1d4ed8", rmse: "#111111" };

function niceStep(range) {
  const raw = range / 6;
  for (const s of [1, 2, 5, 10, 20, 50, 100, 200, 500]) if (s >= raw) return s;
  return 1000;
}

function settingsText(r) {
  if (r.method === "srs") return "n distinct rows per sample, drawn without replacement";
  if (r.method === "stratified") {
    return `stratified on ${r.strataColumn}; proportional allocation (largest remainder, at least 1 row per stratum); estimate = population-weighted mean`;
  }
  return r.design === "whole"
    ? `row order, whole-number interval k = ${r.count}, every possible random start`
    : "row order, fractional interval with a random start";
}

// One dot per estimate on a shared minutes axis, with the labelled true mean and the mean of the estimates.
function Strip({ r, domain }) {
  const [lo, hi] = domain;
  const plotW = STRIP_W - SM.left - SM.right;
  const x = (v) => SM.left + ((v - lo) / (hi - lo)) * plotW;
  const dotsTop = SM.top + 14;
  const dotsH = STRIP_H - SM.top - SM.bottom - 14;
  const rng = makeRng(12345); // fixed vertical jitter: only spreads the dots, never changes a number
  const step = niceStep(hi - lo);
  const ticks = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);
  const axisY = STRIP_H - SM.bottom;
  const dotOpacity = r.estimates.length > 300 ? 0.3 : 0.5;

  return (
    <svg viewBox={`0 0 ${STRIP_W} ${STRIP_H}`} width={STRIP_W} style={{ maxWidth: "100%" }} role="img"
      aria-label={`Each dot is the estimate from one repetition; ${METHOD_NAME[r.method]}, n = ${r.n}`}>
      <rect x={SM.left} y={dotsTop - 4} width={plotW} height={dotsH + 8} fill="#f4f5f7" />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={dotsTop - 4} y2={axisY} stroke="#d9dce1" />
          <line x1={x(t)} x2={x(t)} y1={axisY} y2={axisY + 4} stroke="#333" />
          <text x={x(t)} y={axisY + 16} textAnchor="middle" fontSize="11" fill="#333">{t}</text>
        </g>
      ))}
      <line x1={SM.left} x2={STRIP_W - SM.right} y1={axisY} y2={axisY} stroke="#333" />
      {r.estimates.map((e, i) => (
        <circle key={i} cx={x(e)} cy={dotsTop + rng() * dotsH} r="3" fill="#1f4e79" fillOpacity={dotOpacity} />
      ))}
      <line x1={x(r.trueMean)} x2={x(r.trueMean)} y1={SM.top} y2={axisY} stroke="#000" strokeWidth="2" />
      <text x={x(r.trueMean) + 4} y={SM.top + 8} fontSize="11" fontWeight="bold" fill="#000">
        True mean {r.trueMean.toFixed(2)}
      </text>
      <polygon
        points={`${x(r.stats.meanOfEstimates)},${axisY - 1} ${x(r.stats.meanOfEstimates) - 6},${axisY - 11} ${x(r.stats.meanOfEstimates) + 6},${axisY - 11}`}
        fill="#c2255c" stroke="#fff" strokeWidth="1" />
    </svg>
  );
}

// Bias, SD and RMSE in minutes on one common scale. Bar length is the size of each quantity;
// the bias bar shows |bias| and its number carries the sign.
function Bars({ r, maxVal }) {
  const labelW = 54;
  const valW = 74;
  const plotW = BAR_W - labelW - valW;
  const rows = [
    ["Bias", Math.abs(r.stats.bias), r.stats.bias, COLORS.bias],
    ["SD", r.stats.sd, r.stats.sd, COLORS.sd],
    ["RMSE", r.stats.rmse, r.stats.rmse, COLORS.rmse],
  ];
  return (
    <svg viewBox={`0 0 ${BAR_W} 84`} width={BAR_W} style={{ maxWidth: "100%" }} role="img"
      aria-label={`Bias ${r.stats.bias.toFixed(2)}, SD ${r.stats.sd.toFixed(2)}, RMSE ${r.stats.rmse.toFixed(2)} minutes`}>
      {rows.map(([name, size, value, color], i) => (
        <g key={name} transform={`translate(0 ${i * 26 + 4})`}>
          <text x={0} y={14} fontSize="12" fill="#222">{name}</text>
          <rect x={labelW} y={2} width={plotW} height={18} fill="#f4f5f7" />
          <rect x={labelW} y={2} width={Math.max(1, (size / maxVal) * plotW)} height={18} fill={color} />
          <text x={labelW + plotW + 6} y={15} fontSize="12" fontWeight="bold" fill="#222">
            {name === "Bias" && value > 0 ? "+" : ""}{value.toFixed(2)}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function ExperimentView({ results, trueMeanValue, populationLabel }) {
  // Shared minutes axis and shared bar scale across the conditions of one experiment.
  let lo = trueMeanValue;
  let hi = trueMeanValue;
  for (const r of results) for (const e of r.estimates) { if (e < lo) lo = e; if (e > hi) hi = e; }
  const pad = (hi - lo) * 0.05 || 1;
  const domain = [Math.max(0, lo - pad), hi + pad];
  const maxVal = Math.max(1e-9, ...results.flatMap((r) => [Math.abs(r.stats.bias), r.stats.sd, r.stats.rmse]));

  return (
    <div className="expcard">
      <div className="explegend">
        <span><svg width="22" height="12"><line x1="11" x2="11" y1="0" y2="12" stroke="#000" strokeWidth="2" /></svg>{" "}
          <strong>True population mean: {trueMeanValue.toFixed(4)} min</strong></span>
        <span><svg width="14" height="12"><polygon points="7,1 1,11 13,11" fill="#c2255c" /></svg>{" "}
          mean of the estimates (its gap from the true mean is the bias)</span>
        <span><svg width="14" height="12"><circle cx="7" cy="6" r="4" fill="#1f4e79" fillOpacity="0.6" /></svg>{" "}
          one dot = the estimate from <strong>one repetition</strong> (a separate sample of n rows)</span>
      </div>

      {results.map((r) => (
        <div className="exprow" key={`${r.method}-${r.n}-${r.strataColumn}`}>
          <div className="rowlabel">
            <h3>{METHOD_NAME[r.method]}, n = {r.n}</h3>
            <div><strong>{r.type === "exact" ? "Exact" : "Monte Carlo"}</strong>
              {r.type === "exact" ? " (no seed, no random draws)" : `, seed ${r.seed}`}</div>
            <div>n = {r.n} rows per sample</div>
            <div>
              {r.type === "exact"
                ? <>Starts: <strong>{r.count}</strong> (every possible start, each once)</>
                : <>Repetitions: <strong>{r.count}</strong> (separate samples)</>}
            </div>
            <div>Population: {populationLabel}</div>
            <div className="small">{settingsText(r)}</div>
            {r.note && <div className="small reuse">{r.note}</div>}
          </div>
          <div className="stripcell">
            <Strip r={r} domain={domain} />
            <div className="axislabel">Estimate of mean wait (minutes)</div>
          </div>
          <div className="barcell">
            <Bars r={r} maxVal={maxVal} />
            <div className="small">Mean of estimates: {r.stats.meanOfEstimates.toFixed(4)} min</div>
          </div>
        </div>
      ))}

      <p className="small">
        Bias = mean of the estimates − true mean (consistent error). SD = spread of the estimates (random
        variation). RMSE = typical error, combining both (RMSE² = bias² + SD²). All in minutes; bars share
        one scale, and the bias bar shows its size with the sign in the number.
      </p>
    </div>
  );
}
