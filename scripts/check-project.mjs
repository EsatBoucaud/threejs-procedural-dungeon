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
  'src/render/world-renderer.js',
  'src/game/run-controller.js',
  'public/maps/abrir-001.json',
];
for (const file of required) await fs.access(path.join(root, file));
const state = JSON.parse(await fs.readFile(path.join(root, 'public/maps/abrir-001.json'), 'utf8'));
const result = validateMapState(state);
if (!result.valid) throw new Error(result.errors.join('\n'));
console.log(`ABRIR project check passed. ${state.rooms.length} rooms / ${state.connections.length} links.`);
