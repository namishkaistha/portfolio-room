import { approach, slideThenTurn } from "./motion.js";
import { requireNode } from "./meshHelpers.js";

const PULLED_BOOK_NAME = "Book_005";
const PULL = { distance: 0.14, lift: 0.03, turn: 1.3, slideShare: 0.55, speed: 1.8 };

const state = { book: null, basePosition: null, baseYaw: 0, pull: 0, target: 0, onArrive: null };

export function installBookPull(roomGroup) {
  state.book = requireNode(roomGroup, PULLED_BOOK_NAME);
  state.basePosition = state.book.position.clone();
  state.baseYaw = state.book.rotation.y;
}

export function pullBookOut() {
  return moveBookTo(1);
}

export function pushBookBack() {
  return moveBookTo(0);
}

export function updateBookPull(deltaSeconds) {
  state.pull = approach(state.pull, state.target, PULL.speed * deltaSeconds);
  poseBook();
  if (state.pull !== state.target || !state.onArrive) return;
  const onArrive = state.onArrive;
  state.onArrive = null;
  onArrive();
}

function moveBookTo(target) {
  state.target = target;
  return new Promise((resolve) => {
    state.onArrive = resolve;
  });
}

function poseBook() {
  const { slide, turn } = slideThenTurn(state.pull, PULL.slideShare);
  state.book.position.set(
    state.basePosition.x,
    state.basePosition.y + PULL.lift * slide,
    state.basePosition.z + PULL.distance * slide,
  );
  state.book.rotation.y = state.baseYaw + PULL.turn * turn;
}
