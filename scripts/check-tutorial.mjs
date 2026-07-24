import assert from 'node:assert/strict';
import { createTutorialPlan, TutorialSystem } from '../src/game/tutorial-system.js';

const mapState = {
  entranceRoomId: 0,
  vaultRoomId: 5,
  rooms: [
    { id: 0, type: 'entrance', graphDepth: 0, onCriticalPath: true, x: 0, z: 0 },
    { id: 1, type: 'combat', graphDepth: 1, onCriticalPath: true, x: 8, z: 0 },
    { id: 2, type: 'archive', graphDepth: 2, onCriticalPath: false, x: 15, z: 4 },
    { id: 3, type: 'combat', graphDepth: 3, onCriticalPath: true, x: 20, z: 0 },
    { id: 4, type: 'treasure', graphDepth: 4, onCriticalPath: false, x: 24, z: 7 },
    { id: 5, type: 'vault', graphDepth: 5, onCriticalPath: true, x: 30, z: 0 },
  ],
};

const plan = createTutorialPlan(mapState);
assert.equal(plan.orientationRoomId, 1, 'The first critical-path room should become the stable orientation room.');
assert.equal(plan.combatRoomId, 3, 'The next critical combat room should become the live lesson.');
assert.deepEqual(plan.orientationPosition, { x: 8, z: 0 });
assert.deepEqual(plan.combatPosition, { x: 20, z: 0 });

const twoPlayerDeployment = {
  mode: 'two-player',
  localPlayerId: 'player-1',
  assignments: [
    { playerId: 'player-1', characterId: 'zelia-amato' },
    { playerId: 'player-1', characterId: 'socrates' },
    { playerId: 'player-2', characterId: 'lia' },
    { playerId: 'player-2', characterId: 'chilindo' },
  ],
};

const twoPlayer = new TutorialSystem(plan, twoPlayerDeployment);
twoPlayer.start();
assert.equal(twoPlayer.snapshot().phase, 'threshold');
twoPlayer.enterRoom(plan.orientationRoomId, 5);
assert.equal(twoPlayer.snapshot().phase, 'inspect');
assert.equal(twoPlayer.snapshot().tasks.threshold, true);
assert.equal(twoPlayer.inspectOrientation({ playerId: 'player-1', characterId: 'zelia-amato' }).success, true);
assert.equal(twoPlayer.snapshot().phase, 'ownership');
assert.equal(twoPlayer.recordAction('attack').success, false, 'Combat actions should not count before the combat lesson.');
twoPlayer.enterRoom(plan.combatRoomId, 10);
assert.equal(twoPlayer.snapshot().phase, 'ownership', 'Physically reaching combat must not bypass the 2P ownership lesson.');
assert.equal(twoPlayer.snapshot().tasks.combatEntered, false);
assert.equal(twoPlayer.recordAction('swap', { characterId: 'socrates' }).success, true);
assert.equal(twoPlayer.snapshot().phase, 'combat-route');
assert.equal(twoPlayer.snapshot().currentTargetRoomId, plan.combatRoomId);
twoPlayer.enterRoom(plan.combatRoomId, 18);
assert.equal(twoPlayer.snapshot().phase, 'combat');
assert.equal(twoPlayer.recordAction('attack').success, true);
assert.equal(twoPlayer.recordAction('dodge').success, true);
assert.equal(twoPlayer.recordAction('ability').success, true);
assert.equal(twoPlayer.clearRoom(plan.combatRoomId).success, true);
assert.equal(twoPlayer.snapshot().completed, true, 'Core combat actions plus room clear should finish orientation.');
assert.equal(twoPlayer.snapshot().tasks.cover, false, 'Live cover is observed and rewarded but does not hard-lock completion.');
assert.equal(twoPlayer.snapshot().phase, 'complete');

const fourPlayerDeployment = {
  mode: 'four-player',
  localPlayerId: 'player-3',
  assignments: [
    { playerId: 'player-1', characterId: 'zelia-amato' },
    { playerId: 'player-2', characterId: 'lia' },
    { playerId: 'player-3', characterId: 'chilindo' },
    { playerId: 'player-4', characterId: 'socrates' },
  ],
};

const fourPlayer = new TutorialSystem(plan, fourPlayerDeployment);
fourPlayer.start();
fourPlayer.enterRoom(plan.orientationRoomId, 4);
fourPlayer.inspectOrientation({ playerId: 'player-3', characterId: 'chilindo' });
assert.equal(fourPlayer.snapshot().tasks.ownership, true, 'Four-player fixed ownership should confirm at inspection.');
assert.equal(fourPlayer.snapshot().phase, 'combat-route');
assert.equal(fourPlayer.recordAction('swap').success, false, 'Four-player tutorial must not imply an ordinary swap action.');
fourPlayer.enterRoom(plan.combatRoomId, 12);
fourPlayer.recordAction('cover');
fourPlayer.recordAction('attack');
fourPlayer.recordAction('dodge');
fourPlayer.recordAction('ability');
fourPlayer.clearRoom(plan.combatRoomId);
assert.equal(fourPlayer.snapshot().completed, true);
assert.equal(fourPlayer.snapshot().tasks.cover, true);
assert.ok(fourPlayer.snapshot().history.some((entry) => entry.event === 'tutorial-complete' && entry.coverObserved));

console.log('Tutorial check passed: critical-path planning, stable inspection, 2P ownership gate, scoped swap, 4P fixed ownership, live actions, optional cover observation, and completion.');
