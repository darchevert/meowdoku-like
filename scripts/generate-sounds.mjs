// Synthesizes the game's short sound effects as plain PCM WAV files —
// no external audio assets, so nothing to license or attribute (same
// reasoning as the generated Lottie animations in generate-lottie.mjs:
// real zombie-groan samples would need to come from somewhere with its
// own license terms). Run with `node scripts/generate-sounds.mjs` after
// tweaking any sound below; it overwrites assets/sounds/*.wav.
//
// These are synthesized oscillators/noise, not recordings, so the
// "growls" and "groans" below are a chiptune-ish approximation of a
// zombie voice (pitch-wobbling sawtooth/square tones plus filtered
// noise for grit) rather than a realistic vocal sample.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SAMPLE_RATE = 44100;
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

function envelope(i, n, attack, release) {
  const attackSamples = Math.max(1, Math.floor(attack * SAMPLE_RATE));
  const releaseSamples = Math.max(1, Math.floor(release * SAMPLE_RATE));
  if (i < attackSamples) return i / attackSamples;
  if (i > n - releaseSamples) return Math.max(0, (n - i) / releaseSamples);
  return 1;
}

/** A single synthesized note. `freqEnd` lets a tone glide (useful for a
 * "womp" pitch-drop), and `wave` picks the timbre. */
function tone(freq, durationSec, { wave = 'sine', amp = 0.4, attack = 0.005, release = 0.02, freqEnd } = {}) {
  const n = Math.floor(durationSec * SAMPLE_RATE);
  const samples = new Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const f = freqEnd !== undefined ? freq + (freqEnd - freq) * (i / n) : freq;
    const phase = f * t;
    let v;
    if (wave === 'square') v = Math.sign(Math.sin(2 * Math.PI * phase));
    else if (wave === 'triangle') v = 2 * Math.abs(2 * (phase % 1) - 1) - 1;
    else if (wave === 'sawtooth') v = 2 * (phase % 1) - 1;
    else v = Math.sin(2 * Math.PI * phase);
    samples[i] = v * amp * envelope(i, n, attack, release);
  }
  return samples;
}

/** A guttural "groan" — a pitch-gliding tone (freqStart -> freqEnd) with
 * an LFO wobble on top of it (vibratoRate/vibratoDepth), which is what
 * actually sells it as a voice rather than a clean synth note. Uses true
 * phase accumulation (not `tone`'s f*t shortcut) since a wobbling
 * instantaneous frequency needs integrating properly or the wobble comes
 * out as amplitude buzz instead of pitch buzz. */
function groan(freqStart, freqEnd, durationSec, opts = {}) {
  const { wave = 'sawtooth', amp = 0.35, attack = 0.02, release = 0.08, vibratoRate = 6, vibratoDepth = 10 } = opts;
  const n = Math.floor(durationSec * SAMPLE_RATE);
  const samples = new Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const baseFreq = freqStart + (freqEnd - freqStart) * (i / n);
    const vibrato = vibratoRate > 0 ? Math.sin(2 * Math.PI * vibratoRate * t) * vibratoDepth : 0;
    const f = Math.max(20, baseFreq + vibrato);
    phase += f / SAMPLE_RATE;
    let v;
    if (wave === 'square') v = Math.sign(Math.sin(2 * Math.PI * phase));
    else if (wave === 'triangle') v = 2 * Math.abs(2 * (phase % 1) - 1) - 1;
    else if (wave === 'sawtooth') v = 2 * (phase % 1) - 1;
    else v = Math.sin(2 * Math.PI * phase);
    samples[i] = v * amp * envelope(i, n, attack, release);
  }
  return samples;
}

/** One-pole low-pass IIR filter — turns harsh full-spectrum white noise
 * into a duller rumble/growl texture by cutting everything above
 * `cutoffHz`. Re-normalized afterward since filtering knocks the peak
 * amplitude down a lot. */
function lowpassFilter(samples, cutoffHz) {
  const rc = 1 / (2 * Math.PI * cutoffHz);
  const dt = 1 / SAMPLE_RATE;
  const alpha = dt / (rc + dt);
  const out = new Array(samples.length);
  out[0] = samples[0] * alpha;
  for (let i = 1; i < samples.length; i++) {
    out[i] = out[i - 1] + alpha * (samples[i] - out[i - 1]);
  }
  return out;
}

function peakAbs(samples) {
  let m = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > m) m = a;
  }
  return m || 1;
}

/** Filtered noise burst — the "grit"/breathiness layered under the
 * groans below. `lowpassHz` unset means raw hiss; low values (a few
 * hundred Hz) sound like a low rumble instead. */
function noise(durationSec, { amp = 0.3, attack = 0.005, release = 0.02, lowpassHz } = {}) {
  const n = Math.floor(durationSec * SAMPLE_RATE);
  let samples = new Array(n);
  for (let i = 0; i < n; i++) samples[i] = Math.random() * 2 - 1;
  if (lowpassHz) samples = lowpassFilter(samples, lowpassHz);
  const peak = peakAbs(samples);
  return samples.map((v, i) => (v / peak) * amp * envelope(i, n, attack, release));
}

function concat(...chunks) {
  return chunks.flat();
}

/** Pads `sec` of silence in front of a track — used to stagger layered
 * voices in `mix()` so a chorus doesn't sound like one single note. */
function delay(sec, samples) {
  return new Array(Math.floor(sec * SAMPLE_RATE)).fill(0).concat(samples);
}

/** Sums tracks sample-by-sample (zero-padding the shorter ones) rather
 * than concatenating them — how multiple "voices" or a tone-plus-noise
 * layer play at once instead of one after another. */
function mix(...tracks) {
  const len = Math.max(...tracks.map((t) => t.length));
  const out = new Array(len).fill(0);
  for (const t of tracks) {
    for (let i = 0; i < t.length; i++) out[i] += t[i];
  }
  return out;
}

function writeWav(fileName, samples) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, fileName), buffer);
  console.log('wrote', fileName, `(${(buffer.length / 1024).toFixed(1)} KB)`);
}

// Correct guess: a quick, satisfied grunt (a short upward groan plus a
// little growl grit) with a bright "ping" layered on top so it still
// reads unambiguously as positive feedback — this one fires often, so it
// stays snappy rather than doing a full "moan".
writeWav(
  'correct.wav',
  mix(
    groan(130, 240, 0.11, { amp: 0.32, vibratoRate: 16, vibratoDepth: 10, attack: 0.004, release: 0.05 }),
    noise(0.09, { amp: 0.14, lowpassHz: 450, attack: 0.002, release: 0.06 }),
    delay(0.03, tone(880, 0.07, { amp: 0.22, attack: 0.01, release: 0.05 }))
  )
);

// Wrong guess: two short, annoyed grunts ("hnh! hnh!") — harsher square
// wave, no vibrato (a growl of frustration, not a moan), each with a
// touch of noise underneath for grit.
writeWav(
  'wrong.wav',
  concat(
    mix(
      groan(180, 90, 0.09, { wave: 'square', vibratoRate: 0, amp: 0.3, attack: 0.002, release: 0.02 }),
      noise(0.09, { amp: 0.12, lowpassHz: 350, attack: 0.002, release: 0.02 })
    ),
    mix(
      groan(150, 70, 0.13, { wave: 'square', vibratoRate: 0, amp: 0.3, attack: 0.002, release: 0.04 }),
      noise(0.13, { amp: 0.12, lowpassHz: 350, attack: 0.002, release: 0.04 })
    )
  )
);

// Level won: a small horde cheering — three groaning "voices" at
// slightly different pitches/timings/waveforms (the mismatch is what
// makes it read as a crowd rather than one thick note), all rising,
// plus a low rumble underneath.
writeWav(
  'win.wav',
  mix(
    groan(140, 320, 0.5, { amp: 0.28, vibratoRate: 6, vibratoDepth: 14, attack: 0.03, release: 0.15 }),
    delay(0.05, groan(160, 300, 0.5, { amp: 0.24, vibratoRate: 7.5, vibratoDepth: 12, attack: 0.03, release: 0.15 })),
    delay(0.1, groan(190, 360, 0.45, { wave: 'square', amp: 0.2, vibratoRate: 5, vibratoDepth: 16, attack: 0.03, release: 0.15 })),
    noise(0.55, { amp: 0.09, lowpassHz: 600, attack: 0.05, release: 0.2 })
  )
);

// Level lost: one long defeated groan sliding down into a low rumble
// that fades out — the zombie equivalent of a slumping "aw, man."
writeWav(
  'lose.wav',
  mix(
    groan(220, 70, 0.55, { amp: 0.32, vibratoRate: 4, vibratoDepth: 10, attack: 0.02, release: 0.25 }),
    delay(0.15, noise(0.5, { amp: 0.12, lowpassHz: 200, attack: 0.1, release: 0.3 }))
  )
);
