import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mapsDir = path.join(root, 'content', 'maps', 'generated');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateMapState(state, filename) {
  assert(state && typeof state === 'object', 'root must be an object');
  assert(state.schemaVersion === 1, 'schemaVersion must be 1');
  assert(typeof state.createdAt === 'string', 'createdAt must be a string');

  const generator = state.generator;
  assert(generator?.id === 'dungeon-forge-threejs', 'generator.id is invalid');
  assert(Number.isInteger(generator?.seed) && generator.seed >= 0, 'generator.seed must be a non-negative integer');
  assert(generator?.params && typeof generator.params === 'object', 'generator.params must be an object');

  const generated = state.generated;
  assert(generated && typeof generated === 'object', 'generated section is required');
  assert(typeof generated.name === 'string' && generated.name.length > 0, 'generated.name is required');

  const width = generated.dimensions?.width;
  const height = generated.dimensions?.height;
  assert(Number.isInteger(width) && width > 0, 'generated.dimensions.width must be positive');
  assert(Number.isInteger(height) && height > 0, 'generated.dimensions.height must be positive');
  const cellCount = width * height;

  assert(Array.isArray(generated.rooms) && generated.rooms.length >= 2, 'generated.rooms must contain at least two rooms');
  assert(Array.isArray(generated.edges) && generated.edges.length >= 1, 'generated.edges must contain at least one edge');
  assert(Number.isInteger(generated.entranceRoomId), 'generated.entranceRoomId must be an integer');
  assert(Number.isInteger(generated.bossRoomId), 'generated.bossRoomId must be an integer');

  const roomIds = new Set(generated.rooms.map((room) => room?.id));
  assert(roomIds.has(generated.entranceRoomId), 'entranceRoomId does not exist in rooms');
  assert(roomIds.has(generated.bossRoomId), 'bossRoomId does not exist in rooms');

  for (const [index, edge] of generated.edges.entries()) {
    assert(Number.isInteger(edge?.a) && roomIds.has(edge.a), `edge ${index} has an invalid a room`);
    assert(Number.isInteger(edge?.b) && roomIds.has(edge.b), `edge ${index} has an invalid b room`);
  }

  const layers = generated.layers;
  for (const layerName of ['grid', 'roomId', 'corridor', 'doorway', 'bfs']) {
    assert(Array.isArray(layers?.[layerName]), `layers.${layerName} must be an array`);
    assert(layers[layerName].length === cellCount, `layers.${layerName} must contain ${cellCount} cells`);
  }
  if (layers.lakeMask !== undefined) {
    assert(Array.isArray(layers.lakeMask), 'layers.lakeMask must be an array');
    assert(layers.lakeMask.length === cellCount, `layers.lakeMask must contain ${cellCount} cells`);
  }

  const gameplay = state.gameplay;
  assert(gameplay && typeof gameplay === 'object', 'gameplay section is required');
  assert(typeof gameplay.interlacing?.enabled === 'boolean', 'gameplay.interlacing.enabled must be boolean');
  assert(Number.isFinite(gameplay.interlacing?.triggerSeconds), 'gameplay.interlacing.triggerSeconds must be numeric');

  return `${filename}: ${generated.rooms.length} rooms, ${generated.edges.length} edges, ${width}×${height}, seed ${generator.seed}`;
}

if (!existsSync(mapsDir)) {
  console.log('No generated ABRIR maps found yet. Validation scaffold is ready.');
  process.exit(0);
}

const filenames = (await readdir(mapsDir))
  .filter((name) => name.endsWith('.json'))
  .sort();

if (filenames.length === 0) {
  console.log('No generated ABRIR maps found yet. Validation scaffold is ready.');
  process.exit(0);
}

let failures = 0;
for (const filename of filenames) {
  try {
    const raw = await readFile(path.join(mapsDir, filename), 'utf8');
    const state = JSON.parse(raw);
    console.log(`✓ ${validateMapState(state, filename)}`);
  } catch (error) {
    failures += 1;
    console.error(`✗ ${filename}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`Validated ${filenames.length} ABRIR map state${filenames.length === 1 ? '' : 's'}.`);
}
