import assert from 'node:assert/strict';
import * as THREE from 'three';
import { validateMapState } from '../src/core/dungeon-generator.js';
import { createDemoState, isDemoRequested } from '../src/demo/demo-scenario.js';
import { DemoAssist } from '../src/game/demo-assist.js';
import { validateDeployment } from '../src/game/deployment-system.js';

assert.equal(isDemoRequested('?demo=1'), true);
assert.equal(isDemoRequested('?demo=codex'), true);
assert.equal(isDemoRequested('?demo=0'), false);

const state = createDemoState();
const mapValidation = validateMapState(state);
assert.equal(mapValidation.valid, true, mapValidation.errors.join(' '));
assert.equal(state.demoMode.assistEnabled, true);
assert.equal(state.seedLabel, 'ABRIR-CODEX-DEMO-001');
assert.equal(state.rooms.length, 18);
assert.ok(state.interlaceAtSeconds <= 45, 'The demo safe window should be short enough for a live presentation.');
assert.ok(state.interlace.bridges.length > 0, 'The demo needs a visible cross-state bridge.');
assert.ok(state.interlace.overlaps.length > 0, 'The demo needs at least one overlap showcase coordinate.');
assert.equal(validateDeployment(state.deployment).valid, true);

const activeOperative = { name: 'Zélia Amato', maxHealth: 100, ability: { cooldown: 8 }, dodge: { cooldown: 3 } };
const availableLoot = {
  lootId: 'loot-demo',
  roomId: state.entranceRoomId,
  collected: false,
  resolved: false,
  position: new THREE.Vector3(3, 0, 4),
  item: { name: 'Demo Object' },
};
let interlaceCalls = 0;
let progressCalls = 0;
const run = {
  mapState: state,
  finished: false,
  interlaceTriggered: false,
  activeOperative,
  activeOperativeIndex: 0,
  health: 20,
  healthByOperative: [20, 30, 40, 50],
  abilityCooldowns: [2, 2, 2, 2],
  dodgeCooldowns: [1, 1, 1, 1],
  player: {
    position: new THREE.Vector3(),
    velocity: new THREE.Vector3(1, 0, 1),
    invulnerable: 0,
    damageResistance: 0,
    attackCooldown: 1,
  },
  renderer: { playerMesh: { position: new THREE.Vector3() } },
  mission: {
    currentRoom: state.rooms[0],
    rooms: new Map(state.rooms.map((room) => [room.id, room])),
    loot: [availableLoot],
    recovered: [],
    interactionNodes: [],
    updateRoom: () => {},
    dropLoot: () => {},
  },
  events: {},
  teamSnapshot: () => [100, 90, 80, 70].map((maxHealth, index) => ({ maxHealth, health: run.healthByOperative[index] })),
  isWalkable: () => true,
  reportCooldowns: () => {},
  reportProgress: () => { progressCalls += 1; },
  forceInterlace: () => { interlaceCalls += 1; run.interlaceTriggered = true; },
};

const assist = new DemoAssist(run);
assert.equal(assist.enabled, true);
const restored = assist.restoreSquad();
assert.equal(restored.success, true);
assert.deepEqual(run.healthByOperative, [100, 90, 80, 70]);
assert.deepEqual(run.abilityCooldowns, [0, 0, 0, 0]);
assert.deepEqual(run.dodgeCooldowns, [0, 0, 0, 0]);

const staged = assist.stageObject();
assert.equal(staged.success, true);
assert.equal(staged.lootId, 'loot-demo');
assert.equal(run.player.position.x, 3);
assert.equal(run.player.position.z, 4);
assert.ok(progressCalls > 0);

const interlace = assist.activateInterlace();
assert.equal(interlace.success, true);
assert.equal(interlaceCalls, 1);
const overlap = assist.overlap();
assert.equal(overlap.success, true);
assert.equal(overlap.overlapId, state.interlace.overlaps[0].id);

const disabledAssist = new DemoAssist({ ...run, mapState: { ...state, demoMode: null } });
assert.equal(disabledAssist.restoreSquad().success, false, 'Demo assists must not leak into ordinary runs.');

console.log(`Demo readiness check passed: ${state.rooms.length} local rooms, ${state.interlace.rooms.length} remote rooms, ${state.interlace.overlaps.length} overlaps, fixed 2P deployment, guarded assists.`);
