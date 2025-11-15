import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { getBlockColor, DEFAULT_BLOCK_ID } from './blocks.js';

const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 16;
const WORLD_RADIUS = 2; // in chunks
const BLOCK_SIZE = 1;

function chunkKey(cx, cz) {
  return `${cx},${cz}`;
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
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map();
    this.dirtyChunks = new Set();
    this.modifiedBlocks = new Map();
    this.materialCache = new Map();
    this.blockGeometry = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);

    this.generateBaseWorld();
    this.update();
  }

  dispose() {
    for (const chunk of this.chunks.values()) {
      for (const child of [...chunk.group.children]) {
        chunk.group.remove(child);
      }
      chunk.group.clear();
      this.scene.remove(chunk.group);
    }
    this.chunks.clear();
    this.dirtyChunks.clear();
    this.modifiedBlocks.clear();
  }

  getMaterial(typeId) {
    if (!this.materialCache.has(typeId)) {
      const color = getBlockColor(typeId);
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.9,
        metalness: 0,
      });
      material.name = `material_${typeId}`;
      this.materialCache.set(typeId, material);
    }
    return this.materialCache.get(typeId);
  }

  ensureChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    if (!this.chunks.has(key)) {
      const chunk = new Chunk(cx, cz);
      this.chunks.set(key, chunk);
      this.scene.add(chunk.group);
    }
    return this.chunks.get(key);
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

  getBlock(x, y, z) {
    const { cx, cz, lx, lz } = this.worldToLocal(x, y, z);
    const chunk = this.chunks.get(chunkKey(cx, cz));
    if (!chunk) return null;
    if (y < 0 || y >= CHUNK_HEIGHT) return null;
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
  #setBlockInternal(x, y, z, typeId) {
    if (y < 0 || y >= CHUNK_HEIGHT) return false;
    const { cx, cz, lx, lz } = this.worldToLocal(x, y, z);
    const chunk = this.ensureChunk(cx, cz);
    const idx = chunk.index(lx, y, lz);
    const previous = chunk.blocks[idx];
    if (previous === typeId) {
      return false;
    }
    chunk.blocks[idx] = typeId;
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

  #getBaseBlockType(x, y, z) {
    if (y < 0 || y >= CHUNK_HEIGHT) return null;
    const { cx, cz } = this.worldToChunk(x, z);
    if (Math.abs(cx) > WORLD_RADIUS || Math.abs(cz) > WORLD_RADIUS) {
      return null;
    }
    const height = this.#computeHeight(x, z);
    if (y >= height) return null;
    if (y === height - 1) return 'grass';
    if (height - y <= 3) return 'dirt';
    return 'stone';
  }

    this.markChunkDirty(chunk);
    return true;
  }

  markChunkDirty(chunk) {
    this.dirtyChunks.add(chunkKey(chunk.cx, chunk.cz));
  }

  update() {
    if (this.dirtyChunks.size === 0) return;
    for (const key of Array.from(this.dirtyChunks)) {
      const chunk = this.chunks.get(key);
      if (chunk) {
        this.rebuildChunkMesh(chunk);
      }
      this.dirtyChunks.delete(key);
    }
  }

  rebuildChunkMesh(chunk) {
    if (chunk.group) {
      for (const child of [...chunk.group.children]) {
        chunk.group.remove(child);
      }
    }

    const positionsByType = new Map();
      chunk.group.clear();
    }

    for (let y = 0; y < CHUNK_HEIGHT; y += 1) {
      for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
        for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
          const idx = chunk.index(lx, y, lz);
          const typeId = chunk.blocks[idx];
          if (!typeId) continue;
          const worldX = chunk.cx * CHUNK_SIZE + lx;
          const worldY = y;
          const worldZ = chunk.cz * CHUNK_SIZE + lz;
          if (this.#isBlockHidden(worldX, worldY, worldZ)) {
            continue;
          }
          if (!positionsByType.has(typeId)) {
            positionsByType.set(typeId, []);
          }
          positionsByType.get(typeId).push({ x: worldX, y: worldY, z: worldZ, typeId });
        }
      }
    }

    const dummy = new THREE.Object3D();
    for (const [typeId, positions] of positionsByType.entries()) {
      const material = this.getMaterial(typeId);
      const mesh = new THREE.InstancedMesh(
        this.blockGeometry,
        material,
        positions.length
      );
      mesh.castShadow = true;
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
      chunk.group.add(mesh);
    }
  }

  #isBlockHidden(x, y, z) {
    const neighborOffsets = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    for (const [dx, dy, dz] of neighborOffsets) {
      if (!this.getBlock(x + dx, y + dy, z + dz)) {
        return false;
      }
    }
    return true;
  }

  #markNeighborChunksDirty(x, y, z) {
    const neighborOffsets = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    for (const [dx, , dz] of neighborOffsets) {
      const neighbor = this.worldToLocal(x + dx, y, z + dz);
      const neighborChunk = this.chunks.get(chunkKey(neighbor.cx, neighbor.cz));
      if (neighborChunk) {
        this.markChunkDirty(neighborChunk);
      }
    }
          const material = this.getMaterial(typeId);
          const mesh = new THREE.Mesh(this.blockGeometry, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          const worldX = chunk.cx * CHUNK_SIZE + lx;
          const worldY = y;
          const worldZ = chunk.cz * CHUNK_SIZE + lz;
          mesh.position.set(
            worldX + BLOCK_SIZE / 2,
            worldY + BLOCK_SIZE / 2,
            worldZ + BLOCK_SIZE / 2
          );
          mesh.userData.block = {
            x: worldX,
            y: worldY,
            z: worldZ,
            typeId,
          };
          chunk.group.add(mesh);
        }
      }
    }
  }

  generateBaseWorld() {
    for (let cx = -WORLD_RADIUS; cx <= WORLD_RADIUS; cx += 1) {
      for (let cz = -WORLD_RADIUS; cz <= WORLD_RADIUS; cz += 1) {
        const chunk = this.ensureChunk(cx, cz);
        for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
          for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
            const worldX = cx * CHUNK_SIZE + lx;
            const worldZ = cz * CHUNK_SIZE + lz;
            const height = this.#computeHeight(worldX, worldZ);
            for (let y = 0; y < height; y += 1) {
              let typeId = DEFAULT_BLOCK_ID;
              if (y === height - 1) {
                typeId = 'grass';
              } else if (height - y <= 3) {
                typeId = 'dirt';
              } else {
                typeId = 'stone';
              }
              this.#setBlockInternal(worldX, y, worldZ, typeId, {
                trackModification: false,
              });
              this.#setBlockInternal(worldX, y, worldZ, typeId);
            }
          }
        }
      }
    }
  }

  getRenderableChunks() {
    return Array.from(this.chunks.values()).map((chunk) => chunk.group);
  }

  #computeHeight(x, z) {
    const base = 4;
    const noise = Math.sin(x * 0.15) + Math.cos(z * 0.13);
    const extra = Math.sin((x + z) * 0.1) * 0.75;
    const height = Math.floor(base + noise + extra);
    return THREE.MathUtils.clamp(height, 2, CHUNK_HEIGHT - 2);
  }

  getSpawnPosition() {
    const height = this.getHighestSolidBlockY(0, 0) ?? 4;
    return new THREE.Vector3(
      BLOCK_SIZE / 2,
      height + 3,
      BLOCK_SIZE / 2
    );
  }

  getHighestSolidBlockY(x, z) {
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y -= 1) {
      if (this.getBlock(x, y, z)) {
        return y;
      }
    }
    return null;
  }

  serialize() {
    const modifiedBlocks = Array.from(this.modifiedBlocks.entries())
      .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0))
      .map(([key, value]) => {
        const [x, y, z] = key.split(',').map((part) => Number.parseInt(part, 10));
        return { x, y, z, typeId: value };
      });
    return {
      version: 2,
      chunkSize: CHUNK_SIZE,
      chunkHeight: CHUNK_HEIGHT,
      modifiedBlocks,
    const blocks = [];
    for (const chunk of this.chunks.values()) {
      for (let y = 0; y < CHUNK_HEIGHT; y += 1) {
        for (let lz = 0; lz < CHUNK_SIZE; lz += 1) {
          for (let lx = 0; lx < CHUNK_SIZE; lx += 1) {
            const idx = chunk.index(lx, y, lz);
            const typeId = chunk.blocks[idx];
            if (!typeId) continue;
            const worldX = chunk.cx * CHUNK_SIZE + lx;
            const worldY = y;
            const worldZ = chunk.cz * CHUNK_SIZE + lz;
            blocks.push({ x: worldX, y: worldY, z: worldZ, typeId });
          }
        }
      }
    }
    return {
      version: 1,
      chunkSize: CHUNK_SIZE,
      chunkHeight: CHUNK_HEIGHT,
      blocks,
    };
  }

  load(data) {
    this.dispose();
    if (!data) {
      this.generateBaseWorld();
      this.update();
      return;
    }

    if (Array.isArray(data.modifiedBlocks)) {
      this.generateBaseWorld();
      for (const entry of data.modifiedBlocks) {
        const { x, y, z, typeId } = entry;
        if (
          typeof x !== 'number' ||
          typeof y !== 'number' ||
          typeof z !== 'number'
        ) {
          continue;
        }
        this.#setBlockInternal(x, y, z, typeId ?? null, { trackModification: true });
      }
    if (!data || !Array.isArray(data.blocks) || data.blocks.length === 0) {
      this.generateBaseWorld();
      this.update();
      return;
    }

    if (Array.isArray(data.blocks)) {
      this.generateBaseWorld();
      for (const entry of data.blocks) {
        const { x, y, z, typeId } = entry;
        if (
          typeof x !== 'number' ||
          typeof y !== 'number' ||
          typeof z !== 'number'
        ) {
          continue;
        }
        this.#setBlockInternal(x, y, z, typeId ?? DEFAULT_BLOCK_ID, {
          trackModification: true,
        });
      }
      this.update();
      return;
    }

    this.generateBaseWorld();
    for (const entry of data.blocks) {
      const { x, y, z, typeId } = entry;
      if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
        continue;
      }
      this.#setBlockInternal(x, y, z, typeId ?? DEFAULT_BLOCK_ID);
    }
    this.update();
  }
}

export const WORLD_CONSTANTS = {
  CHUNK_SIZE,
  CHUNK_HEIGHT,
  WORLD_RADIUS,
  BLOCK_SIZE,
};
