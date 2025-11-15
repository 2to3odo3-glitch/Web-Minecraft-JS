import * as THREE from '../three/build/three.module.js';
import { PointerLockControls } from '../three/examples/jsm/controls/PointerLockControls.js';

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
import { MobileControls } from './mobile.js';
import { LanMultiplayer } from './multiplayer.js';

const PLAYER_WIDTH = 0.6;
const PLAYER_HEIGHT = 1.8;
const PLAYER_EYE_HEIGHT = 1.62;
const MAX_INTERACT_DISTANCE = 6.2;
const CREATIVE_FLY_SPEED = 10;
const CREATIVE_FAST_MULTIPLIER = 1.6;
const GRAVITY = 32;
const PLAY_ONLINE_URL = 'https://2to3odo3-glitch.github.io/Web-Minecraft-JS/';
const isMobileDevice =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ));
const MOBILE_LOOK_SENSITIVITY = 0.003;
const signalDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

const TOOLS = [
  { id: 'hand', type: null, speed: 0.8, efficiency: 1.1, labelKey: 'toolHand' },
  { id: 'wooden_pickaxe', type: 'pickaxe', speed: 1.4, efficiency: 2.6, labelKey: 'toolWoodPick' },
  { id: 'wooden_shovel', type: 'shovel', speed: 1.5, efficiency: 2.4, labelKey: 'toolWoodShovel' },
  { id: 'wooden_axe', type: 'axe', speed: 1.45, efficiency: 2.2, labelKey: 'toolWoodAxe' },
  { id: 'shears', type: 'shears', speed: 1.2, efficiency: 3.1, labelKey: 'toolShears' },
];

const TIP_ROTATION_MS = 12000;
const tipItems = [
  { key: 'tipRedstone', icon: '⚡' },
  { key: 'tipFarming', icon: '🌾' },
  { key: 'tipExploration', icon: '🧭' },
  { key: 'tipDefense', icon: '🛡️' },
  { key: 'tipTrading', icon: '💎' },
];

let tipIndex = 0;
let tipRotationTimer = null;

let lanMultiplayer = null;
let currentPeerList = [];

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(
  Math.min(window.devicePixelRatio ?? 1, isMobileDevice ? 1.75 : 2.5)
);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const gameContainer = document.getElementById('gameContainer');
const renderTarget = gameContainer ?? document.body;
renderTarget.appendChild(renderer.domElement);

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

lanMultiplayer = new LanMultiplayer({
  world,
  getPlayerPose: () => getPlayerPoseSnapshot(),
  getMode: () => playerState.mode,
  getWorldSnapshot: () => getWorldSnapshotData(),
  applyWorldSnapshot: applyWorldSnapshotFromHost,
  onStatus: (key, replacements) => {
    updateLanStatus(key ?? 'lanStatusIdle', replacements ?? {});
  },
  onPeerList: (peers) => {
    currentPeerList = Array.isArray(peers) ? peers.slice() : [];
    if (!currentPeerList.some((peer) => peer.id === lanMultiplayer.id)) {
      currentPeerList.unshift({ id: lanMultiplayer.id, mode: playerState.mode });
    }
    updatePeerListDisplay(currentPeerList);
  },
  onRemoteState: handleRemoteState,
  onRemoteMode: handleRemoteMode,
  onRemoteBlock: handleRemoteBlock,
});
currentPeerList = [{ id: lanMultiplayer.id, mode: playerState.mode }];
updatePeerListDisplay(currentPeerList);

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
const helpTouchMoveEl = document.getElementById('helpTouchMove');
const helpTouchLookEl = document.getElementById('helpTouchLook');
const helpTouchActionsEl = document.getElementById('helpTouchActions');
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
const lanPanelEl = document.getElementById('lanPanel');
const lanHostTitleEl = document.getElementById('lanHostTitle');
const lanHostHintEl = document.getElementById('lanHostHint');
const lanCreateOfferButton = document.getElementById('lanCreateOffer');
const lanOfferOutput = document.getElementById('lanOfferOutput');
const lanCopyOfferButton = document.getElementById('lanCopyOffer');
const lanClearOfferButton = document.getElementById('lanClearOffer');
const lanAnswerLabelEl = document.getElementById('lanAnswerLabel');
const lanAnswerInput = document.getElementById('lanAnswerInput');
const lanAcceptAnswerButton = document.getElementById('lanAcceptAnswer');
const lanJoinTitleEl = document.getElementById('lanJoinTitle');
const lanJoinHintEl = document.getElementById('lanJoinHint');
const lanJoinOfferLabelEl = document.getElementById('lanJoinOfferLabel');
const lanJoinOfferInput = document.getElementById('lanJoinOfferInput');
const lanGenerateAnswerButton = document.getElementById('lanGenerateAnswer');
const lanJoinAnswerOutput = document.getElementById('lanJoinAnswerOutput');
const lanCopyAnswerButton = document.getElementById('lanCopyAnswer');
const lanClearJoinButton = document.getElementById('lanClearJoin');
const lanStatusTitleEl = document.getElementById('lanStatusTitle');
const lanStatusTextEl = document.getElementById('lanStatus');
const lanPeersListEl = document.getElementById('lanPeers');
const lanDisconnectButton = document.getElementById('lanDisconnect');
const mobileControlsRoot = document.getElementById('mobileControls');
const movePadEl = document.getElementById('movePad');
const moveThumbEl = document.getElementById('moveThumb');
const lookPadEl = document.getElementById('lookPad');
const jumpButtonEl = document.getElementById('jumpButton');
const breakButtonEl = document.getElementById('breakButton');
const placeButtonEl = document.getElementById('placeButton');
const toolButtonEl = document.getElementById('toolButton');
const modeButtonEl = document.getElementById('modeButton');
const highlightsTitleEl = document.getElementById('highlightsTitle');
const highlightsIntroEl = document.getElementById('highlightsIntro');
const featureCards = [
  {
    titleEl: document.getElementById('featureBiomesTitle'),
    textEl: document.getElementById('featureBiomesText'),
    buttonEl: document.getElementById('featureBiomesButton'),
    titleKey: 'highlightBiomesTitle',
    textKey: 'highlightBiomesText',
    statusKey: 'highlightBiomesStatus',
  },
  {
    titleEl: document.getElementById('featureRedstoneTitle'),
    textEl: document.getElementById('featureRedstoneText'),
    buttonEl: document.getElementById('featureRedstoneButton'),
    titleKey: 'highlightRedstoneTitle',
    textKey: 'highlightRedstoneText',
    statusKey: 'highlightRedstoneStatus',
  },
  {
    titleEl: document.getElementById('featureNetherTitle'),
    textEl: document.getElementById('featureNetherText'),
    buttonEl: document.getElementById('featureNetherButton'),
    titleKey: 'highlightNetherTitle',
    textKey: 'highlightNetherText',
    statusKey: 'highlightNetherStatus',
  },
];
const tipTitleEl = document.getElementById('tipTitle');
const tipLeadEl = document.getElementById('tipLead');
const tipContentEl = document.getElementById('tipContent');
const tipRefreshButton = document.getElementById('tipRefreshButton');
const timelineTitleEl = document.getElementById('timelineTitle');
const timelineIntroEl = document.getElementById('timelineIntro');
const timelineEntries = [
  { textEl: document.getElementById('timelineAlpha'), key: 'timelineAlpha' },
  {
    textEl: document.getElementById('timelineAdventure'),
    key: 'timelineAdventure',
  },
  { textEl: document.getElementById('timelineEnd'), key: 'timelineEnd' },
  { textEl: document.getElementById('timelineNether'), key: 'timelineNether' },
];

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

function updateTipText() {
  if (!tipContentEl || tipItems.length === 0) return;
  const tip = tipItems[tipIndex % tipItems.length];
  const text = translate(tip.key);
  const icon = tip.icon ?? '';
  tipContentEl.textContent = icon ? `${icon} ${text}` : text;
}

function restartTipRotation() {
  if (tipRotationTimer) {
    clearInterval(tipRotationTimer);
    tipRotationTimer = null;
  }
  if (tipItems.length > 1) {
    tipRotationTimer = setInterval(() => {
      tipIndex = (tipIndex + 1) % tipItems.length;
      updateTipText();
    }, TIP_ROTATION_MS);
  }
}

function advanceTip(manual = false) {
  if (tipItems.length === 0) return;
  tipIndex = (tipIndex + 1) % tipItems.length;
  updateTipText();
  if (manual) {
    restartTipRotation();
  }
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

function updateLanStatus(key, replacements = {}) {
  lastLanStatusKey = key;
  lastLanStatusReplacements = replacements;
  if (lanStatusTextEl) {
    lanStatusTextEl.textContent = translate(key, replacements);
  }
  setMenuStatus('', { key, replacements });
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

function isGameplayActive() {
  return controls.isLocked || mobileGameplayActive;
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
let mobileControls = null;
const mobileMoveVector = { x: 0, y: 0 };
let mobileJumpQueued = false;
let mobileGameplayActive = false;
let lanPanelVisible = false;
const remotePlayers = new Map();
const remoteMaterialCache = new Map();
const remotePlayerGeometry = new THREE.BoxGeometry(
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_WIDTH
);
let lastHostOfferId = null;
let lastClientOfferId = null;
let lastLanStatusKey = 'lanStatusIdle';
let lastLanStatusReplacements = {};

function colorToStyle(color) {
  return new THREE.Color(color).getStyle();
}

function getRemoteMaterial(mode = 'survival') {
  const key = mode === 'creative' ? 'creative' : 'survival';
  if (remoteMaterialCache.has(key)) {
    return remoteMaterialCache.get(key);
  }
  const color = key === 'creative' ? 0xffca28 : 0x64b5f6;
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.8,
    metalness: 0.1,
    emissive: key === 'creative' ? new THREE.Color(0x553300) : new THREE.Color(0x10334d),
    emissiveIntensity: 0.2,
  });
  remoteMaterialCache.set(key, material);
  return material;
}

function ensureRemotePlayer(id, mode = 'survival') {
  if (!id) return null;
  let entry = remotePlayers.get(id);
  if (!entry) {
    const mesh = new THREE.Mesh(remotePlayerGeometry, getRemoteMaterial(mode));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.visible = true;
    scene.add(mesh);
    entry = { mesh, mode };
    remotePlayers.set(id, entry);
  }
  const targetMaterial = getRemoteMaterial(mode);
  if (entry.mode !== mode) {
    entry.mode = mode;
    entry.mesh.material = targetMaterial;
  }
  return entry;
}

function removeRemotePlayer(id) {
  const entry = remotePlayers.get(id);
  if (!entry) return;
  scene.remove(entry.mesh);
  remotePlayers.delete(id);
}

function clearRemotePlayers() {
  for (const id of [...remotePlayers.keys()]) {
    removeRemotePlayer(id);
  }
}

function updatePeerListDisplay(peers = []) {
  if (!lanPeersListEl) return;
  lanPeersListEl.innerHTML = '';
  const knownIds = new Set();
  peers.forEach((peer, index) => {
    if (!peer || !peer.id) return;
    const item = document.createElement('li');
    const modeKey = peer.mode === 'creative' ? 'modeCreative' : 'modeSurvival';
    const labelKey = peer.id === lanMultiplayer?.id ? 'lanPeerSelf' : 'lanPeerOther';
    item.textContent = translate(labelKey, {
      index: index + 1,
      mode: translate(modeKey),
    });
    lanPeersListEl.appendChild(item);
    knownIds.add(peer.id);
  });
  for (const id of [...remotePlayers.keys()]) {
    if (id === lanMultiplayer?.id) continue;
    if (!knownIds.has(id)) {
      removeRemotePlayer(id);
    }
  }
}

function handleRemoteState(message) {
  const { id, p, yaw, pitch, mode } = message;
  if (!id || !Array.isArray(p) || p.length < 3) return;
  const entry = ensureRemotePlayer(id, mode);
  if (!entry) return;
  entry.mesh.position.set(
    p[0],
    p[1] - PLAYER_EYE_HEIGHT + PLAYER_HEIGHT / 2,
    p[2]
  );
  entry.mesh.rotation.y = yaw ?? entry.mesh.rotation.y;
  const pitchObject = entry.mesh.children?.[0];
  if (pitchObject && typeof pitch === 'number') {
    pitchObject.rotation.x = pitch;
  }
  if (!currentPeerList.some((peer) => peer.id === id)) {
    currentPeerList.push({ id, mode: mode ?? 'survival' });
    updatePeerListDisplay(currentPeerList);
  }
}

function handleRemoteMode(message) {
  const { id, mode } = message;
  if (!id) return;
  ensureRemotePlayer(id, mode);
  const index = currentPeerList.findIndex((peer) => peer.id === id);
  if (index >= 0) {
    currentPeerList[index] = { ...currentPeerList[index], mode };
  } else {
    currentPeerList.push({ id, mode });
  }
  updatePeerListDisplay(currentPeerList);
}

function handleRemoteBlock(message) {
  const { action, x, y, z, typeId } = message;
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
    return;
  }
  let changed = false;
  if (action === 'set') {
    changed = world.setBlock(x, y, z, typeId);
  } else if (action === 'remove') {
    changed = world.removeBlock(x, y, z);
  }
  if (changed) {
    world.update();
    if (lanMultiplayer?.role === 'host') {
      persistWorld();
    }
  }
}

function getPlayerPoseSnapshot() {
  const position = controls.getObject().position.clone();
  const velocity = playerState.velocity.clone();
  const yaw = controls.getObject().rotation.y;
  const pitchObject = getPitchObject();
  const pitch = pitchObject ? pitchObject.rotation.x : camera.rotation.x;
  return { position, velocity, yaw, pitch };
}

function getWorldSnapshotData() {
  return {
    data: world.serialize(),
    seed: world.seed,
  };
}

function applyWorldSnapshotFromHost(snapshot) {
  if (!snapshot) return;
  if (typeof snapshot.seed === 'number') {
    world.setSeed(snapshot.seed);
  }
  if (snapshot.data) {
    world.load(snapshot.data);
  }
  if (Array.isArray(snapshot.peers)) {
    currentPeerList = snapshot.peers;
    updatePeerListDisplay(currentPeerList);
  }
  world.update();
}

function decodeLanSignal(text) {
  try {
    const normalized = text?.trim();
    if (!normalized) return null;
    const binary = window.atob(normalized);
    if (signalDecoder) {
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const decoded = signalDecoder.decode(bytes);
      return JSON.parse(decoded);
    }
    const decoded = decodeURIComponent(escape(binary));
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
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
  if (helpTouchMoveEl) helpTouchMoveEl.textContent = translate('helpTouchMove');
  if (helpTouchLookEl) helpTouchLookEl.textContent = translate('helpTouchLook');
  if (helpTouchActionsEl)
    helpTouchActionsEl.textContent = translate('helpTouchActions');
  if (editionLabelEl) editionLabelEl.textContent = translate('editionLabel');
  if (shaderLabelEl) shaderLabelEl.textContent = translate('shaderLabel');
  if (versionLabelEl) versionLabelEl.textContent = translate('versionLabel');
  if (resourceLabelEl) resourceLabelEl.textContent = translate('resourceLabel');
  if (languageLabelEl) languageLabelEl.textContent = translate('languageLabel');
  if (lanHostTitleEl) lanHostTitleEl.textContent = translate('lanHostTitle');
  if (lanHostHintEl) lanHostHintEl.textContent = translate('lanHostHint');
  if (lanCreateOfferButton)
    lanCreateOfferButton.textContent = translate('lanCreateOffer');
  if (lanOfferOutput)
    lanOfferOutput.setAttribute('placeholder', translate('lanOfferPlaceholder'));
  if (lanCopyOfferButton)
    lanCopyOfferButton.textContent = translate('lanCopyOffer');
  if (lanClearOfferButton)
    lanClearOfferButton.textContent = translate('lanClearOffer');
  if (lanAnswerLabelEl) lanAnswerLabelEl.textContent = translate('lanAnswerLabel');
  if (lanAnswerInput)
    lanAnswerInput.setAttribute('placeholder', translate('lanAnswerPlaceholder'));
  if (lanAcceptAnswerButton)
    lanAcceptAnswerButton.textContent = translate('lanAcceptAnswer');
  if (lanJoinTitleEl) lanJoinTitleEl.textContent = translate('lanJoinTitle');
  if (lanJoinHintEl) lanJoinHintEl.textContent = translate('lanJoinHint');
  if (lanJoinOfferLabelEl)
    lanJoinOfferLabelEl.textContent = translate('lanJoinOfferLabel');
  if (lanJoinOfferInput)
    lanJoinOfferInput.setAttribute(
      'placeholder',
      translate('lanJoinOfferPlaceholder')
    );
  if (lanGenerateAnswerButton)
    lanGenerateAnswerButton.textContent = translate('lanGenerateAnswer');
  if (lanJoinAnswerOutput)
    lanJoinAnswerOutput.setAttribute(
      'placeholder',
      translate('lanJoinAnswerPlaceholder')
    );
  if (lanCopyAnswerButton)
    lanCopyAnswerButton.textContent = translate('lanCopyAnswer');
  if (lanClearJoinButton)
    lanClearJoinButton.textContent = translate('lanClearJoin');
  if (lanDisconnectButton)
    lanDisconnectButton.textContent = translate('lanDisconnect');
  if (lanStatusTitleEl) lanStatusTitleEl.textContent = translate('lanStatusTitle');
  if (lanStatusTextEl)
    lanStatusTextEl.textContent = translate(
      lastLanStatusKey,
      lastLanStatusReplacements
    );
  if (highlightsTitleEl)
    highlightsTitleEl.textContent = translate('highlightsTitle');
  if (highlightsIntroEl)
    highlightsIntroEl.textContent = translate('highlightsIntro');
  featureCards.forEach((card) => {
    if (card.titleEl) card.titleEl.textContent = translate(card.titleKey);
    if (card.textEl) card.textEl.textContent = translate(card.textKey);
    if (card.buttonEl) card.buttonEl.textContent = translate('highlightAction');
  });
  if (tipTitleEl) tipTitleEl.textContent = translate('tipTitle');
  if (tipLeadEl) tipLeadEl.textContent = translate('tipLead');
  if (tipRefreshButton) tipRefreshButton.textContent = translate('tipRefresh');
  updateTipText();
  if (timelineTitleEl) timelineTitleEl.textContent = translate('timelineTitle');
  if (timelineIntroEl) timelineIntroEl.textContent = translate('timelineIntro');
  timelineEntries.forEach((entry) => {
    if (entry.textEl) entry.textEl.textContent = translate(entry.key);
  });
  if (jumpButtonEl) jumpButtonEl.textContent = translate('mobileJump');
  if (breakButtonEl) breakButtonEl.textContent = translate('mobileBreak');
  if (placeButtonEl) placeButtonEl.textContent = translate('mobilePlace');
  if (toolButtonEl) toolButtonEl.textContent = translate('mobileTool');
  if (modeButtonEl) modeButtonEl.textContent = translate('mobileMode');
  if (optionsButton && helpPanelEl)
    optionsButton.setAttribute(
      'aria-expanded',
      String(!helpPanelEl.classList.contains('collapsed'))
    );
  refreshMenuStatus();
  updateModeIndicator();
  updateToolIndicator();
  updateHudHints();
  updatePeerListDisplay(currentPeerList);
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
restartTipRotation();

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

  if (isDown && isGameplayActive()) {
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

function enterGameplay() {
  if (overlayEl) overlayEl.classList.add('hidden');
  if (hudEl) hudEl.classList.remove('hidden');
  if (isMobileDevice && mobileControls) {
    mobileControls.enable();
    mobileGameplayActive = true;
  }
}

function exitGameplay() {
  if (overlayEl) overlayEl.classList.remove('hidden');
  if (hudEl) hudEl.classList.add('hidden');
  if (mobileControls) {
    mobileControls.disable();
  }
  mobileGameplayActive = false;
  mobileMoveVector.x = 0;
  mobileMoveVector.y = 0;
  cancelBreakBlock();
}

featureCards.forEach((card) => {
  card.buttonEl?.addEventListener('click', () => {
    setMenuStatus('', { key: card.statusKey, replacements: {} });
  });
});

tipRefreshButton?.addEventListener('click', () => {
  advanceTip(true);
  setMenuStatus('', { key: 'tipStatusRefreshed', replacements: {} });
});

singleplayerButton?.addEventListener('click', () => {
  setMenuStatus('', null);
  if (isMobileDevice) {
    enterGameplay();
  } else {
    controls.lock();
  }
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
  lanPanelVisible = !lanPanelVisible;
  if (lanPanelEl) {
    lanPanelEl.classList.toggle('hidden', !lanPanelVisible);
    if (lanPanelVisible) {
      lanPanelEl.scrollTop = 0;
      updateLanStatus('lanStatusIdle');
    }
  }
  const key = lanPanelVisible ? 'lanPanelOpened' : 'lanPanelClosed';
  setMenuStatus('', { key, replacements: {} });
});

lanCreateOfferButton?.addEventListener('click', async () => {
  try {
    const offer = await lanMultiplayer.createOffer();
    lanOfferOutput.value = offer;
    const parsed = decodeLanSignal(offer);
    lastHostOfferId = parsed?.offerId ?? null;
    updateLanStatus('lanStatusOfferReady');
  } catch (error) {
    console.error('[LAN] Failed to create offer', error);
    updateLanStatus('lanStatusInvalidSignal');
  }
});

lanCopyOfferButton?.addEventListener('click', async () => {
  if (!lanOfferOutput?.value) return;
  try {
    await navigator.clipboard?.writeText(lanOfferOutput.value);
    updateLanStatus('lanStatusCopyOk');
  } catch (error) {
    console.warn('[LAN] Clipboard copy failed', error);
    updateLanStatus('lanStatusCopyFail');
  }
});

lanClearOfferButton?.addEventListener('click', () => {
  lanOfferOutput.value = '';
  lanAnswerInput.value = '';
  lastHostOfferId = null;
  lanMultiplayer.cancelPendingOffers();
  if (!lanMultiplayer.isActive()) {
    clearRemotePlayers();
  }
});

lanAcceptAnswerButton?.addEventListener('click', async () => {
  const answer = lanAnswerInput.value.trim();
  const parsed = decodeLanSignal(answer);
  const offerId = parsed?.offerId ?? lastHostOfferId;
  if (!offerId) {
    updateLanStatus('lanStatusInvalidSignal');
    return;
  }
  try {
    await lanMultiplayer.acceptAnswer(offerId, answer);
    updateLanStatus('lanStatusConnecting');
  } catch (error) {
    console.error('[LAN] Failed to accept answer', error);
    updateLanStatus('lanStatusInvalidSignal');
  }
});

lanGenerateAnswerButton?.addEventListener('click', async () => {
  const offer = lanJoinOfferInput.value.trim();
  if (!offer) {
    updateLanStatus('lanStatusInvalidSignal');
    return;
  }
  try {
    lanMultiplayer.disconnect();
    clearRemotePlayers();
    const answer = await lanMultiplayer.createAnswer(offer);
    lanJoinAnswerOutput.value = answer;
    const parsed = decodeLanSignal(answer);
    lastClientOfferId = parsed?.offerId ?? null;
    updateLanStatus('lanStatusAnswerReady');
  } catch (error) {
    console.error('[LAN] Failed to generate answer', error);
    updateLanStatus('lanStatusInvalidSignal');
  }
});

lanCopyAnswerButton?.addEventListener('click', async () => {
  if (!lanJoinAnswerOutput?.value) return;
  try {
    await navigator.clipboard?.writeText(lanJoinAnswerOutput.value);
    updateLanStatus('lanStatusCopyOk');
  } catch (error) {
    console.warn('[LAN] Clipboard copy failed', error);
    updateLanStatus('lanStatusCopyFail');
  }
});

lanClearJoinButton?.addEventListener('click', () => {
  lanJoinOfferInput.value = '';
  lanJoinAnswerOutput.value = '';
  lastClientOfferId = null;
  const removed = lanMultiplayer.cancelPendingOffers();
  if (!lanMultiplayer.isActive()) {
    clearRemotePlayers();
    if (removed === 0) {
      updateLanStatus('lanStatusIdle');
    }
  }
});

lanDisconnectButton?.addEventListener('click', () => {
  lanMultiplayer.disconnect();
  clearRemotePlayers();
});

lanAnswerInput?.addEventListener('input', () => {
  if (lanAnswerInput.value.trim().length > 0) {
    updateLanStatus('lanStatusAwaitAnswer');
  } else if (lanOfferOutput.value.trim().length > 0) {
    updateLanStatus('lanStatusOfferReady');
  } else {
    updateLanStatus('lanStatusIdle');
  }
});

lanJoinOfferInput?.addEventListener('input', () => {
  if (lanJoinOfferInput.value.trim().length > 0) {
    updateLanStatus('lanStatusConnecting');
  } else {
    updateLanStatus('lanStatusIdle');
  }
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
  enterGameplay();
});

controls.addEventListener('unlock', () => {
  exitGameplay();
});

if (isMobileDevice) {
  mobileControls = new MobileControls({
    root: mobileControlsRoot,
    movePad: movePadEl,
    moveThumb: moveThumbEl,
    lookPad: lookPadEl,
    buttons: {
      jumpButton: jumpButtonEl,
      breakButton: breakButtonEl,
      placeButton: placeButtonEl,
      toolButton: toolButtonEl,
      modeButton: modeButtonEl,
    },
    onMove: (vector) => {
      mobileMoveVector.x = THREE.MathUtils.clamp(vector.x, -1, 1);
      mobileMoveVector.y = THREE.MathUtils.clamp(vector.y, -1, 1);
    },
    onLook: ({ deltaX, deltaY }) => {
      if (!isGameplayActive()) return;
      applyLookDelta(deltaX, deltaY);
    },
    onJump: () => {
      if (!isGameplayActive()) {
        enterGameplay();
      }
      mobileJumpQueued = true;
    },
    onBreakStart: () => {
      if (!isGameplayActive()) {
        enterGameplay();
      }
      beginBreakBlock();
    },
    onBreakEnd: () => {
      cancelBreakBlock();
    },
    onPlace: () => {
      if (!isGameplayActive()) {
        enterGameplay();
      }
      tryPlaceBlock();
    },
    onToggleTool: () => {
      if (!isGameplayActive()) {
        enterGameplay();
      }
      cycleTool(1);
    },
    onToggleMode: () => {
      if (!isGameplayActive()) {
        enterGameplay();
      }
      toggleGameMode();
    },
  });
}

renderer.domElement.addEventListener(
  'touchstart',
  (event) => {
    if (isGameplayActive()) {
      event.preventDefault();
    }
  },
  { passive: false }
);
renderer.domElement.addEventListener(
  'touchmove',
  (event) => {
    if (isGameplayActive()) {
      event.preventDefault();
    }
  },
  { passive: false }
);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const raycaster = new THREE.Raycaster();
raycaster.far = MAX_INTERACT_DISTANCE + 2;
const pointer = new THREE.Vector2(0, 0);

function getPitchObject() {
  const yawObject = controls.getObject();
  if (yawObject.children && yawObject.children.length > 0) {
    return yawObject.children[0];
  }
  return null;
}

function applyLookDelta(deltaX, deltaY) {
  const yawObject = controls.getObject();
  yawObject.rotation.y -= deltaX * MOBILE_LOOK_SENSITIVITY;
  const pitchObject = getPitchObject();
  const limit = Math.PI / 2 - 0.01;
  if (pitchObject) {
    const next = THREE.MathUtils.clamp(
      pitchObject.rotation.x - deltaY * MOBILE_LOOK_SENSITIVITY,
      -limit,
      limit
    );
    pitchObject.rotation.x = next;
  } else {
    const next = THREE.MathUtils.clamp(
      camera.rotation.x - deltaY * MOBILE_LOOK_SENSITIVITY,
      -limit,
      limit
    );
    camera.rotation.x = next;
  }
}

renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
renderer.domElement.addEventListener('mousedown', (event) => {
  if (!isGameplayActive()) return;
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
      lanMultiplayer?.notifyBlockChange({
        action: 'remove',
        x: block.x,
        y: block.y,
        z: block.z,
      });
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
    lanMultiplayer?.notifyBlockChange({
      action: 'remove',
      x: block.x,
      y: block.y,
      z: block.z,
    });
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
    lanMultiplayer?.notifyBlockChange({
      action: 'set',
      x: targetX,
      y: targetY,
      z: targetZ,
      typeId: currentBlockType,
    });
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
  if (!isGameplayActive()) {
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
  lanMultiplayer?.notifyModeChange(playerState.mode);
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
  if (!isGameplayActive()) return;
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

  if (mobileControls?.isActive) {
    const magnitude = Math.hypot(mobileMoveVector.x, mobileMoveVector.y);
    if (magnitude > 0.05) {
      movementDirection.addScaledVector(forwardVector, -mobileMoveVector.y);
      movementDirection.addScaledVector(sideVector, mobileMoveVector.x);
    }
  }

  if (movementDirection.lengthSq() > 0) {
    movementDirection.normalize();
  }

  if (playerState.mode === 'creative') {
    const speed = sprinting ? CREATIVE_FLY_SPEED * CREATIVE_FAST_MULTIPLIER : CREATIVE_FLY_SPEED;
    player.position.addScaledVector(movementDirection, speed * delta);
    const ascend = keys.Space || mobileJumpQueued ? 1 : 0;
    const descend = keys.ShiftLeft || keys.ShiftRight ? 1 : 0;
    const vertical = ascend - descend;
    if (vertical !== 0) {
      player.position.y += vertical * speed * 0.75 * delta;
    }
    playerState.velocity.set(0, 0, 0);
    playerState.onGround = false;
    mobileJumpQueued = false;
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

  const jumpRequested = keys.Space || mobileJumpQueued;
  if (playerState.onGround && jumpRequested) {
    playerState.velocity.y = 10;
    playerState.onGround = false;
  }
  mobileJumpQueued = false;

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
  lanMultiplayer.update(delta);
  renderer.render(scene, camera);
}

animate();

showSaveStatus(translate('welcome'), false, {
  key: 'welcome',
  replacements: {},
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .catch((error) => console.warn('[SW] Service worker registration failed', error));
  });
}
