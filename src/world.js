import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { ImprovedNoise } from 'https://unpkg.com/three@0.158.0/examples/jsm/math/ImprovedNoise.js?module';
import {
  DEFAULT_BLOCK_ID,
  getTextureDefinition,
  isBlockOpaque,
  isBlockSolid,
} from './blocks.js';

const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 64;
const BLOCK_SIZE = 1;
const RENDER_DISTANCE = 4; // in chunks
const SEA_LEVEL = 20;
const SNOW_LINE = 36;

function chunkKey(cx, cz) {
  return `${cx},${cz}`;
}

function createSeededRng(seed) {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashCoords(x, y, z, seed = 0) {
  let h = Math.imul(x, 374761393) + Math.imul(z, 668265263) + Math.imul(y, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= seed;
  h = Math.imul(h ^ (h >>> 16), 2246822519);
  h = Math.imul(h ^ (h >>> 15), 3266489917);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function stringHash(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

class Chunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE).fill(null);
    this.group = new THREE.Group();
    this.group.name = `chunk_${cx}_${cz}`;
    this.group.matrixAutoUpdate = true;
  }

  index(lx, y, lz) {
    return y * CHUNK_SIZE * CHUNK_SIZE + lz * CHUNK_SIZE + lx;
  }
}

export class World {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.renderDistance = options.renderDistance ?? RENDER_DISTANCE;
    this.chunks = new Map();
    this.dirtyChunks = new Set();
    this.modifiedBlocks = new Map();
    this.materialCache = new Map();
    this.textureCache = new Map();
    this.blockGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    this.noise = new ImprovedNoise();
    this.setSeed(options.seed ?? Math.floor(Math.random() * 1_000_000_000));
    this.lastCenter = { cx: null, cz: null };

    this.updateAroundPlayer(new THREE.Vector3(0, 0, 0));
    this.update();
  }

  dispose() {
    for (const chunk of this.chunks.values()) {
      for (const child of [...chunk.group.children]) {
        chunk.group.remove(child);
      }
      this.scene.remove(chunk.group);
    }
    this.chunks.clear();
    this.dirtyChunks.clear();
    this.materialCache.clear();
    this.textureCache.clear();
  }

  setSeed(seed) {
    this.seed = seed >>> 0;
    const rng = createSeededRng(this.seed);
    this.primaryOffset = new THREE.Vector3(rng() * 1000, rng() * 1000, rng() * 1000);
    this.secondaryOffset = new THREE.Vector3(rng() * 1000, rng() * 1000, rng() * 1000);
  }

  worldToChunk(x, z) {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    return { cx, cz };
  }

  worldToLocal(x, y, z) {
    const { cx, cz } = this.worldToChunk(x, z);
    const lx = x - cx * CHUNK_SIZE;
    const lz = z - cz * CHUNK_SIZE;
    return { cx, cz, lx, lz, y };
  }

  ensureChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    if (!this.chunks.has(key)) {
      const chunk = new Chunk(cx, cz);
      this.populateChunk(chunk);
      this.chunks.set(key, chunk);
      this.scene.add(chunk.group);
      this.markChunkDirty(chunk);
    }
    return this.chunks.get(key);
  }

  unloadChunk(key) {
    const chunk = this.chunks.get(key);
    if (!chunk) return;
    for (const child of [...chunk.group.children]) {
      chunk.group.remove(child);
    }
    this.scene.remove(chunk.group);
    this.chunks.delete(key);
  }

  markChunkDirty(chunk) {
    this.dirtyChunks.add(chunkKey(chunk.cx, chunk.cz));
  }

  updateAroundPlayer(position) {
    const cx = Math.floor(position.x / CHUNK_SIZE);
    const cz = Math.floor(position.z / CHUNK_SIZE);
    if (this.lastCenter.cx === cx && this.lastCenter.cz === cz) {
      return;
    }
    this.lastCenter = { cx, cz };

    const needed = new Set();
    for (let dx = -this.renderDistance; dx <= this.renderDistance; dx += 1) {
      for (let dz = -this.renderDistance; dz <= this.renderDistance; dz += 1) {
        const nx = cx + dx;
        const nz = cz + dz;
        const key = chunkKey(nx, nz);
        needed.add(key);
        this.ensureChunk(nx, nz);
      }
    }

    for (const key of [...this.chunks.keys()]) {
      if (!needed.has(key)) {
        this.unloadChunk(key);
      }
    }
  }

  getRenderableChunks() {
    return Array.from(this.chunks.values()).map((chunk) => chunk.group);
  }

  getBlock(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return null;
    const { cx, cz, lx, lz } = this.worldToLocal(x, y, z);
    const chunk = this.ensureChunk(cx, cz);
    const idx = chunk.index(lx, y, lz);
    return chunk.blocks[idx];
  }

  setBlock(x, y, z, typeId) {
    return this.#setBlockInternal(x, y, z, typeId);
  }

  removeBlock(x, y, z) {
    return this.#setBlockInternal(x, y, z, null);
  }

  #setBlockInternal(x, y, z, typeId, options = {}) {
    const { trackModification = true } = options;
    if (y < 0 || y >= CHUNK_HEIGHT) return false;
    const { cx, cz, lx, lz } = this.worldToLocal(x, y, z);
    const chunk = this.ensureChunk(cx, cz);
    const idx = chunk.index(lx, y, lz);
    const previous = chunk.blocks[idx];
    if (previous === typeId) {
      return false;
    }
    chunk.blocks[idx] = typeId ?? null;
    if (trackModification) {
      this.#recordModification(x, y, z, typeId);
    }
    this.markChunkDirty(chunk);
    this.#markNeighborChunksDirty(x, y, z);
    return true;
  }

  #recordModification(x, y, z, typeId) {
    const key = `${x},${y},${z}`;
    const baseType = this.#getBaseBlockType(x, y, z);
    if (typeId === baseType) {
      this.modifiedBlocks.delete(key);
      return;
    }
    if (typeId === undefined) {
      this.modifiedBlocks.delete(key);
      return;
    }
    this.modifiedBlocks.set(key, typeId ?? null);
  }

  #markNeighborChunksDirty(x, y, z) {
    const neighborOffsets = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    for (const [dx, , dz] of neighborOffsets) {
      const { cx, cz } = this.worldToLocal(x + dx, y, z + dz);
      const neighborChunk = this.chunks.get(chunkKey(cx, cz));
      if (neighborChunk) {
        this.markChunkDirty(neighborChunk);
      }
    }
  }

  update() {
    if (this.dirtyChunks.size === 0) return;
    const dummy = new THREE.Object3D();
    for (const key of Array.from(this.dirtyChunks)) {
      const chunk = this.chunks.get(key);
      if (!chunk) {
        this.dirtyChunks.delete(key);
        continue;
      }
      for (const child of [...chunk.group.children]) {
        chunk.group.remove(child);
      }
      const positionsByType = new Map();
      for (let y = 0; y < CHUNK_HEIGHT; y += 1) {
        for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
          for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
            const idx = chunk.index(lx, y, lz);
            const typeId = chunk.blocks[idx];
            if (!typeId) continue;
            const worldX = chunk.cx * CHUNK_SIZE + lx;
            const worldY = y;
            const worldZ = chunk.cz * CHUNK_SIZE + lz;
            if (this.#isBlockHidden(worldX, worldY, worldZ, typeId)) {
              continue;
            }
            if (!positionsByType.has(typeId)) {
              positionsByType.set(typeId, []);
            }
            positionsByType.get(typeId).push({ x: worldX, y: worldY, z: worldZ, typeId });
          }
        }
      }
      for (const [typeId, positions] of positionsByType.entries()) {
        const material = this.getMaterial(typeId);
        const mesh = new THREE.InstancedMesh(
          this.blockGeometry,
          material,
          positions.length
        );
        const opaque = isBlockOpaque(typeId);
        mesh.castShadow = opaque;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        positions.forEach((pos, index) => {
          dummy.position.set(
            pos.x + BLOCK_SIZE / 2,
            pos.y + BLOCK_SIZE / 2,
            pos.z + BLOCK_SIZE / 2
          );
          dummy.updateMatrix();
          mesh.setMatrixAt(index, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
        mesh.userData = {
          chunk,
          typeId,
          instances: positions,
        };
        if (!opaque) {
          mesh.renderOrder = 1;
        }
        chunk.group.add(mesh);
      }
      this.dirtyChunks.delete(key);
    }
  }

  getMaterial(typeId) {
    if (this.materialCache.has(typeId)) {
      return this.materialCache.get(typeId);
    }

    const textures = getTextureDefinition(typeId) ?? {};
    const materials = [
      this.#createFaceMaterial(typeId, textures.side ?? textures.top ?? textures.bottom, 'px'),
      this.#createFaceMaterial(typeId, textures.side ?? textures.top ?? textures.bottom, 'nx'),
      this.#createFaceMaterial(typeId, textures.top ?? textures.side ?? textures.bottom, 'py'),
      this.#createFaceMaterial(typeId, textures.bottom ?? textures.side ?? textures.top, 'ny'),
      this.#createFaceMaterial(typeId, textures.side ?? textures.top ?? textures.bottom, 'pz'),
      this.#createFaceMaterial(typeId, textures.side ?? textures.top ?? textures.bottom, 'nz'),
    ];
    this.materialCache.set(typeId, materials);
    return materials;
  }

  #createFaceMaterial(typeId, definition = {}, salt = 'default') {
    const texture = this.#getFaceTexture(typeId, definition, salt);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0,
    });
    if (!isBlockOpaque(typeId)) {
      material.transparent = true;
      material.opacity = typeId === 'water' ? 0.65 : 0.82;
      material.depthWrite = false;
      material.side = THREE.DoubleSide;
    }
    material.name = `material_${typeId}_${salt}`;
    return material;
  }

  #getFaceTexture(typeId, definition = {}, salt = 'default') {
    const key = `${typeId}:${salt}`;
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key);
    }
    const size = 16;
    const data = new Uint8Array(size * size * 3);
    const baseColor = new THREE.Color(definition.color ?? 0xffffff);
    const noiseAmount = definition.noise ?? 0.1;
    const brightness = definition.brightness ?? 1;
    const highlight = definition.highlight ?? 0.08;
    const shadow = definition.shadow ?? 0.12;
    const saltHash = stringHash(`${typeId}:${salt}`) ^ this.seed;
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const coarse = hashCoords(
          x + saltHash,
          y + saltHash,
          saltHash,
          this.seed
        ) - 0.5;
        const fine = hashCoords(
          x * 7 + saltHash,
          y * 13 + saltHash,
          saltHash * 3,
          this.seed
        ) - 0.5;
        let shade = brightness;
        shade *= 1 + coarse * noiseAmount;
        shade *= 1 + fine * noiseAmount * 0.45;

        const verticalGradient = 1 - (y / (size - 1)) * shadow;
        shade *= verticalGradient;

        const edgeDistance = Math.min(x, size - 1 - x, y, size - 1 - y) / (size / 2);
        const edgeInfluence = THREE.MathUtils.lerp(0.82, 1, edgeDistance);
        shade *= edgeInfluence;

        if (y <= 2) {
          shade *= 1 + highlight;
        }

        const final = baseColor.clone().multiplyScalar(shade);
        const idx = (y * size + x) * 3;
        data[idx] = Math.floor(THREE.MathUtils.clamp(final.r, 0, 1) * 255);
        data[idx + 1] = Math.floor(THREE.MathUtils.clamp(final.g, 0, 1) * 255);
        data[idx + 2] = Math.floor(THREE.MathUtils.clamp(final.b, 0, 1) * 255);
      }
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    this.textureCache.set(key, texture);
    return texture;
  }

  #isBlockHidden(x, y, z, typeId) {
    if (!isBlockOpaque(typeId)) {
      return false;
    }
    const neighborOffsets = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    for (const [dx, dy, dz] of neighborOffsets) {
      const neighborId = this.getBlock(x + dx, y + dy, z + dz);
      if (!neighborId) {
        return false;
      }
      if (!isBlockOpaque(neighborId)) {
        return false;
      }
    }
    return true;
  }

  populateChunk(chunk) {
    chunk.blocks.fill(null);
    for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
      for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
        const worldX = chunk.cx * CHUNK_SIZE + lx;
        const worldZ = chunk.cz * CHUNK_SIZE + lz;
        const column = this.#composeColumn(worldX, worldZ);
        for (let y = 0; y < CHUNK_HEIGHT; y += 1) {
          const idx = chunk.index(lx, y, lz);
          chunk.blocks[idx] = column[y] ?? null;
        }
      }
    }
    this.#applyModificationsToChunk(chunk);
  }

  #applyModificationsToChunk(chunk) {
    for (const [key, value] of this.modifiedBlocks.entries()) {
      const [x, y, z] = key.split(',').map((part) => Number.parseInt(part, 10));
      if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) continue;
      if (y < 0 || y >= CHUNK_HEIGHT) continue;
      const { cx, cz, lx, lz } = this.worldToLocal(x, y, z);
      if (cx !== chunk.cx || cz !== chunk.cz) continue;
      const idx = chunk.index(lx, y, lz);
      chunk.blocks[idx] = value ?? null;
    }
  }

  #composeColumn(x, z) {
    const column = new Array(CHUNK_HEIGHT).fill(null);
    const terrainHeight = THREE.MathUtils.clamp(this.#computeHeight(x, z), 1, CHUNK_HEIGHT - 2);
    const surfaceBlock = this.#determineSurfaceBlock(x, z, terrainHeight);
    for (let y = 0; y <= terrainHeight; y += 1) {
      let typeId = DEFAULT_BLOCK_ID;
      if (y === terrainHeight) {
        typeId = surfaceBlock;
      } else if (terrainHeight - y <= 3) {
        typeId = 'dirt';
      } else {
        typeId = 'stone';
        if (this.#shouldPlaceOre(x, y, z)) {
          typeId = 'coal_ore';
        }
      }
      if (y === 0) {
        typeId = 'stone';
      }
      column[y] = typeId;
    }
    if (terrainHeight < SEA_LEVEL - 1) {
      for (let y = terrainHeight + 1; y <= SEA_LEVEL; y += 1) {
        if (y >= CHUNK_HEIGHT) break;
        column[y] = 'water';
      }
    }
    this.#decorateColumnWithTrees(column, x, z, terrainHeight, surfaceBlock);
    return column;
  }

  #determineSurfaceBlock(x, z, height) {
    const biomeNoise = this.noise.noise(
      (x + this.secondaryOffset.x) * 0.008,
      this.secondaryOffset.y,
      (z + this.secondaryOffset.z) * 0.008
    );
    if (height >= SNOW_LINE + Math.max(0, biomeNoise * 8)) {
      return 'snow';
    }
    if (height <= SEA_LEVEL + 1 && biomeNoise > -0.2) {
      return 'sand';
    }
    if (biomeNoise < -0.45) {
      return 'gravel';
    }
    return DEFAULT_BLOCK_ID;
  }

  #shouldPlaceOre(x, y, z) {
    if (y > SEA_LEVEL - 2) return false;
    const chance = hashCoords(x, y, z, this.seed ^ 0x9e3779b9);
    return chance > 0.86;
  }

  #decorateColumnWithTrees(column, x, z, terrainHeight, surfaceBlock) {
    if (surfaceBlock !== 'grass') return;
    if (terrainHeight < SEA_LEVEL) return;
    const treeChance = hashCoords(x, terrainHeight, z, this.seed ^ 0xabc98388);
    if (treeChance < 0.975) return;
    const trunkHeight = 4 + Math.floor(hashCoords(x, terrainHeight, z, this.seed ^ 0xdefaced) * 3);
    for (let i = 1; i <= trunkHeight; i += 1) {
      const y = terrainHeight + i;
      if (y >= CHUNK_HEIGHT) break;
      column[y] = 'oak_log';
    }
    const canopyBase = terrainHeight + trunkHeight - 1;
    const canopyRadius = 2;
    for (let dy = -2; dy <= 2; dy += 1) {
      for (let dx = -canopyRadius; dx <= canopyRadius; dx += 1) {
        for (let dz = -canopyRadius; dz <= canopyRadius; dz += 1) {
          const dist = Math.abs(dx) + Math.abs(dz) + Math.abs(dy) * 0.5;
          if (dist > canopyRadius + 0.5) continue;
          const y = canopyBase + dy;
          if (y < 0 || y >= CHUNK_HEIGHT) continue;
          if (dy === -2 && dist > 2) continue;
          if (column[y] && column[y] !== 'oak_log' && column[y] !== 'oak_leaves') continue;
          if (!column[y]) {
            column[y] = 'oak_leaves';
          }
        }
      }
    }
  }

  #computeHeight(x, z) {
    const largeScale = this.noise.noise(
      (x + this.primaryOffset.x) * 0.03,
      this.primaryOffset.y * 0.03,
      (z + this.primaryOffset.z) * 0.03
    );
    const detail = this.noise.noise(
      (x + this.secondaryOffset.x) * 0.08,
      this.secondaryOffset.y * 0.08,
      (z + this.secondaryOffset.z) * 0.08
    );
    const ridge = Math.abs(
      this.noise.noise(
        (x + this.primaryOffset.x * 0.5) * 0.012,
        this.primaryOffset.y * 0.5,
        (z - this.primaryOffset.z * 0.5) * 0.012
      )
    );
    const height = SEA_LEVEL + largeScale * 10 + detail * 6 + ridge * 8;
    return Math.floor(THREE.MathUtils.clamp(height, 3, CHUNK_HEIGHT - 4));
  }

  #getBaseBlockType(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return null;
    const column = this.#composeColumn(x, z);
    return column[y] ?? null;
  }

  getHighestSolidBlockY(x, z) {
    const { cx, cz } = this.worldToChunk(x, z);
    this.ensureChunk(cx, cz);
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y -= 1) {
      const typeId = this.getBlock(x, y, z);
      if (typeId && isBlockSolid(typeId)) {
        return y;
      }
    }
    return null;
  }

  getSpawnPosition() {
    const height = this.#computeHeight(0, 0);
    return new THREE.Vector3(
      BLOCK_SIZE / 2,
      height + 4,
      BLOCK_SIZE / 2
    );
  }

  serialize() {
    const modifiedBlocks = Array.from(this.modifiedBlocks.entries())
      .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0))
      .map(([key, value]) => {
        const [x, y, z] = key.split(',').map((part) => Number.parseInt(part, 10));
        return { x, y, z, typeId: value };
      });
    return {
      version: 3,
      chunkSize: CHUNK_SIZE,
      chunkHeight: CHUNK_HEIGHT,
      modifiedBlocks,
      seed: this.seed,
    };
  }

  load(data) {
    this.dispose();
    this.modifiedBlocks.clear();
    if (data?.seed) {
      this.setSeed(data.seed);
    }

    if (Array.isArray(data?.modifiedBlocks)) {
      for (const entry of data.modifiedBlocks) {
        const { x, y, z, typeId } = entry;
        if (
          typeof x !== 'number' ||
          typeof y !== 'number' ||
          typeof z !== 'number'
        ) {
          continue;
        }
        const key = `${x},${y},${z}`;
        this.modifiedBlocks.set(key, typeId ?? null);
      }
    } else if (Array.isArray(data?.blocks)) {
      for (const entry of data.blocks) {
        const { x, y, z, typeId } = entry;
        if (
          typeof x !== 'number' ||
          typeof y !== 'number' ||
          typeof z !== 'number'
        ) {
          continue;
        }
        const key = `${x},${y},${z}`;
        this.modifiedBlocks.set(key, typeId ?? DEFAULT_BLOCK_ID);
      }
    }

    this.chunks.clear();
    this.dirtyChunks.clear();
    this.lastCenter = { cx: null, cz: null };
    this.updateAroundPlayer(new THREE.Vector3(0, 0, 0));
    this.update();
  }
}

export const WORLD_CONSTANTS = {
  CHUNK_SIZE,
  CHUNK_HEIGHT,
  BLOCK_SIZE,
  RENDER_DISTANCE,
  SEA_LEVEL,
};
