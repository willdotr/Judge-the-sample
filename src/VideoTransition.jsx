// EXTRAS: plays public/transition/transition.mp4 full screen as a loading transition and removes its green
// screen live in the browser (a small WebGL shader). If the file is missing, can't play, or WebGL is not
// available, it calls onFail and the app uses the built-in CSS transition (src/Transition.jsx) instead.
// To remove it, see the removal list in src/extras.css.
import { useEffect, useRef } from "react";
import { KEY_LOW, KEY_HIGH, BLACK_LOW, BLACK_HIGH, coverageOf, coverScale } from "./chromaKey.js";

// Clips live in public/transition/. clipUrl("experiment-a.mp4") is the address of one of them.
export const clipUrl = (name) => `${import.meta.env.BASE_URL}transition/${name}`;
const PLAYBACK_RATE = 2; // 1 = normal speed; 1.5 = 50% faster; 2 = twice as fast. Browsers allow roughly 0.25 to 4.
const COVER_THRESHOLD = 0.97; // the screen underneath is swapped the first time the clip covers this much
const BLACK_COVER_THRESHOLD = 0.9; // same idea for black-keyed clips, whose glass has dark cracks in it
const MID_FALLBACK = 0.6; // ...or at this fraction of the clip if it never covers the whole screen
// Shatter mode: how much of the clip's own colour (its red glow and highlights) is mixed into the pieces of the
// page picture. 0 = pieces show the page untouched; 1 = pieces show only the clip's red glass.
const SHATTER_TINT = 0.2;
const START_TIMEOUT_MS = 4000; // give up (and use the CSS transition) if the clip hasn't started by then

// One shared <video> per clip file, created the first time it is needed (or preloaded), so a clip is only
// loaded once and then reused by every later transition that uses it.
const videos = new Map();
function getVideo(src) {
  if (!videos.has(src)) {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.defaultPlaybackRate = PLAYBACK_RATE; // loading a source resets playbackRate to this default
    v.playbackRate = PLAYBACK_RATE;
    v.src = src;
    videos.set(src, v);
  }
  return videos.get(src);
}
export function preloadTransitionVideo(src) {
  try {
    getVideo(src);
  } catch (e) {
    /* ignored: the next clip, or the CSS transition, is used if this one can't be used */
  }
}

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() {
  uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}`;

// Same maths as keyAlpha() / blackAlpha() in chromaKey.js. Green mode also despills, so green fringes turn
// neutral. Black mode makes near-black see-through, so what is underneath shows through.
function fragFor(mode) {
  if (mode === "shatter") {
    // The clip decides WHERE the glass is (anything that is not black); the pieces show a picture of the page
    // the user was on, drawn in screen position. Black parts are see-through, so the new page shows there.
    return `
precision mediump float;
varying vec2 uv;
uniform sampler2D tex;
uniform sampler2D snap;
uniform vec2 vscale;
void main() {
  vec2 vuv = (uv - 0.5) * vscale + 0.5;
  vec4 c = texture2D(tex, vuv);
  float a = smoothstep(${BLACK_LOW.toFixed(3)}, ${BLACK_HIGH.toFixed(3)}, max(c.r, max(c.g, c.b)));
  vec3 page = texture2D(snap, uv).rgb;
  vec3 rgb = mix(page, c.rgb, ${SHATTER_TINT.toFixed(3)});
  gl_FragColor = vec4(rgb * a, a);
}`;
  }
  if (mode === "black") {
    return `
precision mediump float;
varying vec2 uv;
uniform sampler2D tex;
void main() {
  vec4 c = texture2D(tex, uv);
  float a = smoothstep(${BLACK_LOW.toFixed(3)}, ${BLACK_HIGH.toFixed(3)}, max(c.r, max(c.g, c.b)));
  gl_FragColor = vec4(c.rgb * a, a);
}`;
  }
  return `
precision mediump float;
varying vec2 uv;
uniform sampler2D tex;
void main() {
  vec4 c = texture2D(tex, uv);
  float greenness = c.g - max(c.r, c.b);
  float a = 1.0 - smoothstep(${KEY_LOW.toFixed(3)}, ${KEY_HIGH.toFixed(3)}, greenness);
  vec3 rgb = c.rgb;
  rgb.g = min(rgb.g, max(rgb.r, rgb.b));
  gl_FragColor = vec4(rgb * a, a);
}`;
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader error");
  return s;
}

// keyColor is "green" (the green screen is removed), "black" (near-black is removed instead) or "shatter"
// (near-black is removed and the rest shows `snapshot`, a picture of the page the user was on; without a
// snapshot, shatter falls back to "black").
export default function VideoTransition({ src, keyColor = "green", snapshot = null, label, onMidpoint, onDone, onFail }) {
  const canvasRef = useRef(null);
  const cb = useRef({});
  cb.current = { onMidpoint, onDone, onFail };
  const mode = keyColor === "shatter" && !snapshot ? "black" : keyColor;
  const blackish = mode === "black" || mode === "shatter"; // black is the see-through part

  useEffect(() => {
    const canvas = canvasRef.current;
    let gl;
    let raf = 0;
    let startTimer = 0;
    let finished = false;
    let midFired = false;
    let peak = 0; // the most the clip has covered the screen so far
    const video = getVideo(src);
    const listeners = [];
    const listen = (name, fn) => {
      video.addEventListener(name, fn);
      listeners.push([name, fn]);
    };

    function fail() {
      if (finished) return;
      finished = true;
      cb.current.onFail(src);
    }

    // Some browsers reset the speed when the clip starts or restarts, so it is re-applied every time.
    const applyRate = () => {
      if (video.playbackRate !== PLAYBACK_RATE) video.playbackRate = PLAYBACK_RATE;
    };

    try {
      gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true });
      if (!gl) throw new Error("no webgl");
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fragFor(mode)));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link error");
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      const setupTexture = () => {
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        return t;
      };
      gl.activeTexture(gl.TEXTURE0);
      const tex = setupTexture(); // texture 0: the current video frame
      gl.uniform1i(gl.getUniformLocation(prog, "tex"), 0);
      let vscaleLoc = null;
      if (mode === "shatter") {
        gl.activeTexture(gl.TEXTURE1);
        setupTexture(); // texture 1: the picture of the page, uploaded once
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, snapshot);
        gl.uniform1i(gl.getUniformLocation(prog, "snap"), 1);
        vscaleLoc = gl.getUniformLocation(prog, "vscale");
        gl.activeTexture(gl.TEXTURE0);
      }

      // Tiny canvas used only to ask "how much of the screen does this frame cover?".
      const probe = document.createElement("canvas");
      probe.width = 32;
      probe.height = 18;
      const pctx = probe.getContext("2d", { willReadFrequently: true });

      const sizeCanvas = () => {
        const w = video.videoWidth || 1280;
        const h = video.videoHeight || 720;
        if (mode === "shatter") {
          // The canvas matches the screen (so the page picture lines up with the page); the clip is stretched
          // to cover it, cropped the same way CSS "cover" would.
          const sw = snapshot.width;
          const sh = snapshot.height;
          const scale = Math.min(1, 1920 / sw);
          canvas.width = Math.round(sw * scale);
          canvas.height = Math.round(sh * scale);
          const [sx, sy] = coverScale(sw, sh, w, h);
          gl.uniform2f(vscaleLoc, sx, sy);
        } else {
          const scale = Math.min(1, 1920 / w);
          canvas.width = Math.round(w * scale);
          canvas.height = Math.round(h * scale);
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
      };

      listen("error", fail);
      listen("playing", () => {
        clearTimeout(startTimer);
        applyRate();
      });
      listen("ratechange", applyRate);
      listen("ended", () => {
        if (finished) return;
        finished = true;
        if (!midFired) {
          midFired = true;
          cb.current.onMidpoint();
        }
        cb.current.onDone();
      });

      const frame = () => {
        raf = requestAnimationFrame(frame);
        if (video.readyState < 2) return;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        if (!midFired) {
          pctx.drawImage(video, 0, 0, probe.width, probe.height);
          const cover = coverageOf(pctx.getImageData(0, 0, probe.width, probe.height).data, blackish ? "black" : "green");
          peak = Math.max(peak, cover);
          const covered = cover >= (blackish ? BLACK_COVER_THRESHOLD : COVER_THRESHOLD);
          // Black-keyed clip: the glass may never cover 100%, so also swap just as the coverage starts to fall
          // after its peak (the zoom into black begins), while the screen is still mostly covered.
          const pastPeak = blackish && peak >= 0.5 && cover < peak * 0.85;
          const late = video.duration > 0 && video.currentTime >= video.duration * MID_FALLBACK;
          if (covered || pastPeak || late) {
            midFired = true;
            cb.current.onMidpoint();
          }
        }
      };

      if (video.error) throw new Error("clip could not be loaded");
      if (video.readyState >= 1) sizeCanvas();
      listen("loadedmetadata", sizeCanvas);

      startTimer = setTimeout(fail, START_TIMEOUT_MS);
      video.currentTime = 0;
      applyRate();
      const p = video.play();
      if (p && p.catch) p.catch(fail);
      applyRate();
      raf = requestAnimationFrame(frame);
    } catch (e) {
      fail();
    }

    return () => {
      finished = true;
      cancelAnimationFrame(raf);
      clearTimeout(startTimer);
      listeners.forEach(([name, fn]) => video.removeEventListener(name, fn));
      video.pause(); // the shared clip stays loaded for the next transition
      const lose = gl && gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
    };
  }, [src, mode, snapshot]);

  return (
    <div className="p5vt" role="status" aria-live="polite" aria-label={`Loading ${label}`}>
      <canvas ref={canvasRef} />
    </div>
  );
}
