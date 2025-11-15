import { DEFAULT_LANGUAGE } from './i18n.js';

export const BLOCK_TYPES = [
  {
    id: 'grass',
    solid: true,
    opaque: true,
    hardness: 1,
    tool: 'shovel',
    textures: {
      top: { color: 0x4caf50, noise: 0.1, brightness: 1.05 },
      side: { color: 0x5f8f3a, noise: 0.12, brightness: 0.95 },
      bottom: { color: 0x8d6e63, noise: 0.08, brightness: 0.9 },
    },
    labels: {
      'zh-CN': '草方块',
      'zh-TW': '草方塊',
      'en-US': 'Grass Block',
      'en-GB': 'Grass Block',
    },
    descriptions: {
      'zh-CN': '绿色的草地表层。',
      'zh-TW': '綠色的草地方塊。',
      'en-US': 'Lush surface turf with rich soil beneath.',
      'en-GB': 'Lush surface turf with rich soil beneath.',
    },
  },
  {
    id: 'dirt',
    solid: true,
    opaque: true,
    hardness: 1,
    tool: 'shovel',
    textures: {
      top: { color: 0x7a5a43, noise: 0.12, brightness: 0.95 },
      side: { color: 0x7a5a43, noise: 0.12, brightness: 0.95 },
      bottom: { color: 0x7a5a43, noise: 0.12, brightness: 0.95 },
    },
    labels: {
      'zh-CN': '泥土',
      'zh-TW': '泥土',
      'en-US': 'Dirt',
      'en-GB': 'Soil',
    },
    descriptions: {
      'zh-CN': '草地下的湿润泥土层。',
      'zh-TW': '草地下的濕潤泥土層。',
      'en-US': 'Moist earth found beneath the grass.',
      'en-GB': 'Moist earth found beneath the turf.',
    },
  },
  {
    id: 'stone',
    solid: true,
    opaque: true,
    hardness: 4,
    tool: 'pickaxe',
    textures: {
      top: { color: 0x8f8f8f, noise: 0.08, brightness: 0.92 },
      side: { color: 0x8f8f8f, noise: 0.08, brightness: 0.92 },
      bottom: { color: 0x8f8f8f, noise: 0.08, brightness: 0.92 },
    },
    labels: {
      'zh-CN': '石头',
      'zh-TW': '石頭',
      'en-US': 'Stone',
      'en-GB': 'Stone',
    },
    descriptions: {
      'zh-CN': '坚硬的地下基岩。',
      'zh-TW': '堅硬的地下基岩。',
      'en-US': 'Dense subterranean rock.',
      'en-GB': 'Dense subterranean rock.',
    },
  },
  {
    id: 'sand',
    solid: true,
    opaque: true,
    hardness: 0.8,
    tool: 'shovel',
    textures: {
      top: { color: 0xd7c183, noise: 0.15, brightness: 1 },
      side: { color: 0xd7c183, noise: 0.15, brightness: 1 },
      bottom: { color: 0xd7c183, noise: 0.15, brightness: 1 },
    },
    labels: {
      'zh-CN': '沙子',
      'zh-TW': '沙子',
      'en-US': 'Sand',
      'en-GB': 'Sand',
    },
    descriptions: {
      'zh-CN': '细腻的海滩沙粒。',
      'zh-TW': '細膩的海灘沙粒。',
      'en-US': 'Fine grains from beaches and deserts.',
      'en-GB': 'Fine grains from beaches and deserts.',
    },
  },
  {
    id: 'gravel',
    solid: true,
    opaque: true,
    hardness: 1.2,
    tool: 'shovel',
    textures: {
      top: { color: 0x6f6f6f, noise: 0.2, brightness: 0.95 },
      side: { color: 0x6f6f6f, noise: 0.2, brightness: 0.95 },
      bottom: { color: 0x6f6f6f, noise: 0.2, brightness: 0.95 },
    },
    labels: {
      'zh-CN': '砂砾',
      'zh-TW': '砂礫',
      'en-US': 'Gravel',
      'en-GB': 'Gravel',
    },
    descriptions: {
      'zh-CN': '松散的碎石混合物。',
      'zh-TW': '鬆散的碎石混合物。',
      'en-US': 'Loose mixture of small stones.',
      'en-GB': 'Loose mixture of small stones.',
    },
  },
  {
    id: 'snow',
    solid: true,
    opaque: true,
    hardness: 0.6,
    tool: 'shovel',
    textures: {
      top: { color: 0xf2f6ff, noise: 0.08, brightness: 1.1 },
      side: { color: 0xe1ecff, noise: 0.1, brightness: 1.05 },
      bottom: { color: 0xe1ecff, noise: 0.1, brightness: 1.05 },
    },
    labels: {
      'zh-CN': '雪',
      'zh-TW': '雪',
      'en-US': 'Snow',
      'en-GB': 'Snow',
    },
    descriptions: {
      'zh-CN': '寒冷地区的柔软积雪。',
      'zh-TW': '寒冷地區的柔軟積雪。',
      'en-US': 'Soft powder resting atop cold peaks.',
      'en-GB': 'Soft powder resting atop cold peaks.',
    },
  },
  {
    id: 'oak_log',
    solid: true,
    opaque: true,
    hardness: 2.5,
    tool: 'axe',
    textures: {
      top: { color: 0xc7a67b, noise: 0.12, brightness: 1 },
      side: { color: 0x6a4b30, noise: 0.1, brightness: 0.9 },
      bottom: { color: 0xc7a67b, noise: 0.12, brightness: 1 },
    },
    labels: {
      'zh-CN': '橡木原木',
      'zh-TW': '橡木原木',
      'en-US': 'Oak Log',
      'en-GB': 'Oak Log',
    },
    descriptions: {
      'zh-CN': '树干的木质核心。',
      'zh-TW': '樹幹的木質核心。',
      'en-US': 'The sturdy heart of an oak tree.',
      'en-GB': 'The sturdy heart of an oak tree.',
    },
  },
  {
    id: 'oak_planks',
    solid: true,
    opaque: true,
    hardness: 1.8,
    tool: 'axe',
    textures: {
      top: { color: 0xcaa56a, noise: 0.08, brightness: 1 },
      side: { color: 0xcaa56a, noise: 0.08, brightness: 1 },
      bottom: { color: 0xcaa56a, noise: 0.08, brightness: 1 },
    },
    labels: {
      'zh-CN': '橡木木板',
      'zh-TW': '橡木木板',
      'en-US': 'Oak Planks',
      'en-GB': 'Oak Planks',
    },
    descriptions: {
      'zh-CN': '整齐的木板，非常适合建造。',
      'zh-TW': '整齊的木板，非常適合建造。',
      'en-US': 'Neatly cut planks perfect for building.',
      'en-GB': 'Neatly cut planks perfect for building.',
    },
  },
  {
    id: 'oak_leaves',
    solid: false,
    opaque: false,
    hardness: 0.3,
    tool: 'shears',
    textures: {
      top: { color: 0x3f7532, noise: 0.2, brightness: 1.1 },
      side: { color: 0x3f7532, noise: 0.2, brightness: 1.1 },
      bottom: { color: 0x3f7532, noise: 0.2, brightness: 1.1 },
    },
    labels: {
      'zh-CN': '橡木树叶',
      'zh-TW': '橡木樹葉',
      'en-US': 'Oak Leaves',
      'en-GB': 'Oak Leaves',
    },
    descriptions: {
      'zh-CN': '茂密的绿叶，会微微透光。',
      'zh-TW': '茂密的綠葉，會微微透光。',
      'en-US': 'Lush foliage that lets light shimmer through.',
      'en-GB': 'Lush foliage that lets light shimmer through.',
    },
  },
  {
    id: 'water',
    solid: false,
    opaque: false,
    hardness: Infinity,
    tool: null,
    textures: {
      top: { color: 0x3d6ad6, noise: 0.05, brightness: 1.1 },
      side: { color: 0x3d6ad6, noise: 0.05, brightness: 1.1 },
      bottom: { color: 0x3d6ad6, noise: 0.05, brightness: 1.1 },
    },
    labels: {
      'zh-CN': '水',
      'zh-TW': '水',
      'en-US': 'Water',
      'en-GB': 'Water',
    },
    descriptions: {
      'zh-CN': '清澈的水面，适合河流与湖泊。',
      'zh-TW': '清澈的水面，適合河流與湖泊。',
      'en-US': 'Crystal clear water for rivers and lakes.',
      'en-GB': 'Crystal clear water for rivers and lakes.',
    },
  },
  {
    id: 'coal_ore',
    solid: true,
    opaque: true,
    hardness: 4.5,
    tool: 'pickaxe',
    textures: {
      top: { color: 0x4b4b4b, noise: 0.2, brightness: 0.9 },
      side: { color: 0x4b4b4b, noise: 0.2, brightness: 0.9 },
      bottom: { color: 0x4b4b4b, noise: 0.2, brightness: 0.9 },
    },
    labels: {
      'zh-CN': '煤矿石',
      'zh-TW': '煤礦石',
      'en-US': 'Coal Ore',
      'en-GB': 'Coal Ore',
    },
    descriptions: {
      'zh-CN': '散布着煤炭脉络的石头。',
      'zh-TW': '散佈著煤炭脈絡的石頭。',
      'en-US': 'Rock shot through with veins of coal.',
      'en-GB': 'Rock shot through with veins of coal.',
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
  return getBlockType(id).textures?.top?.color ?? 0xffffff;
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

export function isBlockSolid(id) {
  return getBlockType(id).solid !== false;
}

export function isBlockOpaque(id) {
  return getBlockType(id).opaque !== false;
}

export function getBlockHardness(id) {
  const hardness = getBlockType(id).hardness;
  return typeof hardness === 'number' ? hardness : 1;
}

export function getPreferredTool(id) {
  return getBlockType(id).tool ?? null;
}

export function getTextureDefinition(id) {
  return getBlockType(id).textures;
}
