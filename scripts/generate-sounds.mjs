// Synthesizes the game's short sound effects as plain PCM WAV files —
// no external audio assets, so nothing to license or attribute. Run with
// `node scripts/generate-sounds.mjs` after tweaking any sound below; it
// overwrites assets/sounds/*.wav.
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

function concat(...chunks) {
  return chunks.flat();
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

// Correct guess: a quick cheerful two-note upward chirp.
writeWav(
  'correct.wav',
  concat(
    tone(880, 0.07, { amp: 0.5 }),
    tone(1318.51, 0.11, { amp: 0.45, release: 0.04 })
  )
);

// Wrong guess: a short, low double buzz.
writeWav(
  'wrong.wav',
  concat(
    tone(220, 0.09, { wave: 'square', amp: 0.28, attack: 0.002, release: 0.015 }),
    tone(160, 0.13, { wave: 'square', amp: 0.28, attack: 0.002, release: 0.03 })
  )
);

// Level won: a bright ascending major arpeggio.
writeWav(
  'win.wav',
  concat(
    tone(523.25, 0.13, { amp: 0.42, release: 0.02 }), // C5
    tone(659.25, 0.13, { amp: 0.42, release: 0.02 }), // E5
    tone(783.99, 0.13, { amp: 0.42, release: 0.02 }), // G5
    tone(1046.5, 0.26, { amp: 0.45, release: 0.1 }) // C6
  )
);

// Level lost: a soft descending run ending in a downward pitch-drop.
writeWav(
  'lose.wav',
  concat(
    tone(392.0, 0.16, { wave: 'triangle', amp: 0.4, release: 0.03 }), // G4
    tone(329.63, 0.16, { wave: 'triangle', amp: 0.4, release: 0.03 }), // E4
    tone(261.63, 0.32, { wave: 'triangle', amp: 0.4, release: 0.1, freqEnd: 196 }) // C4 -> G3 womp
  )
);
