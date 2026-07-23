import * as THREE from 'three';

export function makeMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.82,
    metalness: options.metalness ?? 0.05,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    side: THREE.DoubleSide,
  });
}

function box(width, height, depth, material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function segmentTransform(start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  return {
    x: (start.x + end.x) / 2,
    z: (start.z + end.z) / 2,
    length: Math.hypot(dx, dz),
    angle: Math.atan2(dz, dx),
  };
}

function dressRoom(group, room, trimMaterial, wallMaterial) {
  const count = room.type === 'vault' ? 6 : room.type === 'archive' ? 5 : 2 + (room.dressingSeed % 3);
  for (let index = 0; index < count; index += 1) {
    const phase = ((room.dressingSeed * (index + 3)) % 997) / 997;
    const angle = phase * Math.PI * 2;
    const radius = Math.min(room.width, room.depth) * (0.19 + ((room.dressingSeed + index * 17) % 20) / 100);
    const height = room.type === 'archive' ? 1.5 + (index % 3) * 0.45 : 0.8 + (index % 2) * 0.7;
    const prop = box(
      0.7 + (index % 3) * 0.35,
      height,
      0.7 + ((index + 1) % 3) * 0.3,
      index % 2 ? wallMaterial : trimMaterial,
    );
    prop.position.set(room.x + Math.cos(angle) * radius, height / 2, room.z + Math.sin(angle) * radius);
    prop.rotation.y = angle * 0.7;
    prop.castShadow = true;
    prop.receiveShadow = true;
    group.add(prop);
  }
}

export function buildRoomLayer(group, rooms, connections, skin, ghost) {
  const floorMaterial = makeMaterial(skin.floor, {
    transparent: ghost,
    opacity: ghost ? 0.28 : 1,
    emissive: ghost ? skin.portal : 0x000000,
    emissiveIntensity: ghost ? 0.18 : 0,
  });
  const floorAccent = makeMaterial(skin.floorSecondary, { transparent: ghost, opacity: ghost ? 0.22 : 1 });
  const wallMaterial = makeMaterial(skin.wall, { transparent: ghost, opacity: ghost ? 0.22 : 1 });
  const trimMaterial = makeMaterial(skin.trim, {
    metalness: 0.62,
    roughness: 0.38,
    transparent: ghost,
    opacity: ghost ? 0.38 : 1,
    emissive: ghost ? skin.trim : 0x000000,
    emissiveIntensity: ghost ? 0.25 : 0,
  });

  for (const room of rooms) {
    const floor = box(room.width, 0.5, room.depth, room.type === 'archive' ? floorAccent : floorMaterial);
    floor.position.set(room.x, -0.3, room.z);
    floor.receiveShadow = true;
    group.add(floor);

    const height = ghost ? 0.2 : 0.7;
    const north = box(room.width + 0.7, height, 0.52, wallMaterial);
    north.position.set(room.x, height / 2, room.z - room.depth / 2);
    const south = north.clone();
    south.position.z = room.z + room.depth / 2;
    const west = box(0.52, height, room.depth, wallMaterial);
    west.position.set(room.x - room.width / 2, height / 2, room.z);
    const east = west.clone();
    east.position.x = room.x + room.width / 2;
    group.add(north, south, west, east);

    const trim = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(1.1, Math.min(room.width, room.depth) * 0.14), 0.07, 5, 24),
      trimMaterial,
    );
    trim.rotation.x = Math.PI / 2;
    trim.position.set(room.x, 0.06, room.z);
    group.add(trim);
    if (!ghost) dressRoom(group, room, trimMaterial, wallMaterial);
  }

  for (const connection of connections) {
    const points = connection.corridor.points;
    for (let index = 0; index < points.length - 1; index += 1) {
      const transform = segmentTransform(points[index], points[index + 1]);
      if (transform.length < 0.1) continue;
      const corridor = box(transform.length + 1.5, 0.35, connection.corridor.width, floorMaterial);
      corridor.position.set(transform.x, -0.22, transform.z);
      corridor.rotation.y = -transform.angle;
      corridor.receiveShadow = true;
      group.add(corridor);
    }
  }
}

export function buildPortal(room, skin) {
  const ringMaterial = makeMaterial(skin.portal, {
    emissive: skin.portal,
    emissiveIntensity: 2.1,
    metalness: 0.2,
    roughness: 0.25,
    transparent: true,
    opacity: 0.9,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.24, 10, 40), ringMaterial);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(room.x, 0.24, room.z);
  const core = new THREE.Mesh(
    new THREE.CircleGeometry(1.72, 40),
    new THREE.MeshBasicMaterial({ color: skin.portal, transparent: true, opacity: 0.12, side: THREE.DoubleSide }),
  );
  core.rotation.x = -Math.PI / 2;
  core.position.set(room.x, 0.01, room.z);
  const portal = new THREE.Group();
  portal.add(ring, core);
  portal.userData.position = new THREE.Vector3(room.x, 0, room.z);
  return portal;
}
