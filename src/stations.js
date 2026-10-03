import { SLEEP_POSE, SPOTS } from "./roomConfig.js";
import { closeOnBackdropClick, element } from "./dom.js";
import { createViewOverlay } from "./viewOverlay.js";
import { closeIDE, dismissIDELayer, isIDEOpen, openIDE } from "./ide.js";
import { closeIframePanel, isIframePanelOpen, openIframePanel } from "./iframePanel.js";
import { closeAboutCard, isAboutCardOpen, openAboutCard } from "./aboutCard.js";
import { closeCloset, dismissClosetLayer, isClosetOpen, openCloset } from "./closetPanel.js";
import { closeNotesPanel, dismissNotesLayer, isNotesPanelOpen, openNotesPanel, preloadNotes, wireNotesPanel } from "./notesPanel.js";
import { closeCrateDigging, isCrateDiggingOpen, openCrateDigging, wireCrateDigging } from "./crateDigging.js";
import { closeBookReader, isBookReaderOpen, openBookReader, wireBookReader } from "./bookReader.js";
import { pullBookOut, pushBookBack } from "./bookPull.js";
import { closeTravelGlobe, dismissTravelLayer, isTravelGlobeOpen, openTravelGlobe, wireTravelGlobe } from "./travelGlobe.js";

const FACING_RIGHT_WALL = Math.PI / 2;
const DRESSING_TURN_SECONDS = 0.5;

// Every place in the room that opens something, keyed by hotspot id.
//   spot      where the avatar and camera go first (none: opens in place)
//   approach  runs as the visit starts, while the camera is still moving
//   open      shows the station; resolves once the visitor has closed it
//   close     closes it outright (switching stations from the menu)
//   dismiss   steps back one layer (Escape): an open card first, then the station
export function createStations({ player, closetDoors }) {
  const sleepOverlay = createViewOverlay("sleepOverlay", ["Space", "Enter"]);
  return {
    laptop: station({ spot: SPOTS.laptop, open: openIDE, close: closeIDE, dismiss: dismissIDELayer, isOpen: isIDEOpen }),
    about: station({ spot: SPOTS.about, open: openAboutCard, close: closeAboutCard, isOpen: isAboutCardOpen }),
    bed: station({ spot: SPOTS.bed, open: () => takeANap(player, sleepOverlay), close: sleepOverlay.close, isOpen: sleepOverlay.isOpen }),
    closet: station({ spot: SPOTS.closet, open: () => pickAnOutfit(player, closetDoors), close: closeCloset, dismiss: dismissClosetLayer, isOpen: isClosetOpen }),
    notes: station({ spot: SPOTS.notes, approach: preloadNotes, open: openNotesPanel, close: closeNotesPanel, dismiss: dismissNotesLayer, isOpen: isNotesPanelOpen }),
    tripod: station({ spot: SPOTS.tripod, open: () => openIframePanel("tripod"), close: closeIframePanel, isOpen: isIframePanelOpen }),
    vinyl: station({ spot: SPOTS.vinyl, open: openCrateDigging, close: closeCrateDigging, isOpen: isCrateDiggingOpen }),
    library: station({ spot: SPOTS.library, open: readABook, close: closeBookReader, isOpen: isBookReaderOpen }),
    travel: station({ spot: null, open: openTravelGlobe, close: closeTravelGlobe, dismiss: dismissTravelLayer, isOpen: isTravelGlobeOpen }),
  };
}

export function wireStations() {
  wireTravelGlobe();
  wireCrateDigging();
  wireBookReader();
  wireNotesPanel();
  element("ideClose").addEventListener("click", closeIDE);
  element("iframeClose").addEventListener("click", closeIframePanel);
  closeOnBackdropClick(element("idePanel"), dismissIDELayer);
  closeOnBackdropClick(element("iframePanel"), closeIframePanel);
  closeOnBackdropClick(element("bookReader"), closeBookReader);
  closeOnBackdropClick(element("notesPanel"), dismissNotesLayer);
}

function station({ dismiss, ...definition }) {
  return { ...definition, dismiss: dismiss ?? definition.close };
}

async function takeANap(player, sleepOverlay) {
  player.lieDown(SLEEP_POSE);
  await sleepOverlay.open();
  player.standUp();
}

async function pickAnOutfit(player, closetDoors) {
  closetDoors.open();
  await player.glideTo(SPOTS.closet.position, FACING_RIGHT_WALL, DRESSING_TURN_SECONDS);
  await openCloset();
  closetDoors.close();
}

async function readABook() {
  await pullBookOut();
  await openBookReader();
  pushBookBack();
}
