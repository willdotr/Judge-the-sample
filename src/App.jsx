import { useMemo, useState } from "react";
import { population } from "./data.js";
import { trueMean, sampleMean, simpleRandomSample } from "./sampling.js";
import { waitColor } from "./colors.js";
import OrderGrid from "./OrderGrid.jsx";
import Histogram, { WeekdayLegend } from "./Histogram.jsx";

const N = population.length;
const SAMPLE_SIZE = 100;
const MAX_WAIT = Math.max(...population.map((r) => r.wait_time));
const TRUE_MEAN = trueMean(population);

export default function App() {
  const [seed, setSeed] = useState(2026);
  const [hover, setHover] = useState(null);

  const sampledIdx = useMemo(() => simpleRandomSample(N, SAMPLE_SIZE, seed), [seed]);
  const sampledSet = useMemo(() => new Set(sampledIdx), [sampledIdx]);
  const sMean = useMemo(() => sampleMean(population, sampledIdx), [sampledIdx]);
  const diff = sMean - TRUE_MEAN;

  const h = hover !== null ? population[hover] : null;

  return (
    <div className="page">
      <h1>Judge the Sample: clinic waiting times</h1>
      <p>
        Population: all {N.toLocaleString()} appointments in <code>clinic_visits.csv</code> (100 weeks ×
        5 days × 20 slots). It is not every clinic or every week. Target: <code>wait_time</code>, in
        minutes.
      </p>

      <div className="summary">
        <div>
          <strong>True population mean</strong> (all {N.toLocaleString()} appointments):{" "}
          <span className="num">{TRUE_MEAN.toFixed(4)} min</span>
        </div>
        <div>
          <strong>Sample mean</strong> (single temporary sample, n = {SAMPLE_SIZE}):{" "}
          <span className="num sample">{sMean.toFixed(4)} min</span>
        </div>
        <div>
          <strong>Sample mean minus true mean:</strong>{" "}
          <span className="num">
            {diff >= 0 ? "+" : ""}
            {diff.toFixed(4)} min
          </span>
        </div>
        <div className="temp">
          TEMPORARY sample for testing the display: simple random sample of {SAMPLE_SIZE} rows, without
          replacement. Sampling methods come in the next stage.
        </div>
        <label>
          Seed:{" "}
          <input
            type="number"
            value={seed}
            step="1"
            onChange={(e) => {
              const v = Math.trunc(Number(e.target.value));
              if (Number.isFinite(v)) setSeed(v);
            }}
          />{" "}
          (the same seed gives the same sample)
        </label>
      </div>

      <div className="views">
        <section>
          <h2>All appointments in file order (main view)</h2>
          <p className="note">
            One cell per appointment. Rows are weeks 1–100, top to bottom. Columns are Mon slots 1–20, then
            Tue, Wed, Thu, Fri. Cell colour is the wait; <strong>outlined cells are the sampled
            appointments</strong>.
          </p>
          <OrderGrid rows={population} sampledSet={sampledSet} maxWait={MAX_WAIT} onHover={setHover} />
          <div className="hoverinfo">
            {h ? (
              <>
                Visit {h.visit_id}: week {h.week}, {h.weekday}, slot {h.slot}, {h.visit_type}, wait{" "}
                <strong>{h.wait_time} min</strong> — {sampledSet.has(hover) ? "SAMPLED" : "not sampled"}
              </>
            ) : (
              "Hover over a cell to see that appointment."
            )}
          </div>
          <div className="colorbar">
            <span>0 min</span>
            <span
              className="ramp"
              style={{
                background: `linear-gradient(to right, ${waitColor(0, MAX_WAIT)}, ${waitColor(
                  MAX_WAIT / 2,
                  MAX_WAIT
                )}, ${waitColor(MAX_WAIT, MAX_WAIT)})`,
              }}
            />
            <span>{MAX_WAIT} min (longest wait)</span>
          </div>
        </section>

        <section>
          <h2>Distribution of waits (secondary view)</h2>
          <p className="note">
            Grey bars: all {N.toLocaleString()} appointments, in 5-minute bins. Dots: the sampled
            appointments, coloured by weekday so you can see which days they come from.
          </p>
          <Histogram
            rows={population}
            sampledIdx={sampledIdx}
            trueMeanValue={TRUE_MEAN}
            sampleMeanValue={sMean}
          />
          <WeekdayLegend />
        </section>
      </div>
    </div>
  );
}
