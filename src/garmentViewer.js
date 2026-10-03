import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

// A small turntable that shows one closet piece as a 3D model. It owns its own
// renderer so it can move between the Fashion panel and the enlarged view.
const SPIN = { autoRadiansPerSecond: 0.45, dragRadiansPerPixel: 0.011, inertiaDecayPerSecond: 3, tiltLimit: 0.6, restTilt: 0.12 };
const RESUME_AUTO_SPIN_MS = 1600;
const FRAME_MARGIN = 1.08;
const FIELD_OF_VIEW = 30;
const ENTRANCE_SECONDS = 0.6;

const loader = new GLTFLoader();
const modelCache = new Map();

export function createGarmentViewer() {
  const canvas = document.createElement("canvas");
  canvas.className = "garment-canvas";
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, 1, 0.05, 20);
  addLights(scene);
  const turntable = new THREE.Group();
  scene.add(turntable);

  const view = { yaw: 0, tilt: SPIN.restTilt, velocity: SPIN.autoRadiansPerSecond, drag: null, lastInteraction: 0, entrance: 1, size: new THREE.Vector3(1, 1, 0.1), url: null };
  const clock = new THREE.Clock(false);
  const resizeObserver = new ResizeObserver(() => fit());
  resizeObserver.observe(canvas);
  wireDrag(canvas, view);

  function fit() {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // While it spins, the widest the piece gets on screen is its width-depth diagonal.
    const halfTan = Math.tan(THREE.MathUtils.degToRad(FIELD_OF_VIEW / 2));
    const halfWidth = Math.hypot(view.size.x, view.size.z) / 2;
    const fitHeight = view.size.y / 2 / halfTan;
    const fitWidth = halfWidth / (halfTan * camera.aspect);
    camera.position.set(0, 0, (Math.max(fitHeight, fitWidth) + halfWidth) * FRAME_MARGIN);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  function tick() {
    const delta = Math.min(clock.getDelta(), 0.1);
    if (!view.drag) {
      const isResting = performance.now() - view.lastInteraction > RESUME_AUTO_SPIN_MS;
      const target = isResting ? SPIN.autoRadiansPerSecond : 0;
      view.velocity += (target - view.velocity) * (1 - Math.exp(-SPIN.inertiaDecayPerSecond * delta));
      view.yaw += view.velocity * delta;
      if (isResting) view.tilt += (SPIN.restTilt - view.tilt) * (1 - Math.exp(-2 * delta));
    }
    view.entrance = Math.min(1, view.entrance + delta / ENTRANCE_SECONDS);
    const eased = 1 - (1 - view.entrance) ** 3;
    turntable.rotation.set(view.tilt, view.yaw - (1 - eased) * 1.2, 0);
    turntable.scale.setScalar(0.85 + 0.15 * eased);
    renderer.render(scene, camera);
  }

  return {
    canvas,
    // Resolves to false when a newer show() call replaced this one first.
    async show(url) {
      view.url = url;
      const model = await loadModel(url);
      if (view.url !== url) return false;
      turntable.clear();
      turntable.add(model);
      view.size.copy(model.userData.size);
      view.yaw = -0.5;
      view.entrance = 0;
      fit();
      return true;
    },
    clear() {
      view.url = null;
      turntable.clear();
    },
    start() {
      clock.start();
      fit();
      renderer.setAnimationLoop(tick);
    },
    stop() {
      clock.stop();
      renderer.setAnimationLoop(null);
    },
    fit,
  };
}

// Models are cached and cloned so switching back to a piece is instant. The
// garments are skinned, so they are measured through their bones and cloned
// with SkeletonUtils, which rebinds each copy to its own skeleton.
function loadModel(url) {
  if (!modelCache.has(url)) {
    modelCache.set(url, loader.loadAsync(url).then(({ scene }) => {
      scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(scene, true);
      scene.position.sub(box.getCenter(new THREE.Vector3()));
      const holder = new THREE.Group().add(scene);
      holder.userData.size = box.getSize(new THREE.Vector3());
      return holder;
    }).catch((error) => {
      modelCache.delete(url);
      throw error;
    }));
  }
  return modelCache.get(url).then((holder) => {
    const copy = cloneSkinned(holder);
    copy.userData.size = holder.userData.size;
    return copy;
  });
}

function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x3a2414, 1.5));
  const key = new THREE.DirectionalLight(0xffe2b8, 2.2);
  key.position.set(1.5, 2, 2.5);
  const fill = new THREE.DirectionalLight(0xbcd2ff, 0.7);
  fill.position.set(-2, 0.5, 1.5);
  const rim = new THREE.DirectionalLight(0xffc56b, 1.4);
  rim.position.set(0, 1.5, -2.5);
  scene.add(key, fill, rim);
}

function wireDrag(canvas, view) {
  canvas.addEventListener("pointerdown", (event) => {
    view.drag = { x: event.clientX, y: event.clientY, time: performance.now() };
    view.velocity = 0;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!view.drag) return;
    const now = performance.now();
    const turn = (event.clientX - view.drag.x) * SPIN.dragRadiansPerPixel;
    view.yaw += turn;
    view.tilt = THREE.MathUtils.clamp(view.tilt + (event.clientY - view.drag.y) * SPIN.dragRadiansPerPixel, -SPIN.tiltLimit, SPIN.tiltLimit);
    view.velocity = turn / Math.max((now - view.drag.time) / 1000, 1 / 120);
    view.drag = { x: event.clientX, y: event.clientY, time: now };
    view.lastInteraction = now;
  });
  const release = () => {
    view.drag = null;
    view.lastInteraction = performance.now();
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
}
