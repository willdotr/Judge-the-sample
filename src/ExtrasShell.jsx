// EXTRAS: wraps the app with a separate main-menu page, the loading transition and the music player.
// The player stays mounted the whole time, so the music keeps playing across screens and transitions.
// To remove all of it, see the removal list in src/extras.css.
import { useEffect, useState } from "react";
import App from "./App.jsx";
import MainMenu from "./MainMenu.jsx";
import MusicPlayer from "./MusicPlayer.jsx";
import Transition from "./Transition.jsx";
import VideoTransition, { preloadTransitionVideo } from "./VideoTransition.jsx";
import { baselineRows, BASELINE_TRUE_MEAN } from "./experiments.js";

const LABELS = {
  menu: "Main menu",
  single: "Single sample",
  A: "Experiment A: methods",
  B: "Experiment B: sample size",
  challenge: "Challenge: reordering",
};

export default function ExtrasShell() {
  const [screen, setScreen] = useState("menu"); // "menu" or "app"
  const [openTab, setOpenTab] = useState(null); // object, so choosing the same tab again still applies
  const [trans, setTrans] = useState(null); // { target } while a transition is playing
  // The green-screen clip (public/transition/transition.mp4) is tried first. If it is missing or can't play,
  // this flips to true and the built-in CSS transition is used from then on.
  const [videoFailed, setVideoFailed] = useState(false);

  // Start loading the clip as soon as the app opens, so the first transition doesn't wait for the file.
  useEffect(() => {
    preloadTransitionVideo();
  }, []);

  // Ignore clicks while a transition is already running.
  const go = (target) => setTrans((cur) => cur || { target });

  function swapScreen() {
    if (!trans) return;
    if (trans.target === "menu") {
      setScreen("menu");
    } else {
      setOpenTab({ tab: trans.target });
      setScreen("app");
    }
  }

  return (
    <>
      <MusicPlayer />
      {screen === "menu" && <MainMenu onOpen={go} N={baselineRows.length} trueMeanValue={BASELINE_TRUE_MEAN} />}
      {/* The app stays mounted (just hidden) so settings survive a trip back to the menu. */}
      <div hidden={screen !== "app"}>
        <App openTab={openTab} onMenu={() => go("menu")} />
      </div>
      {trans && !videoFailed && (
        <VideoTransition
          label={LABELS[trans.target]}
          onMidpoint={swapScreen}
          onDone={() => setTrans(null)}
          onFail={() => setVideoFailed(true)}
        />
      )}
      {trans && videoFailed && <Transition label={LABELS[trans.target]} onMidpoint={swapScreen} onDone={() => setTrans(null)} />}
    </>
  );
}
