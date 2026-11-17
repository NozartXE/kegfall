// Synthesizes every sound effect and the generative pentatonic score in WebAudio, created lazily and silent in headless.

import { DEFAULT_SETTINGS } from './save.js';

const clamp01 = (value, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
};

const settingsFor = (settings) => ({
  music: clamp01(settings && settings.music, DEFAULT_SETTINGS.music),
  sfx: clamp01(settings && settings.sfx, DEFAULT_SETTINGS.sfx),
});

const PENTATONIC = Object.freeze([0, 3, 5, 7, 10]);
const BASE_FREQ = 220;
const MELODY_LENGTH = 16;
const STEP_TICKS = 12;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.25;

const audio = {
  ctx: null,
  master: null,
  musicBus: null,
  sfxBus: null,
  settings: { ...DEFAULT_SETTINGS },
  noise: null,
  music: null,
  unlocked: false,
};

function Ctor() {
  if (typeof globalThis === 'undefined') return null;
  return globalThis.AudioContext || globalThis.webkitAudioContext || null;
}

function ensure() {
  if (audio.ctx) return audio.ctx;
  const Audio = Ctor();
  if (!Audio) return null;
  try {
    audio.ctx = new Audio();
    audio.master = audio.ctx.createGain();
    audio.musicBus = audio.ctx.createGain();
    audio.sfxBus = audio.ctx.createGain();
    audio.musicBus.connect(audio.master);
    audio.sfxBus.connect(audio.master);
    audio.master.connect(audio.ctx.destination);
    applyGains();
    if (audio.music && audio.music.pendingMode) {
      startMusic(audio.music.pendingMode);
    }
  } catch {
    audio.ctx = null;
  }
  return audio.ctx;
}

function applyGains() {
  if (!audio.ctx) return;
  const { music, sfx } = audio.settings;
  const now = audio.ctx.currentTime;
  audio.master.gain.setTargetAtTime(music > 0 || sfx > 0 ? 0.9 : 0, now, 0.04);
  audio.musicBus.gain.setTargetAtTime(music * 0.42, now, 0.04);
  audio.sfxBus.gain.setTargetAtTime(sfx * 0.8, now, 0.04);
}

export function initAudio(settings) {
  audio.settings = settingsFor(settings || audio.settings);
  const ctx = ensure();
  if (ctx && ctx.state === 'suspended') {
    try {
      const resumed = ctx.resume();
      if (resumed && typeof resumed.catch === 'function') resumed.catch(() => {});
    } catch {
      /* headless or blocked: stay silent */
    }
  }
  if (ctx) audio.unlocked = true;
  applyGains();
  return Boolean(ctx);
}

export function setGains(settings) {
  audio.settings = settingsFor(settings || audio.settings);
  applyGains();
}

function noiseBuffer(ctx) {
  if (audio.noise) return audio.noise;
  const length = Math.floor(ctx.sampleRate * 0.6);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 0x9e3779b9;
  for (let i = 0; i < length; i += 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    data[i] = (seed / 4294967296) * 2 - 1;
  }
  audio.noise = buffer;
  return buffer;
}

function envelope(gain, t0, peak, attack, decay) {
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
}

function tone({ type = 'sine', freq = 440, freqEnd = null, gain = 0.2, attack = 0.005, decay = 0.2, delay = 0, at = null, detune = 0, bus = 'sfx' }) {
  const ctx = audio.ctx;
  if (!ctx) return;
  const t0 = Number.isFinite(at) ? at : ctx.currentTime + Math.max(0, delay);
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd && freqEnd !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + attack + decay);
  osc.detune.value = detune;
  envelope(env, t0, gain, attack, decay);
  osc.connect(env);
  env.connect(bus === 'music' ? audio.musicBus : audio.sfxBus);
  osc.start(t0);
  osc.stop(t0 + attack + decay + 0.05);
}

function burst({ gain = 0.2, freq = 1200, freqEnd = 200, attack = 0.002, decay = 0.25, delay = 0, q = 0.8, type = 'lowpass' }) {
  const ctx = audio.ctx;
  if (!ctx) return;
  const t0 = ctx.currentTime + Math.max(0, delay);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t0 + attack + decay);
  const env = ctx.createGain();
  envelope(env, t0, gain, attack, decay);
  src.connect(filter);
  filter.connect(env);
  env.connect(audio.sfxBus);
  src.start(t0);
  src.stop(t0 + attack + decay + 0.05);
}

const SFX = Object.freeze({
  place() {
    tone({ type: 'triangle', freq: 160, freqEnd: 96, gain: 0.22, decay: 0.09 });
    tone({ type: 'square', freq: 320, freqEnd: 260, gain: 0.04, decay: 0.05 });
  },
  ignite() {
    burst({ gain: 0.12, freq: 2600, freqEnd: 900, decay: 0.3, type: 'highpass' });
    tone({ type: 'sawtooth', freq: 180, freqEnd: 320, gain: 0.05, decay: 0.32 });
  },
  blast(chain) {
    const n = Math.max(1, Math.min(30, Math.floor(Number(chain) || 1)));
    const weight = Math.min(1, 0.35 + n * 0.035);
    burst({ gain: 0.35 * weight, freq: 900 + n * 60, freqEnd: 90, decay: 0.34 });
    tone({ type: 'sine', freq: 96 - n * 1.5, freqEnd: 38, gain: 0.32 * weight, decay: 0.3 });
    tone({ type: 'triangle', freq: 240 * (1 + n * 0.02), freqEnd: 70, gain: 0.08, decay: 0.2 });
  },
  strike() {
    tone({ type: 'square', freq: 880, freqEnd: 220, gain: 0.1, decay: 0.16 });
    burst({ gain: 0.16, freq: 4000, freqEnd: 600, decay: 0.2, type: 'bandpass', q: 1.6 });
  },
  breach() {
    tone({ type: 'sawtooth', freq: 130, freqEnd: 55, gain: 0.2, decay: 0.5 });
    burst({ gain: 0.12, freq: 500, freqEnd: 70, decay: 0.5 });
  },
  draft() {
    [0, 3, 7, 10].forEach((semi, i) => {
      const freq = BASE_FREQ * Math.pow(2, semi / 12) * 2;
      tone({ type: 'triangle', freq, gain: 0.12, decay: 0.3, delay: i * 0.08 });
    });
  },
  feat() {
    [0, 7, 12, 19].forEach((semi, i) => {
      const freq = BASE_FREQ * Math.pow(2, semi / 12) * 2;
      tone({ type: 'sine', freq, gain: 0.12, decay: 0.4, delay: i * 0.07 });
    });
  },
  click() {
    tone({ type: 'square', freq: 520, freqEnd: 420, gain: 0.05, decay: 0.035 });
  },
  win() {
    [0, 5, 7, 12, 15, 19, 24].forEach((semi, i) => {
      const freq = BASE_FREQ * Math.pow(2, semi / 12);
      tone({ type: 'triangle', freq, gain: 0.16, decay: 0.55, delay: i * 0.11 });
    });
  },
  lose() {
    [12, 10, 7, 3, 0].forEach((semi, i) => {
      const freq = BASE_FREQ * Math.pow(2, semi / 12) * 0.75;
      tone({ type: 'sawtooth', freq, freqEnd: freq * 0.92, gain: 0.07, decay: 0.4, delay: i * 0.16 });
    });
    burst({ gain: 0.1, freq: 300, freqEnd: 50, decay: 0.7, delay: 0.5 });
  },
});

export function sfx(name, arg) {
  if (!audio.ctx) return;
  const play = SFX[name];
  if (!play) return;
  try {
    play(arg);
  } catch {
    /* a failing voice must never break the frame */
  }
}

const mulberry = (seed) => {
  let s = (Number(seed) >>> 0) || 0x9e3779b9;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

function buildPlan(mode, seed) {
  const rand = mulberry(seed);
  const tense = mode === 'play';
  const steps = [];
  for (let i = 0; i < MELODY_LENGTH; i += 1) {
    const octave = tense ? (i % 4 === 2 ? 1 : 0) : (i % 8 === 4 ? 1 : 0);
    const degree = PENTATONIC[Math.floor(rand() * PENTATONIC.length)] + 12 * octave;
    const rest = rand() < (tense ? 0.22 : 0.14);
    steps.push({ degree, rest, accent: rand() < 0.3 });
  }
  const bass = [0, 0, 3, 3, 5, 5, 3, 3].map((semi) => semi - 12);
  return { steps, bass, tense };
}

function marimba(freq, t0, peak) {
  const ctx = audio.ctx;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
  osc.connect(env);
  env.connect(audio.musicBus);
  osc.start(t0);
  osc.stop(t0 + 1);

  const overtone = ctx.createOscillator();
  const otEnv = ctx.createGain();
  overtone.type = 'sine';
  overtone.frequency.setValueAtTime(freq * 3.02, t0);
  otEnv.gain.setValueAtTime(0.0001, t0);
  otEnv.gain.exponentialRampToValueAtTime(peak * 0.22, t0 + 0.004);
  otEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
  overtone.connect(otEnv);
  otEnv.connect(audio.musicBus);
  overtone.start(t0);
  overtone.stop(t0 + 0.3);
}

function scheduleStep(music, stepIndex, when) {
  const { plan } = music;
  const step = plan.steps[stepIndex % plan.steps.length];
  if (!step.rest) {
    const freq = BASE_FREQ * Math.pow(2, step.degree / 12);
    marimba(freq, when, step.accent ? 0.2 : 0.13);
    if (step.accent && plan.tense) marimba(freq * 2, when + 0.045, 0.05);
  }
  if (stepIndex % 2 === 0) {
    const bassSemi = plan.bass[(stepIndex / 2) % plan.bass.length];
    marimba(BASE_FREQ * 0.5 * Math.pow(2, bassSemi / 12), when, plan.tense ? 0.16 : 0.11);
  }
  if (plan.tense && stepIndex % 4 === 3) {
    tone({ type: 'sine', freq: 70, gain: 0.07, decay: 0.18, at: when, bus: 'music' });
  }
}

function pump() {
  const music = audio.music;
  const ctx = audio.ctx;
  if (!music || !ctx) return;
  if (ctx.state !== 'running') return;
  const stepDur = 0.26;
  const horizon = ctx.currentTime + SCHEDULE_AHEAD;
  let guard = 0;
  while (music.nextTime < horizon && guard < 8) {
    scheduleStep(music, music.step, music.nextTime);
    music.step += 1;
    music.nextTime += music.plan.tense ? stepDur * 0.85 : stepDur;
    guard += 1;
  }
}

export function startMusic(mode, seed) {
  const wanted = mode === 'play' ? 'play' : 'title';
  const ctx = ensure();
  if (!ctx) {
    audio.music = audio.music || { mode: null, pendingMode: wanted };
    audio.music.pendingMode = wanted;
    return;
  }
  if (audio.music && audio.music.mode === wanted && audio.music.timer) return;
  stopMusic();
  audio.music = {
    mode: wanted,
    pendingMode: wanted,
    plan: buildPlan(wanted, seed ?? (wanted === 'play' ? 11 : 7)),
    step: 0,
    nextTime: ctx.currentTime + 0.12,
    timer: null,
  };
  try {
    audio.music.timer = globalThis.setInterval(pump, LOOKAHEAD_MS);
  } catch {
    audio.music.timer = null;
  }
  pump();
}

export function stopMusic() {
  if (audio.music && audio.music.timer) {
    try {
      globalThis.clearInterval(audio.music.timer);
    } catch {
      /* ignore */
    }
  }
  if (audio.music) {
    audio.music.timer = null;
    audio.music.mode = null;
  }
  audio.music = null;
}

export function isAudioReady() {
  return Boolean(audio.ctx);
}

export const AUDIO_STEP_TICKS = STEP_TICKS;
