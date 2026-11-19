// EXTRAS: plays public/transition/transition.mp4 full screen as a loading transition and removes its green
// screen live in the browser (a small WebGL shader). If the file is missing, can't play, or WebGL is not
// available, it calls onFail and the app uses the built-in CSS transition (src/Transition.jsx) instead.
// To remove it, see the removal list in src/extras.css.
import { useEffect, useRef } from "react";
import { KEY_LOW, KEY_HIGH, coverageOf } from "./chromaKey.js";

const VIDEO_URL = `${import.meta.env.BASE_URL}transition/transition.mp4`;
const PLAYBACK_RATE = 2; // 1 = normal speed; 1.5 = 50% faster; 2 = twice as fast. Browsers allow roughly 0.25 to 4.
const COVER_THRESHOLD = 0.97; // the screen underneath is swapped the first time the clip covers this much
const MID_FALLBACK = 0.6; // ...or at this fraction of the clip if it never covers the whole screen
const START_TIMEOUT_MS = 4000; // give up (and use the CSS transition) if the clip hasn't started by then

// One shared <video>, created and loaded when the app opens, so a click never waits for the file to load.
let sharedVideo = null;
function getVideo() {
  if (!sharedVideo) {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.defaultPlaybackRate = PLAYBACK_RATE; // loading a source resets playbackRate to this default
    v.playbackRate = PLAYBACK_RATE;
    v.src = VIDEO_URL;
    sharedVideo = v;
  }
  return sharedVideo;
}
export function preloadTransitionVideo() {
  try {
    getVideo();
  } catch (e) {
    /* ignored: the CSS transition is used if the clip can't be used */
  }
}

const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() {
  uv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5);
  gl_Position = vec4(p, 0.0, 1.0);
}`;

// Same maths as keyAlpha() in chromaKey.js, plus a little despill so green fringes turn neutral.
const FRAG = `
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

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader error");
  return s;
}

export default function VideoTransition({ label, onMidpoint, onDone, onFail }) {
  const canvasRef = useRef(null);
  const cb = useRef({});
  cb.current = { onMidpoint, onDone, onFail };

  useEffect(() => {
    const canvas = canvasRef.current;
    let gl;
    let raf = 0;
    let startTimer = 0;
    let finished = false;
    let midFired = false;
    const video = getVideo();
    const listeners = [];
    const listen = (name, fn) => {
      video.addEventListener(name, fn);
      listeners.push([name, fn]);
    };

    function fail() {
      if (finished) return;
      finished = true;
      cb.current.onFail();
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
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link error");
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      // Tiny canvas used only to ask "how much of the screen does this frame cover?".
      const probe = document.createElement("canvas");
      probe.width = 32;
      probe.height = 18;
      const pctx = probe.getContext("2d", { willReadFrequently: true });

      const sizeCanvas = () => {
        const w = video.videoWidth || 1280;
        const h = video.videoHeight || 720;
        const scale = Math.min(1, 1920 / w);
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
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
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        if (!midFired) {
          pctx.drawImage(video, 0, 0, probe.width, probe.height);
          const covered = coverageOf(pctx.getImageData(0, 0, probe.width, probe.height).data) >= COVER_THRESHOLD;
          const late = video.duration > 0 && video.currentTime >= video.duration * MID_FALLBACK;
          if (covered || late) {
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
  }, []);

  return (
    <div className="p5vt" role="status" aria-live="polite" aria-label={`Loading ${label}`}>
      <canvas ref={canvasRef} />
    </div>
  );
}
