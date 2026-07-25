import assert from 'node:assert/strict';
import * as THREE from 'three';
import { validateMapState } from '../src/core/dungeon-generator.js';
import { createDemoState, isDemoRequested } from '../src/demo/demo-scenario.js';
import { DemoAssist } from '../src/game/demo-assist.js';
import { validateDeployment } from '../src/game/deployment-system.js';
import { createDemoProfile } from '../src/game/progression-system.js';

assert.equal(isDemoRequested('?demo=1'), true);
assert.equal(isDemoRequested('?demo=codex'), true);
assert.equal(isDemoRequested('?demo=0'), false);

const profile = createDemoProfile();
assert.equal(profile.rank, 1);
assert.deepEqual(profile.upgrades, [], 'Demo runs must not inherit persistent upgrades.');
assert.ok(profile.unlocks.includes('chilindo'), 'The current roster identity must exist in the clean profile.');
assert.ok(!profile.unlocks.includes('kindred'), 'The retired masked-character identity must be migrated away.');

const state = createDemoState();
const mapValidation = validateMapState(state);
assert.equal(mapValidation.valid, true, mapValidation.errors.join(' '));
assert.equal(state.demoMode.assistEnabled, true);
assert.equal(state.seedLabel, 'ABRIR-CODEX-DEMO-001');
assert.equal(state.rooms.length, 18);
assert.ok(
  state.interlaceAtSeconds >= 120 && state.interlaceAtSeconds <= 240,
  'The demo interlace should wait for the presenter unless triggered manually.',
);
assert.ok(state.interlace.bridges.length > 0, 'The demo needs a visible cross-state bridge.');
assert.ok(state.interlace.overlaps.length > 0, 'The demo needs at least one overlap showcase coordinate.');
assert.equal(validateDeployment(state.deployment).valid, true);

const activeOperative = { name: 'Zélia Amato', maxHealth: 100, ability: { cooldown: 8 }, dodge: { cooldown: 3 } };
let interlaceCalls = 0;
let progressCalls = 0;
let stagedRoom = null;
const entrance = state.rooms.find((room) => room.id === state.entranceRoomId);
const roomStates = new Map(state.rooms.map((room) => [room.id, { lootDropped: false }]));
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
    currentRoom: entrance,
    rooms: new Map(state.rooms.map((room) => [room.id, room])),
    roomStates,
    loot: [],
    recovered: [],
    interactionNodes: [],
    updateRoom: () => {},
    dropLoot(room) {
      stagedRoom = room;
      this.roomStates.get(room.id).lootDropped = true;
      this.loot.push({
        lootId: 'loot-demo',
        roomId: room.id,
        collected: false,
        resolved: false,
        position: new THREE.Vector3(room.x + 1, 0, room.z - 1),
        item: { name: 'Demo Object' },
      });
    },
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
assert.ok(stagedRoom, 'The assist should create an object when no unresolved object exists.');
assert.ok(!['entrance', 'breach', 'shrine'].includes(stagedRoom.type), 'The demo object must be staged in an eligible room.');
assert.equal(staged.roomId, stagedRoom.id);
assert.equal(run.player.position.x, stagedRoom.x + 1);
assert.equal(run.player.position.z, stagedRoom.z - 1);
assert.ok(progressCalls > 0);

run.mission.loot[0].resolved = true;
const secondStage = assist.stageObject();
assert.equal(secondStage.success, true, 'The assist should find another unused eligible room after the first object is resolved.');
assert.notEqual(secondStage.roomId, staged.roomId);

const originalWalkability = run.isWalkable;
const currentPosition = run.player.position.clone();
run.isWalkable = (position) => position.distanceTo(currentPosition) < 0.01;
const fallback = assist.teleport(new THREE.Vector3(999, 0, 999), 'blocked test coordinate');
assert.equal(fallback.success, true, 'Blocked targets should fall back to the current walkable position rather than placing inside geometry.');
assert.ok(run.player.position.distanceTo(currentPosition) < 0.01);
run.isWalkable = originalWalkability;

const interlace = assist.activateInterlace();
assert.equal(interlace.success, true);
assert.equal(interlaceCalls, 1);
const overlap = assist.overlap();
assert.equal(overlap.success, true);
assert.equal(overlap.overlapId, state.interlace.overlaps[0].id);

const disabledAssist = new DemoAssist({ ...run, mapState: { ...state, demoMode: null } });
assert.equal(disabledAssist.restoreSquad().success, false, 'Demo assists must not leak into ordinary runs.');

console.log(`Demo readiness check passed: ${state.rooms.length} local rooms, ${state.interlace.rooms.length} remote rooms, ${state.interlace.overlaps.length} overlaps, fixed 2P deployment, clean profile, guarded assists, safe fallback movement, presenter-controlled interlace.`);
