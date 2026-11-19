// EXTRAS: main menu (landing page). To remove it, see the removal list in src/extras.css.
const ITEMS = [
  {
    id: "single",
    title: "Single sample",
    text:
      "Draw one sample of n appointments using simple random, systematic or stratified sampling. See where the sampled appointments sit in the file, and how the sample's estimate compares with the true mean.",
  },
  {
    id: "A",
    title: "Experiment A: methods",
    text:
      "Repeat the sampling many times at n = 100 and compare simple random, systematic and stratified sampling: how spread out the estimates are, and how far typical estimates fall from the true mean.",
  },
  {
    id: "B",
    title: "Experiment B: sample size",
    text:
      "Repeat simple random sampling at n = 1, 10 and 100 to see how the spread of the estimates and the estimation error change with sample size.",
  },
  {
    id: "challenge",
    title: "Challenge: reordering",
    text:
      "Compare simple random and systematic sampling on the original file order and on a copy sorted by weekday, each judged against its own population's true mean.",
  },
];

export default function MainMenu({ onOpen, N, trueMeanValue }) {
  return (
    <div className="page mainmenu">
      <h1>Judge the Sample</h1>
      <div className="credit">Created by Willie Robinson</div>
      <div className="menusub">Clinic waiting times: a sampling activity</div>
      <p className="menuq">
        Which sampling method would you trust for this population, at what sample size, and with what limits?
      </p>

      <div className="menugrid">
        {ITEMS.map((it, i) => (
          <button key={it.id} className="menucard" onClick={() => onOpen(it.id)}>
            <span className="menunum">{i + 1}</span>
            <span className="menutitle">{it.title}</span>
            <span className="menutext">{it.text}</span>
            <span className="menugo">Open ▶</span>
          </button>
        ))}
      </div>

      <div className="menuabout">
        <h2>About the data</h2>
        <ul>
          <li>
            The population is all {N.toLocaleString()} appointments in <code>clinic_visits.csv</code> (simulated, 100
            weeks × 5 days × 20 slots). It is not every clinic or every week.
          </li>
          <li>
            The target is <code>wait_time</code>, in minutes. The true population mean is{" "}
            <strong>{trueMeanValue.toFixed(4)} minutes</strong>, the mean over all {N.toLocaleString()} rows.
          </li>
          <li>
            Every result is labelled <strong>Monte Carlo</strong> (with its seed) or <strong>exact</strong> (no
            seed), with its population, method, n, and repetition or start count. The same seed and settings always
            give the same results.
          </li>
          <li>
            The theme is inspired by{" "}
            <a href="https://store.steampowered.com/app/1687950/Persona_5_Royal/" target="_blank" rel="noopener noreferrer">
              Persona 5
            </a>
            .
          </li>
        </ul>
      </div>
    </div>
  );
}
