Green-screen transition videos go in this folder. The app removes the green live in the browser and plays
each clip muted (your music player keeps playing).

When each clip plays:

    transition.mp4     The normal subway transition. Plays when you pick something on the main menu and
                       when you go back to the main menu.
    experiment-a.mp4   Plays when you move to Experiment A from another section INSIDE the app (the tab buttons).
    experiment-b.mp4   Plays when you move to Experiment B from another section INSIDE the app.
    single-sample.mp4  Plays when you move to Single sample from another section INSIDE the app.
    challenge.mp4      Plays when you move to Challenge from another section INSIDE the app. This one is NOT a green
                       screen. It is glass shards that shatter and zoom into black. The shards show a picture of the
                       page you were on, and the black is see-through, so the Challenge page shows through it.
                       (If the picture of the page can't be taken, the shards are plain red glass instead.)

Moving between sections inside the app only plays a transition for sections that have their own clip.
A section without a clip switches instantly.

(A new name only starts to be used once a line for it is added in src/ExtrasShell.jsx.)

If transition.mp4 is missing or can't be played, the app uses its built-in CSS loading transition for the
main-menu trips instead. If a section clip is missing or can't be played, that section just switches instantly.

Tuning the see-through part (src/chromaKey.js):
  Green clips:
    - green still showing  -> lower KEY_LOW and KEY_HIGH a little
    - parts of the picture disappearing -> raise them a little
  Challenge clip (black is see-through; how strongly the clip's own red tints the page pieces is SHATTER_TINT in
  src/VideoTransition.jsx):
    - dark parts of the glass still showing as black -> raise BLACK_LOW and BLACK_HIGH a little
    - the red glass looks eaten or too see-through -> lower them a little

The screen underneath swaps automatically at the moment each clip fully covers the screen.
Playback speed is PLAYBACK_RATE in src/VideoTransition.jsx.

This file only keeps the folder in git. You can delete it.
