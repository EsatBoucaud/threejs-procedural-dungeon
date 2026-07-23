import assert from 'node:assert/strict';
import { createDefaultDeployment } from '../src/game/deployment-system.js';
import { ActivityAuthority } from '../src/game/activity-authority.js';
import { SharedInteractionSystem } from '../src/game/shared-interaction-system.js';

function actor(deployment, playerId, index = 0) {
  const assignment = deployment.assignments.filter((entry) => entry.playerId === playerId)[index];
  return {
    playerId,
    characterId: assignment.characterId,
    assignmentId: assignment.assignmentId,
    kitId: assignment.kitId,
  };
}

const twoPlayer = createDefaultDeployment('two-player');
const twoAuthority = new ActivityAuthority(twoPlayer);
const resolved = [];
const twoSystem = new SharedInteractionSystem(twoAuthority, twoPlayer, 'ABRIR-SHARED-2P', {
  onDialogueResolved: (result) => resolved.push({ type: 'dialogue', result }),
  onObjectResolved: (result) => resolved.push({ type: 'object', result }),
});

const dialogueNode = {
  nodeId: 'talk:test',
  roomId: 2,
  speaker: 'TEST CUSTODIAN',
  title: 'TEST CONVERSATION',
  opening: 'Who is authorized to speak?',
  choices: [
    { id: 'answer', label: 'Anyone present may answer.', outcome: 'Correct.', effect: 'none', consequential: false },
  ],
};

const openedDialogue = twoSystem.openDialogue(actor(twoPlayer, 'player-1'), dialogueNode);
assert.equal(openedDialogue.success, true);
const dialogueSessionId = openedDialogue.session.sessionId;
assert.equal(twoSystem.requestHandoff(dialogueSessionId, 'player-1', 'player-2').success, true);
assert.equal(twoSystem.acceptHandoff(dialogueSessionId, 'player-2').success, true);
assert.equal(twoSystem.chooseDialogue(dialogueSessionId, actor(twoPlayer, 'player-2'), 'answer').success, true);
assert.equal(resolved[0].result.actor.playerId, 'player-2', 'Dialogue control must transfer between players.');

const objectEntry = {
  lootId: 'loot:test',
  roomId: 3,
  item: {
    instanceId: 'object:test',
    name: 'Object Under Test',
    rarity: 'rare',
    condition: 'contested',
    value: 200,
    origin: 'base',
    provenance: 'Used to confirm shared object decisions.',
  },
};
const openedObject = twoSystem.openObjectDecision(actor(twoPlayer, 'player-1'), objectEntry);
assert.equal(openedObject.success, true);
const objectSessionId = openedObject.session.sessionId;
assert.equal(twoSystem.chooseObjectOption(objectSessionId, actor(twoPlayer, 'player-1'), 'mark-return').success, true);
assert.equal(twoSystem.castVote(objectSessionId, 'player-2', 'oppose').success, true);
const objectSession = twoSystem.snapshot().sessions.find((session) => session.sessionId === objectSessionId);
assert.ok(objectSession.proposal.resolution.rolls, 'A two-player split must produce a visible deterministic roll.');
assert.equal(typeof objectSession.proposal.resolution.rolls.agree.total, 'number');
assert.equal(typeof objectSession.proposal.resolution.rolls.oppose.total, 'number');

const fourPlayer = createDefaultDeployment('four-player');
const fourAuthority = new ActivityAuthority(fourPlayer);
let cardResult = null;
let extractionApproved = false;
const fourSystem = new SharedInteractionSystem(fourAuthority, fourPlayer, 'ABRIR-SHARED-4P', {
  onCardBattleResolved: (result) => { cardResult = result; },
  onExtractionApproved: () => { extractionApproved = true; },
});
const cardNode = {
  nodeId: 'card:test',
  roomId: 4,
  opponent: 'TEST FILING',
  title: 'TEST CARD BATTLE',
  opening: 'Every player may enter the argument.',
  teamTarget: 7,
  opponentTarget: 99,
  reward: 'Test passed.',
};
const openedCard = fourSystem.openCardBattle(actor(fourPlayer, 'player-1'), cardNode);
assert.equal(openedCard.success, true);
const cardSessionId = openedCard.session.sessionId;
for (const playerId of ['player-2', 'player-3', 'player-4']) {
  assert.equal(fourSystem.join(cardSessionId, actor(fourPlayer, playerId)).success, true);
}
let guard = 0;
while (!cardResult && guard < 12) {
  const session = fourSystem.snapshot().activeSession;
  assert.ok(session, 'Card session should remain active until resolved.');
  const turnPlayer = session.payload.turnPlayerId;
  const cardId = guard % 2 === 0 ? 'claim' : 'witness';
  assert.equal(fourSystem.playCard(cardSessionId, turnPlayer, cardId).success, true);
  guard += 1;
}
assert.equal(cardResult?.won, true, 'Shared card battle should resolve from plays by multiple players.');
assert.ok(cardResult.session.participants.length >= 4, 'All four players must be able to participate.');

const extraction = fourSystem.openExtractionProposal(actor(fourPlayer, 'player-3'), { id: 'passage:test' });
assert.equal(extraction.success, true, 'Any player may initiate extraction.');
const extractionSessionId = extraction.session.sessionId;
for (const playerId of ['player-1', 'player-2', 'player-4']) {
  assert.equal(fourSystem.castVote(extractionSessionId, playerId, 'agree').success, true);
}
assert.equal(extractionApproved, true, 'Unanimous extraction proposal should be approved.');

const participation = fourAuthority.snapshot().participation;
for (const playerId of ['player-1', 'player-2', 'player-3', 'player-4']) {
  assert.ok(participation.some((entry) => entry.playerId === playerId), `${playerId} must appear in shared activity participation.`);
}

console.log('Shared interactions passed: dialogue handoff, object proposals, visible split rolls, four-player card participation, and player-initiated extraction.');
