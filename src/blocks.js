import { DEFAULT_LANGUAGE } from './i18n.js';

export const BLOCK_TYPES = [
  {
    id: 'grass',
    color: 0x4caf50,
    labels: {
      'zh-CN': '草方块',
      'zh-TW': '草方塊',
      'en-US': 'Grass Block',
      'en-GB': 'Grass Block',
    },
    descriptions: {
      'zh-CN': '绿色的草地表层',
      'zh-TW': '綠色的草地方塊',
      'en-US': 'Lush surface grass',
      'en-GB': 'Lush surface grass',
    },
  },
  {
    id: 'dirt',
    color: 0x8d6e63,
    labels: {
      'zh-CN': '泥土',
      'zh-TW': '泥土',
      'en-US': 'Dirt',
      'en-GB': 'Soil',
    },
    descriptions: {
      'zh-CN': '草地下的泥土层',
      'zh-TW': '草地下的泥土層',
      'en-US': 'Soil beneath the grass',
      'en-GB': 'Soil beneath the grass',
    },
  },
  {
    id: 'stone',
    color: 0x9e9e9e,
    labels: {
      'zh-CN': '石头',
      'zh-TW': '石頭',
      'en-US': 'Stone',
      'en-GB': 'Stone',
    },
    descriptions: {
      'zh-CN': '坚硬的石头方块',
      'zh-TW': '堅硬的石頭方塊',
      'en-US': 'Hard subterranean rock',
      'en-GB': 'Hard subterranean rock',
    },
  },
];

export const BLOCK_TYPE_BY_ID = new Map(
  BLOCK_TYPES.map((type) => [type.id, type])
);

export const DEFAULT_BLOCK_ID = BLOCK_TYPES[0].id;

export function getBlockType(id) {
  return BLOCK_TYPE_BY_ID.get(id) ?? BLOCK_TYPE_BY_ID.get(DEFAULT_BLOCK_ID);
}

export function getBlockColor(id) {
  return getBlockType(id).color;
}

export function getBlockLabel(id, locale = DEFAULT_LANGUAGE) {
  const type = getBlockType(id);
  return type.labels?.[locale] ?? type.labels?.[DEFAULT_LANGUAGE] ?? type.id;
}

export function getBlockDescription(id, locale = DEFAULT_LANGUAGE) {
  const type = getBlockType(id);
  return (
    type.descriptions?.[locale] ?? type.descriptions?.[DEFAULT_LANGUAGE] ?? ''
  );
}
