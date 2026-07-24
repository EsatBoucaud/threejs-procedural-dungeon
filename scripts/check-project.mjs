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
  'src/content/field-comic.js',
  'src/content/interlace-forecast.js',
  'src/content/interaction-content.js',
  'src/content/items.js',
  'src/content/room-skins.js',
  'src/content/routes.js',
  'src/content/upgrades.js',
  'src/render/scene-factory.js',
  'src/render/world-renderer.js',
  'src/render/entity-factory.js',
  'src/game/navigation.js',
  'src/game/run-controller.js',
  'src/game/interactive-run-controller.js',
  'src/game/shared-interaction-system.js',
  'src/game/comic-page-state.js',
  'src/game/safe-window-system.js',
  'src/game/safe-window-runtime.js',
  'src/game/tutorial-system.js',
  'src/game/tutorial-runtime.js',
  'src/game/combat-system.js',
  'src/game/mission-system.js',
  'src/game/director-system.js',
  'src/game/deployment-system.js',
  'src/game/activity-authority.js',
  'src/game/progression-system.js',
  'src/game/archive-system.js',
  'src/ui/minimap.js',
  'src/ui/headquarters.js',
  'src/ui/headquarters.css',
  'src/ui/processes.css',
  'src/ui/deployment-builder.js',
  'src/ui/deployment-builder.css',
  'src/ui/shared-interactions.js',
  'src/ui/shared-interactions.css',
  'src/ui/comic-reader.js',
  'src/ui/comic-reader.css',
  'src/ui/safe-window-bootstrap.js',
  'src/ui/safe-window.css',
  'src/ui/tutorial-bootstrap.js',
  'src/ui/tutorial-guide.css',
  'docs/PLAYER_ACTIVITY_AUTHORITY.md',
  'docs/SAFE_WINDOW_CHOICE.md',
  'docs/COMIC_PAGE_FLIP.md',
  'docs/FIRST_RUN_TUTORIAL.md',
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

const indexSource = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const mainSource = await fs.readFile(path.join(root, 'src/main.js'), 'utf8');
const characterSource = await fs.readFile(path.join(root, 'src/content/characters.js'), 'utf8');
const deploymentSource = await fs.readFile(path.join(root, 'src/game/deployment-system.js'), 'utf8');
const activitySource = await fs.readFile(path.join(root, 'src/game/activity-authority.js'), 'utf8');
const sharedSource = await fs.readFile(path.join(root, 'src/game/shared-interaction-system.js'), 'utf8');
const comicStateSource = await fs.readFile(path.join(root, 'src/game/comic-page-state.js'), 'utf8');
const comicReaderSource = await fs.readFile(path.join(root, 'src/ui/comic-reader.js'), 'utf8');
const safeWindowSource = await fs.readFile(path.join(root, 'src/game/safe-window-system.js'), 'utf8');
const safeRuntimeSource = await fs.readFile(path.join(root, 'src/game/safe-window-runtime.js'), 'utf8');
const safeUiSource = await fs.readFile(path.join(root, 'src/ui/safe-window-bootstrap.js'), 'utf8');
const tutorialSource = await fs.readFile(path.join(root, 'src/game/tutorial-system.js'), 'utf8');
const tutorialRuntimeSource = await fs.readFile(path.join(root, 'src/game/tutorial-runtime.js'), 'utf8');
const tutorialUiSource = await fs.readFile(path.join(root, 'src/ui/tutorial-bootstrap.js'), 'utf8');
const missionSource = await fs.readFile(path.join(root, 'src/game/mission-system.js'), 'utf8');
const directorSource = await fs.readFile(path.join(root, 'src/game/director-system.js'), 'utf8');
const rendererSource = await fs.readFile(path.join(root, 'src/render/world-renderer.js'), 'utf8');
const navigationSource = await fs.readFile(path.join(root, 'src/game/navigation.js'), 'utf8');
const minimapSource = await fs.readFile(path.join(root, 'src/ui/minimap.js'), 'utf8');
for (const expected of ['Sócrates', 'Zélia', 'Lia', 'Chilindo']) {
  if (!characterSource.includes(expected)) throw new Error(`Missing field character identity: ${expected}.`);
}
for (const retired of ['Caio Vilar', "name: 'Kindred'"]) {
  if (characterSource.includes(retired)) throw new Error(`Retired character identity must not return: ${retired}.`);
}
if (!mainSource.includes('headquarters.open()')) throw new Error('Headquarters must remain the primary startup loop.');
if (!mainSource.includes('DeploymentBuilder')) throw new Error('Multiplayer deployment builder must remain wired into startup.');
if (!mainSource.includes('SharedInteractionPanel')) throw new Error('Shared interaction panel must remain wired into live play.');
if (!mainSource.includes('InteractiveRunController')) throw new Error('Live runs must use the interaction-aware controller.');
if (!mainSource.includes('ComicReader')) throw new Error('The two-page comic reader must remain wired into live play.');
if (!mainSource.includes('createFieldComic')) throw new Error('Live play must expose a deterministic comic packet.');
if (!indexSource.includes('comic-reader-root')) throw new Error('The comic reader mount is missing from the application shell.');
if (!indexSource.includes('safe-window-bootstrap.js')) throw new Error('The safe-window runtime must load before the main game module.');
if (!indexSource.includes('safe-window-panel')) throw new Error('The safe-window forecast mount is missing.');
if (!indexSource.includes('tutorial-bootstrap.js')) throw new Error('The first-run tutorial runtime must load before the main game module.');
if (!indexSource.includes('tutorial-guide')) throw new Error('The field-orientation guide mount is missing.');
for (const expected of ['two-player', 'four-player', 'compositionRule']) {
  if (!deploymentSource.includes(expected)) throw new Error(`Deployment contract missing: ${expected}.`);
}
for (const expected of ['loot', 'talk', 'card-battle', 'route', 'extract']) {
  if (!activitySource.includes(expected)) throw new Error(`Activity authority missing: ${expected}.`);
}
for (const expected of ['openDialogue', 'openObjectDecision', 'openCardBattle', 'requestHandoff', 'castVote', 'deterministicRoll']) {
  if (!sharedSource.includes(expected)) throw new Error(`Shared interaction behavior missing: ${expected}.`);
}
for (const expected of ['currentPage', 'next()', 'previous()', 'spread(offset']) {
  if (!comicStateSource.includes(expected)) throw new Error(`Comic spread state missing: ${expected}.`);
}
for (const expected of ['ArrowRight', 'ArrowLeft', 'comicPageFlip', 'flip-forward', 'flip-backward']) {
  if (!comicReaderSource.includes(expected)) throw new Error(`Comic reader behavior missing: ${expected}.`);
}
for (const expected of ['warning', 'final', 'markReturned', 'markStayed', 'decision']) {
  if (!safeWindowSource.includes(expected)) throw new Error(`Safe-window state missing: ${expected}.`);
}
for (const expected of ['spawnInterlaceVanguard', 'attemptExtraction', 'triggerInterlace', 'abrir:run-finished']) {
  if (!safeRuntimeSource.includes(expected)) throw new Error(`Safe-window runtime missing: ${expected}.`);
}
for (const expected of ['RETURN', 'STAY', 'DANGER', 'abrir:safe-window']) {
  if (!safeUiSource.includes(expected)) throw new Error(`Safe-window UI missing: ${expected}.`);
}
for (const expected of ['threshold', 'inspect', 'ownership', 'combat-route', 'attack', 'dodge', 'ability', 'cover', 'roomClear']) {
  if (!tutorialSource.includes(expected)) throw new Error(`First-run tutorial state missing: ${expected}.`);
}
for (const expected of ['spawnBaseEnemies', 'tutorialCoverTarget', 'attemptTutorialInteraction', 'firstRunTutorialComplete']) {
  if (!tutorialRuntimeSource.includes(expected)) throw new Error(`First-run tutorial runtime missing: ${expected}.`);
}
for (const expected of ['CROSS THE THRESHOLD', 'SWAP WITHIN YOUR PAIR', 'LIVE COMBAT', 'TEAMMATE']) {
  if (!tutorialUiSource.includes(expected)) throw new Error(`First-run tutorial UI missing: ${expected}.`);
}
if (!minimapSource.includes('drawForecastMarkers')) throw new Error('Interlace opportunity and danger markers must remain visible on the minimap.');
if (!minimapSource.includes('drawTutorialMarker')) throw new Error('Generated tutorial targets must remain visible on the minimap.');
if (!missionSource.includes('ActivityAuthority')) throw new Error('Mission interactions must route through activity authority.');
if (!missionSource.includes('recoveredByPlayerId')) throw new Error('Recovered objects must remember the acting player.');
if (!missionSource.includes('resolveObjectDecision')) throw new Error('Object outcomes must be resolved after the visible shared decision.');
for (const expected of ['seizeHighestRecovered', 'relocateEnemy', 'extractionLocked']) {
  if (!directorSource.includes(expected)) throw new Error(`Major process behavior missing: ${expected}.`);
}
if (!rendererSource.includes('deriveMapLayout')) throw new Error('Renderer must consume the shared room layout.');
if (!navigationSource.includes('deriveMapLayout')) throw new Error('Navigation must consume the shared room layout.');

console.log(
  `ABRIR project check passed. local=${state.rooms.length}/${state.connections.length} remote=${state.interlace.rooms.length}/${state.interlace.connections.length} localObjects=${layout.local.obstacles.length} remoteObjects=${layout.remote.obstacles.length} bridges=${state.interlace.bridges.length} routes=${FIELD_ROUTES.length} permissions=${INSTITUTE_UPGRADES.length} processes=${processIds.length}.`,
);
