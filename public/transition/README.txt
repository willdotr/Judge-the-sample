Put your green-screen video in this folder and name it exactly:

    transition.mp4

The app plays it full screen when you open a page from the main menu, and removes the green
live in the browser. It plays muted (your music player keeps playing).

If the file is missing or can't be played, the app uses its built-in CSS loading transition instead.

Tuning the green removal (src/chromaKey.js):
  - green still showing  -> lower KEY_LOW and KEY_HIGH a little
  - parts of the picture disappearing -> raise them a little

The screen underneath swaps automatically at the moment the clip fully covers the screen.

This file only keeps the folder in git. You can delete it.
