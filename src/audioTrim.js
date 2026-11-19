// EXTRAS: finds how much silence is at the start of a sound, so playback can skip it and the sound starts the
// instant it is triggered. Pure JavaScript with no imports, so it also runs under Node for the automated checks.

// samples: one channel of audio as numbers between -1 and 1. Returns the number of seconds to skip.
//  - threshold: a sample quieter than this counts as silence.
//  - keepSeconds: a tiny lead-in kept before the first loud sample so the very start isn't clipped.
//  - maxSeconds: never skip more than this, in case a sound starts quietly on purpose.
export function leadingSilenceSeconds(samples, sampleRate, threshold = 0.01, keepSeconds = 0.003, maxSeconds = 0.6) {
  let first = -1;
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) > threshold) {
      first = i;
      break;
    }
  }
  if (first < 0) return 0; // all silent: leave it alone
  return Math.min(maxSeconds, Math.max(0, first / sampleRate - keepSeconds));
}

// Same, looking at every channel and using the earliest sound found. channels: array of sample arrays.
export function leadingSilenceOfChannels(channels, sampleRate, threshold, keepSeconds, maxSeconds) {
  let best = Infinity;
  for (const ch of channels) {
    const t = leadingSilenceSeconds(ch, sampleRate, threshold, keepSeconds, maxSeconds);
    // A silent channel returns 0, so only trust it when it actually contains sound.
    if (ch.some((v) => Math.abs(v) > (threshold ?? 0.01))) best = Math.min(best, t);
  }
  return best === Infinity ? 0 : best;
}
