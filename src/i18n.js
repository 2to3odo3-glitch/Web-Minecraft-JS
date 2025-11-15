export const SUPPORTED_LANGUAGES = [
  { code: 'zh-CN', label: '简体中文 (Simplified Chinese)' },
  { code: 'zh-TW', label: '繁體中文 (Traditional Chinese)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
];

export const DEFAULT_LANGUAGE = 'zh-CN';

const TRANSLATIONS = {
  'zh-CN': {
    overlayTitle: 'Web Minecraft JS',
    overlayIntro: '点击下方按钮开始体验。',
    startButton: '开始游戏',
    helpMouse: '鼠标：视角',
    helpMovement: 'WASD：移动，空格：上升，Shift：下降',
    helpBreak: '左键：破坏方块',
    helpPlace: '右键：放置方块',
    helpSelect: '数字键 1-{maxBlock}：选择方块类型',
    languageLabel: '语言 / Language',
    saveSuccess: '已保存世界',
    saveError: '无法保存：本地存储不可用',
    welcome: '欢迎来到方块世界',
    blockOption: '{index}. {label}',
  },
  'zh-TW': {
    overlayTitle: 'Web Minecraft JS',
    overlayIntro: '點擊下方按鈕開始體驗。',
    startButton: '開始遊戲',
    helpMouse: '滑鼠：視角',
    helpMovement: 'WASD：移動，空白鍵：上升，Shift：下降',
    helpBreak: '左鍵：破壞方塊',
    helpPlace: '右鍵：放置方塊',
    helpSelect: '數字鍵 1-{maxBlock}：選擇方塊類型',
    languageLabel: '語言 / Language',
    saveSuccess: '世界已儲存',
    saveError: '無法儲存：無法使用本機儲存空間',
    welcome: '歡迎來到方塊世界',
    blockOption: '{index}. {label}',
  },
  'en-US': {
    overlayTitle: 'Web Minecraft JS',
    overlayIntro: 'Click the button below to begin.',
    startButton: 'Start Game',
    helpMouse: 'Mouse: Look around',
    helpMovement: 'WASD: Move, Space: Ascend, Shift: Descend',
    helpBreak: 'Left Click: Break block',
    helpPlace: 'Right Click: Place block',
    helpSelect: 'Number Keys 1-{maxBlock}: Select block type',
    languageLabel: 'Language',
    saveSuccess: 'World saved',
    saveError: 'Unable to save: localStorage not available',
    welcome: 'Welcome to the voxel world',
    blockOption: '{index}. {label}',
  },
  'en-GB': {
    overlayTitle: 'Web Minecraft JS',
    overlayIntro: 'Click the button below to get started.',
    startButton: 'Start Game',
    helpMouse: 'Mouse: Adjust view',
    helpMovement: 'WASD: Move, Space: Ascend, Shift: Descend',
    helpBreak: 'Left Click: Break block',
    helpPlace: 'Right Click: Place block',
    helpSelect: 'Number Keys 1-{maxBlock}: Choose block type',
    languageLabel: 'Language',
    saveSuccess: 'World saved',
    saveError: 'Unable to save: local storage unavailable',
    welcome: 'Welcome to the voxel world',
    blockOption: '{index}. {label}',
  },
};

export function getStrings(locale) {
  return TRANSLATIONS[locale] ?? TRANSLATIONS[DEFAULT_LANGUAGE];
}

export function getMessage(locale, key, replacements = {}) {
  const baseStrings = getStrings(locale);
  const fallbackStrings = getStrings(DEFAULT_LANGUAGE);
  const template = baseStrings[key] ?? fallbackStrings[key] ?? '';
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    return Object.prototype.hasOwnProperty.call(replacements, name)
      ? String(replacements[name])
      : match;
  });
}

export function validateLanguage(code) {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code)
    ? code
    : DEFAULT_LANGUAGE;
}
