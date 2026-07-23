function numberOf(value) {
  if (Number.isFinite(value)) return Math.abs(value) >>> 0;
  let hash = 2166136261;
  for (const character of String(value ?? 'layout')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sideFor(dx, dz) {
  if (Math.abs(dx) >= Math.abs(dz)) return dx >= 0 ? 'east' : 'west';
  return dz >= 0 ? 'south' : 'north';
}

function merge(entries) {
  const result = [];
  for (const entry of [...entries].sort((a, b) => a.center - b.center)) {
    const previous = result.at(-1);
    if (!previous || entry.center - entry.width / 2 > previous.center + previous.width / 2 + 0.35) {
      result.push({ ...entry });
      continue;
    }
    const start = Math.min(previous.center - previous.width / 2, entry.center - entry.width / 2);
    const end = Math.max(previous.center + previous.width / 2, entry.center + entry.width / 2);
    previous.center = (start + end) / 2;
    previous.width = end - start;
  }
  return result;
}

function deriveOpenings(rooms, connections) {
  const roomsById = new Map(rooms.map((room) => [room.id, room]));
  const table = new Map(rooms.map((room) => [room.id, { north: [], south: [], east: [], west: [] }]));
  const add = (room, point, next, width) => {
    if (!room) return;
    const side = sideFor(next.x - point.x, next.z - point.z);
    table.get(room.id)[side].push({
      side,
      center: side === 'north' || side === 'south' ? point.x - room.x : point.z - room.z,
      width: Math.max(2.5, width + 0.65),
    });
  };
  for (const connection of connections ?? []) {
    const points = connection.corridor?.points ?? [];
    if (points.length < 2) continue;
    add(roomsById.get(connection.a), points[0], points[1], connection.corridor.width);
    const end = points.length - 1;
    add(roomsById.get(connection.b), points[end], points[end - 1], connection.corridor.width);
  }
  for (const sides of table.values()) {
    for (const side of Object.keys(sides)) sides[side] = merge(sides[side]);
  }
  return table;
}

const POSITIONS = [
  [-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3],
  [-0.34, 0.08], [0.34, -0.08], [0.08, -0.34], [-0.08, 0.34],
];

function countFor(room, bonus) {
  if (room.type === 'entrance' || room.type === 'breach') return 0;
  if (room.type === 'shrine') return 1;
  if (room.type === 'archive') return 4 + bonus;
  if (room.type === 'vault') return 5 + bonus;
  if (room.type === 'elite') return 4 + bonus;
  return 2 + bonus;
}

function styleFor(room, profile, index) {
  if (room.type === 'archive') return index % 2 ? 'cabinet' : 'shelf';
  if (room.type === 'vault') return index % 3 ? 'case' : 'pillar';
  if (room.type === 'treasure') return index ? 'case' : 'plinth';
  if (room.type === 'shrine') return 'table';
  if (profile === 'municipal-archive') return index % 2 ? 'cabinet' : 'inspection';
  if (profile === 'transit') return index % 2 ? 'pylon' : 'barrier';
  if (profile === 'glass-office') return index % 2 ? 'cabinet' : 'desk';
  if (profile === 'reliquary') return index % 2 ? 'case' : 'pillar';
  if (profile === 'weather') return index % 2 ? 'ballast' : 'instrument';
  if (profile === 'customs') return index % 2 ? 'case' : 'inspection';
  if (profile === 'remote-fracture') return index % 2 ? 'pylon' : 'cover';
  return index % 2 ? 'pylon' : 'cover';
}

function sizeFor(style, seed) {
  const variance = (seed % 17) / 100;
  const sizes = {
    shelf: [2.2 + variance, 0.75, 2.2], cabinet: [1.25, 0.85, 1.6],
    pillar: [1.05, 1.05, 2.8], case: [1.4 + variance, 1.25, 1.25],
    plinth: [1.7, 1.7, 0.85], table: [2, 1, 0.8], barrier: [2.7, 0.55, 1.05],
    pylon: [0.85, 0.85, 1.9], desk: [2.35, 1.15, 0.95], instrument: [1.45, 1.45, 2.2],
    ballast: [1.8, 1.2, 1.05], inspection: [2.5, 1.05, 0.9], cover: [2 + variance, 1.1, 1.05],
  };
  return sizes[style] ?? sizes.cover;
}

function deriveObstacles(rooms, seed, profile, densityBonus) {
  const obstacles = [];
  for (const room of rooms) {
    const bonus = Math.min(2, (numberOf(room.dressingSeed + seed) % 2) + densityBonus);
    const count = Math.min(POSITIONS.length, countFor(room, bonus));
    const shift = numberOf(`${seed}:${room.id}:${room.dressingSeed}`) % POSITIONS.length;
    for (let index = 0; index < count; index += 1) {
      const [nx, nz] = POSITIONS[(index + shift) % POSITIONS.length];
      const style = styleFor(room, profile, index);
      const [width, depth, height] = sizeFor(style, numberOf(`${room.id}:${index}:${seed}`));
      const rotation = (numberOf(`${room.id}:${index}:rotation`) % 4) * Math.PI / 2;
      const swap = Math.abs(Math.sin(rotation)) > 0.5;
      const collisionWidth = swap ? depth : width;
      const collisionDepth = swap ? width : depth;
      const maxOffsetX = Math.max(0, room.width / 2 - collisionWidth / 2 - 0.45);
      const maxOffsetZ = Math.max(0, room.depth / 2 - collisionDepth / 2 - 0.45);
      const x = room.x + clamp(nx * room.width, -maxOffsetX, maxOffsetX);
      const z = room.z + clamp(nz * room.depth, -maxOffsetZ, maxOffsetZ);
      obstacles.push({
        id: `${room.id}:obstacle:${index}`,
        roomId: room.id,
        origin: room.origin ?? 'base',
        style, x, z, width, depth, height, rotation,
        collision: {
          left: x - collisionWidth / 2 - 0.18,
          right: x + collisionWidth / 2 + 0.18,
          top: z - collisionDepth / 2 - 0.18,
          bottom: z + collisionDepth / 2 + 0.18,
        },
      });
    }
  }
  return obstacles;
}

export function deriveLayerLayout(rooms, connections, options = {}) {
  return {
    openings: deriveOpenings(rooms, connections),
    obstacles: deriveObstacles(rooms, options.seed ?? 0, options.profile ?? 'institutional', options.densityBonus ?? 0),
  };
}

export function deriveMapLayout(mapState) {
  return {
    local: deriveLayerLayout(mapState.rooms, mapState.connections, {
      seed: mapState.seed,
      profile: mapState.route?.layoutProfile ?? 'institutional',
    }),
    remote: deriveLayerLayout(mapState.interlace?.rooms ?? [], mapState.interlace?.connections ?? [], {
      seed: mapState.interlace?.seed ?? mapState.seed,
      profile: 'remote-fracture',
    }),
  };
}

export function pointInsideObstacle(point, obstacle, margin = 0) {
  return point.x >= obstacle.collision.left - margin
    && point.x <= obstacle.collision.right + margin
    && point.z >= obstacle.collision.top - margin
    && point.z <= obstacle.collision.bottom + margin;
}
