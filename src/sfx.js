import { createStepCounter } from "./stepCounter.js";
import { createVariantPicker } from "./variantPicker.js";

const MUTED_KEY = "namish-room:sfx-muted";
const MASTER_GAIN = 0.7;
const STRIDE_METERS = 0.8;

// Real recordings (CC0, Kenney.nl) cut into small clips. Each kind has a base
// gain because the sources were recorded at very different levels, and a pitch
// range so repeats never sound identical.
const SOUNDS = {
  step: { files: ["step-1", "step-2", "step-3", "step-4", "step-5"], gain: 0.9, pitch: [0.9, 1.1] },
  key: { files: ["key-1", "key-2", "key-3", "key-4", "key-5"], gain: 0.55, pitch: [0.92, 1.15] },
  page: { files: ["page-1", "page-2", "page-3"], gain: 1.5, pitch: [0.96, 1.04] },
  record: { files: ["record-1", "record-2"], gain: 1.1, pitch: [0.97, 1.03] },
};

const state = { context: null, master: null, buffers: new Map(), pickers: {}, isMuted: readMuted() };
const advanceFootsteps = createStepCounter(STRIDE_METERS);

for (const [kind, { files }] of Object.entries(SOUNDS)) state.pickers[kind] = createVariantPicker(files, Math.random);

// Browsers only allow audio after a gesture, so the context is created on the
// first tap or key press and the clips are fetched then.
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
  for (let step = 0; step < steps; step += 1) play("step");
}

export function playKeyClick() {
  play("key");
}

export function playPageTurn() {
  play("page");
}

export function playRecordPull() {
  play("record");
}

function play(kind) {
  if (!canPlay()) return;
  const buffer = state.buffers.get(state.pickers[kind]());
  if (!buffer) return;
  const { gain, pitch } = SOUNDS[kind];
  const source = state.context.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = pitch[0] + Math.random() * (pitch[1] - pitch[0]);
  const level = state.context.createGain();
  level.gain.value = gain;
  source.connect(level);
  level.connect(state.master);
  source.start();
}

function createContext() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;
  state.context = new AudioContextClass();
  state.master = state.context.createGain();
  state.master.gain.value = state.isMuted ? 0 : MASTER_GAIN;
  state.master.connect(state.context.destination);
  loadAllClips();
}

async function loadAllClips() {
  const names = Object.values(SOUNDS).flatMap(({ files }) => files);
  await Promise.all(names.map(loadClip));
}

async function loadClip(name) {
  try {
    const response = await fetch(`/sfx/${name}.mp3`);
    if (!response.ok) throw new Error(`status ${response.status}`);
    state.buffers.set(name, await state.context.decodeAudioData(await response.arrayBuffer()));
  } catch (error) {
    console.warn(`sound effect ${name} unavailable:`, error.message);
  }
}

function canPlay() {
  return state.context !== null && state.context.state === "running" && !state.isMuted;
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
