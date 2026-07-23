export const ABRIR_MAP_STATE_VERSION = 1;
export const ABRIR_GENERATOR_ID = 'dungeon-forge-threejs';
export const ABRIR_GENERATOR_VERSION = '1.0.0';

function toSerializable(value) {
  if (value === null || value === undefined) return value;
  if (ArrayBuffer.isView(value)) return Array.from(value);
  if (Array.isArray(value)) return value.map(toSerializable);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .map(([key, child]) => [key, toSerializable(child)]),
    );
  }
  return value;
}

function requireDungeon(dungeon) {
  if (!dungeon || dungeon.valid !== true) {
    throw new Error('Cannot export an invalid or missing dungeon.');
  }
  if (!Number.isInteger(dungeon.seed)) {
    throw new Error('Generated dungeon is missing an integer seed.');
  }
  if (!Number.isInteger(dungeon.W) || !Number.isInteger(dungeon.H)) {
    throw new Error('Generated dungeon is missing valid dimensions.');
  }
  if (!Array.isArray(dungeon.rooms) || !Array.isArray(dungeon.edges)) {
    throw new Error('Generated dungeon is missing rooms or graph edges.');
  }
}

/**
 * Convert the current Three.js generator output into the stable ABRIR snapshot
 * consumed by the gameplay layer.
 *
 * @param {object} dungeon Raw object returned by generateDungeon().
 * @param {object} [gameplayOverlay] Optional authored ABRIR encounter data.
 * @returns {object} JSON-safe, versioned map state.
 */
export function createMapState(dungeon, gameplayOverlay = {}) {
  requireDungeon(dungeon);

  return {
    schemaVersion: ABRIR_MAP_STATE_VERSION,
    createdAt: new Date().toISOString(),
    generator: {
      id: ABRIR_GENERATOR_ID,
      version: ABRIR_GENERATOR_VERSION,
      seed: dungeon.seed,
      params: toSerializable(dungeon.params ?? {}),
    },
    generated: {
      name: dungeon.name ?? `ABRIR-${dungeon.seed}`,
      dimensions: {
        width: dungeon.W,
        height: dungeon.H,
      },
      entranceRoomId: dungeon.entrance,
      bossRoomId: dungeon.boss,
      maxDepth: dungeon.maxDepth,
      maxBfs: dungeon.maxBfs,
      rooms: toSerializable(dungeon.rooms),
      edges: toSerializable(dungeon.edges),
      layers: {
        grid: toSerializable(dungeon.grid),
        roomId: toSerializable(dungeon.roomId),
        corridor: toSerializable(dungeon.corridor),
        doorway: toSerializable(dungeon.doorway),
        bfs: toSerializable(dungeon.bfs),
        lakeMask: toSerializable(dungeon.lakeMask),
      },
      markers: {
        props: toSerializable(dungeon.props ?? []),
        spawns: toSerializable(dungeon.spawns ?? []),
        torches: toSerializable(dungeon.torches ?? []),
        pools: toSerializable(dungeon.pools ?? []),
        lakeCells: toSerializable(dungeon.lakeCells ?? []),
        arches: toSerializable(dungeon.arches ?? []),
      },
      stats: toSerializable(dungeon.stats ?? {}),
    },
    gameplay: {
      encounterOverrides: {},
      lootTables: {},
      interlacing: {
        enabled: true,
        triggerSeconds: 360,
        state: 'dormant',
      },
      ...toSerializable(gameplayOverlay),
    },
  };
}

export function mapStateFilename(mapState) {
  const seed = mapState?.generator?.seed ?? 'unknown';
  const name = String(mapState?.generated?.name ?? 'abrir-map')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56);

  return `${name || 'abrir-map'}-${seed}.json`;
}

/** Download a generated state from the browser-based Three.js forge. */
export function downloadMapState(mapState, filename = mapStateFilename(mapState)) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('downloadMapState() requires a browser environment.');
  }

  const blob = new Blob([`${JSON.stringify(mapState, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
