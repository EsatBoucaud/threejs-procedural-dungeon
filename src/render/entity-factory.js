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

export function enemyMesh(position, elite = false, interlaced = false) {
  const color = interlaced ? 0x7c61d8 : elite ? 0xd76848 : 0xa43e3b;
  const mesh = new THREE.Mesh(
    elite ? new THREE.OctahedronGeometry(1.18, 0) : new THREE.DodecahedronGeometry(0.78, 0),
    makeMaterial(color, {
      metalness: 0.42,
      roughness: 0.32,
      emissive: color,
      emissiveIntensity: interlaced ? 0.55 : 0.2,
      transparent: interlaced,
      opacity: interlaced ? 0.82 : 1,
    }),
  );
  mesh.position.copy(position);
  mesh.position.y = elite ? 1.4 : 1;
  mesh.castShadow = true;
  return mesh;
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

export function pulseMesh(position, color, radius) {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.3, radius * 0.35, 40),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(position);
  mesh.position.y = 0.12;
  mesh.userData.life = 0.28;
  mesh.userData.maxLife = 0.28;
  return mesh;
}
