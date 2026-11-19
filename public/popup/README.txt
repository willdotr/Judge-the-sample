The transparent picture that pops up in the middle of the screen when someone clicks the small animation at the
bottom of the app's screens. Clicking anywhere (or pressing Esc) closes it.

    Jose.png         the picture for clicks 1 to 9 (keep the capital J: the live site is case-sensitive)
    Jose2.png        the picture shown for clicks 10 to 19 (keep the capital J)
    Jose3.png        the picture shown from click 20 on, with no sound effects (keep the capital J)
    open.mp3         sound effect that plays when the picture opens
    close-menu.mp3   sound effect that plays when it closes (clicking off, or pressing Esc)

(If a sound is a wav or ogg, keep its own extension and tell Claude the name.)

If Jose.png is missing, clicking the animation does nothing. If Jose2.png is missing, Jose.png is used every time. If Jose3.png is missing, Jose2.png is used
from click 10 on, and the sounds keep playing. If a sound is missing, that sound is just silent.

Look: the picture is shown at up to 80% of the window, with a soft dark backdrop. Both are in src/extras.css
(.popupimg and .popupback). The sound volumes are OPEN_VOLUME and CLOSE_VOLUME in src/FooterAnimation.jsx.

This file only keeps the folder in git. You can delete it.
