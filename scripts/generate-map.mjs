import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateMapState, validateMapState } from '../src/core/dungeon-generator.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const seed = process.argv[2] ?? 'ABRIR-001';
const output = process.argv[3] ?? 'public/maps/abrir-001.json';
const state = generateMapState({ seed, roomCount: 20, loopChance: 0.3, interlaceAtSeconds: 90 });
const validation = validateMapState(state);
if (!validation.valid) {
  throw new Error(`Map generation failed: ${validation.errors.join(' ')}`);
}
await fs.mkdir(path.dirname(path.resolve(root, output)), { recursive: true });
await fs.writeFile(path.resolve(root, output), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
console.log(`Generated ${output} from seed ${seed}: ${state.rooms.length} rooms, ${state.connections.length} links.`);
