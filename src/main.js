import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/PointerLockControls.js';

import { World } from './world.js';
import { BLOCK_TYPES } from './blocks.js';
import { loadWorld, saveWorld } from './storage.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 60, 200);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);

const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
sunLight.position.set(50, 80, 30);
sunLight.castShadow = true;
const shadowSize = 80;
sunLight.shadow.camera.left = -shadowSize;
sunLight.shadow.camera.right = shadowSize;
sunLight.shadow.camera.top = shadowSize;
sunLight.shadow.camera.bottom = -shadowSize;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 200;
scene.add(sunLight);

const world = new World(scene);
const savedWorld = loadWorld();
if (savedWorld) {
  world.load(savedWorld);
}
const spawnPosition = world.getSpawnPosition();
controls.getObject().position.copy(spawnPosition);

const overlayEl = document.getElementById('overlay');
const hudEl = document.getElementById('hud');
const startButton = document.getElementById('startButton');
const blockSelectorEl = document.getElementById('blockSelector');
const saveStatusEl = document.getElementById('saveStatus');

let saveStatusTimeout = null;
function showSaveStatus(message, isError = false) {
  if (!saveStatusEl) return;
  saveStatusEl.textContent = message;
  saveStatusEl.classList.toggle('error', isError);
  saveStatusEl.classList.add('visible');
  clearTimeout(saveStatusTimeout);
  saveStatusTimeout = setTimeout(() => {
    saveStatusEl.classList.remove('visible');
  }, 1600);
}

function persistWorld() {
  const result = saveWorld(world.serialize());
  if (result) {
    showSaveStatus('已保存世界');
  } else {
    showSaveStatus('无法保存：本地存储不可用', true);
  }
}

let currentBlockType = BLOCK_TYPES[0].id;
const blockOptionElements = new Map();

function colorToStyle(color) {
  return new THREE.Color(color).getStyle();
}

function rebuildBlockSelector() {
  if (!blockSelectorEl) return;
  blockSelectorEl.innerHTML = '';
  blockOptionElements.clear();
  BLOCK_TYPES.forEach((type, index) => {
    const option = document.createElement('div');
    option.className = 'block-option';
    option.dataset.type = type.id;

    const chip = document.createElement('div');
    chip.className = 'color-chip';
    chip.style.background = colorToStyle(type.color);
    option.appendChild(chip);

    const label = document.createElement('span');
    label.textContent = `${index + 1}. ${type.label}`;
    option.appendChild(label);

    option.addEventListener('click', () => {
      setCurrentBlockType(type.id);
    });

    blockSelectorEl.appendChild(option);
    blockOptionElements.set(type.id, option);
  });
  updateBlockSelectorUI();
}

function updateBlockSelectorUI() {
  blockOptionElements.forEach((element) => {
    element.classList.remove('active');
  });
  const activeEl = blockOptionElements.get(currentBlockType);
  if (activeEl) {
    activeEl.classList.add('active');
  }
}

function setCurrentBlockType(typeId) {
  currentBlockType = typeId;
  updateBlockSelectorUI();
}

rebuildBlockSelector();

const keys = {
  KeyW: false,
  KeyA: false,
  KeyS: false,
  KeyD: false,
  Space: false,
  ShiftLeft: false,
  ShiftRight: false,
};

function handleKeyChange(event, isDown) {
  if (event.code in keys) {
    keys[event.code] = isDown;
  }

  if (isDown && /^Digit[1-9]$/.test(event.code)) {
    const index = parseInt(event.code.replace('Digit', ''), 10) - 1;
    if (BLOCK_TYPES[index]) {
      setCurrentBlockType(BLOCK_TYPES[index].id);
    }
  }
}

document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyR' && event.shiftKey) {
    persistWorld();
  }
  handleKeyChange(event, true);
});

document.addEventListener('keyup', (event) => {
  handleKeyChange(event, false);
});

startButton?.addEventListener('click', () => {
  controls.lock();
});

controls.addEventListener('lock', () => {
  overlayEl?.classList.add('hidden');
  if (hudEl) {
    hudEl.classList.remove('hidden');
  }
});

controls.addEventListener('unlock', () => {
  overlayEl?.classList.remove('hidden');
  if (hudEl) {
    hudEl.classList.add('hidden');
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0, 0);

renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
renderer.domElement.addEventListener('mousedown', (event) => {
  if (!controls.isLocked) return;
  if (event.button === 0) {
    tryBreakBlock();
  } else if (event.button === 2) {
    tryPlaceBlock();
  }
});

function pickBlock() {
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(world.getRenderableChunks(), true);
  return intersects[0] ?? null;
}

function tryBreakBlock() {
  const hit = pickBlock();
  if (!hit) return;
  const block = hit.object.userData.block;
  if (!block) return;
  const changed = world.removeBlock(block.x, block.y, block.z);
  if (changed) {
    world.update();
    persistWorld();
  }
}

const normalMatrix = new THREE.Matrix3();

function tryPlaceBlock() {
  const hit = pickBlock();
  if (!hit) return;
  const block = hit.object.userData.block;
  if (!block) return;
  const face = hit.face;
  const object = hit.object;
  if (!face || !object) return;
  normalMatrix.getNormalMatrix(object.matrixWorld);
  const worldNormal = face.normal.clone().applyMatrix3(normalMatrix).round();
  const targetX = block.x + worldNormal.x;
  const targetY = block.y + worldNormal.y;
  const targetZ = block.z + worldNormal.z;
  if (world.getBlock(targetX, targetY, targetZ)) {
    return;
  }
  const placed = world.setBlock(targetX, targetY, targetZ, currentBlockType);
  if (placed) {
    world.update();
    persistWorld();
  }
}

const clock = new THREE.Clock();
const moveSpeed = 10;

function updateMovement(delta) {
  if (!controls.isLocked) return;
  if (keys.KeyW) controls.moveForward(moveSpeed * delta);
  if (keys.KeyS) controls.moveForward(-moveSpeed * delta);
  if (keys.KeyA) controls.moveRight(-moveSpeed * delta);
  if (keys.KeyD) controls.moveRight(moveSpeed * delta);
  const vertical = (keys.Space ? 1 : 0) - (keys.ShiftLeft || keys.ShiftRight ? 1 : 0);
  if (vertical !== 0) {
    controls.getObject().position.y += vertical * moveSpeed * delta;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  updateMovement(delta);
  renderer.render(scene, camera);
}

animate();

showSaveStatus('欢迎来到方块世界');
