import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/PointerLockControls.js?module';

import { World } from './world.js';
import {
  BLOCK_TYPES,
  getBlockLabel,
  getBlockHardness,
  getPreferredTool,
  isBlockSolid,
} from './blocks.js';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  getMessage,
  validateLanguage,
} from './i18n.js';
import { loadWorld, saveWorld } from './storage.js';
import { MobManager } from './mobs.js';

const PLAYER_WIDTH = 0.6;
const PLAYER_HEIGHT = 1.8;
const PLAYER_EYE_HEIGHT = 1.62;
const MAX_INTERACT_DISTANCE = 6.2;
const CREATIVE_FLY_SPEED = 10;
const CREATIVE_FAST_MULTIPLIER = 1.6;
const GRAVITY = 32;
const PLAY_ONLINE_URL = 'https://2to3odo3-glitch.github.io/Web-Minecraft-JS/';

const TOOLS = [
  { id: 'hand', type: null, speed: 0.8, efficiency: 1.1, labelKey: 'toolHand' },
  { id: 'wooden_pickaxe', type: 'pickaxe', speed: 1.4, efficiency: 2.6, labelKey: 'toolWoodPick' },
  { id: 'wooden_shovel', type: 'shovel', speed: 1.5, efficiency: 2.4, labelKey: 'toolWoodShovel' },
  { id: 'wooden_axe', type: 'axe', speed: 1.45, efficiency: 2.2, labelKey: 'toolWoodAxe' },
  { id: 'shears', type: 'shears', speed: 1.2, efficiency: 3.1, labelKey: 'toolShears' },
];

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 80, 300);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 600);

const controls = new PointerLockControls(camera, renderer.domElement);
scene.add(controls.getObject());

const ambientLight = new THREE.AmbientLight(0xffffff, 0.42);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 0.85);
sunLight.position.set(80, 120, 40);
sunLight.castShadow = true;
const shadowSize = 120;
sunLight.shadow.camera.left = -shadowSize;
sunLight.shadow.camera.right = shadowSize;
sunLight.shadow.camera.top = shadowSize;
sunLight.shadow.camera.bottom = -shadowSize;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 400;
scene.add(sunLight);

const world = new World(scene);
const savedWorld = loadWorld();
if (savedWorld) {
  world.load(savedWorld);
}
const spawnPosition = world.getSpawnPosition();
controls.getObject().position.copy(spawnPosition);
world.updateAroundPlayer(spawnPosition);
world.update();

const mobManager = new MobManager(scene, world);

const overlayEl = document.getElementById('overlay');
const overlayTitleEl = document.getElementById('overlayTitle');
const splashTextEl = document.getElementById('splashText');
const overlayIntroEl = document.getElementById('overlayIntro');
const singleplayerButton = document.getElementById('singleplayerButton');
const playOnlineButton = document.getElementById('playOnlineButton');
const multiplayerButton = document.getElementById('multiplayerButton');
const optionsButton = document.getElementById('optionsButton');
const quitButton = document.getElementById('quitButton');
const menuStatusEl = document.getElementById('menuStatus');
const optionsTitleEl = document.getElementById('optionsTitle');
const helpPanelEl = document.getElementById('helpPanel');
const editionLabelEl = document.getElementById('editionLabel');
const shaderLabelEl = document.getElementById('shaderLabel');
const versionLabelEl = document.getElementById('versionLabel');
const resourceLabelEl = document.getElementById('resourceLabel');
const helpMouseEl = document.getElementById('helpMouse');
const helpMovementEl = document.getElementById('helpMovement');
const helpSprintEl = document.getElementById('helpSprint');
const helpBreakEl = document.getElementById('helpBreak');
const helpPlaceEl = document.getElementById('helpPlace');
const helpToolEl = document.getElementById('helpTool');
const helpModeEl = document.getElementById('helpMode');
const helpSelectEl = document.getElementById('helpSelect');
const languageLabelEl = document.getElementById('languageLabel');
const languageSelectEl = document.getElementById('languageSelect');
const hudEl = document.getElementById('hud');
const blockSelectorEl = document.getElementById('blockSelector');
const saveStatusEl = document.getElementById('saveStatus');
const modeIndicatorEl = document.getElementById('modeIndicator');
const toolIndicatorEl = document.getElementById('toolIndicator');
const hudHintToolEl = document.getElementById('hudHintTool');
const hudHintModeEl = document.getElementById('hudHintMode');
const breakProgressEl = document.getElementById('breakProgress');
const breakProgressFillEl = breakProgressEl?.querySelector('.fill');

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

let currentLanguage = validateLanguage(readStoredLanguage() ?? DEFAULT_LANGUAGE);

SUPPORTED_LANGUAGES.forEach((language) => {
  const option = document.createElement('option');
  option.value = language.code;
  option.textContent = language.label;
  if (language.code === currentLanguage) {
    option.selected = true;
  }
  languageSelectEl?.appendChild(option);
});

function translate(key, replacements) {
  return getMessage(currentLanguage, key, replacements);
}

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
  saveStatusEl.textContent = message;
  saveStatusEl.classList.toggle('error', isError);
  saveStatusEl.classList.add('visible');
  clearTimeout(saveStatusTimeout);
  saveStatusTimeout = setTimeout(() => {
    saveStatusEl.classList.remove('visible');
  }, 1600);
}

let menuStatusMessage = '';
let menuStatusMetadata = null;

function refreshMenuStatus() {
  if (!menuStatusEl) return;
  if (menuStatusMetadata?.key) {
    menuStatusEl.textContent = translate(
      menuStatusMetadata.key,
      menuStatusMetadata.replacements ?? {}
    );
  } else {
    menuStatusEl.textContent = menuStatusMessage;
  }
}

function setMenuStatus(message, metadata = null) {
  menuStatusMessage = message;
  menuStatusMetadata = metadata;
  refreshMenuStatus();
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
  }
}

let currentBlockType = BLOCK_TYPES[0].id;
const blockOptionElements = new Map();
let currentToolIndex = 0;

const playerState = {
  mode: 'survival',
  velocity: new THREE.Vector3(),
  onGround: false,
  breaking: null,
};

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
    chip.style.background = colorToStyle(type.textures?.top?.color ?? 0xffffff);
    option.appendChild(chip);

    const label = document.createElement('span');
    const localizedLabel = getBlockLabel(type.id, currentLanguage);
    label.textContent = translate('blockOption', {
      index: index + 1,
      label: localizedLabel,
    });
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

function updateModeIndicator() {
  if (!modeIndicatorEl) return;
  const modeKey = playerState.mode === 'creative' ? 'modeCreative' : 'modeSurvival';
  modeIndicatorEl.textContent = translate('hudMode', {
    mode: translate(modeKey),
  });
}

function updateToolIndicator() {
  if (!toolIndicatorEl) return;
  const tool = TOOLS[currentToolIndex];
  toolIndicatorEl.textContent = translate('hudTool', {
    tool: translate(tool.labelKey),
  });
}

function updateHudHints() {
  if (hudHintToolEl) {
    hudHintToolEl.textContent = translate('hudHintTool');
  }
  if (hudHintModeEl) {
    hudHintModeEl.textContent = translate('hudHintMode');
  }
}

function applyTranslations() {
  if (overlayTitleEl) overlayTitleEl.textContent = translate('overlayTitle');
  if (splashTextEl) splashTextEl.textContent = translate('splashText');
  if (overlayIntroEl) overlayIntroEl.textContent = translate('overlayIntro');
  if (optionsTitleEl) optionsTitleEl.textContent = translate('optionsTitle');
  if (singleplayerButton)
    singleplayerButton.textContent = translate('menuSingleplayer');
  if (playOnlineButton)
    playOnlineButton.textContent = translate('menuPlayOnline');
  if (multiplayerButton)
    multiplayerButton.textContent = translate('menuMultiplayer');
  if (optionsButton) optionsButton.textContent = translate('menuOptions');
  if (quitButton) quitButton.textContent = translate('menuQuit');
  if (helpMouseEl) helpMouseEl.textContent = translate('helpMouse');
  if (helpMovementEl) helpMovementEl.textContent = translate('helpMovement');
  if (helpSprintEl) helpSprintEl.textContent = translate('helpSprint');
  if (helpBreakEl) helpBreakEl.textContent = translate('helpBreak');
  if (helpPlaceEl) helpPlaceEl.textContent = translate('helpPlace');
  if (helpToolEl) helpToolEl.textContent = translate('helpTool');
  if (helpModeEl) helpModeEl.textContent = translate('helpMode');
  if (helpSelectEl)
    helpSelectEl.textContent = translate('helpSelect', {
      maxBlock: BLOCK_TYPES.length,
      zeroHint: BLOCK_TYPES.length >= 10 ? translate('helpSelectZero') : '',
    });
  if (editionLabelEl) editionLabelEl.textContent = translate('editionLabel');
  if (shaderLabelEl) shaderLabelEl.textContent = translate('shaderLabel');
  if (versionLabelEl) versionLabelEl.textContent = translate('versionLabel');
  if (resourceLabelEl) resourceLabelEl.textContent = translate('resourceLabel');
  if (languageLabelEl) languageLabelEl.textContent = translate('languageLabel');
  if (optionsButton && helpPanelEl)
    optionsButton.setAttribute(
      'aria-expanded',
      String(!helpPanelEl.classList.contains('collapsed'))
    );
  refreshMenuStatus();
  updateModeIndicator();
  updateToolIndicator();
  updateHudHints();
}

languageSelectEl?.addEventListener('change', (event) => {
  const target = event.target;
  if (target && 'value' in target) {
    currentLanguage = validateLanguage(String(target.value));
    storeLanguagePreference(currentLanguage);
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
});

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
  ControlLeft: false,
  ControlRight: false,
};

function handleKeyChange(event, isDown) {
  if (event.code in keys) {
    keys[event.code] = isDown;
  }

  if (isDown && /^Digit[0-9]$/.test(event.code)) {
    const number = Number.parseInt(event.code.replace('Digit', ''), 10);
    let index = number - 1;
    if (number === 0) {
      index = 9;
    }
    if (BLOCK_TYPES[index]) {
      setCurrentBlockType(BLOCK_TYPES[index].id);
    }
  }

  if (isDown && controls.isLocked) {
    if (event.code === 'KeyF') {
      cycleTool(1);
    }
    if (event.code === 'KeyV') {
      toggleGameMode();
    }
    if (event.code === 'KeyR' && event.shiftKey) {
      persistWorld();
    }
  }
}

document.addEventListener('keydown', (event) => {
  handleKeyChange(event, true);
});

document.addEventListener('keyup', (event) => {
  handleKeyChange(event, false);
});

singleplayerButton?.addEventListener('click', () => {
  setMenuStatus('', null);
  controls.lock();
});

playOnlineButton?.addEventListener('click', () => {
  const onlineWindow = window.open(PLAY_ONLINE_URL, '_blank', 'noopener');
  if (onlineWindow) {
    onlineWindow.opener = null;
  }
  setMenuStatus(translate('playOnlineStatus'), {
    key: 'playOnlineStatus',
    replacements: {},
  });
});

multiplayerButton?.addEventListener('click', () => {
  setMenuStatus(translate('multiplayerUnavailable'), {
    key: 'multiplayerUnavailable',
    replacements: {},
  });
});

optionsButton?.addEventListener('click', () => {
  if (!helpPanelEl) return;
  const collapsed = helpPanelEl.classList.toggle('collapsed');
  optionsButton.setAttribute('aria-expanded', String(!collapsed));
  const key = collapsed ? 'optionsHidden' : 'optionsShown';
  setMenuStatus(translate(key), { key, replacements: {} });
});

quitButton?.addEventListener('click', () => {
  setMenuStatus(translate('quitUnavailable'), {
    key: 'quitUnavailable',
    replacements: {},
  });
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
  cancelBreakBlock();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const raycaster = new THREE.Raycaster();
raycaster.far = MAX_INTERACT_DISTANCE + 2;
const pointer = new THREE.Vector2(0, 0);

renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
renderer.domElement.addEventListener('mousedown', (event) => {
  if (!controls.isLocked) return;
  if (event.button === 0) {
    beginBreakBlock();
  } else if (event.button === 2) {
    tryPlaceBlock();
  }
});

renderer.domElement.addEventListener('mouseup', (event) => {
  if (event.button === 0) {
    cancelBreakBlock();
  }
});

function getPlayerBoundingBox() {
  const position = controls.getObject().position;
  const halfWidth = PLAYER_WIDTH / 2;
  const feetY = position.y - PLAYER_EYE_HEIGHT;
  return {
    minX: position.x - halfWidth,
    maxX: position.x + halfWidth,
    minY: feetY,
    maxY: feetY + PLAYER_HEIGHT,
    minZ: position.z - halfWidth,
    maxZ: position.z + halfWidth,
  };
}

function blockIntersectsPlayer(x, y, z) {
  const playerBox = getPlayerBoundingBox();
  const blockMinX = x;
  const blockMaxX = x + 1;
  const blockMinY = y;
  const blockMaxY = y + 1;
  const blockMinZ = z;
  const blockMaxZ = z + 1;
  const intersects =
    blockMinX < playerBox.maxX &&
    blockMaxX > playerBox.minX &&
    blockMinY < playerBox.maxY &&
    blockMaxY > playerBox.minY &&
    blockMinZ < playerBox.maxZ &&
    blockMaxZ > playerBox.minZ;
  return intersects;
}

function pickBlock() {
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(world.getRenderableChunks(), true);
  if (!intersects.length) return null;
  const hit = intersects[0];
  if (!hit) return null;
  if (hit.distance > MAX_INTERACT_DISTANCE) return null;
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
}

function beginBreakBlock() {
  const hit = pickBlock();
  if (!hit) return;
  const block = hit.block ?? hit.object?.userData?.block;
  if (!block) return;
  if (playerState.mode === 'creative') {
    const changed = world.removeBlock(block.x, block.y, block.z);
    if (changed) {
      world.update();
      persistWorld();
    }
    return;
  }
  const hardness = getBlockHardness(block.typeId);
  if (!Number.isFinite(hardness) || hardness <= 0) {
    return;
  }
  playerState.breaking = {
    block,
    progress: 0,
    hardness,
  };
  if (breakProgressEl) {
    breakProgressEl.classList.remove('hidden');
  }
  if (breakProgressFillEl) {
    breakProgressFillEl.style.width = '0%';
  }
}

function cancelBreakBlock() {
  if (playerState.breaking) {
    playerState.breaking = null;
    if (breakProgressEl) {
      breakProgressEl.classList.add('hidden');
    }
    if (breakProgressFillEl) {
      breakProgressFillEl.style.width = '0%';
    }
  }
}

function finishBreakingBlock(block) {
  const removed = world.removeBlock(block.x, block.y, block.z);
  if (removed) {
    world.update();
    persistWorld();
  }
  cancelBreakBlock();
}

const normalMatrix = new THREE.Matrix3();

function tryPlaceBlock() {
  const hit = pickBlock();
  if (!hit) return;
  const block = hit.block ?? hit.object?.userData?.block;
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
  if (blockIntersectsPlayer(targetX, targetY, targetZ)) {
    return;
  }
  const placed = world.setBlock(targetX, targetY, targetZ, currentBlockType);
  if (placed) {
    world.update();
    persistWorld();
  }
}

function getToolSpeed(tool, blockType) {
  const preferred = getPreferredTool(blockType);
  let speed = tool.speed;
  if (preferred && tool.type === preferred) {
    speed *= tool.efficiency;
  } else if (preferred && tool.type && tool.type !== preferred) {
    speed *= 0.65;
  } else if (!preferred && tool.type) {
    speed *= 0.9;
  }
  if (tool.id === 'hand' && preferred) {
    speed *= 0.65;
  }
  return speed;
}

function updateBreakProgress(delta) {
  if (!playerState.breaking) return;
  if (!controls.isLocked) {
    cancelBreakBlock();
    return;
  }
  const { block, hardness } = playerState.breaking;
  const currentType = world.getBlock(block.x, block.y, block.z);
  if (currentType !== block.typeId) {
    cancelBreakBlock();
    return;
  }
  const tool = TOOLS[currentToolIndex];
  const speed = getToolSpeed(tool, block.typeId);
  playerState.breaking.progress += delta * speed;
  const ratio = Math.min(playerState.breaking.progress / hardness, 1);
  if (breakProgressFillEl) {
    breakProgressFillEl.style.width = `${ratio * 100}%`;
  }
  if (ratio >= 1) {
    finishBreakingBlock(block);
  }
}

function cycleTool(direction) {
  currentToolIndex = (currentToolIndex + direction + TOOLS.length) % TOOLS.length;
  updateToolIndicator();
  showSaveStatus(
    translate('toolSelected', {
      tool: translate(TOOLS[currentToolIndex].labelKey),
    }),
    false,
    {
      key: 'toolSelected',
      replacements: { tool: translate(TOOLS[currentToolIndex].labelKey) },
    }
  );
}

function setGameMode(mode) {
  if (playerState.mode === mode) return;
  playerState.mode = mode;
  if (mode === 'creative') {
    playerState.velocity.set(0, 0, 0);
    playerState.onGround = false;
  }
  updateModeIndicator();
  showSaveStatus(
    translate('modeSwitched', {
      mode: translate(mode === 'creative' ? 'modeCreative' : 'modeSurvival'),
    }),
    false,
    {
      key: 'modeSwitched',
      replacements: {
        mode: translate(mode === 'creative' ? 'modeCreative' : 'modeSurvival'),
      },
    }
  );
}

function toggleGameMode() {
  setGameMode(playerState.mode === 'creative' ? 'survival' : 'creative');
}

function resolvePlayerCollisions(position, velocity, delta) {
  let onGround = false;
  const epsilon = 0.001;
  const halfWidth = PLAYER_WIDTH / 2;

  const axes = ['y', 'x', 'z'];
  axes.forEach((axis) => {
    const offset = velocity[axis] * delta;
    if (offset === 0) return;
    position[axis] += offset;

    const feet = position.y - PLAYER_EYE_HEIGHT;
    const head = feet + PLAYER_HEIGHT;
    const minX = position.x - halfWidth;
    const maxX = position.x + halfWidth;
    const minY = feet;
    const maxY = head;
    const minZ = position.z - halfWidth;
    const maxZ = position.z + halfWidth;

    if (axis === 'x') {
      const edge = offset > 0 ? Math.floor(maxX) : Math.floor(minX);
      outerX: for (let y = Math.floor(minY); y <= Math.floor(maxY); y += 1) {
        for (let z = Math.floor(minZ); z <= Math.floor(maxZ); z += 1) {
          const block = world.getBlock(edge, y, z);
          if (!block || !isBlockSolid(block)) continue;
          if (offset > 0) {
            position.x = edge - halfWidth - epsilon;
          } else {
            position.x = edge + 1 + halfWidth + epsilon;
          }
          velocity.x = 0;
          break outerX;
        }
      }
    } else if (axis === 'z') {
      const edge = offset > 0 ? Math.floor(maxZ) : Math.floor(minZ);
      outerZ: for (let y = Math.floor(minY); y <= Math.floor(maxY); y += 1) {
        for (let x = Math.floor(minX); x <= Math.floor(maxX); x += 1) {
          const block = world.getBlock(x, y, edge);
          if (!block || !isBlockSolid(block)) continue;
          if (offset > 0) {
            position.z = edge - halfWidth - epsilon;
          } else {
            position.z = edge + 1 + halfWidth + epsilon;
          }
          velocity.z = 0;
          break outerZ;
        }
      }
    } else if (axis === 'y') {
      if (offset > 0) {
        const edge = Math.floor(maxY);
        outerYUp: for (let x = Math.floor(minX); x <= Math.floor(maxX); x += 1) {
          for (let z = Math.floor(minZ); z <= Math.floor(maxZ); z += 1) {
            const block = world.getBlock(x, edge, z);
            if (!block || !isBlockSolid(block)) continue;
            const headLimit = edge;
            position.y = headLimit - PLAYER_HEIGHT + PLAYER_EYE_HEIGHT - epsilon;
            velocity.y = 0;
            break outerYUp;
          }
        }
      } else {
        const edge = Math.floor(minY);
        outerYDown: for (let x = Math.floor(minX); x <= Math.floor(maxX); x += 1) {
          for (let z = Math.floor(minZ); z <= Math.floor(maxZ); z += 1) {
            const block = world.getBlock(x, edge, z);
            if (!block || !isBlockSolid(block)) continue;
            const footLimit = edge + 1;
            position.y = footLimit + PLAYER_EYE_HEIGHT + epsilon;
            velocity.y = 0;
            onGround = true;
            break outerYDown;
          }
        }
      }
    }
  });
  return onGround;
}

const forwardVector = new THREE.Vector3();
const sideVector = new THREE.Vector3();
const movementDirection = new THREE.Vector3();

function updateMovement(delta) {
  if (!controls.isLocked) return;
  const player = controls.getObject();
  const sprinting = keys.ControlLeft || keys.ControlRight;

  controls.getDirection(forwardVector);
  forwardVector.y = 0;
  forwardVector.normalize();

  sideVector.set(0, 1, 0).cross(forwardVector).normalize();

  movementDirection.set(0, 0, 0);
  if (keys.KeyW) movementDirection.add(forwardVector);
  if (keys.KeyS) movementDirection.addScaledVector(forwardVector, -1);
  if (keys.KeyD) movementDirection.add(sideVector);
  if (keys.KeyA) movementDirection.addScaledVector(sideVector, -1);
  if (movementDirection.lengthSq() > 0) {
    movementDirection.normalize();
  }

  if (playerState.mode === 'creative') {
    const speed = sprinting ? CREATIVE_FLY_SPEED * CREATIVE_FAST_MULTIPLIER : CREATIVE_FLY_SPEED;
    player.position.addScaledVector(movementDirection, speed * delta);
    const vertical = (keys.Space ? 1 : 0) - (keys.ShiftLeft || keys.ShiftRight ? 1 : 0);
    if (vertical !== 0) {
      player.position.y += vertical * speed * 0.75 * delta;
    }
    playerState.velocity.set(0, 0, 0);
    playerState.onGround = false;
    return;
  }

  const moveSpeed = sprinting ? 7 : 4.5;
  playerState.velocity.x = THREE.MathUtils.damp(
    playerState.velocity.x,
    movementDirection.x * moveSpeed,
    10,
    delta
  );
  playerState.velocity.z = THREE.MathUtils.damp(
    playerState.velocity.z,
    movementDirection.z * moveSpeed,
    10,
    delta
  );

  playerState.velocity.y -= GRAVITY * delta;
  if (playerState.velocity.y < -GRAVITY * 2) {
    playerState.velocity.y = -GRAVITY * 2;
  }

  if (playerState.onGround && keys.Space) {
    playerState.velocity.y = 10;
    playerState.onGround = false;
  }

  const onGround = resolvePlayerCollisions(player.position, playerState.velocity, delta);
  playerState.onGround = onGround;
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  const playerPosition = controls.getObject().position;
  world.updateAroundPlayer(playerPosition);
  updateMovement(delta);
  updateBreakProgress(delta);
  world.update();
  mobManager.update(delta, playerPosition);
  renderer.render(scene, camera);
}

animate();

showSaveStatus(translate('welcome'), false, {
  key: 'welcome',
  replacements: {},
});
