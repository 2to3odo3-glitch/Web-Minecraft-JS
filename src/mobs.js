import * as THREE from '../three/build/three.module.js';
import { isBlockSolid } from './blocks.js';

const MOB_MAX_COUNT = 10;
const MOB_SPAWN_RADIUS = 32;
const MOB_DESPAWN_RADIUS = 96;
const MOB_MIN_SPAWN_DISTANCE = 12;

function createSheepMesh() {
  const group = new THREE.Group();
  const bodyGeometry = new THREE.BoxGeometry(1.2, 0.9, 0.6);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.9 });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.6;
  group.add(body);

  const headGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xd8c7a0, roughness: 0.8 });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.set(0.75, 0.8, 0);
  group.add(head);

  const legGeometry = new THREE.BoxGeometry(0.25, 0.6, 0.25);
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x8c7b62, roughness: 0.9 });
  const legOffsets = [
    [-0.35, 0, -0.2],
    [0.35, 0, -0.2],
    [-0.35, 0, 0.2],
    [0.35, 0, 0.2],
  ];
  legOffsets.forEach(([x, , z]) => {
    const leg = new THREE.Mesh(legGeometry, legMaterial);
    leg.position.set(x, 0.3, z);
    group.add(leg);
  });

  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return group;
}

class PassiveMob {
  constructor(world, position) {
    this.world = world;
    this.group = createSheepMesh();
    this.group.position.copy(position);
    this.velocity = new THREE.Vector3();
    this.targetDirection = new THREE.Vector3();
    this.wanderTimer = 0;
    this.walkSpeed = 1.4;
    this.floatHeight = 0.45;
  }

  setPosition(position) {
    this.group.position.copy(position);
  }

  update(delta) {
    this.wanderTimer -= delta;
    if (this.wanderTimer <= 0) {
      const angle = Math.random() * Math.PI * 2;
      this.targetDirection.set(Math.cos(angle), 0, Math.sin(angle));
      this.targetDirection.normalize();
      this.wanderTimer = 2 + Math.random() * 4;
    }

    this.velocity.x = THREE.MathUtils.damp(
      this.velocity.x,
      this.targetDirection.x * this.walkSpeed,
      4,
      delta
    );
    this.velocity.z = THREE.MathUtils.damp(
      this.velocity.z,
      this.targetDirection.z * this.walkSpeed,
      4,
      delta
    );
    this.velocity.y -= 9.8 * delta * 0.5;

    const nextPosition = this.group.position.clone();
    nextPosition.addScaledVector(this.velocity, delta);

    const groundY = this.world.getHighestSolidBlockY(
      Math.floor(nextPosition.x),
      Math.floor(nextPosition.z)
    );
    if (groundY !== null) {
      const targetY = groundY + this.floatHeight;
      nextPosition.y = THREE.MathUtils.damp(nextPosition.y, targetY, 6, delta);
      if (nextPosition.y < targetY - 0.05) {
        this.velocity.y = Math.max(this.velocity.y, 0);
      }
    }

    this.group.position.copy(nextPosition);
    const lookAt = nextPosition.clone().add(this.targetDirection);
    this.group.lookAt(lookAt.x, nextPosition.y, lookAt.z);
  }
}

export class MobManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.mobs = [];
    this.spawnCooldown = 0;
  }

  update(delta, playerPosition) {
    this.spawnCooldown -= delta;
    if (this.mobs.length < MOB_MAX_COUNT && this.spawnCooldown <= 0) {
      if (this.trySpawnMob(playerPosition)) {
        this.spawnCooldown = 5 + Math.random() * 5;
      } else {
        this.spawnCooldown = 1;
      }
    }

    this.mobs = this.mobs.filter((mob) => {
      const distance = mob.group.position.distanceTo(playerPosition);
      if (distance > MOB_DESPAWN_RADIUS) {
        this.scene.remove(mob.group);
        return false;
      }
      mob.update(delta);
      return true;
    });
  }

  trySpawnMob(playerPosition) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const angle = Math.random() * Math.PI * 2;
      const distance = MOB_MIN_SPAWN_DISTANCE + Math.random() * (MOB_SPAWN_RADIUS - MOB_MIN_SPAWN_DISTANCE);
      const spawnX = Math.floor(playerPosition.x + Math.cos(angle) * distance);
      const spawnZ = Math.floor(playerPosition.z + Math.sin(angle) * distance);
      const groundY = this.world.getHighestSolidBlockY(spawnX, spawnZ);
      if (groundY === null) continue;
      const blockAbove = this.world.getBlock(spawnX, groundY + 1, spawnZ);
      if (blockAbove && isBlockSolid(blockAbove)) continue;
      const mob = new PassiveMob(
        this.world,
        new THREE.Vector3(spawnX + 0.5, groundY + 0.45, spawnZ + 0.5)
      );
      this.scene.add(mob.group);
      this.mobs.push(mob);
      return true;
    }
    return false;
  }
}
