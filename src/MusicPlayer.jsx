// EXTRAS: music player fixed at the top right. Plays one looping mp3 that you add yourself at
// public/music/theme.mp3. To remove it, see the removal list in src/extras.css.
import { useEffect, useRef, useState } from "react";

const TRACK_URL = `${import.meta.env.BASE_URL}music/theme.mp3`;
const TRACK_TITLE = "The Days When My Mother Was There";

export default function MusicPlayer() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      // Browsers only allow sound after a click, so playback always starts from this button.
      audio.play().catch(() => setMissing(true));
    }
  }

  return (
    <div className="p5player" role="region" aria-label="Music player">
      <audio
        ref={audioRef}
        src={TRACK_URL}
        loop
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onCanPlay={() => setMissing(false)}
        onError={() => setMissing(true)}
      />
      <div className="p5player-top">
        <span className="p5player-star">★</span>
        <span className="p5player-title">{playing ? "Now playing" : "Music"}</span>
        <span className={"p5eq" + (playing ? " on" : "")} aria-hidden="true">
          <i /><i /><i /><i />
        </span>
      </div>
      {missing ? (
        <div className="p5player-missing">
          No music file found. Add an mp3 at <code>public/music/theme.mp3</code>.
        </div>
      ) : (
        <div className="p5player-track">{TRACK_TITLE}</div>
      )}
      <div className="p5player-controls">
        <button onClick={toggle} disabled={missing} aria-label={playing ? "Pause music" : "Play music"}>
          {playing ? "❚❚ Pause" : "▶ Play"}
        </button>
        <label>
          <span className="sr">Volume</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
          />
        </label>
      </div>
    </div>
  );
}
