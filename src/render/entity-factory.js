import * as THREE from 'three';
import { makeMaterial } from './scene-factory.js';

export function playerMesh(color, position) {
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.62, 1.2, 6, 12),
    makeMaterial(color, { metalness: 0.35, roughness: 0.33, emissive: color, emissiveIntensity: 0.14 }),
  );
  body.castShadow = true;
  body.position.set(0, 1.2, 0);
  const marker = new THREE.Mesh(
    new THREE.TorusGeometry(0.92, 0.06, 5, 24),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }),
  );
  marker.rotation.x = Math.PI / 2;
  marker.position.y = -1.15;
  const group = new THREE.Group();
  group.add(body, marker);
  group.position.set(position.x, 0, position.z);
  return group;
}

function enemyGeometry(archetype, elite) {
  if (archetype === 'gunner') return new THREE.TetrahedronGeometry(elite ? 1.18 : 0.9, 0);
  if (archetype === 'auditor') return new THREE.CylinderGeometry(1.2, 1.55, 2.7, 8, 1, false);
  return elite ? new THREE.OctahedronGeometry(1.18, 0) : new THREE.DodecahedronGeometry(0.78, 0);
}

export function enemyMesh(position, elite = false, interlaced = false, archetype = 'pursuer') {
  const isAuditor = archetype === 'auditor';
  const color = isAuditor ? 0xe1c173 : interlaced ? 0x7c61d8 : archetype === 'gunner' ? 0x4f79ba : elite ? 0xd76848 : 0xa43e3b;
  const core = new THREE.Mesh(
    enemyGeometry(archetype, elite),
    makeMaterial(color, {
      metalness: isAuditor ? 0.7 : 0.42,
      roughness: isAuditor ? 0.18 : 0.32,
      emissive: color,
      emissiveIntensity: interlaced || isAuditor ? 0.55 : 0.2,
      transparent: interlaced,
      opacity: interlaced ? 0.84 : 1,
    }),
  );
  core.castShadow = true;
  const group = new THREE.Group();
  group.add(core);
  if (archetype === 'gunner') {
    const sight = new THREE.Mesh(
      new THREE.TorusGeometry(elite ? 1.2 : 0.92, 0.08, 5, 20),
      new THREE.MeshBasicMaterial({ color: 0x9fc4ff, transparent: true, opacity: 0.75 }),
    );
    sight.rotation.x = Math.PI / 2;
    group.add(sight);
  }
  if (isAuditor) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2, 0.12, 7, 32),
      new THREE.MeshBasicMaterial({ color: 0xe8d296, transparent: true, opacity: 0.72 }),
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    const crown = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 1.2, 6),
      makeMaterial(0x8e6a30, { metalness: 0.8, roughness: 0.2, emissive: 0x8e6a30, emissiveIntensity: 0.3 }),
    );
    crown.position.y = 1.8;
    group.add(crown);
  }
  group.position.copy(position);
  group.position.y = isAuditor ? 1.75 : elite ? 1.4 : 1;
  group.userData.core = core;
  return group;
}

export function projectileMesh(position, color) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 10, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
  );
  mesh.position.copy(position);
  mesh.position.y = 1.1;
  return mesh;
}

export function enemyProjectileMesh(position, color = 0xdf6f5e, large = false) {
  const mesh = new THREE.Mesh(
    large ? new THREE.OctahedronGeometry(0.38, 0) : new THREE.SphereGeometry(0.18, 8, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }),
  );
  mesh.position.copy(position);
  mesh.position.y = large ? 1.4 : 1;
  return mesh;
}

export function lootMesh(position, color) {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.48, 0),
    makeMaterial(color, { metalness: 0.25, roughness: 0.24, emissive: color, emissiveIntensity: 1.3 }),
  );
  mesh.position.copy(position);
  mesh.position.y = 0.75;
  mesh.castShadow = true;
  return mesh;
}

export function shrineMesh(position, color = 0x7fa4e8) {
  const group = new THREE.Group();
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 1.05, 0.75, 8),
    makeMaterial(0x48505d, { metalness: 0.35, roughness: 0.65 }),
  );
  pedestal.position.y = 0.38;
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55, 0),
    makeMaterial(color, { metalness: 0.2, roughness: 0.25, emissive: color, emissiveIntensity: 1.1 }),
  );
  core.position.y = 1.45;
  group.add(pedestal, core);
  group.position.copy(position);
  group.userData.core = core;
  return group;
}

export function hazardMesh(position, color, radius) {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.72, radius, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(position);
  ring.position.y = 0.08;
  return ring;
}

export function pulseMesh(position, color, radius) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.3, radius * 0.35, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(position);
  mesh.position.y = 0.12;
  mesh.userData.life = 0.32;
  mesh.userData.maxLife = 0.32;
  return mesh;
}
