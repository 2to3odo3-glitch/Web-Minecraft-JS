import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/PointerLockControls.js';

import { World } from './world.js';
import { BLOCK_TYPES, getBlockLabel } from './blocks.js';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  getMessage,
  validateLanguage,
} from './i18n.js';
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
const overlayTitleEl = document.getElementById('overlayTitle');
const overlayIntroEl = document.getElementById('overlayIntro');
const startButton = document.getElementById('startButton');
const helpMouseEl = document.getElementById('helpMouse');
const helpMovementEl = document.getElementById('helpMovement');
const helpBreakEl = document.getElementById('helpBreak');
const helpPlaceEl = document.getElementById('helpPlace');
const helpSelectEl = document.getElementById('helpSelect');
const languageLabelEl = document.getElementById('languageLabel');
const languageSelectEl = document.getElementById('languageSelect');
const hudEl = document.getElementById('hud');
const blockSelectorEl = document.getElementById('blockSelector');
const saveStatusEl = document.getElementById('saveStatus');

function readStoredLanguage() {
  try {
    return window.localStorage?.getItem('voxel-lang') ?? null;
  } catch (error) {
    console.warn('[i18n] Unable to read stored language', error);
    return null;
  }
}

function storeLanguagePreference(locale) {
  try {
    window.localStorage?.setItem('voxel-lang', locale);
  } catch (error) {
    console.warn('[i18n] Unable to persist language', error);
  }
}

let currentLanguage = validateLanguage(
  readStoredLanguage() ?? DEFAULT_LANGUAGE
);

SUPPORTED_LANGUAGES.forEach((language) => {
  const option = document.createElement('option');
  option.value = language.code;
  option.textContent = language.label;
  if (language.code === currentLanguage) {
    option.selected = true;
  }
  languageSelectEl?.appendChild(option);
});

function setLanguage(locale) {
  currentLanguage = validateLanguage(locale);
  storeLanguagePreference(currentLanguage);
  if (languageSelectEl && languageSelectEl.value !== currentLanguage) {
    languageSelectEl.value = currentLanguage;
  }
  applyTranslations();
  rebuildBlockSelector();
  if (saveStatusEl?.classList.contains('visible')) {
    const message =
      lastSaveTranslationKey !== null
        ? translate(lastSaveTranslationKey, lastSaveReplacements)
        : lastSaveMessage;
    showSaveStatus(message, lastSaveWasError, {
      key: lastSaveTranslationKey,
      replacements: lastSaveReplacements,
    });
  }
}

languageSelectEl?.addEventListener('change', (event) => {
  const target = event.target;
  if (target && 'value' in target) {
    setLanguage(String(target.value));
  }
});

let lastSaveMessage = '';
let lastSaveWasError = false;
let lastSaveTranslationKey = null;
let lastSaveReplacements = {};
let saveStatusTimeout = null;

function showSaveStatus(message, isError = false, metadata = null) {
  if (!saveStatusEl) return;
  lastSaveMessage = message;
  lastSaveWasError = isError;
  lastSaveTranslationKey = metadata?.key ?? null;
  lastSaveReplacements = metadata?.replacements ?? {};
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

function translate(key, replacements) {
  return getMessage(currentLanguage, key, replacements);
}

function persistWorld() {
  const result = saveWorld(world.serialize());
  if (result) {
    showSaveStatus(translate('saveSuccess'), false, {
      key: 'saveSuccess',
      replacements: {},
    });
  } else {
    showSaveStatus(translate('saveError'), true, {
      key: 'saveError',
      replacements: {},
    });
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
    const localizedLabel = getBlockLabel(type.id, currentLanguage);
    label.textContent = translate('blockOption', {
      index: index + 1,
      label: localizedLabel,
    });
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

function applyTranslations() {
  if (overlayTitleEl) overlayTitleEl.textContent = translate('overlayTitle');
  if (overlayIntroEl) overlayIntroEl.textContent = translate('overlayIntro');
  if (startButton) startButton.textContent = translate('startButton');
  if (helpMouseEl) helpMouseEl.textContent = translate('helpMouse');
  if (helpMovementEl) helpMovementEl.textContent = translate('helpMovement');
  if (helpBreakEl) helpBreakEl.textContent = translate('helpBreak');
  if (helpPlaceEl) helpPlaceEl.textContent = translate('helpPlace');
  if (helpSelectEl)
    helpSelectEl.textContent = translate('helpSelect', {
      maxBlock: BLOCK_TYPES.length,
    });
  if (languageLabelEl) languageLabelEl.textContent = translate('languageLabel');
}

applyTranslations();
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
  if (!intersects.length) return null;
  const hit = intersects[0];
  if (!hit) return null;
  const { object, instanceId } = hit;
  if (object && object.isInstancedMesh && instanceId !== undefined && instanceId !== null) {
    const instances = object.userData.instances;
    if (instances && instances[instanceId]) {
      const blockInfo = instances[instanceId];
      return {
        ...hit,
        block: {
          x: blockInfo.x,
          y: blockInfo.y,
          z: blockInfo.z,
          typeId: blockInfo.typeId,
        },
      };
    }
  }
  if (object?.userData?.block) {
    return hit;
  }
  return null;
  return intersects[0] ?? null;
}

function tryBreakBlock() {
  const hit = pickBlock();
  if (!hit) return;
  const block = hit.block ?? hit.object?.userData?.block;
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
  const block = hit.block ?? hit.object?.userData?.block;
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

showSaveStatus(translate('welcome'), false, {
  key: 'welcome',
  replacements: {},
});
showSaveStatus('欢迎来到方块世界');
