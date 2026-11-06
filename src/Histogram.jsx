import { WEEKDAYS } from "./sampling.js";
import { WEEKDAY_COLORS } from "./colors.js";

const BIN = 5; // minutes per bar
const W = 560;
const M = { left: 52, right: 16, top: 40, bottom: 34 };
const BARS_H = 200;
const DOT_R = 3;
const DOT_STEP = 7;
const GAP = 14;

// Secondary view: histogram of ALL waits (as % of appointments per bin) with the sampled
// appointments as dots underneath on the same minutes axis, coloured by weekday.
export default function Histogram({ rows, sampledIdx, trueMeanValue, sampleMeanValue }) {
  const maxWait = Math.max(...rows.map((r) => r.wait_time));
  const nBins = Math.floor(maxWait / BIN) + 1;
  const xMax = nBins * BIN;

  const counts = new Array(nBins).fill(0);
  for (const r of rows) counts[Math.floor(r.wait_time / BIN)]++;
  const shares = counts.map((c) => (c / rows.length) * 100);
  const yMax = Math.ceil(Math.max(...shares) / 5) * 5;

  // Stack sampled dots within each bin.
  const stackCount = new Array(nBins).fill(0);
  const dots = sampledIdx.map((i) => {
    const r = rows[i];
    const b = Math.floor(r.wait_time / BIN);
    const level = stackCount[b]++;
    return { x: r.wait_time + 0.5, level, weekday: r.weekday };
  });
  const maxStack = Math.max(1, ...stackCount);

  const plotW = W - M.left - M.right;
  const dotsH = maxStack * DOT_STEP + 6;
  const H = M.top + BARS_H + GAP + dotsH + M.bottom;
  const x = (m) => M.left + (m / xMax) * plotW;
  const y = (pct) => M.top + BARS_H - (pct / yMax) * BARS_H;
  const dotTop = M.top + BARS_H + GAP;
  const lineBottom = dotTop + dotsH;

  const ticksX = [];
  for (let m = 0; m <= xMax; m += 20) ticksX.push(m);
  const ticksY = [];
  for (let p = 0; p <= yMax; p += 5) ticksY.push(p);

  const labelsFlip = sampleMeanValue < trueMeanValue; // keep the two labels from overlapping

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} style={{ maxWidth: "100%" }} role="img"
      aria-label="Histogram of all waiting times with the sampled appointments as dots">
      {/* y axis */}
      {ticksY.map((p) => (
        <g key={p}>
          <line x1={M.left} x2={W - M.right} y1={y(p)} y2={y(p)} stroke="#e5e5e5" />
          <text x={M.left - 6} y={y(p) + 4} textAnchor="end" fontSize="11" fill="#333">{p}%</text>
        </g>
      ))}
      <text x={12} y={M.top + BARS_H / 2} fontSize="11" fill="#333"
        transform={`rotate(-90 12 ${M.top + BARS_H / 2})`} textAnchor="middle">
        % of all appointments
      </text>

      {/* population bars */}
      {shares.map((s, b) => (
        <rect key={b} x={x(b * BIN) + 0.5} y={y(s)} width={x(BIN) - x(0) - 1}
          height={y(0) - y(s)} fill="#9aa5b1" />
      ))}

      {/* sampled dots, coloured by weekday */}
      <text x={M.left} y={dotTop - 3} fontSize="11" fill="#333">Sampled appointments (one dot each)</text>
      {dots.map((d, k) => (
        <circle key={k} cx={x(d.x)} cy={dotTop + dotsH - 3 - d.level * DOT_STEP - DOT_R}
          r={DOT_R} fill={WEEKDAY_COLORS[d.weekday]} stroke="#fff" strokeWidth="0.5" />
      ))}

      {/* x axis */}
      <line x1={M.left} x2={W - M.right} y1={lineBottom} y2={lineBottom} stroke="#333" />
      {ticksX.map((m) => (
        <g key={m}>
          <line x1={x(m)} x2={x(m)} y1={lineBottom} y2={lineBottom + 4} stroke="#333" />
          <text x={x(m)} y={lineBottom + 16} textAnchor="middle" fontSize="11" fill="#333">{m}</text>
        </g>
      ))}
      <text x={M.left + plotW / 2} y={H - 4} textAnchor="middle" fontSize="12" fill="#333">
        Waiting time (minutes)
      </text>

      {/* mean lines */}
      <line x1={x(trueMeanValue)} x2={x(trueMeanValue)} y1={M.top - 8} y2={lineBottom}
        stroke="#000" strokeWidth="2" />
      <text x={x(trueMeanValue) + (labelsFlip ? 4 : -4)} y={14} fontSize="12" fontWeight="bold"
        textAnchor={labelsFlip ? "start" : "end"}>
        True mean {trueMeanValue.toFixed(2)}
      </text>
      <line x1={x(sampleMeanValue)} x2={x(sampleMeanValue)} y1={M.top - 8} y2={lineBottom}
        stroke="#c2255c" strokeWidth="2" strokeDasharray="6 3" />
      <text x={x(sampleMeanValue) + (labelsFlip ? -4 : 4)} y={30} fontSize="12" fontWeight="bold"
        fill="#c2255c" textAnchor={labelsFlip ? "end" : "start"}>
        Sample mean {sampleMeanValue.toFixed(2)}
      </text>
    </svg>
  );
}

export function WeekdayLegend() {
  return (
    <div className="legend">
      {WEEKDAYS.map((d) => (
        <span key={d} style={{ marginRight: 12 }}>
          <svg width="12" height="12" style={{ verticalAlign: "middle" }}>
            <circle cx="6" cy="6" r="5" fill={WEEKDAY_COLORS[d]} />
          </svg>{" "}
          {d}
        </span>
      ))}
    </div>
  );
}
