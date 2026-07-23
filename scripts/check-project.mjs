import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHAVE_PROCESSES } from '../src/content/chave-processes.js';
import { FIELD_ROUTES } from '../src/content/routes.js';
import { ROUTE_SKINS } from '../src/content/room-skins.js';
import { INSTITUTE_UPGRADES } from '../src/content/upgrades.js';
import { validateMapState } from '../src/core/dungeon-generator.js';
import { deriveMapLayout } from '../src/core/room-layout.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const required = [
  'index.html',
  'src/main.js',
  'src/core/dungeon-generator.js',
  'src/core/room-layout.js',
  'src/content/chave-processes.js',
  'src/content/characters.js',
  'src/content/combat-kits.js',
  'src/content/contracts.js',
  'src/content/items.js',
  'src/content/room-skins.js',
  'src/content/routes.js',
  'src/content/upgrades.js',
  'src/render/scene-factory.js',
  'src/render/world-renderer.js',
  'src/render/entity-factory.js',
  'src/game/navigation.js',
  'src/game/run-controller.js',
  'src/game/combat-system.js',
  'src/game/mission-system.js',
  'src/game/director-system.js',
  'src/game/deployment-system.js',
  'src/game/progression-system.js',
  'src/game/archive-system.js',
  'src/ui/minimap.js',
  'src/ui/headquarters.js',
  'src/ui/headquarters.css',
  'src/ui/processes.css',
  'src/ui/deployment-builder.js',
  'src/ui/deployment-builder.css',
  'public/assets/ui/instituto-travessia-seal.svg',
  'public/assets/ui/chave-geral-audit-mark.svg',
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

const layout = deriveMapLayout(state);
if (layout.local.openings.size !== state.rooms.length) throw new Error('Local opening table does not cover every room.');
if (layout.remote.openings.size !== state.interlace.rooms.length) throw new Error('Remote opening table does not cover every room.');

const processIds = Object.keys(CHAVE_PROCESSES);
const requiredProcessIds = ['auditor', 'seizure-chief', 'route-runner', 'warden'];
for (const processId of requiredProcessIds) {
  if (!processIds.includes(processId)) throw new Error(`Missing Chave Geral process: ${processId}.`);
}

if (FIELD_ROUTES.length < 6) throw new Error('Headquarters route board requires at least six routes.');
if (new Set(FIELD_ROUTES.map((route) => route.id)).size !== FIELD_ROUTES.length) throw new Error('Route IDs must be unique.');
if (FIELD_ROUTES.some((route) => route.rewardMultiplier < 1 || route.roomCount < 10)) throw new Error('Route tuning is invalid.');
if (FIELD_ROUTES.some((route) => !processIds.includes(route.chaveProcess))) throw new Error('Every route requires a valid Chave Geral major process.');
if (FIELD_ROUTES.some((route) => !route.layoutProfile)) throw new Error('Every route requires a procedural architecture profile.');
if (FIELD_ROUTES.some((route) => !ROUTE_SKINS[route.id])) throw new Error('Every route requires a procedural material skin.');
const routeProcesses = new Set(FIELD_ROUTES.map((route) => route.chaveProcess));
for (const processId of requiredProcessIds) {
  if (!routeProcesses.has(processId)) throw new Error(`No current route exposes ${processId}.`);
}

if (INSTITUTE_UPGRADES.length < 7) throw new Error('Permissions desk requires at least seven upgrades.');
if (new Set(INSTITUTE_UPGRADES.map((upgrade) => upgrade.id)).size !== INSTITUTE_UPGRADES.length) throw new Error('Upgrade IDs must be unique.');

const mainSource = await fs.readFile(path.join(root, 'src/main.js'), 'utf8');
const characterSource = await fs.readFile(path.join(root, 'src/content/characters.js'), 'utf8');
const deploymentSource = await fs.readFile(path.join(root, 'src/game/deployment-system.js'), 'utf8');
const directorSource = await fs.readFile(path.join(root, 'src/game/director-system.js'), 'utf8');
const rendererSource = await fs.readFile(path.join(root, 'src/render/world-renderer.js'), 'utf8');
const navigationSource = await fs.readFile(path.join(root, 'src/game/navigation.js'), 'utf8');
for (const expected of ['Sócrates', 'Zélia', 'Lia', 'Chilindo']) {
  if (!characterSource.includes(expected)) throw new Error(`Missing field character identity: ${expected}.`);
}
for (const retired of ['Caio Vilar', "name: 'Kindred'"]) {
  if (characterSource.includes(retired)) throw new Error(`Retired character identity must not return: ${retired}.`);
}
if (!mainSource.includes("headquarters.open()")) throw new Error('Headquarters must remain the primary startup loop.');
if (!mainSource.includes('DeploymentBuilder')) throw new Error('Multiplayer deployment builder must remain wired into startup.');
for (const expected of ['two-player', 'four-player', 'compositionRule']) {
  if (!deploymentSource.includes(expected)) throw new Error(`Deployment contract missing: ${expected}.`);
}
for (const expected of ['seizeHighestRecovered', 'relocateEnemy', 'extractionLocked']) {
  if (!directorSource.includes(expected)) throw new Error(`Major process behavior missing: ${expected}.`);
}
if (!rendererSource.includes('deriveMapLayout')) throw new Error('Renderer must consume the shared room layout.');
if (!navigationSource.includes('deriveMapLayout')) throw new Error('Navigation must consume the shared room layout.');

console.log(
  `ABRIR project check passed. local=${state.rooms.length}/${state.connections.length} remote=${state.interlace.rooms.length}/${state.interlace.connections.length} localObjects=${layout.local.obstacles.length} remoteObjects=${layout.remote.obstacles.length} bridges=${state.interlace.bridges.length} routes=${FIELD_ROUTES.length} permissions=${INSTITUTE_UPGRADES.length} processes=${processIds.length}.`,
);
