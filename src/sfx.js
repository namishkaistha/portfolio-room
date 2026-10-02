import { createStepCounter } from "./stepCounter.js";

const MUTED_KEY = "namish-room:sfx-muted";
const MASTER_GAIN = 0.28;
const NOISE_SECONDS = 1;
const STRIDE_METERS = 0.8;

const state = { context: null, master: null, noise: null, isMuted: readMuted() };
const advanceFootsteps = createStepCounter(STRIDE_METERS);

// Browsers only allow audio after a gesture, so the context is created on the
// first tap or key press.
export function unlockAudio() {
  if (!state.context) createContext();
  if (state.context?.state === "suspended") state.context.resume();
}

export function isMuted() {
  return state.isMuted;
}

export function setMuted(isMuted) {
  state.isMuted = isMuted;
  if (state.master) state.master.gain.value = isMuted ? 0 : MASTER_GAIN;
  writeMuted(isMuted);
}

export function updateFootsteps(position) {
  const steps = advanceFootsteps(position.x, position.z);
  for (let step = 0; step < steps; step += 1) playFootstep();
}

// A soft thud with a little scuff, varied so steps never sound identical.
export function playFootstep() {
  const pitch = 0.85 + Math.random() * 0.3;
  burst({ type: "lowpass", frequency: 420 * pitch, seconds: 0.09, volume: 0.9 });
  burst({ type: "bandpass", frequency: 1800 * pitch, seconds: 0.05, volume: 0.12, delay: 0.015 });
}

export function playKeyClick() {
  const pitch = 0.9 + Math.random() * 0.25;
  burst({ type: "highpass", frequency: 2400 * pitch, seconds: 0.03, volume: 0.45 });
  tone({ frequency: 1500 * pitch, seconds: 0.025, volume: 0.12 });
}

export function playPageTurn() {
  burst({ type: "bandpass", frequency: 1400, sweepTo: 4200, seconds: 0.28, volume: 0.5 });
  burst({ type: "highpass", frequency: 3000, seconds: 0.08, volume: 0.2, delay: 0.24 });
}

export function playRecordPull() {
  burst({ type: "lowpass", frequency: 700, sweepTo: 160, seconds: 0.26, volume: 0.55 });
  tone({ frequency: 95, seconds: 0.12, volume: 0.35, delay: 0.2 });
}

function createContext() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;
  state.context = new AudioContextClass();
  state.master = state.context.createGain();
  state.master.gain.value = state.isMuted ? 0 : MASTER_GAIN;
  state.master.connect(state.context.destination);
  state.noise = createNoiseBuffer(state.context);
}

function burst({ type, frequency, sweepTo, seconds, volume, delay = 0 }) {
  if (!canPlay()) return;
  const { context } = state;
  const start = context.currentTime + delay;
  const source = context.createBufferSource();
  source.buffer = state.noise;
  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(frequency, start);
  if (sweepTo) filter.frequency.exponentialRampToValueAtTime(sweepTo, start + seconds);
  source.connect(filter);
  filter.connect(envelope(volume, start, seconds));
  source.start(start, Math.random() * (NOISE_SECONDS - seconds), seconds);
}

function tone({ frequency, seconds, volume, delay = 0 }) {
  if (!canPlay()) return;
  const { context } = state;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.connect(envelope(volume, start, seconds));
  oscillator.start(start);
  oscillator.stop(start + seconds);
}

function envelope(volume, start, seconds) {
  const gain = state.context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + seconds * 0.15);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  gain.connect(state.master);
  return gain;
}

function canPlay() {
  return state.context !== null && state.context.state === "running" && !state.isMuted;
}

function createNoiseBuffer(context) {
  const buffer = context.createBuffer(1, context.sampleRate * NOISE_SECONDS, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;
  return buffer;
}

function readMuted() {
  try {
    return localStorage.getItem(MUTED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeMuted(isMuted) {
  try {
    localStorage.setItem(MUTED_KEY, isMuted ? "1" : "0");
  } catch {
    // Storage can be unavailable (private mode); the choice just won't persist.
  }
}
