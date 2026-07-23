import assert from 'node:assert/strict';
import { ACTIVITY_TYPES, ActivityAuthority } from '../src/game/activity-authority.js';
import { createDefaultDeployment } from '../src/game/deployment-system.js';

const deployment = createDefaultDeployment('four-player');
const authority = new ActivityAuthority(deployment);
const actors = deployment.assignments.map((assignment) => ({
  playerId: assignment.playerId,
  characterId: assignment.characterId,
  assignmentId: assignment.assignmentId,
}));
const unrestrictedActivities = [
  ACTIVITY_TYPES.LOOT,
  ACTIVITY_TYPES.INSPECT,
  ACTIVITY_TYPES.TALK,
  ACTIVITY_TYPES.CARD_BATTLE,
  ACTIVITY_TYPES.SHRINE,
  ACTIVITY_TYPES.PUZZLE,
  ACTIVITY_TYPES.HACK,
  ACTIVITY_TYPES.REVIVE,
];

for (const actor of actors) {
  for (const type of unrestrictedActivities) {
    const attempt = authority.attempt(
      type,
      { ...actor, kitId: actor.playerId === 'player-1' ? 'breacher' : 'field-medic' },
      { id: `${type}:${actor.playerId}` },
      { requiresProximity: true, inRange: true },
    );
    assert.notEqual(attempt.status, 'denied', `${actor.playerId} was incorrectly denied ${type}.`);
    authority.resolve(attempt.activityId, { status: 'completed' });
  }
}

const talker = authority.attempt(
  ACTIVITY_TYPES.TALK,
  actors[0],
  { id: 'npc:customs-clerk' },
  { requiresProximity: true, inRange: true },
);
assert.equal(talker.status, 'active');
const simultaneousTalker = authority.attempt(
  ACTIVITY_TYPES.TALK,
  actors[1],
  { id: 'npc:customs-clerk' },
  { requiresProximity: true, inRange: true },
);
assert.equal(simultaneousTalker.status, 'denied', 'Exclusive targets should reject simultaneous claims, not reserve dialogue by role.');
assert.deepEqual(simultaneousTalker.denialReasons, ['already-claimed']);
authority.resolve(talker.activityId, { status: 'completed' });

const routeProposal = authority.attempt(
  ACTIVITY_TYPES.ROUTE,
  actors[2],
  { id: 'route:stay-after-window' },
  { requireConsensus: true },
);
assert.equal(routeProposal.status, 'proposed', 'Consequential route actions should be player-started proposals.');
assert.equal(authority.respond(routeProposal.activityId, 'player-1', 'agree').success, true);
assert.equal(authority.respond(routeProposal.activityId, 'player-2', 'oppose').success, true);
assert.equal(authority.respond(routeProposal.activityId, 'player-3', 'agree').success, true);
assert.equal(authority.respond(routeProposal.activityId, 'player-4', 'abstain').success, true);

const wrongOwner = authority.attempt(
  ACTIVITY_TYPES.CARD_BATTLE,
  { playerId: 'player-1', characterId: 'lia' },
  { id: 'card-table:1' },
);
assert.equal(wrongOwner.status, 'denied');
assert.ok(wrongOwner.denialReasons.includes('character-not-owned'));

const outOfRange = authority.attempt(
  ACTIVITY_TYPES.LOOT,
  actors[3],
  { id: 'object:remote-ledger' },
  { requiresProximity: true, inRange: false },
);
assert.equal(outOfRange.status, 'denied');
assert.ok(outOfRange.denialReasons.includes('out-of-range'));

const snapshot = authority.snapshot();
for (const actor of actors) {
  const participation = snapshot.participation.find((entry) => entry.playerId === actor.playerId);
  assert.ok(participation, `${actor.playerId} has no participation record.`);
  assert.ok(participation.byType[ACTIVITY_TYPES.LOOT] >= 1);
  assert.ok(participation.byType[ACTIVITY_TYPES.CARD_BATTLE] >= 1);
  assert.ok(participation.byType[ACTIVITY_TYPES.TALK] >= 1);
}

console.log('Activity authority checks passed: every assigned player can loot, talk, card battle, inspect, revive, puzzle, hack, and initiate route decisions without role locks.');
