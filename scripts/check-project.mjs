import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMapState } from '../src/core/dungeon-generator.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const required = [
  'index.html',
  'src/main.js',
  'src/core/dungeon-generator.js',
  'src/content/contracts.js',
  'src/content/items.js',
  'src/render/world-renderer.js',
  'src/game/run-controller.js',
  'src/game/mission-system.js',
  'src/game/director-system.js',
  'src/ui/minimap.js',
  'public/maps/abrir-001.json',
];
for (const file of required) await fs.access(path.join(root, file));

const state = JSON.parse(await fs.readFile(path.join(root, 'public/maps/abrir-001.json'), 'utf8'));
const result = validateMapState(state);
if (!result.valid) throw new Error(result.errors.join('\n'));
if (state.schemaVersion !== 2) throw new Error(`Expected schemaVersion 2, received ${state.schemaVersion}.`);
if (state.interlace.seed === state.seed) throw new Error('Interlace must use an independent seed.');
if (state.interlace.rooms.some((room) => state.rooms.includes(room))) throw new Error('Interlace rooms must be independently generated objects.');
if (state.interlace.connections.length < state.interlace.rooms.length - 1) throw new Error('Remote graph is not connected.');
if (state.interlace.bridges.length < 1) throw new Error('At least one cross-state bridge is required.');
if (!Array.isArray(state.interlace.overlaps)) throw new Error('Overlap list is required.');

console.log(
  `ABRIR project check passed. local=${state.rooms.length}/${state.connections.length} remote=${state.interlace.rooms.length}/${state.interlace.connections.length} bridges=${state.interlace.bridges.length} overlaps=${state.interlace.overlaps.length}.`,
);
