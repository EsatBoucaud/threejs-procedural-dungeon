import * as THREE from 'three';
import { isMajorProcess, processById } from '../content/chave-processes.js';
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
  if (archetype === 'seizure-chief') return new THREE.BoxGeometry(2.35, 2.25, 2.35, 1, 1, 1);
  if (archetype === 'route-runner') return new THREE.ConeGeometry(1.35, 3, 5, 1, false);
  if (archetype === 'warden') return new THREE.BoxGeometry(2.55, 3.45, 1.8, 1, 2, 1);
  return elite ? new THREE.OctahedronGeometry(1.18, 0) : new THREE.DodecahedronGeometry(0.78, 0);
}

function addAuditorParts(group) {
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

function addSeizureChiefParts(group, color) {
  const clampMaterial = makeMaterial(0x4d1c1c, { metalness: 0.78, roughness: 0.24, emissive: color, emissiveIntensity: 0.18 });
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.5, 0.5), clampMaterial);
    arm.position.set(side * 1.55, 0, 0);
    arm.rotation.z = side * 0.16;
    group.add(arm);
  }
  const claimRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.75, 0.14, 6, 28),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.78 }),
  );
  claimRing.rotation.x = Math.PI / 2;
  claimRing.position.y = -1.05;
  group.add(claimRing);
}

function addRouteRunnerParts(group, color) {
  for (const tilt of [-0.72, 0.72]) {
    const routeRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.65, 0.1, 5, 30),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.62 }),
    );
    routeRing.rotation.set(Math.PI / 2, tilt, tilt * 0.45);
    group.add(routeRing);
  }
  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 1.8, 3),
      makeMaterial(color, { metalness: 0.42, roughness: 0.28, emissive: color, emissiveIntensity: 0.55 }),
    );
    fin.position.set(side * 1.25, 0, 0.35);
    fin.rotation.z = side * -1.2;
    group.add(fin);
  }
}

function addWardenParts(group, color) {
  const barMaterial = makeMaterial(0x33204f, { metalness: 0.7, roughness: 0.24, emissive: color, emissiveIntensity: 0.25 });
  for (const x of [-1.5, 1.5]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.1, 0.22), barMaterial);
    bar.position.x = x;
    group.add(bar);
  }
  for (const y of [-1.75, 1.75]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 0.22), barMaterial);
    bar.position.y = y;
    group.add(bar);
  }
  const lock = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.62, 0),
    makeMaterial(color, { metalness: 0.35, roughness: 0.2, emissive: color, emissiveIntensity: 0.85 }),
  );
  lock.position.z = 1.2;
  group.add(lock);
}

export function enemyMesh(position, elite = false, interlaced = false, archetype = 'pursuer') {
  const major = isMajorProcess(archetype);
  const process = major ? processById(archetype) : null;
  const color = process?.color ?? (interlaced ? 0x7c61d8 : archetype === 'gunner' ? 0x4f79ba : elite ? 0xd76848 : 0xa43e3b);
  const core = new THREE.Mesh(
    enemyGeometry(archetype, elite),
    makeMaterial(color, {
      metalness: major ? 0.72 : 0.42,
      roughness: major ? 0.2 : 0.32,
      emissive: color,
      emissiveIntensity: interlaced || major ? 0.55 : 0.2,
      transparent: interlaced,
      opacity: interlaced ? 0.88 : 1,
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
  if (archetype === 'auditor') addAuditorParts(group);
  if (archetype === 'seizure-chief') addSeizureChiefParts(group, color);
  if (archetype === 'route-runner') addRouteRunnerParts(group, color);
  if (archetype === 'warden') addWardenParts(group, color);

  group.position.copy(position);
  group.position.y = major ? 1.85 : elite ? 1.4 : 1;
  group.userData.core = core;
  group.userData.majorProcess = major ? archetype : null;
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
