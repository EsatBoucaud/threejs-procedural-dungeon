import assert from 'node:assert/strict';
import { applyDeployment, OPERATIVES } from '../src/content/characters.js';
import {
  changeDeploymentMode,
  compositionSummary,
  createDefaultDeployment,
  updateAssignment,
  validateDeployment,
} from '../src/game/deployment-system.js';

const twoPlayer = createDefaultDeployment('two-player');
let validation = validateDeployment(twoPlayer);
assert.equal(validation.valid, true, validation.errors.join(' '));
assert.equal(twoPlayer.playerCount, 2);
assert.equal(twoPlayer.assignments.filter((entry) => entry.playerId === 'player-1').length, 2);
assert.equal(twoPlayer.assignments.filter((entry) => entry.playerId === 'player-2').length, 2);

applyDeployment(twoPlayer);
assert.equal(OPERATIVES.length, 2, 'Two-player local client must own two swappable characters.');
assert.deepEqual(OPERATIVES.map((entry) => entry.characterId), ['zelia-amato', 'socrates']);

const allRanged = twoPlayer.assignments.reduce(
  (deployment, assignment) => updateAssignment(deployment, assignment.assignmentId, { kitId: 'field-medic' }),
  twoPlayer,
);
validation = validateDeployment(allRanged);
assert.equal(validation.valid, true, 'Combat composition must not enforce melee/ranged balance.');
assert.deepEqual(compositionSummary(allRanged), { ranged: 4, melee: 0 });

applyDeployment(allRanged);
assert.equal(OPERATIVES.every((entry) => entry.combatFamily === 'ranged'), true);
assert.equal(OPERATIVES.every((entry) => entry.id === 'socrates'), true, 'Kit behavior must follow the selected kit, not character identity.');
assert.deepEqual(OPERATIVES.map((entry) => entry.characterId), ['zelia-amato', 'socrates']);

const fourPlayer = changeDeploymentMode(twoPlayer, 'four-player');
validation = validateDeployment(fourPlayer);
assert.equal(validation.valid, true, validation.errors.join(' '));
for (const player of fourPlayer.players) {
  assert.equal(fourPlayer.assignments.filter((entry) => entry.playerId === player.id).length, 1);
}

fourPlayer.localPlayerId = 'player-3';
applyDeployment(fourPlayer);
assert.equal(OPERATIVES.length, 1, 'Four-player local client must own one directly controlled character.');
assert.equal(OPERATIVES[0].characterId, 'lia');

const duplicateCharacter = updateAssignment(fourPlayer, 'slot-4', { characterId: 'lia' });
validation = validateDeployment(duplicateCharacter);
assert.equal(validation.valid, false, 'Each character must be assigned exactly once.');
assert.ok(validation.errors.some((error) => error.includes('exactly once')));

console.log('Deployment checks passed: 2P swapping ownership, 4P direct ownership, unique characters, and unrestricted combat-kit composition.');
