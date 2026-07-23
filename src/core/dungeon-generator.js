import { createRng, hashString } from './rng.js';

const ROOM_TYPES = ['combat', 'combat', 'combat', 'archive', 'treasure', 'shrine'];

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function roomBounds(room, padding = 0) {
  return {
    left: room.x - room.width / 2 - padding,
    right: room.x + room.width / 2 + padding,
    top: room.z - room.depth / 2 - padding,
    bottom: room.z + room.depth / 2 + padding,
  };
}

function overlapVector(a, b, padding) {
  const A = roomBounds(a, padding);
  const B = roomBounds(b, padding);
  const overlapX = Math.min(A.right, B.right) - Math.max(A.left, B.left);
  const overlapZ = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
  if (overlapX <= 0 || overlapZ <= 0) return null;
  if (overlapX < overlapZ) {
    return { x: a.x < b.x ? -overlapX : overlapX, z: 0 };
  }
  return { x: 0, z: a.z < b.z ? -overlapZ : overlapZ };
}

function separateRooms(rooms) {
  for (let pass = 0; pass < 260; pass += 1) {
    let moved = false;
    for (let a = 0; a < rooms.length; a += 1) {
      for (let b = a + 1; b < rooms.length; b += 1) {
        const vector = overlapVector(rooms[a], rooms[b], 2.4);
        if (!vector) continue;
        moved = true;
        rooms[a].x += vector.x * 0.51;
        rooms[a].z += vector.z * 0.51;
        rooms[b].x -= vector.x * 0.51;
        rooms[b].z -= vector.z * 0.51;
      }
    }
    if (!moved) break;
  }
  for (const room of rooms) {
    room.x = Math.round(room.x);
    room.z = Math.round(room.z);
  }
}

function candidateEdges(rooms) {
  const edges = [];
  for (let a = 0; a < rooms.length; a += 1) {
    const nearest = rooms
      .map((room, b) => ({ b, length: a === b ? Number.POSITIVE_INFINITY : distance(rooms[a], room) }))
      .sort((left, right) => left.length - right.length)
      .slice(0, 5);
    for (const edge of nearest) {
      const lo = Math.min(a, edge.b);
      const hi = Math.max(a, edge.b);
      if (!edges.some((item) => item.a === lo && item.b === hi)) {
        edges.push({ a: lo, b: hi, length: edge.length });
      }
    }
  }
  return edges.sort((left, right) => left.length - right.length);
}

function connectRooms(rooms, rng, loopChance) {
  const candidates = candidateEdges(rooms);
  const parent = rooms.map((_, index) => index);
  const find = (index) => {
    let cursor = index;
    while (parent[cursor] !== cursor) cursor = parent[cursor];
    while (parent[index] !== index) {
      const next = parent[index];
      parent[index] = cursor;
      index = next;
    }
    return cursor;
  };
  const union = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA === rootB) return false;
    parent[rootB] = rootA;
    return true;
  };

  const selected = [];
  const leftovers = [];
  for (const edge of candidates) {
    if (union(edge.a, edge.b)) selected.push({ ...edge, loop: false });
    else leftovers.push(edge);
  }
  for (const edge of leftovers) {
    if (rng.chance(loopChance) && edge.length < 34) selected.push({ ...edge, loop: true });
  }
  return selected;
}

function assignSemantics(rooms, edges, rng) {
  const adjacency = rooms.map(() => []);
  for (const edge of edges) {
    adjacency[edge.a].push(edge.b);
    adjacency[edge.b].push(edge.a);
  }

  let entrance = 0;
  for (let index = 1; index < rooms.length; index += 1) {
    if (rooms[index].x + rooms[index].z < rooms[entrance].x + rooms[entrance].z) entrance = index;
  }

  const depth = rooms.map(() => -1);
  const parent = rooms.map(() => -1);
  depth[entrance] = 0;
  const queue = [entrance];
  for (let index = 0; index < queue.length; index += 1) {
    const room = queue[index];
    for (const neighbor of adjacency[room]) {
      if (depth[neighbor] >= 0) continue;
      depth[neighbor] = depth[room] + 1;
      parent[neighbor] = room;
      queue.push(neighbor);
    }
  }

  let boss = entrance;
  for (let index = 0; index < rooms.length; index += 1) {
    if (depth[index] > depth[boss]) boss = index;
  }
  const maxDepth = Math.max(1, depth[boss]);
  const critical = new Set();
  for (let cursor = boss; cursor >= 0; cursor = parent[cursor]) {
    critical.add(cursor);
    if (cursor === entrance) break;
  }

  for (const room of rooms) {
    room.graphDepth = depth[room.id];
    room.difficulty = Math.max(0, depth[room.id] / maxDepth);
    room.degree = adjacency[room.id].length;
    room.onCriticalPath = critical.has(room.id);
    room.type = ROOM_TYPES[Math.floor(rng.raw() * ROOM_TYPES.length)];
  }
  rooms[entrance].type = 'entrance';
  rooms[entrance].difficulty = 0;
  rooms[boss].type = 'vault';
  rooms[boss].difficulty = 1;

  const leaves = rooms
    .filter((room) => room.degree === 1 && room.id !== entrance && room.id !== boss)
    .sort((a, b) => b.difficulty - a.difficulty);
  if (leaves[0]) leaves[0].type = 'treasure';
  if (leaves[1]) leaves[1].type = 'archive';

  const elites = rooms
    .filter((room) => room.onCriticalPath && room.type === 'combat' && room.difficulty > 0.5)
    .sort((a, b) => b.difficulty - a.difficulty);
  if (elites[0]) elites[0].type = 'elite';

  return { entrance, boss, maxDepth };
}

function corridorForRooms(a, b) {
  const horizontalFirst = Math.abs(a.x - b.x) > Math.abs(a.z - b.z);
  const midpoint = horizontalFirst
    ? { x: b.x, z: a.z }
    : { x: a.x, z: b.z };
  return {
    width: 3.2,
    points: [
      { x: a.x, z: a.z },
      midpoint,
      { x: b.x, z: b.z },
    ],
  };
}

function interlaceState(baseState, rng) {
  const angle = rng.float(-0.31, 0.31);
  const offset = { x: rng.float(-9, 9), z: rng.float(-9, 9) };
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const rooms = baseState.rooms
    .filter((room) => room.difficulty > 0.36)
    .map((room, index) => ({
      ...room,
      id: `i-${index}`,
      sourceRoomId: room.id,
      x: room.x * cosine - room.z * sine + offset.x,
      z: room.x * sine + room.z * cosine + offset.z,
      type: room.type === 'entrance' ? 'combat' : room.type,
      difficulty: Math.min(1, room.difficulty + 0.18),
    }));
  return { angle, offset, rooms };
}

export function generateMapState(options = {}) {
  const seedLabel = String(options.seed ?? 'ABRIR-001');
  const seed = Number.isFinite(options.seed) ? options.seed >>> 0 : hashString(seedLabel);
  const roomCount = Math.max(10, Math.min(34, options.roomCount ?? 18));
  const loopChance = Math.max(0, Math.min(0.65, options.loopChance ?? 0.26));
  const rng = createRng(seed);
  const radius = Math.sqrt(roomCount) * 10.8;
  const rooms = [];

  for (let id = 0; id < roomCount; id += 1) {
    const angle = rng.float(0, Math.PI * 2);
    const distanceFromCenter = radius * Math.sqrt(rng.raw());
    const large = rng.chance(0.22);
    rooms.push({
      id,
      x: Math.cos(angle) * distanceFromCenter,
      z: Math.sin(angle) * distanceFromCenter,
      width: large ? rng.int(13, 18) : rng.int(8, 13),
      depth: large ? rng.int(13, 18) : rng.int(8, 13),
      ceiling: rng.float(4.4, 6.8),
      shape: rng.pick(['rect', 'rect', 'oct']),
      type: 'combat',
      difficulty: 0,
      graphDepth: 0,
      degree: 0,
      onCriticalPath: false,
      dressingSeed: rng.int(1, 999999),
    });
  }

  separateRooms(rooms);
  const edges = connectRooms(rooms, rng, loopChance);
  const semantics = assignSemantics(rooms, edges, rng);
  const connections = edges.map((edge, id) => ({
    id,
    ...edge,
    critical: rooms[edge.a].onCriticalPath && rooms[edge.b].onCriticalPath,
    corridor: corridorForRooms(rooms[edge.a], rooms[edge.b]),
  }));

  const state = {
    schemaVersion: 1,
    generator: 'abrir-threejs-state-v1',
    seedLabel,
    seed,
    createdAt: new Date(0).toISOString(),
    settings: { roomCount, loopChance },
    rooms,
    connections,
    entranceRoomId: semantics.entrance,
    vaultRoomId: semantics.boss,
    interlaceAtSeconds: options.interlaceAtSeconds ?? 90,
  };
  state.interlace = interlaceState(state, rng);
  return state;
}

export function validateMapState(state) {
  const errors = [];
  if (!state || state.schemaVersion !== 1) errors.push('Unsupported or missing schemaVersion.');
  if (!Array.isArray(state?.rooms) || state.rooms.length < 2) errors.push('Map requires at least two rooms.');
  if (!Array.isArray(state?.connections) || state.connections.length < state.rooms.length - 1) {
    errors.push('Map graph is not sufficiently connected.');
  }
  const roomIds = new Set(state?.rooms?.map((room) => room.id));
  for (const edge of state?.connections ?? []) {
    if (!roomIds.has(edge.a) || !roomIds.has(edge.b)) errors.push(`Connection ${edge.id} references a missing room.`);
  }
  if (!roomIds.has(state?.entranceRoomId)) errors.push('Entrance room is missing.');
  if (!roomIds.has(state?.vaultRoomId)) errors.push('Vault room is missing.');
  return { valid: errors.length === 0, errors };
}
