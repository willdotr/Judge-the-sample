// "How this sample was chosen": explains the selection rule using the live numbers of the
// current single sample.
function fmt(x) {
  return Number.isInteger(x) ? String(x) : x.toFixed(2);
}

function rowList(indices, count) {
  const ids = indices.map((i) => i + 1); // visit_id = row number in the file
  const head = ids.slice(0, count).join(", ");
  return ids.length > count ? `${head}, … (${ids.length} rows)` : head;
}

export default function RuleBox({ result, N }) {
  const { method, n, seed, info } = result;

  return (
    <div className="rulebox">
      <h2>How this sample was chosen</h2>

      {method === "srs" && (
        <p>
          <strong>Simple random sampling.</strong> {n} distinct appointments are drawn at random,
          without replacement, from all {N.toLocaleString()}. Every possible set of {n} appointments is
          equally likely. Estimate = the mean of the {n} sampled waits. Seed {seed}.
        </p>
      )}

      {method === "systematic" && (
        <>
          <p>
            <strong>Systematic sampling with a random start.</strong> Appointments are taken in the
            file's row order, which is chronological: week by week, Monday to Friday, slot 1 to 20
            within each day (the grid reads in the same order). Row order matters for systematic
            sampling. Estimate = the mean of the {n} sampled waits. Seed {seed}.
          </p>
          {info.design === "whole" ? (
            <p>
              <strong>Whole-number interval design.</strong> N / n = {N.toLocaleString()} / {n} ={" "}
              {info.k}, a whole number, so the interval is k = {info.k}. A random start r is drawn from
              1 to {info.k}: <strong>r = {info.start}</strong>. The sampled rows are r, r + k, r + 2k, …
              : {rowList(result.indices, 6)}.
            </p>
          ) : (
            <p>
              <strong>Fractional-interval design.</strong> N / n = {N.toLocaleString()} / {n} ={" "}
              {info.k.toFixed(4)}, not a whole number, so the interval is k = {info.k.toFixed(4)}. A
              random start u is drawn uniformly from (0, k]: <strong>u = {info.start.toFixed(4)}</strong>.
              The sampled rows are ceil(u + j·k) for j = 0 to {n - 1}: {rowList(result.indices, 6)}.
            </p>
          )}
        </>
      )}

      {method === "stratified" && (
        <>
          <p>
            <strong>Stratified sampling on {info.column}.</strong> The appointments are split into
            strata by {info.column}. Each stratum gets a share of the {n} rows proportional to its size
            (largest-remainder rounding, at least 1 row per stratum, never more than the stratum
            size, totalling exactly {n}). Within each stratum, rows are drawn by simple random sampling
            without replacement. Estimate = the population-weighted mean, the sum over strata of
            (N<sub>h</sub> / N) × (stratum sample mean), not the plain average of all sampled rows.
            Seed {seed}.
          </p>
          {result.blocked ? (
            <p className="blocked">{result.blocked}</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{info.column}</th>
                  <th>Stratum size N<sub>h</sub></th>
                  <th>Weight N<sub>h</sub>/N</th>
                  <th>Rows allocated</th>
                  <th>Stratum sample mean (min)</th>
                </tr>
              </thead>
              <tbody>
                {info.table.map((t) => (
                  <tr key={t.label}>
                    <td>{t.label}</td>
                    <td>{t.size.toLocaleString()}</td>
                    <td>{fmt(t.weight)}</td>
                    <td>{t.allocated}</td>
                    <td>{t.sampleMean.toFixed(2)}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td>Total</td>
                  <td>{N.toLocaleString()}</td>
                  <td>{fmt(info.table.reduce((s, t) => s + t.weight, 0))}</td>
                  <td>{info.table.reduce((s, t) => s + t.allocated, 0)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
