// =============================================================================
// reelMusic.js — Web Audio API music tracks for reel/highlight feature
// Generates synthetic background music with beat maps for photo transitions.
// No external audio files required.
// =============================================================================

// ---------------------------------------------------------------------------
// Track definitions
// ---------------------------------------------------------------------------

export const REEL_TRACKS = [
  { id: 'ambient',   name: 'Ambient',   desc: 'Dreamy & warm',   icon: '🌅', bpm: 120 },
  { id: 'upbeat',    name: 'Upbeat',    desc: 'Happy road trip', icon: '🚗', bpm: 130 },
  { id: 'cinematic', name: 'Cinematic', desc: 'Epic & sweeping', icon: '🎬', bpm: 90  },
  { id: 'indie',     name: 'Indie',     desc: 'Chill diary',     icon: '🎸', bpm: 110 },
  { id: 'lofi',      name: 'Lo-fi',     desc: 'Cozy nostalgia',  icon: '☕', bpm: 85  },
];

// Frequency map for musical notes (Hz)
const NOTE = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a gain envelope: attack → sustain → release */
function envelope(ctx, gain, time, attack, sustain, sustainLevel, release) {
  gain.setValueAtTime(0, time);
  gain.linearRampToValueAtTime(sustainLevel, time + attack);
  gain.setValueAtTime(sustainLevel, time + attack + sustain);
  gain.linearRampToValueAtTime(0, time + attack + sustain + release);
}

/** Create a lowpass filter for warmth */
function createFilter(ctx, freq = 2000) {
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = freq;
  filter.Q.value = 1;
  return filter;
}

/** Play a single note through the given destination node */
function playNote(ctx, dest, freq, time, duration, waveform = 'sine', volume = 0.15) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = waveform;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(dest);
  const attack = Math.min(0.05, duration * 0.1);
  const release = Math.min(0.3, duration * 0.3);
  const sustain = duration - attack - release;
  envelope(ctx, gain.gain, time, attack, sustain, volume, release);
  osc.start(time);
  osc.stop(time + duration + 0.01);
}

// ---------------------------------------------------------------------------
// Synthesizer functions — one per track style
// ---------------------------------------------------------------------------

/** Ambient: Slow warm pad chords. C → F → Am → G. ~120 BPM */
function synthAmbient(ctx, master, loopDuration) {
  const filter = createFilter(ctx, 1200);
  filter.connect(master);
  // 4 chords, each lasting one bar (2 sec at 120 BPM = 4 beats)
  const barLen = (60 / 120) * 4; // 2 seconds
  const chords = [
    [NOTE.C4, NOTE.E4, NOTE.G4],   // C major
    [NOTE.F3, NOTE.A3, NOTE.C4],   // F major
    [NOTE.A3, NOTE.C4, NOTE.E4],   // A minor
    [NOTE.G3, NOTE.B3, NOTE.D4],   // G major
  ];
  const numLoops = Math.ceil(loopDuration / (chords.length * barLen));
  for (let loop = 0; loop < numLoops; loop++) {
    chords.forEach((chord, ci) => {
      const t = (loop * chords.length + ci) * barLen;
      if (t >= loopDuration) return;
      chord.forEach(freq => playNote(ctx, filter, freq, t, barLen * 0.95, 'sine', 0.1));
    });
  }
}

/** Upbeat: Bright rhythmic plucks. ~130 BPM */
function synthUpbeat(ctx, master, loopDuration) {
  const filter = createFilter(ctx, 4000);
  filter.connect(master);
  const beatLen = 60 / 130;
  const melody = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.E5, NOTE.F5, NOTE.A5, NOTE.G5, NOTE.E5];
  const totalBeats = Math.ceil(loopDuration / beatLen);
  for (let i = 0; i < totalBeats; i++) {
    const t = i * beatLen;
    if (t >= loopDuration) break;
    const freq = melody[i % melody.length];
    playNote(ctx, filter, freq, t, beatLen * 0.4, 'triangle', 0.12);
    // Bass on strong beats (every 4)
    if (i % 4 === 0) {
      playNote(ctx, filter, freq / 4, t, beatLen * 2, 'sine', 0.08);
    }
  }
}

/** Cinematic: Deep drone with bell accents. ~90 BPM */
function synthCinematic(ctx, master, loopDuration) {
  const filter = createFilter(ctx, 900);
  filter.connect(master);
  const barLen = (60 / 90) * 4; // ~2.67 seconds
  // Sustained drone notes
  const drones = [NOTE.C3, NOTE.G3];
  const numBars = Math.ceil(loopDuration / barLen);
  for (let i = 0; i < numBars; i++) {
    const t = i * barLen;
    if (t >= loopDuration) break;
    drones.forEach(freq => playNote(ctx, filter, freq, t, barLen * 0.95, 'sawtooth', 0.04));
    // Bell accent on every other bar
    if (i % 2 === 0) {
      playNote(ctx, master, NOTE.C5, t + barLen * 0.5, 1.5, 'sine', 0.06);
      playNote(ctx, master, NOTE.G5, t + barLen * 0.75, 1.0, 'sine', 0.04);
    }
  }
}

/** Indie: Clean guitar-like plucks with soft beat. ~110 BPM */
function synthIndie(ctx, master, loopDuration) {
  const filter = createFilter(ctx, 3000);
  filter.connect(master);
  const beatLen = 60 / 110;
  const pattern = [NOTE.E4, NOTE.G4, NOTE.A4, NOTE.B4, NOTE.A4, NOTE.G4, NOTE.E4, NOTE.D4];
  const totalBeats = Math.ceil(loopDuration / beatLen);
  for (let i = 0; i < totalBeats; i++) {
    const t = i * beatLen;
    if (t >= loopDuration) break;
    const freq = pattern[i % pattern.length];
    // Plucked note — short triangle with quick decay
    playNote(ctx, filter, freq, t, beatLen * 0.6, 'triangle', 0.1);
    // Soft kick on strong beats
    if (i % 4 === 0) {
      playNote(ctx, filter, NOTE.E3, t, beatLen * 0.3, 'sine', 0.08);
    }
  }
}

/** Lo-fi: Warm muffled chords with vinyl crackle. ~85 BPM */
function synthLofi(ctx, master, loopDuration) {
  const filter = createFilter(ctx, 800); // Muffled
  filter.connect(master);
  const barLen = (60 / 85) * 4; // ~2.82 seconds
  const chords = [
    [NOTE.D4, NOTE.F4, NOTE.A4],   // Dm
    [NOTE.G3, NOTE.B3, NOTE.D4],   // G
    [NOTE.C4, NOTE.E4, NOTE.G4],   // C
    [NOTE.A3, NOTE.C4, NOTE.E4],   // Am
  ];
  const numLoops = Math.ceil(loopDuration / (chords.length * barLen));
  for (let loop = 0; loop < numLoops; loop++) {
    chords.forEach((chord, ci) => {
      const t = (loop * chords.length + ci) * barLen;
      if (t >= loopDuration) return;
      chord.forEach(freq => playNote(ctx, filter, freq, t, barLen * 0.9, 'triangle', 0.07));
    });
  }
  // Vinyl crackle: quiet noise bursts throughout
  addVinylCrackle(ctx, master, loopDuration);
}

/** Subtle noise bursts to simulate vinyl crackle texture */
function addVinylCrackle(ctx, dest, duration) {
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    // Sparse crackle: mostly silence with occasional pops
    data[i] = Math.random() < 0.002 ? (Math.random() - 0.5) * 0.3 : 0;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;
  const noiseFilter = createFilter(ctx, 5000);
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.08;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(dest);
  noise.start(0);
  noise.stop(duration);
}

// Map track IDs to their synth functions
const SYNTH_MAP = {
  ambient:   synthAmbient,
  upbeat:    synthUpbeat,
  cinematic: synthCinematic,
  indie:     synthIndie,
  lofi:      synthLofi,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns an array of strong-beat timestamps (in seconds) for the given track
 * over a specified duration. Strong beats = every bar (every 4 beats).
 */
export function getBeatTimestamps(trackId, durationSec = 60) {
  const track = REEL_TRACKS.find(t => t.id === trackId);
  if (!track) return [];
  const beatLen = 60 / track.bpm;       // seconds per beat
  const barLen = beatLen * 4;            // seconds per bar (4/4 time)
  const timestamps = [];
  for (let t = 0; t < durationSec; t += barLen) {
    timestamps.push(Math.round(t * 1000) / 1000); // round to ms precision
  }
  return timestamps;
}

/**
 * Starts playing a track using Web Audio API synthesis.
 * Returns an object with a stop() method and the underlying audioCtx.
 */
export function playTrack(trackId, durationSec = 60) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioContext();

  // Master volume
  const master = ctx.createGain();
  master.gain.value = 0.3;
  master.connect(ctx.destination);

  // Run the appropriate synthesizer
  const synthFn = SYNTH_MAP[trackId];
  if (synthFn) {
    synthFn(ctx, master, durationSec);
  }

  return {
    audioCtx: ctx,
    /** Stop playback and clean up */
    stop() {
      try {
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        setTimeout(() => ctx.close(), 350);
      } catch {
        ctx.close();
      }
    },
  };
}

/**
 * Given a track and a number of photos, returns an array of display durations
 * (in ms) for each photo, snapped to the closest strong beats.
 *
 * Constraints:
 *  - Minimum 2 seconds per photo
 *  - Maximum 6 seconds per photo
 *  - Total durations sum to totalDurationMs
 */
export function getTransitionTimings(trackId, numPhotos, totalDurationMs = 60000) {
  if (numPhotos <= 0) return [];
  if (numPhotos === 1) return [totalDurationMs];

  const totalSec = totalDurationMs / 1000;
  const beats = getBeatTimestamps(trackId, totalSec);

  // We need (numPhotos - 1) transition points between first and last beat
  // Find the best beats to place transitions on
  const minMs = 2000;
  const maxMs = 6000;
  const idealDuration = totalDurationMs / numPhotos;

  // Greedily assign each photo to the nearest beat boundary
  const transitionTimes = [0]; // start at 0
  for (let i = 1; i < numPhotos; i++) {
    const idealTime = (i * totalDurationMs) / numPhotos / 1000; // in seconds
    // Find closest beat
    let closest = idealTime;
    let bestDist = Infinity;
    for (const beat of beats) {
      const dist = Math.abs(beat - idealTime);
      if (dist < bestDist) {
        bestDist = dist;
        closest = beat;
      }
    }
    transitionTimes.push(closest);
  }
  transitionTimes.push(totalSec); // end

  // Convert to durations in ms
  let durations = [];
  for (let i = 0; i < numPhotos; i++) {
    const dur = (transitionTimes[i + 1] - transitionTimes[i]) * 1000;
    durations.push(dur);
  }

  // Enforce min/max constraints and redistribute
  durations = enforceConstraints(durations, minMs, maxMs, totalDurationMs);

  return durations;
}

/**
 * Clamp durations to [min, max] and redistribute excess to maintain total.
 */
function enforceConstraints(durations, minMs, maxMs, totalMs) {
  const n = durations.length;
  let result = [...durations];

  // Iteratively clamp and redistribute (up to 10 passes)
  for (let pass = 0; pass < 10; pass++) {
    let surplus = 0;
    let flexCount = 0;

    for (let i = 0; i < n; i++) {
      if (result[i] < minMs) {
        surplus -= (minMs - result[i]);
        result[i] = minMs;
      } else if (result[i] > maxMs) {
        surplus += (result[i] - maxMs);
        result[i] = maxMs;
      } else {
        flexCount++;
      }
    }

    if (Math.abs(surplus) < 1) break;

    // Distribute surplus among flexible slots
    if (flexCount > 0) {
      const share = surplus / flexCount;
      for (let i = 0; i < n; i++) {
        if (result[i] > minMs && result[i] < maxMs) {
          result[i] += share;
        }
      }
    }
  }

  // Final correction: ensure exact total by adjusting last element
  const currentTotal = result.reduce((sum, d) => sum + d, 0);
  result[n - 1] += totalMs - currentTotal;

  return result.map(d => Math.round(d));
}
