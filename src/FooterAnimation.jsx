// EXTRAS: a small looping animation shown directly on the page at the bottom of every screen except the main menu.
// The clip (public/footer/animation.mp4) is a character in the bottom-right corner of a solid black frame. Each frame
// is cropped to that corner and the black background is cut away (src/silhouetteKey.js), so the character appears
// straight on the screen. Black that is enclosed inside the character is kept, so its dark hair is not cut out.
// Clicking the animation pops a picture (public/popup/Jose.png) up in the middle of the screen; clicking anywhere or
// pressing Esc closes it. If the file is missing, nothing is shown. To remove it, see the removal list in src/extras.css.
import { useEffect, useRef, useState } from "react";
import { createSilhouetteKey } from "./silhouetteKey.js";
import { leadingSilenceOfChannels } from "./audioTrim.js";

const CLIP = `${import.meta.env.BASE_URL}footer/animation.mp4`;
const POPUP = `${import.meta.env.BASE_URL}popup/Jose.png`;
// Which picture the animation shows depends on how many times it has been clicked:
//   clicks 1 to 9   Jose.png
//   clicks 10 to 19 Jose2.png
//   click 20 and on Jose3.png, and from there on the sound effects stay silent
const POPUP_2 = `${import.meta.env.BASE_URL}popup/Jose2.png`;
const POPUP_3 = `${import.meta.env.BASE_URL}popup/Jose3.png`;
const CLICKS_FOR_SECOND_PICTURE = 10;
const CLICKS_FOR_THIRD_PICTURE = 20;
// Counts clicks on the animation. It lives outside the component so it keeps counting when you go to the main
// menu and back; it starts again from zero when the page is reloaded.
let clickCount = 0;
// Sound effects for the picture: one when it opens, one when it closes. A missing file is just silent.
const OPEN_SOUND = `${import.meta.env.BASE_URL}popup/open.mp3`;
const CLOSE_SOUND = `${import.meta.env.BASE_URL}popup/close-menu.mp3`;
// Volumes for the two sounds: 0 = silent, 1 = full volume.
const OPEN_VOLUME = 0.8;
const CLOSE_VOLUME = 0.1;
// The character sits in the corner of the frame: use the right 22% and the bottom 42% of it.
const CROP_X = 0.78;
const CROP_Y = 0.58;

export default function FooterAnimation() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false); // the picture is showing
  const [closing, setClosing] = useState(false); // ...and is fading away
  const [popupMissing, setPopupMissing] = useState(false);
  const [popup2Missing, setPopup2Missing] = useState(false);
  const [popup3Missing, setPopup3Missing] = useState(false);
  const [shown, setShown] = useState(POPUP); // which picture the open popup is showing
  // Sound effects play through the Web Audio system, which starts a sound the instant it is asked to. The files are
  // loaded and decoded ahead of time, and any silence at the very start of a file is skipped, so there is no delay.
  const audioCtx = useRef(null);
  const buffers = useRef({});

  useEffect(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return undefined;
    const ctx = new AudioContextClass();
    audioCtx.current = ctx;

    // Browsers start audio "asleep" until the visitor does something. Waking it on the first click or key press
    // anywhere means it is already awake by the time they reach the animation.
    const wake = () => {
      if (ctx.state === "suspended") ctx.resume();
    };
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);

    const load = async (name, url, volume) => {
      try {
        const response = await fetch(url);
        if (!response.ok) return;
        const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
        const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c));
        buffers.current[name] = { buffer, volume, skip: leadingSilenceOfChannels(channels, buffer.sampleRate) };
      } catch (e) {
        /* a missing or unreadable file is simply silent */
      }
    };
    load("open", OPEN_SOUND, OPEN_VOLUME);
    load("close", CLOSE_SOUND, CLOSE_VOLUME);

    return () => {
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
      ctx.close();
      audioCtx.current = null;
    };
  }, []);

  const play = (name) => {
    const ctx = audioCtx.current;
    const sound = buffers.current[name];
    if (!ctx || !sound) return;
    try {
      if (ctx.state === "suspended") ctx.resume();
      const source = ctx.createBufferSource();
      source.buffer = sound.buffer;
      const gain = ctx.createGain();
      gain.gain.value = sound.volume;
      source.connect(gain).connect(ctx.destination);
      source.start(0, sound.skip); // start at once, skipping any silence at the beginning of the file
    } catch (e) {
      /* ignored */
    }
  };

  // Check the picture exists, so a click does nothing (instead of showing a broken picture) when it is missing.
  useEffect(() => {
    const img = new Image();
    img.onerror = () => setPopupMissing(true);
    img.src = POPUP;
    const img2 = new Image(); // the second picture is loaded ahead of time too, so it appears instantly
    img2.onerror = () => setPopup2Missing(true);
    img2.src = POPUP_2;
    const img3 = new Image();
    img3.onerror = () => setPopup3Missing(true);
    img3.src = POPUP_3;
  }, []);

  const close = () => {
    if (closing) return;
    if (shown !== POPUP_3) play("close"); // clicking off and pressing Esc both come through here (silent for Jose3)
    setClosing(true);
    setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, 180);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closing]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let keyer = null;
    let crop = null;
    let timer = 0;
    let alive = true;

    const setup = () => {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;
      const sx = Math.floor(vw * CROP_X);
      const sy = Math.floor(vh * CROP_Y);
      crop = { sx, sy, sw: vw - sx, sh: vh - sy };
      canvas.width = crop.sw;
      canvas.height = crop.sh;
      keyer = createSilhouetteKey(crop.sw, crop.sh);
    };

    // Copy the character's corner of the current frame onto the canvas, then cut the black away.
    const draw = () => {
      if (!keyer || video.readyState < 2) return;
      ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.sw, crop.sh);
      const frame = ctx.getImageData(0, 0, crop.sw, crop.sh);
      keyer(frame.data);
      ctx.putImageData(frame, 0, 0);
    };

    const loop = () => {
      if (!alive) return;
      draw();
      if (video.requestVideoFrameCallback) timer = video.requestVideoFrameCallback(loop);
      else timer = requestAnimationFrame(loop);
    };

    video.addEventListener("loadedmetadata", setup);
    if (video.readyState >= 1) setup();
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
    loop();

    return () => {
      alive = false;
      video.removeEventListener("loadedmetadata", setup);
      if (video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(timer);
      cancelAnimationFrame(timer);
      video.pause();
    };
  }, []);

  if (failed) return null;
  return (
    <div className="footband">
      <button
        type="button"
        className="footanim"
        aria-label="Show the picture"
        style={{ cursor: popupMissing ? "default" : "pointer" }}
        onClick={() => {
          if (popupMissing) return;
          clickCount += 1;
          let picture = POPUP;
          if (clickCount >= CLICKS_FOR_SECOND_PICTURE && !popup2Missing) picture = POPUP_2;
          if (clickCount >= CLICKS_FOR_THIRD_PICTURE && !popup3Missing) picture = POPUP_3;
          setShown(picture);
          if (picture !== POPUP_3) play("open"); // Jose has gone quiet: no sound effects once Jose3 shows
          setOpen(true);
        }}
      >
        {/* The video itself is kept invisible; the keyed canvas below is what you see. */}
        <video ref={videoRef} src={CLIP} loop muted playsInline preload="auto" onError={() => setFailed(true)} />
        <canvas ref={canvasRef} />
      </button>
      {open && (
        <div className={"popupback" + (closing ? " closing" : "")} onClick={close} role="dialog" aria-label="Picture">
          <img
            className="popupimg"
            src={shown}
            alt=""
            onError={() => {
              // A missing later picture falls back to the one before it.
              if (shown === POPUP_3) setShown(POPUP_2);
              else if (shown === POPUP_2) setShown(POPUP);
              else setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
