export const BLOCK_TYPES = [
  {
    id: 'grass',
    label: '草方块',
    color: 0x4caf50,
    description: '绿色的草地表层',
  },
  {
    id: 'dirt',
    label: '泥土',
    color: 0x8d6e63,
    description: '草地下的泥土层',
  },
  {
    id: 'stone',
    label: '石头',
    color: 0x9e9e9e,
    description: '坚硬的石头方块',
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
