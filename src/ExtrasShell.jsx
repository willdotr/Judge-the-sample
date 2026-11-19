// EXTRAS: wraps the app with a separate main-menu page, the loading transitions and the music player.
// The player stays mounted the whole time, so the music keeps playing across screens and transitions.
// To remove all of it, see the removal list in src/extras.css.
import { useEffect, useRef, useState } from "react";
import App from "./App.jsx";
import { capturePage } from "./pageSnapshot.js";
import MainMenu from "./MainMenu.jsx";
import MusicPlayer from "./MusicPlayer.jsx";
import FooterAnimation from "./FooterAnimation.jsx";
import Transition from "./Transition.jsx";
import VideoTransition, { preloadTransitionVideo, clipUrl } from "./VideoTransition.jsx";
import { baselineRows, BASELINE_TRUE_MEAN } from "./experiments.js";

const LABELS = {
  menu: "Main menu",
  single: "Single sample",
  A: "Experiment A: methods",
  B: "Experiment B: sample size",
  challenge: "Challenge: reordering",
};

// Green-screen clips in public/transition/.
//  - DEFAULT_CLIP is the normal subway transition. It plays when you leave the main menu to enter the app.
//  - BACK_CLIPS play only when you go BACK to the main menu. Each time, one of them is picked at random. If the
//    picked one is missing or can't play, the other is tried, and then the default clip.
//  - CLIPS are the section transitions. They play only when you move between sections INSIDE the app
//    (the tabs), and only for sections that have a clip. A section without a clip switches instantly.
// To give another section its own clip, put the file in public/transition/ and add a line here, for example:
//   B: "experiment-b.mp4", challenge: "challenge.mp4", single: "single-sample.mp4"
const DEFAULT_CLIP = "transition.mp4";
const BACK_CLIPS = ["back-to-menu.mp4", "back-to-menu-2.mp4"];
// Each back clip starts fading out this many milliseconds before it ends (it dims while still playing).
// Raise it for a longer, gentler fade; set it to 0 for no early fade.
const BACK_FADE_MS = 450;
const CLIPS = { single: "single-sample.mp4", A: "experiment-a.mp4", B: "experiment-b.mp4", challenge: "challenge.mp4" };
// How each clip is keyed. Everything not listed here is a green screen.
//  - "shatter" (the Challenge clip): the clip is glass shards that shatter and zoom into black. The shards show a
//    picture of the page the user was on (taken just before the transition), and the black is the new page
//    underneath. If the picture can't be taken, the shards are plain red glass instead.
//  - "black": near-black is see-through, with no page picture.
const KEY_COLOR = { challenge: "shatter" };

// The star icon (public/icon/star.png) replaces the drawn spinning stars. If it can't be loaded, the drawn stars stay.
const STAR_ICON = `${import.meta.env.BASE_URL}icon/star.png`;

export default function ExtrasShell() {
  const [screen, setScreen] = useState("menu"); // "menu" or "app"
  const [openTab, setOpenTab] = useState(null); // object, so choosing the same tab again still applies
  // { target, kind } while a transition is playing. kind: "enter" (menu to app), "back" (app to menu) or
  // "tab" (between sections inside the app).
  const [trans, setTrans] = useState(null);
  const [failedClips, setFailedClips] = useState([]); // clip addresses that are missing or can't play
  const snapRef = useRef(null); // { target, at, promise }: a picture of the current page, taken ahead of a click

  // Load the star icon. Once it has loaded, the stars switch to it (see "has-star-icon" in extras.css).
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      document.documentElement.style.setProperty("--star-icon", `url("${STAR_ICON}")`);
      document.body.classList.add("has-star-icon");
    };
    img.src = STAR_ICON;
    return () => document.body.classList.remove("has-star-icon");
  }, []);

  // Start loading the default clip as soon as the app opens, so the first transition doesn't wait for it.
  useEffect(() => {
    preloadTransitionVideo(clipUrl(DEFAULT_CLIP));
  }, []);

  // Once inside the app, load every section clip ahead of time so moving between sections doesn't wait.
  useEffect(() => {
    if (screen === "app") [...Object.values(CLIPS), ...BACK_CLIPS].forEach((name) => preloadTransitionVideo(clipUrl(name)));
  }, [screen]);

  // Main menu <-> app. Ignores clicks while a transition is already running.
  // For a trip back to the menu, one of the back clips is picked at random here, once, so it stays the same for the
  // whole transition.
  const go = (target) =>
    setTrans(
      (cur) =>
        cur ||
        (target === "menu"
          ? { target, kind: "back", pick: Math.floor(Math.random() * BACK_CLIPS.length) }
          : { target, kind: "enter" })
    );

  // Moving between sections inside the app (the tab buttons).
  const currentTab = openTab ? openTab.tab : "single";
  // Take the picture of the current page as soon as the pointer reaches a section's tab (and again when it is
  // pressed), so it is ready by the time the click lands.
  const prepare = (target) => {
    if (trans || target === currentTab || KEY_COLOR[target] !== "shatter") return;
    snapRef.current = { target, at: Date.now(), promise: capturePage() };
  };
  const navigate = (target) => {
    if (trans || target === currentTab) return;
    const url = CLIPS[target] && clipUrl(CLIPS[target]);
    if (!url || failedClips.includes(url)) {
      setOpenTab({ tab: target }); // no clip for this section: switch straight away
    } else if (KEY_COLOR[target] === "shatter") {
      const ready = snapRef.current;
      const promise = ready && ready.target === target && Date.now() - ready.at < 5000 ? ready.promise : capturePage();
      snapRef.current = null;
      setTrans({ target, kind: "tab", pending: true, snapshot: null }); // waits for the picture, if it isn't ready
      promise.then((snapshot) =>
        setTrans((cur) => (cur && cur.target === target && cur.pending ? { ...cur, pending: false, snapshot } : cur))
      );
    } else {
      setTrans({ target, kind: "tab" });
    }
  };

  function swapScreen() {
    if (!trans) return;
    if (trans.kind === "back") {
      setScreen("menu");
    } else {
      setOpenTab({ tab: trans.target });
      setScreen("app");
    }
  }

  // Which clip plays: the section's own clip for a tab change; the randomly picked back clip (then the other back
  // clip, then the default clip) for a trip back to the menu; the default clip for entering the app from the menu.
  // The first one that works is used.
  const wantedClips = !trans
    ? []
    : trans.kind === "tab"
      ? [CLIPS[trans.target]]
      : trans.kind === "back"
        ? [BACK_CLIPS[trans.pick || 0], ...BACK_CLIPS.filter((_, i) => i !== (trans.pick || 0)), DEFAULT_CLIP]
        : [DEFAULT_CLIP];
  const clip = wantedClips.filter(Boolean).map(clipUrl).find((u) => !failedClips.includes(u)) || null;
  const markFailed = (u) => setFailedClips((list) => (list.includes(u) ? list : [...list, u]));

  // A section clip that can't play: just switch sections without a transition.
  useEffect(() => {
    if (trans && trans.kind === "tab" && !clip) {
      setOpenTab({ tab: trans.target });
      setTrans(null);
    }
  }, [trans, clip]);

  return (
    <>
      <MusicPlayer />
      {screen === "menu" && <MainMenu onOpen={go} N={baselineRows.length} trueMeanValue={BASELINE_TRUE_MEAN} />}
      {/* The app stays mounted (just hidden) so settings survive a trip back to the menu. */}
      <div hidden={screen !== "app"}>
        <div className="appframe">
          <App openTab={openTab} onMenu={() => go("menu")} onNavigate={navigate} onPrepare={prepare} />
          {/* Mounted only while the app is showing, so it starts playing each time you come in from the menu. */}
          {screen === "app" && <FooterAnimation />}
        </div>
      </div>
      {trans && clip && !trans.pending && (
        <VideoTransition
          key={clip}
          src={clip}
          keyColor={trans.kind === "tab" ? KEY_COLOR[trans.target] || "green" : "green"}
          snapshot={trans.snapshot || null}
          fadeBeforeEndMs={trans.kind === "back" && BACK_CLIPS.some((name) => clip === clipUrl(name)) ? BACK_FADE_MS : 0}
          label={LABELS[trans.target]}
          onMidpoint={swapScreen}
          onDone={() => setTrans(null)}
          onFail={markFailed}
        />
      )}
      {trans && !clip && trans.kind !== "tab" && (
        <Transition label={LABELS[trans.target]} onMidpoint={swapScreen} onDone={() => setTrans(null)} />
      )}
    </>
  );
}
