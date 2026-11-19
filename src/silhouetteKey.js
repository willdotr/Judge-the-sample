// EXTRAS: cuts a character out of a solid black background WITHOUT making the character's own dark parts
// see-through. Black that is connected to the edge of the picture is the background (made transparent); black
// that is enclosed inside the character (hair shadows, pupils, gaps) is part of the picture and stays solid.
// Pure JavaScript with no imports, so it also runs under Node for the automated checks.

// A pixel counts as "black" when its brightest colour channel is below this (0..1).
// Tuning: a dark halo is left around the character -> raise it a little.
//         dark parts of the character are being cut away at its edge -> lower it a little.
export const BLACK_MAX = 0.1;
// Pixels just outside the cut fade in between BLACK_MAX and BLACK_MAX * EDGE_SOFT, which softens the edge.
export const EDGE_SOFT = 3.5;

function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

// Returns apply(rgba): sets the alpha channel of an RGBA byte array (like ImageData.data) of the given size.
// Buffers are created once and reused, so it is cheap to call on every video frame.
export function createSilhouetteKey(width, height, blackMax = BLACK_MAX) {
  const n = width * height;
  const isBg = new Uint8Array(n);
  const queue = new Int32Array(n);
  const limit = Math.round(blackMax * 255);

  return function apply(rgba) {
    isBg.fill(0);
    let head = 0;
    let tail = 0;
    const bright = (i) => Math.max(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
    const seed = (i) => {
      if (!isBg[i] && bright(i) < limit) {
        isBg[i] = 1;
        queue[tail++] = i;
      }
    };

    // Start from every black pixel on the edge of the picture, then spread through connected black pixels.
    for (let x = 0; x < width; x++) {
      seed(x);
      seed((height - 1) * width + x);
    }
    for (let y = 0; y < height; y++) {
      seed(y * width);
      seed(y * width + width - 1);
    }
    while (head < tail) {
      const i = queue[head++];
      const x = i % width;
      if (x > 0) seed(i - 1);
      if (x < width - 1) seed(i + 1);
      if (i >= width) seed(i - width);
      if (i < n - width) seed(i + width);
    }

    for (let i = 0; i < n; i++) {
      let a;
      if (isBg[i]) {
        a = 0;
      } else {
        const x = i % width;
        const nextToBg =
          (x > 0 && isBg[i - 1]) ||
          (x < width - 1 && isBg[i + 1]) ||
          (i >= width && isBg[i - width]) ||
          (i < n - width && isBg[i + width]);
        a = nextToBg ? Math.round(255 * smoothstep(blackMax, blackMax * EDGE_SOFT, bright(i) / 255)) : 255;
      }
      rgba[i * 4 + 3] = a;
    }
    return rgba;
  };
}
