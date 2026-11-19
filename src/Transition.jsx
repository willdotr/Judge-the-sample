// EXTRAS: full-screen Persona 5-style loading transition (red and black shards sweep in, a spinning
// star and "Now loading" hold the screen, then the shards sweep out). To remove it, see src/extras.css.
import { useEffect, useRef } from "react";

// Timings in milliseconds. The screen underneath is swapped at MID, while it is fully covered.
const FULL = { mid: 1300, total: 2600 };
const REDUCED = { mid: 250, total: 600 }; // for people who ask their system for reduced motion

export default function Transition({ label, onMidpoint, onDone }) {
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const t = reduced ? REDUCED : FULL;
  const midRef = useRef(onMidpoint);
  const doneRef = useRef(onDone);
  midRef.current = onMidpoint;
  doneRef.current = onDone;

  useEffect(() => {
    const a = setTimeout(() => midRef.current(), t.mid);
    const b = setTimeout(() => doneRef.current(), t.total);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [t.mid, t.total]);

  return (
    <div className={"p5t" + (reduced ? " reduced" : "")} role="status" aria-live="polite" aria-label={`Loading ${label}`}>
      <div className="p5t-layer p5t-black" />
      <div className="p5t-layer p5t-white" />
      <div className="p5t-layer p5t-red" />
      <div className="p5t-slash p5t-slash-a" />
      <div className="p5t-slash p5t-slash-b" />
      <div className="p5t-content">
        <div className="p5t-starwrap" aria-hidden="true">
          <span className="p5t-star back" />
          <span className="p5t-star front" />
        </div>
        <div className="p5t-text">
          <div className="p5t-loading">
            Now loading
            <span className="p5t-dots" aria-hidden="true">
              <i>.</i>
              <i>.</i>
              <i>.</i>
            </span>
          </div>
          <div className="p5t-label">▶ {label}</div>
        </div>
      </div>
    </div>
  );
}
