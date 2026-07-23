import { SHARED_CARD_DECK, objectDecisionFor } from '../content/interaction-content.js';
import { hashString } from '../core/rng.js';
import { ACTIVITY_TYPES } from './activity-authority.js';

function clone(value) {
  return structuredClone(value);
}

function actorForPlayer(deployment, playerId, preferredCharacterId = null) {
  const assignments = deployment.assignments?.filter((assignment) => assignment.playerId === playerId) ?? [];
  const assignment = assignments.find((entry) => entry.characterId === preferredCharacterId) ?? assignments[0];
  if (!assignment) return null;
  return {
    playerId,
    characterId: assignment.characterId,
    assignmentId: assignment.assignmentId,
    kitId: assignment.kitId,
  };
}

function playerLabel(deployment, playerId) {
  return deployment.players?.find((player) => player.id === playerId)?.label ?? playerId;
}

export class SharedInteractionSystem {
  constructor(authority, deployment, seed, callbacks = {}) {
    this.authority = authority;
    this.deployment = clone(deployment ?? { players: [], assignments: [] });
    this.seed = String(seed ?? 'ABRIR');
    this.callbacks = callbacks;
    this.sessions = new Map();
    this.activeSessionId = null;
    this.sequence = 0;
  }

  get activeSession() {
    return this.activeSessionId ? this.sessions.get(this.activeSessionId) ?? null : null;
  }

  playerIds() {
    return (this.deployment.players ?? []).map((player) => player.id);
  }

  emit() {
    this.callbacks.onUpdate?.(this.snapshot());
  }

  createSession(type, activity, actor, payload) {
    const session = {
      sessionId: `shared-${++this.sequence}`,
      type,
      activityId: activity.activityId,
      status: 'active',
      targetId: activity.targetId,
      initiatorPlayerId: actor.playerId,
      controllerPlayerId: actor.playerId,
      participants: [{ playerId: actor.playerId, characterId: actor.characterId }],
      pendingHandoff: null,
      proposal: null,
      transcript: [],
      payload: clone(payload),
      history: [{
        event: 'opened',
        playerId: actor.playerId,
        characterId: actor.characterId,
      }],
    };
    this.sessions.set(session.sessionId, session);
    this.activeSessionId = session.sessionId;
    this.emit();
    return clone(session);
  }

  openDialogue(actor, node) {
    const activity = this.authority.attempt(ACTIVITY_TYPES.TALK, actor, {
      id: node.nodeId,
      roomId: node.roomId,
      speaker: node.speaker,
    }, { requiresProximity: true, inRange: true });
    if (activity.status === 'denied') return { success: false, activity };
    const session = this.createSession('dialogue', activity, actor, node);
    const stored = this.sessions.get(session.sessionId);
    stored.transcript.push({ speaker: node.speaker, text: node.opening });
    this.emit();
    return { success: true, session: clone(stored) };
  }

  openObjectDecision(actor, lootEntry) {
    const item = lootEntry.item;
    const activity = this.authority.attempt(ACTIVITY_TYPES.INSPECT, actor, {
      id: `object:${item.instanceId}`,
      roomId: lootEntry.roomId,
      itemId: item.instanceId,
    }, { requiresProximity: true, inRange: true });
    if (activity.status === 'denied') return { success: false, activity };
    const session = this.createSession('object', activity, actor, {
      lootId: lootEntry.lootId,
      item: clone(item),
      decision: objectDecisionFor(item),
    });
    return { success: true, session };
  }

  openCardBattle(actor, node) {
    const activity = this.authority.attempt(ACTIVITY_TYPES.CARD_BATTLE, actor, {
      id: node.nodeId,
      roomId: node.roomId,
      opponent: node.opponent,
    }, { requiresProximity: true, inRange: true });
    if (activity.status === 'denied') return { success: false, activity };
    const session = this.createSession('card-battle', activity, actor, {
      node: clone(node),
      deck: clone(SHARED_CARD_DECK),
      teamScore: 0,
      opponentScore: 0,
      teamTarget: node.teamTarget,
      opponentTarget: node.opponentTarget,
      turnPlayerId: actor.playerId,
      round: 1,
      guard: 0,
      lastPlayerId: null,
      lastCardId: null,
    });
    const stored = this.sessions.get(session.sessionId);
    stored.transcript.push({ speaker: node.opponent, text: node.opening });
    this.emit();
    return { success: true, session: clone(stored) };
  }

  openExtractionProposal(actor, target = {}) {
    const activity = this.authority.attempt(ACTIVITY_TYPES.EXTRACT, actor, {
      id: target.id ?? 'passage:extraction',
      ...target,
    }, { requiresProximity: true, inRange: true, requireConsensus: true });
    if (activity.status === 'denied') return { success: false, activity };
    const session = this.createSession('extraction', activity, actor, {
      title: 'REQUEST EXTRACTION',
      description: 'Any player can request extraction. The team decides whether to close the run now.',
    });
    this.beginProposal(session.sessionId, actor, {
      id: 'extract-now',
      label: 'EXTRACT NOW',
      description: 'Close the passage with the current team, objects, and unresolved consequences.',
      consequential: true,
    });
    return { success: true, session: this.snapshot().activeSession };
  }

  join(sessionId, actor) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') return { success: false, reason: 'session-unavailable' };
    const joined = this.authority.join(session.activityId, actor);
    if (!joined.success) return joined;
    if (!session.participants.some((entry) => entry.playerId === actor.playerId)) {
      session.participants.push({ playerId: actor.playerId, characterId: actor.characterId });
      session.history.push({ event: 'joined', playerId: actor.playerId, characterId: actor.characterId });
    }
    this.emit();
    return { success: true, session: clone(session) };
  }

  requestHandoff(sessionId, fromPlayerId, toPlayerId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') return { success: false, reason: 'session-unavailable' };
    if (session.controllerPlayerId !== fromPlayerId) return { success: false, reason: 'not-controller' };
    if (!this.playerIds().includes(toPlayerId)) return { success: false, reason: 'unknown-player' };
    session.pendingHandoff = { fromPlayerId, toPlayerId };
    session.history.push({ event: 'handoff-requested', fromPlayerId, toPlayerId });
    this.emit();
    return { success: true, session: clone(session) };
  }

  acceptHandoff(sessionId, playerId) {
    const session = this.sessions.get(sessionId);
    if (!session?.pendingHandoff || session.pendingHandoff.toPlayerId !== playerId) {
      return { success: false, reason: 'handoff-not-offered' };
    }
    const actor = actorForPlayer(this.deployment, playerId);
    if (!actor) return { success: false, reason: 'player-has-no-character' };
    this.join(sessionId, actor);
    session.controllerPlayerId = playerId;
    session.pendingHandoff = null;
    session.history.push({ event: 'control-transferred', playerId, characterId: actor.characterId });
    this.emit();
    return { success: true, session: clone(session) };
  }

  chooseDialogue(sessionId, actor, choiceId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.type !== 'dialogue' || session.status !== 'active') {
      return { success: false, reason: 'dialogue-unavailable' };
    }
    if (session.controllerPlayerId !== actor.playerId) return { success: false, reason: 'not-dialogue-controller' };
    const choice = session.payload.choices.find((entry) => entry.id === choiceId);
    if (!choice) return { success: false, reason: 'missing-choice' };
    if (choice.consequential) return this.beginProposal(sessionId, actor, choice);

    session.transcript.push({
      speaker: playerLabel(this.deployment, actor.playerId),
      text: choice.label,
      characterId: actor.characterId,
    });
    session.transcript.push({ speaker: session.payload.speaker, text: choice.outcome });
    session.history.push({ event: 'dialogue-choice', choiceId, playerId: actor.playerId });
    this.callbacks.onDialogueResolved?.({ session: clone(session), choice: clone(choice), actor: clone(actor) });
    this.completeSession(sessionId, { outcome: 'dialogue-complete', choiceId });
    return { success: true, session: clone(session) };
  }

  chooseObjectOption(sessionId, actor, optionId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.type !== 'object' || session.status !== 'active') {
      return { success: false, reason: 'object-decision-unavailable' };
    }
    const option = session.payload.decision.options.find((entry) => entry.id === optionId);
    if (!option) return { success: false, reason: 'missing-option' };
    if (option.consequential) return this.beginProposal(sessionId, actor, option);
    this.callbacks.onObjectResolved?.({
      session: clone(session),
      option: clone(option),
      actor: clone(actor),
    });
    this.completeSession(sessionId, { outcome: option.id, decidedBy: actor.playerId });
    return { success: true, session: clone(session) };
  }

  beginProposal(sessionId, actor, option) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') return { success: false, reason: 'session-unavailable' };
    const consequence = this.authority.attempt(ACTIVITY_TYPES.CONSEQUENCE, actor, {
      id: `${session.targetId}:proposal:${option.id}`,
      parentSessionId: sessionId,
      optionId: option.id,
    }, { requireConsensus: true });
    if (consequence.status === 'denied') return { success: false, reason: consequence.denialReasons.join(',') };
    session.proposal = {
      activityId: consequence.activityId,
      option: clone(option),
      proposedBy: actor.playerId,
      responses: { [actor.playerId]: 'agree' },
      status: 'voting',
      resolution: null,
    };
    session.history.push({ event: 'proposal-opened', optionId: option.id, playerId: actor.playerId });
    this.emit();
    return { success: true, session: clone(session) };
  }

  castVote(sessionId, playerId, response) {
    const session = this.sessions.get(sessionId);
    if (!session?.proposal || session.proposal.status !== 'voting') {
      return { success: false, reason: 'proposal-unavailable' };
    }
    if (!['agree', 'oppose', 'abstain'].includes(response)) return { success: false, reason: 'invalid-response' };
    const authorityResponse = this.authority.respond(session.proposal.activityId, playerId, response);
    if (!authorityResponse.success) return authorityResponse;
    session.proposal.responses[playerId] = response;
    session.history.push({ event: 'vote', playerId, response });
    const allResponded = this.playerIds().every((id) => session.proposal.responses[id]);
    if (allResponded) this.resolveProposal(sessionId);
    else this.emit();
    return { success: true, session: clone(session) };
  }

  deterministicRoll(sessionId, side, playerIds) {
    const base = hashString(`${this.seed}:${sessionId}:${side}:${playerIds.join(',')}`);
    const die = (base % 20) + 1;
    const participationBonus = Math.max(0, playerIds.length - 1);
    return {
      die,
      modifier: participationBonus,
      total: die + participationBonus,
      playerIds: [...playerIds],
    };
  }

  resolveProposal(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session?.proposal || session.proposal.status !== 'voting') return { success: false, reason: 'proposal-unavailable' };
    const responses = session.proposal.responses;
    const agreeing = this.playerIds().filter((id) => responses[id] === 'agree');
    const opposing = this.playerIds().filter((id) => responses[id] === 'oppose');
    const abstaining = this.playerIds().filter((id) => responses[id] === 'abstain');
    let passed = agreeing.length > opposing.length;
    let rolls = null;

    if (agreeing.length === opposing.length) {
      const agreeRoll = this.deterministicRoll(sessionId, 'agree', agreeing);
      const opposeRoll = this.deterministicRoll(sessionId, 'oppose', opposing);
      passed = agreeRoll.total >= opposeRoll.total;
      rolls = { agree: agreeRoll, oppose: opposeRoll };
    }

    session.proposal.status = 'resolved';
    session.proposal.resolution = {
      passed,
      agreeing,
      opposing,
      abstaining,
      rolls,
    };
    this.authority.resolve(session.proposal.activityId, {
      status: passed ? 'completed' : 'rejected',
      ...clone(session.proposal.resolution),
    });
    session.history.push({ event: 'proposal-resolved', passed, rolls });

    if (passed) {
      const actor = actorForPlayer(this.deployment, session.proposal.proposedBy);
      if (session.type === 'object') {
        this.callbacks.onObjectResolved?.({
          session: clone(session),
          option: clone(session.proposal.option),
          actor,
          resolution: clone(session.proposal.resolution),
        });
      }
      if (session.type === 'dialogue') {
        session.transcript.push({
          speaker: playerLabel(this.deployment, session.proposal.proposedBy),
          text: session.proposal.option.label,
          characterId: actor?.characterId,
        });
        session.transcript.push({ speaker: session.payload.speaker, text: session.proposal.option.outcome });
        this.callbacks.onDialogueResolved?.({
          session: clone(session),
          choice: clone(session.proposal.option),
          actor,
          resolution: clone(session.proposal.resolution),
        });
      }
      if (session.type === 'extraction') this.callbacks.onExtractionApproved?.(clone(session));
      this.completeSession(sessionId, {
        outcome: session.proposal.option.id,
        proposal: clone(session.proposal.resolution),
      });
    } else {
      session.proposal = null;
      this.emit();
    }
    return { success: true, session: clone(session) };
  }

  playCard(sessionId, playerId, cardId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.type !== 'card-battle' || session.status !== 'active') {
      return { success: false, reason: 'card-battle-unavailable' };
    }
    const state = session.payload;
    if (state.turnPlayerId !== playerId) return { success: false, reason: 'not-player-turn' };
    const card = state.deck.find((entry) => entry.id === cardId);
    if (!card) return { success: false, reason: 'missing-card' };
    const actor = actorForPlayer(this.deployment, playerId);
    if (!actor) return { success: false, reason: 'player-has-no-character' };
    this.join(sessionId, actor);

    const variedVoiceBonus = card.id === 'witness' && state.lastPlayerId && state.lastPlayerId !== playerId ? 2 : 0;
    const teamGain = card.value + variedVoiceBonus;
    state.teamScore += teamGain;
    state.guard += card.guard ?? 0;
    state.lastPlayerId = playerId;
    state.lastCardId = card.id;
    session.transcript.push({
      speaker: playerLabel(this.deployment, playerId),
      text: `${card.name} +${teamGain}${variedVoiceBonus ? ' including a different-player witness bonus' : ''}.`,
      characterId: actor.characterId,
    });
    session.history.push({ event: 'card-played', playerId, characterId: actor.characterId, cardId, teamGain });

    if (state.teamScore >= state.teamTarget) {
      this.callbacks.onCardBattleResolved?.({ session: clone(session), won: true });
      this.completeSession(sessionId, { outcome: 'won', teamScore: state.teamScore, opponentScore: state.opponentScore });
      return { success: true, session: clone(session) };
    }

    const oppositionSeed = hashString(`${this.seed}:${sessionId}:${state.round}:${card.id}:${playerId}`);
    const rawOpponentGain = 1 + (oppositionSeed % 4) + (card.backlash ?? 0);
    const blocked = Math.min(state.guard, rawOpponentGain);
    const opponentGain = rawOpponentGain - blocked;
    state.guard -= blocked;
    state.opponentScore += opponentGain;
    session.transcript.push({
      speaker: state.node.opponent,
      text: `Files a response for +${opponentGain}${blocked ? ` after ${blocked} was blocked` : ''}.`,
    });

    if (state.opponentScore >= state.opponentTarget) {
      this.callbacks.onCardBattleResolved?.({ session: clone(session), won: false });
      this.completeSession(sessionId, { outcome: 'lost', teamScore: state.teamScore, opponentScore: state.opponentScore });
      return { success: true, session: clone(session) };
    }

    const participants = session.participants.map((entry) => entry.playerId);
    const allPlayers = this.playerIds();
    const turnPool = participants.length > 1 ? participants : allPlayers;
    const currentIndex = Math.max(0, turnPool.indexOf(playerId));
    state.turnPlayerId = turnPool[(currentIndex + 1) % turnPool.length];
    if (state.turnPlayerId === turnPool[0]) state.round += 1;
    this.emit();
    return { success: true, session: clone(session) };
  }

  completeSession(sessionId, resolution = {}) {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, reason: 'session-unavailable' };
    session.status = 'completed';
    session.resolution = clone(resolution);
    this.authority.resolve(session.activityId, { status: 'completed', ...clone(resolution) });
    if (this.activeSessionId === sessionId) this.activeSessionId = null;
    this.emit();
    return { success: true, session: clone(session) };
  }

  close(sessionId, playerId) {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') return { success: false, reason: 'session-unavailable' };
    if (session.proposal?.status === 'voting') return { success: false, reason: 'proposal-open' };
    session.status = 'released';
    session.history.push({ event: 'closed', playerId });
    this.authority.release(session.activityId, 'interface-closed');
    if (this.activeSessionId === sessionId) this.activeSessionId = null;
    this.emit();
    return { success: true, session: clone(session) };
  }

  snapshot() {
    return {
      activeSessionId: this.activeSessionId,
      activeSession: clone(this.activeSession),
      sessions: clone([...this.sessions.values()]),
      players: clone(this.deployment.players ?? []),
    };
  }
}
