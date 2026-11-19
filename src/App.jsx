import { useMemo, useState } from "react";
import { population } from "./data.js";
import { trueMean, drawSample, STRATA_COLUMNS, conditionKey } from "./sampling.js";
import { runCondition } from "./experiments.js";
import { waitColor } from "./colors.js";
import OrderGrid from "./OrderGrid.jsx";
import Histogram, { WeekdayLegend } from "./Histogram.jsx";
import RuleBox from "./RuleBox.jsx";
import ExperimentView from "./ExperimentView.jsx";

const N = population.length;
const MAX_WAIT = Math.max(...population.map((r) => r.wait_time));
const TRUE_MEAN = trueMean(population);
const POPULATION_LABEL = `baseline (all ${N.toLocaleString()} appointments)`;
const REP_CHOICES = [100, 500, 1000];

const METHODS = [
  { id: "srs", label: "Simple random" },
  { id: "systematic", label: "Systematic" },
  { id: "stratified", label: "Stratified" },
];
const METHOD_NAME = Object.fromEntries(METHODS.map((m) => [m.id, m.label]));

const TABS = [
  { id: "single", label: "Single sample" },
  { id: "A", label: "Experiment A: methods" },
  { id: "B", label: "Experiment B: sample size" },
];

function Experiments({ tab, seed, setSeed, reps, setReps, column, setColumn }) {
  const results = useMemo(() => {
    if (tab === "A") {
      return [
        runCondition({ method: "srs", n: 100, reps, seed }),
        runCondition({ method: "systematic", n: 100, reps, seed }),
        runCondition({ method: "stratified", n: 100, reps, seed, strataColumn: column }),
      ];
    }
    const specA = { method: "srs", n: 100, reps, seed };
    const spec100 = { method: "srs", n: 100, reps, seed };
    // Reuse Experiment A's simple random n = 100 result: same population, method, n, seed and repetitions.
    const reused = conditionKey(spec100, N) === conditionKey(specA, N);
    const r100 = runCondition(spec100);
    return [
      runCondition({ method: "srs", n: 1, reps, seed }),
      runCondition({ method: "srs", n: 10, reps, seed }),
      reused ? { ...r100, note: "Same result as Experiment A's simple random row (same population, method, n, seed and repetitions)." } : r100,
    ];
  }, [tab, seed, reps, column]);

  return (
    <>
      <div className="controls">
        <label>
          Repetitions (number of separate samples drawn):{" "}
          <select value={reps} onChange={(e) => setReps(Number(e.target.value))}>
            {REP_CHOICES.map((c) => (
              <option key={c} value={c}>{c.toLocaleString()}</option>
            ))}
          </select>
        </label>
        <label>
          Seed (Monte Carlo results):{" "}
          <input
            type="number"
            step="1"
            value={seed}
            onChange={(e) => {
              const v = Math.trunc(Number(e.target.value));
              if (Number.isFinite(v)) setSeed(v);
            }}
          />
        </label>
        {tab === "A" && (
          <label>
            Stratify on:{" "}
            <select value={column} onChange={(e) => setColumn(e.target.value)}>
              {STRATA_COLUMNS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
        <div className="hint">
          n (rows in each sample) and the repetition count are separate settings: with n = 10 and 100
          repetitions the app draws 100 separate samples of 10 rows and gets 100 estimates. Each sample is
          drawn without replacement; a row may appear again in a later repetition. The same seed and
          settings always give the same results.
        </div>
        <div className="hint">
          100 repetitions usually reveal the main pattern; 1,000 give smoother distributions and more stable
          bias, SD and RMSE estimates. Neither guarantees stable results, and 100 repetitions cannot
          reliably separate small differences between methods. Rerun with different seeds to check whether
          your main conclusions hold.
        </div>
        {tab === "A" && (
          <div className="hint">
            Systematic sampling at n = 100 has a whole-number interval (10,000 / 100 = 100), so it uses
            exact enumeration of all 100 possible starts: no seed, and the repetition setting does not
            apply to it. The other two methods are Monte Carlo.
          </div>
        )}
      </div>

      <h2>
        {tab === "A"
          ? "Experiment A: three sampling methods at n = 100 (distributions across repetitions)"
          : "Experiment B: simple random sampling at n = 1, 10 and 100 (distributions across repetitions)"}
      </h2>
      <p className="note">
        These are not single samples. Each dot is the estimate from one repetition, so each strip shows how
        much the estimates vary from sample to sample. The single sample tab shows one draw.
      </p>
      <ExperimentView results={results} trueMeanValue={TRUE_MEAN} populationLabel={POPULATION_LABEL} />
    </>
  );
}

function SingleSample() {
  const [method, setMethod] = useState("srs");
  const [n, setN] = useState(100);
  const [nText, setNText] = useState("100");
  const [seed, setSeed] = useState(2026);
  const [column, setColumn] = useState("weekday");
  const [hover, setHover] = useState(null);

  const nInvalid = nText.trim() === "" || !Number.isInteger(Number(nText)) || Number(nText) < 1 || Number(nText) > N;

  const result = useMemo(() => drawSample(population, method, n, seed, column), [method, n, seed, column]);
  const sampledSet = useMemo(() => new Set(result.indices), [result]);

  const estimate = result.estimate;
  const diff = estimate === null ? null : estimate - TRUE_MEAN;
  const estimateName = method === "stratified" ? "Sample estimate (population-weighted mean)" : "Sample mean";
  const h = hover !== null ? population[hover] : null;

  return (
    <>
      <div className="controls">
        <fieldset>
          <legend>Sampling method</legend>
          {METHODS.map((m) => (
            <label key={m.id} className={"chip" + (method === m.id ? " on" : "")}>
              <input type="radio" name="method" checked={method === m.id} onChange={() => setMethod(m.id)} />{" "}
              {m.label}
            </label>
          ))}
        </fieldset>
        <label>
          Sample size n (1 to {N.toLocaleString()}):{" "}
          <input
            type="number"
            min="1"
            max={N}
            step="1"
            value={nText}
            onChange={(e) => {
              setNText(e.target.value);
              const v = Number(e.target.value);
              if (e.target.value.trim() !== "" && Number.isInteger(v) && v >= 1 && v <= N) setN(v);
            }}
          />
        </label>
        <label>
          Seed:{" "}
          <input
            type="number"
            step="1"
            value={seed}
            onChange={(e) => {
              const v = Math.trunc(Number(e.target.value));
              if (Number.isFinite(v)) setSeed(v);
            }}
          />
        </label>
        {method === "stratified" && (
          <label>
            Stratify on:{" "}
            <select value={column} onChange={(e) => setColumn(e.target.value)}>
              {STRATA_COLUMNS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        )}
        <div className="hint">The same seed and settings always give the same sample.</div>
        {nInvalid && (
          <div className="blocked">n must be a whole number from 1 to {N.toLocaleString()}. Showing the last valid n ({n}).</div>
        )}
      </div>

      <div className="summary">
        <div>
          <strong>True population mean</strong> (all {N.toLocaleString()} appointments):{" "}
          <span className="num">{TRUE_MEAN.toFixed(4)} min</span>
        </div>
        <div>
          <strong>{estimateName}</strong> (single sample):{" "}
          <span className="num sample">{estimate === null ? "no sample drawn" : `${estimate.toFixed(4)} min`}</span>
        </div>
        <div>
          <strong>Estimate minus true mean:</strong>{" "}
          <span className="num">{diff === null ? "—" : `${diff >= 0 ? "+" : ""}${diff.toFixed(4)} min`}</span>
        </div>
        <div className="single">
          SINGLE SAMPLE: {METHOD_NAME[method]}
          {method === "stratified" ? ` on ${column}` : ""}, n = {n}, seed {seed}. This is one draw, not a
          repeated-sampling result.
        </div>
      </div>

      <RuleBox result={result} N={N} />

      {result.blocked && <div className="blocked bigblock">{result.blocked}</div>}

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
            sampledIdx={result.indices}
            trueMeanValue={TRUE_MEAN}
            sampleMeanValue={estimate}
          />
          <WeekdayLegend />
        </section>
      </div>
    </>
  );
}

export default function App() {
  const [tab, setTab] = useState("single");
  // Experiment settings are shared by tabs A and B, so a result is only reused when they truly match.
  const [expSeed, setExpSeed] = useState(2026);
  const [expReps, setExpReps] = useState(100);
  const [expColumn, setExpColumn] = useState("weekday");

  return (
    <div className="page">
      <h1>Judge the Sample: clinic waiting times</h1>
      <p className="intro">
        Population: all {N.toLocaleString()} appointments in <code>clinic_visits.csv</code> (100 weeks × 5
        days × 20 slots). It is not every clinic or every week. Target: <code>wait_time</code>, in minutes.
      </p>

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <label key={t.id} className={"chip" + (tab === t.id ? " on" : "")}>
            <input type="radio" name="tab" checked={tab === t.id} onChange={() => setTab(t.id)} /> {t.label}
          </label>
        ))}
      </div>

      <div hidden={tab !== "single"}>
        <SingleSample />
      </div>
      {tab !== "single" && (
        <Experiments
          tab={tab}
          seed={expSeed}
          setSeed={setExpSeed}
          reps={expReps}
          setReps={setExpReps}
          column={expColumn}
          setColumn={setExpColumn}
        />
      )}
    </div>
  );
}
