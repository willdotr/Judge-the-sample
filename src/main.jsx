import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ExtrasShell from "./ExtrasShell.jsx"; // EXTRAS: separate main-menu page, loading transition, music player
import "./styles.css";
import "./theme.css"; // PERSONA 5 THEME (remove this line and the classList line below to take the theme out)
import "./extras.css"; // EXTRAS (see the removal list inside)
document.body.classList.add("p5");

const USE_EXTRAS = true; // EXTRAS (set to false, or follow the removal list in extras.css, to go back to the plain app)
createRoot(document.getElementById("root")).render(USE_EXTRAS ? <ExtrasShell /> : <App />);
