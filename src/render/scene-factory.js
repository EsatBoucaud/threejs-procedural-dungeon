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
    depthWrite: options.depthWrite ?? true,
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

function addWallSegment(group, room, side, start, end, height, material) {
  const length = end - start;
  if (length <= 0.2) return;
  let wall;
  if (side === 'north' || side === 'south') {
    wall = box(length, height, 0.52, material);
    wall.position.set(room.x + (start + end) / 2, height / 2, room.z + (side === 'north' ? -room.depth / 2 : room.depth / 2));
  } else {
    wall = box(0.52, height, length, material);
    wall.position.set(room.x + (side === 'west' ? -room.width / 2 : room.width / 2), height / 2, room.z + (start + end) / 2);
  }
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);
}

function addDoorFrame(group, room, opening, wallHeight, trimMaterial, ghost) {
  if (ghost) return;
  const vertical = opening.side === 'north' || opening.side === 'south';
  const edgeX = room.x + (opening.side === 'west' ? -room.width / 2 : opening.side === 'east' ? room.width / 2 : opening.center);
  const edgeZ = room.z + (opening.side === 'north' ? -room.depth / 2 : opening.side === 'south' ? room.depth / 2 : opening.center);
  const postHeight = wallHeight + 0.65;
  const offset = opening.width / 2;
  for (const direction of [-1, 1]) {
    const post = box(0.18, postHeight, 0.18, trimMaterial);
    post.position.set(
      edgeX + (vertical ? direction * offset : 0),
      postHeight / 2,
      edgeZ + (vertical ? 0 : direction * offset),
    );
    post.castShadow = true;
    group.add(post);
  }
  const header = box(vertical ? opening.width + 0.35 : 0.22, 0.16, vertical ? 0.22 : opening.width + 0.35, trimMaterial);
  header.position.set(edgeX, postHeight, edgeZ);
  group.add(header);
}

function buildRoomWalls(group, room, openings, height, wallMaterial, trimMaterial, ghost) {
  const sides = {
    north: room.width,
    south: room.width,
    east: room.depth,
    west: room.depth,
  };
  for (const [side, length] of Object.entries(sides)) {
    const entries = openings?.[side] ?? [];
    const half = length / 2;
    let cursor = -half;
    for (const opening of entries) {
      const start = Math.max(-half, opening.center - opening.width / 2);
      const end = Math.min(half, opening.center + opening.width / 2);
      addWallSegment(group, room, side, cursor, start, height, wallMaterial);
      addDoorFrame(group, room, { ...opening, side }, height, trimMaterial, ghost);
      cursor = Math.max(cursor, end);
    }
    addWallSegment(group, room, side, cursor, half, height, wallMaterial);
  }
}

function moduleForRoom(group, room, skin, materials, ghost) {
  const opacity = ghost ? 0.24 : 0.72;
  const accentMaterial = new THREE.MeshBasicMaterial({
    color: skin.accent ?? skin.portal,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  if (room.type === 'vault' || room.type === 'elite') {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(Math.min(room.width, room.depth) * 0.2, Math.min(room.width, room.depth) * 0.27, 8),
      accentMaterial,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(room.x, 0.01, room.z);
    group.add(ring);
  } else if (room.type === 'archive') {
    for (const offset of [-0.18, 0, 0.18]) {
      const stripe = box(room.width * 0.65, 0.025, 0.08, materials.trim);
      stripe.position.set(room.x, 0.015, room.z + room.depth * offset);
      group.add(stripe);
    }
  } else if (room.type === 'treasure') {
    const plate = box(room.width * 0.35, 0.05, room.depth * 0.35, materials.accent);
    plate.position.set(room.x, -0.01, room.z);
    group.add(plate);
  } else if (room.type === 'shrine') {
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.7, 2.2, 24), accentMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(room.x, 0.02, room.z);
    group.add(ring);
  }
}

function geometryForObstacle(style, width, height, depth) {
  if (style === 'pillar' || style === 'pylon' || style === 'instrument') {
    return new THREE.CylinderGeometry(width / 2, depth / 2, height, style === 'instrument' ? 6 : 8);
  }
  if (style === 'plinth') return new THREE.CylinderGeometry(width / 2, width * 0.58, height, 8);
  return new THREE.BoxGeometry(width, height, depth);
}

function buildObstacle(group, obstacle, materials, ghost) {
  const accentStyles = new Set(['pylon', 'instrument', 'plinth', 'inspection']);
  const material = accentStyles.has(obstacle.style) ? materials.accent : obstacle.style === 'shelf' ? materials.wallSecondary : materials.trim;
  const mesh = new THREE.Mesh(
    geometryForObstacle(obstacle.style, obstacle.width, obstacle.height, obstacle.depth),
    material,
  );
  mesh.position.set(obstacle.x, obstacle.height / 2, obstacle.z);
  mesh.rotation.y = obstacle.rotation;
  mesh.castShadow = !ghost;
  mesh.receiveShadow = true;
  mesh.userData.obstacleId = obstacle.id;
  mesh.userData.obstacleStyle = obstacle.style;
  group.add(mesh);

  if (!ghost && (obstacle.style === 'desk' || obstacle.style === 'inspection')) {
    const surface = box(obstacle.width * 0.84, 0.05, obstacle.depth * 0.78, materials.accent);
    surface.position.set(obstacle.x, obstacle.height + 0.04, obstacle.z);
    surface.rotation.y = obstacle.rotation;
    group.add(surface);
  }
}

export function buildRoomLayer(group, rooms, connections, skin, ghost, layout = null) {
  const floorMaterial = makeMaterial(skin.floor, {
    transparent: ghost,
    opacity: ghost ? 0.28 : 1,
    emissive: ghost ? skin.portal : 0x000000,
    emissiveIntensity: ghost ? 0.18 : 0,
    depthWrite: !ghost,
  });
  const floorAccent = makeMaterial(skin.floorSecondary, { transparent: ghost, opacity: ghost ? 0.24 : 1, depthWrite: !ghost });
  const wallMaterial = makeMaterial(skin.wall, { transparent: ghost, opacity: ghost ? 0.2 : 1, depthWrite: !ghost });
  const wallSecondary = makeMaterial(skin.wallSecondary ?? skin.wall, { transparent: ghost, opacity: ghost ? 0.22 : 1, depthWrite: !ghost });
  const trimMaterial = makeMaterial(skin.trim, {
    metalness: 0.62,
    roughness: 0.38,
    transparent: ghost,
    opacity: ghost ? 0.36 : 1,
    emissive: ghost ? skin.trim : 0x000000,
    emissiveIntensity: ghost ? 0.25 : 0,
    depthWrite: !ghost,
  });
  const accentMaterial = makeMaterial(skin.accent ?? skin.portal, {
    metalness: 0.28,
    roughness: 0.32,
    transparent: ghost,
    opacity: ghost ? 0.42 : 1,
    emissive: skin.accent ?? skin.portal,
    emissiveIntensity: ghost ? 0.48 : 0.12,
    depthWrite: !ghost,
  });
  const materials = { floor: floorMaterial, floorAccent, wall: wallMaterial, wallSecondary, trim: trimMaterial, accent: accentMaterial };

  for (const room of rooms) {
    const floor = box(room.width, 0.5, room.depth, room.type === 'archive' ? floorAccent : floorMaterial);
    floor.position.set(room.x, -0.3, room.z);
    floor.receiveShadow = true;
    group.add(floor);

    const wallHeight = ghost ? 0.24 : 1.15;
    buildRoomWalls(group, room, layout?.openings?.get(room.id), wallHeight, wallMaterial, trimMaterial, ghost);
    moduleForRoom(group, room, skin, materials, ghost);
  }

  for (const connection of connections) {
    const points = connection.corridor.points;
    for (let index = 0; index < points.length - 1; index += 1) {
      const transform = segmentTransform(points[index], points[index + 1]);
      if (transform.length < 0.1) continue;
      const corridor = box(transform.length + 1.5, 0.35, connection.corridor.width, connection.critical ? floorAccent : floorMaterial);
      corridor.position.set(transform.x, -0.22, transform.z);
      corridor.rotation.y = -transform.angle;
      corridor.receiveShadow = true;
      group.add(corridor);
    }
  }

  for (const obstacle of layout?.obstacles ?? []) buildObstacle(group, obstacle, materials, ghost);
}

export function buildInterlaceFeatures(group, overlaps, bridges, skin) {
  const overlapMaterial = makeMaterial(skin.portal, {
    transparent: true,
    opacity: 0.18,
    emissive: skin.portal,
    emissiveIntensity: 0.75,
    roughness: 0.24,
    metalness: 0.18,
    depthWrite: false,
  });
  const fractureMaterial = new THREE.MeshBasicMaterial({
    color: skin.trim,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (const overlap of overlaps) {
    const plate = box(overlap.width, 0.08, overlap.depth, overlapMaterial);
    plate.position.set(overlap.x, 0.04, overlap.z);
    plate.userData.overlap = overlap;
    group.add(plate);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(
        Math.max(0.8, Math.min(overlap.width, overlap.depth) * 0.18),
        Math.max(1.05, Math.min(overlap.width, overlap.depth) * 0.29),
        32,
      ),
      fractureMaterial,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(overlap.x, 0.11, overlap.z);
    ring.userData.phase = overlap.dressingSeed % 1000;
    group.add(ring);
  }

  const bridgeMaterial = makeMaterial(skin.trim, {
    transparent: true,
    opacity: 0.56,
    emissive: skin.portal,
    emissiveIntensity: 0.9,
    metalness: 0.45,
    roughness: 0.28,
    depthWrite: false,
  });
  for (const bridge of bridges) {
    const points = bridge.corridor.points;
    for (let index = 0; index < points.length - 1; index += 1) {
      const transform = segmentTransform(points[index], points[index + 1]);
      if (transform.length < 0.1) continue;
      const corridor = box(transform.length + 0.8, 0.16, bridge.corridor.width, bridgeMaterial);
      corridor.position.set(transform.x, 0.02, transform.z);
      corridor.rotation.y = -transform.angle;
      corridor.userData.bridge = bridge;
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
