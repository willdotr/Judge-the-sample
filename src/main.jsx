import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";
import "./theme.css"; // PERSONA 5 THEME (remove this line and the next to take the theme out)
document.body.classList.add("p5");

createRoot(document.getElementById("root")).render(<App />);
