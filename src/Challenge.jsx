import { useMemo, useState } from "react";
import { buildChallengeSpecs, MAX_REPS } from "./sampling.js";
import { runCondition, modifiedRows, BASELINE_TRUE_MEAN, MODIFIED_TRUE_MEAN } from "./experiments.js";
import ExperimentView from "./ExperimentView.jsx";

const N = modifiedRows.length;
const REP_CHOICES = [100, 500, 1000];
const METHOD_NAME = { srs: "Simple random", systematic: "Systematic" };
const POP_LABEL = {
  baseline: `baseline (all ${N.toLocaleString()} appointments, original file order)`,
  modified: `MODIFIED copy (the same ${N.toLocaleString()} appointments, sorted by weekday)`,
};

const signed = (x) => `${x > 0 ? "+" : ""}${x.toFixed(2)}`;

function ResultsTable({ results }) {
  return (
    <div className="chtable">
      <table>
        <thead>
          <tr>
            <th>Population</th>
            <th>Method</th>
            <th>Type</th>
            <th>Seed</th>
            <th>n</th>
            <th>Repetitions or starts</th>
            <th>True mean of its population (min)</th>
            <th>Mean of estimates (min)</th>
            <th>Bias (min)</th>
            <th>SD (min)</th>
            <th>RMSE (min)</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={`${r.population}-${r.method}`}>
              <td>{r.population === "modified" ? "MODIFIED (weekday-sorted)" : "baseline"}</td>
              <td>{METHOD_NAME[r.method]}</td>
              <td>{r.type === "exact" ? "exact" : "Monte Carlo"}</td>
              <td>{r.type === "exact" ? "exact (no seed)" : r.seed}</td>
              <td>{r.n}</td>
              <td>{r.count}{r.type === "exact" ? " starts" : ""}</td>
              <td>{r.trueMean.toFixed(4)}</td>
              <td>{r.stats.meanOfEstimates.toFixed(4)}</td>
              <td>{signed(r.stats.bias)}</td>
              <td>{r.stats.sd.toFixed(2)}</td>
              <td>{r.stats.rmse.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Challenge({ n, setN, nText, setNText, seed, setSeed, reps, setReps }) {
  const [showModified, setShowModified] = useState(true);
  const nInvalid = nText.trim() === "" || !Number.isInteger(Number(nText)) || Number(nText) < 1 || Number(nText) > N;

  const results = useMemo(() => {
    const specs = buildChallengeSpecs({ n, reps, seed }).filter((s) => showModified || s.population === "baseline");
    return specs.map((s) => ({ ...runCondition(s), populationLabel: POP_LABEL[s.population] }));
  }, [n, reps, seed, showModified]);

  const systematicExact = Number.isInteger(N / n);

  return (
    <>
      <div className="controls">
        <label>
          Total sample size n, the same for all results (1 to {N.toLocaleString()}):{" "}
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
          Repetitions (separate samples, Monte Carlo results):{" "}
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
        <label>
          <input type="checkbox" checked={showModified} onChange={(e) => setShowModified(e.target.checked)} /> Show the
          modified copy (untick to return to the baseline only)
        </label>
        {nInvalid && (
          <div className="blocked">n must be a whole number from 1 to {N.toLocaleString()}. Showing the last valid n ({n}).</div>
        )}
        <div className="hint">
          n (rows in each sample) and the repetition count are separate settings, and n is the same for every
          result below. Each repetition draws one sample of n rows without replacement and gives one estimate.
          The same seed and settings always give the same results.
        </div>
        <div className="hint">
          100 repetitions usually reveal the main pattern; 1,000 give smoother distributions and more stable
          bias, SD and RMSE estimates (up to {MAX_REPS.toLocaleString()}). Neither guarantees stable results, and
          100 repetitions cannot reliably separate small differences between methods. Rerun with different seeds
          to check whether your main conclusions hold.
        </div>
        <div className="hint">
          {systematicExact
            ? `Systematic sampling at n = ${n} has a whole-number interval (${N.toLocaleString()} / ${n} = ${N / n}), so it uses exact enumeration of all ${N / n} possible starts on each population: no seed, and the repetition setting does not apply to it.`
            : `At n = ${n}, ${N.toLocaleString()} / ${n} is not a whole number, so systematic sampling uses the fractional-interval design and is Monte Carlo (seeded, with the repetition count above).`}
          {" "}Simple random sampling is always Monte Carlo.
        </div>
      </div>

      <div className="summary">
        <div>
          <strong>Baseline:</strong> the original file, unchanged, in its original order. True mean{" "}
          <span className="num">{BASELINE_TRUE_MEAN.toFixed(4)} min</span>.
        </div>
        <div className={showModified ? "" : "dim"}>
          <strong className="popmod">MODIFIED copy:</strong> the same {N.toLocaleString()} appointments sorted by
          weekday (Monday to Friday), keeping the original order within each weekday. True mean, recalculated from
          the copy's own rows: <span className="num">{MODIFIED_TRUE_MEAN.toFixed(4)} min</span>.
          {!showModified && " (hidden)"}
        </div>
        <div className="hint">
          The file on disk is never changed: the modified copy exists only in memory, and the other tabs always use
          the baseline. Each result below is judged against the true mean of its own population.
        </div>
      </div>

      <h2>Challenge: simple random and systematic sampling on the baseline and the modified copy</h2>
      <p className="note">
        These are not single samples. Each dot is the estimate from one repetition. Results are shown side by side
        and are never pooled.
      </p>
      <ExperimentView
        results={results}
        trueMeanValue={BASELINE_TRUE_MEAN}
        populationLabel={POP_LABEL.baseline}
        legendTrue={`True mean of each row's own population (baseline ${BASELINE_TRUE_MEAN.toFixed(4)} min; modified ${MODIFIED_TRUE_MEAN.toFixed(4)} min)`}
      />
      <h2>Side by side</h2>
      <ResultsTable results={results} />
    </>
  );
}
