import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages serves this repo at https://willdotr.github.io/Judge-the-sample/, so assets need this prefix.
  // (Locally, `bash run_app.sh` then opens http://localhost:5173/Judge-the-sample/.)
  base: "/Judge-the-sample/",
  plugins: [react()],
});
