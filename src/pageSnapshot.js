// EXTRAS: takes a picture of the page the user is looking at right now, so the Challenge transition can show it
// inside the shattering glass. Uses the html-to-image library, which asks the browser itself to draw the page.
// Resolves to a canvas the size of the visible window, or null if the picture could not be taken (the transition
// then falls back to plain red glass). To remove it, see the removal list in src/extras.css.
import { toCanvas } from "html-to-image";

const CAPTURE_TIMEOUT_MS = 3000;

export async function capturePage() {
  try {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scrollY = window.scrollY;
    const body = document.body;
    const height = Math.max(body.scrollHeight, vh);
    const shot = toCanvas(body, {
      pixelRatio: 1,
      width: vw,
      height,
      // Leave out the transition overlay itself, if it is on screen.
      filter: (node) => !(node.classList && node.classList.contains("p5vt")),
    });
    const full = await Promise.race([
      shot,
      new Promise((_, reject) => setTimeout(() => reject(new Error("snapshot timed out")), CAPTURE_TIMEOUT_MS)),
    ]);
    // Keep only the part of the page that is on screen (the window may be scrolled).
    const view = document.createElement("canvas");
    view.width = vw;
    view.height = vh;
    view.getContext("2d").drawImage(full, 0, scrollY, vw, vh, 0, 0, vw, vh);
    return view;
  } catch (e) {
    return null;
  }
}
