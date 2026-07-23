import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { createMapState } from '../src/abrir/map-state.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.resolve(
  root,
  process.argv[2] ?? 'content/maps/abrir-mvp.config.json',
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function loadGeneratorFromShowcase() {
  const sourcePath = path.join(root, 'src', 'main.js');
  const source = await readFile(sourcePath, 'utf8');
  const rendererMarker = '/* ================================================================\n   RENDERER';
  const rendererIndex = source.indexOf(rendererMarker);

  assert(rendererIndex > 0, 'Could not locate the renderer boundary in src/main.js.');

  const generatorSource = `${source
    .slice(0, rendererIndex)
    .replace(/import \* as THREE from ['"]three['"];\s*/, '')}\nexport { generateDungeon };\n`;

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(
    generatorSource,
    'utf8',
  ).toString('base64')}`;

  return import(moduleUrl);
}

const config = JSON.parse(await readFile(configPath, 'utf8'));
assert(config && typeof config === 'object', 'Map config must be an object.');
assert(config.params && typeof config.params === 'object', 'Map config requires params.');
assert(Number.isInteger(config.params.seed), 'params.seed must be an integer.');
assert(Number.isInteger(config.params.roomCount), 'params.roomCount must be an integer.');
assert(Number.isFinite(config.params.loopChance), 'params.loopChance must be numeric.');
assert(Number.isFinite(config.params.decorDensity), 'params.decorDensity must be numeric.');
assert(typeof config.params.themeKey === 'string', 'params.themeKey must be a string.');

const { generateDungeon } = await loadGeneratorFromShowcase();
assert(typeof generateDungeon === 'function', 'The Three.js showcase did not expose generateDungeon().');

const dungeon = generateDungeon(config.params);
assert(dungeon?.valid === true, `Seed ${config.params.seed} did not generate a valid connected map.`);

const state = createMapState(dungeon, config.gameplay ?? {});
state.createdAt = config.snapshotCreatedAt ?? '2026-07-23T00:00:00.000Z';

// Generation duration varies by machine and must not create noisy snapshot diffs.
if (state.generated?.stats) state.generated.stats.genMs = 0;

const outputRelative = config.outputFile ?? `content/maps/generated/abrir-${config.params.seed}.json`;
const outputPath = path.resolve(root, outputRelative);
assert(
  outputPath.startsWith(path.join(root, 'content', 'maps', 'generated')),
  'outputFile must remain inside content/maps/generated/.',
);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

console.log(
  `Generated ${path.relative(root, outputPath)} from the Three.js showcase: ` +
    `${state.generated.rooms.length} rooms, ${state.generated.edges.length} edges, ` +
    `${state.generated.dimensions.width}×${state.generated.dimensions.height}, ` +
    `seed ${state.generator.seed}.`,
);
