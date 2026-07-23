export const ACTIVITY_TYPES = Object.freeze({
  LOOT: 'loot',
  INSPECT: 'inspect',
  TALK: 'talk',
  CARD_BATTLE: 'card-battle',
  NEGOTIATE: 'negotiate',
  ROUTE: 'route',
  SHRINE: 'shrine',
  PUZZLE: 'puzzle',
  HACK: 'hack',
  REVIVE: 'revive',
  EXTRACT: 'extract',
  CONSEQUENCE: 'consequence',
});

export const ACTIVITY_POLICIES = Object.freeze({
  [ACTIVITY_TYPES.LOOT]: { exclusive: true, consequential: false },
  [ACTIVITY_TYPES.INSPECT]: { exclusive: false, consequential: false },
  [ACTIVITY_TYPES.TALK]: { exclusive: true, consequential: false },
  [ACTIVITY_TYPES.CARD_BATTLE]: { exclusive: true, consequential: false },
  [ACTIVITY_TYPES.NEGOTIATE]: { exclusive: true, consequential: true },
  [ACTIVITY_TYPES.ROUTE]: { exclusive: true, consequential: true },
  [ACTIVITY_TYPES.SHRINE]: { exclusive: true, consequential: false },
  [ACTIVITY_TYPES.PUZZLE]: { exclusive: true, consequential: false },
  [ACTIVITY_TYPES.HACK]: { exclusive: true, consequential: false },
  [ACTIVITY_TYPES.REVIVE]: { exclusive: true, consequential: false },
  [ACTIVITY_TYPES.EXTRACT]: { exclusive: true, consequential: true },
  [ACTIVITY_TYPES.CONSEQUENCE]: { exclusive: true, consequential: true },
});

function assignmentKey(playerId, characterId) {
  return `${playerId}:${characterId}`;
}

function clone(value) {
  return structuredClone(value);
}

export class ActivityAuthority {
  constructor(deployment, options = {}) {
    this.deployment = clone(deployment ?? { players: [], assignments: [] });
    this.options = options;
    this.sequence = 0;
    this.claims = new Map();
    this.log = [];
    this.participation = new Map();
    this.playerIds = new Set((this.deployment.players ?? []).map((player) => player.id));
    this.assignments = new Map(
      (this.deployment.assignments ?? []).map((assignment) => [
        assignmentKey(assignment.playerId, assignment.characterId),
        assignment,
      ]),
    );
  }

  policyFor(type) {
    return ACTIVITY_POLICIES[type] ?? { exclusive: true, consequential: false };
  }

  actorIsAssigned(actor) {
    if (!actor?.playerId || !actor?.characterId) return false;
    return this.assignments.has(assignmentKey(actor.playerId, actor.characterId));
  }

  canAttempt(type, actor, context = {}) {
    const reasons = [];
    if (!this.playerIds.has(actor?.playerId)) reasons.push('unknown-player');
    if (!this.actorIsAssigned(actor)) reasons.push('character-not-owned');
    if (actor?.disconnected) reasons.push('player-disconnected');
    if (actor?.incapacitated) reasons.push('character-incapacitated');
    if (context.locked) reasons.push(context.lockReason ?? 'activity-locked');
    if (context.requiresProximity && !context.inRange) reasons.push('out-of-range');

    // Deliberately absent: no combat family, kit, class, character identity,
    // or player-seat check can reserve an activity for a preferred role.
    return { allowed: reasons.length === 0, reasons };
  }

  attempt(type, actor, target = {}, context = {}) {
    const authorization = this.canAttempt(type, actor, context);
    const policy = this.policyFor(type);
    const targetId = target.id ?? `${type}:unidentified`;
    const existing = this.claims.get(targetId);

    if (authorization.allowed && policy.exclusive && existing && existing.status === 'active') {
      authorization.allowed = false;
      authorization.reasons.push('already-claimed');
    }

    const attempt = {
      activityId: `activity-${++this.sequence}`,
      sequence: this.sequence,
      type,
      targetId,
      target: clone(target),
      actor: clone(actor),
      policy: clone(policy),
      status: authorization.allowed
        ? policy.consequential && context.requireConsensus !== false
          ? 'proposed'
          : 'active'
        : 'denied',
      denialReasons: [...authorization.reasons],
      participants: [{ playerId: actor?.playerId, characterId: actor?.characterId }],
      responses: {},
      metadata: clone(context.metadata ?? {}),
    };

    this.log.push(attempt);
    if (attempt.status === 'active' && policy.exclusive) this.claims.set(targetId, attempt);
    if (attempt.status !== 'denied') this.recordParticipation(attempt, actor);
    this.options.onActivity?.(clone(attempt));
    return clone(attempt);
  }

  join(activityId, actor) {
    const activity = this.log.find((entry) => entry.activityId === activityId);
    if (!activity) return { success: false, reason: 'missing-activity' };
    const authorization = this.canAttempt(activity.type, actor);
    if (!authorization.allowed) return { success: false, reason: authorization.reasons.join(',') };
    const exists = activity.participants.some(
      (entry) => entry.playerId === actor.playerId && entry.characterId === actor.characterId,
    );
    if (!exists) activity.participants.push({ playerId: actor.playerId, characterId: actor.characterId });
    this.recordParticipation(activity, actor);
    this.options.onActivity?.(clone(activity));
    return { success: true, activity: clone(activity) };
  }

  respond(activityId, playerId, response) {
    const activity = this.log.find((entry) => entry.activityId === activityId);
    if (!activity || activity.status !== 'proposed') return { success: false, reason: 'not-open-proposal' };
    if (!this.playerIds.has(playerId)) return { success: false, reason: 'unknown-player' };
    if (!['agree', 'oppose', 'abstain'].includes(response)) return { success: false, reason: 'invalid-response' };
    activity.responses[playerId] = response;
    this.options.onActivity?.(clone(activity));
    return { success: true, activity: clone(activity) };
  }

  resolve(activityId, resolution = {}) {
    const activity = this.log.find((entry) => entry.activityId === activityId);
    if (!activity) return { success: false, reason: 'missing-activity' };
    activity.status = resolution.status ?? 'completed';
    activity.resolution = clone(resolution);
    if (this.claims.get(activity.targetId)?.activityId === activity.activityId) {
      this.claims.delete(activity.targetId);
    }
    this.options.onActivity?.(clone(activity));
    return { success: true, activity: clone(activity) };
  }

  release(activityId, reason = 'released') {
    return this.resolve(activityId, { status: 'released', reason });
  }

  recordParticipation(activity, actor) {
    const playerId = actor?.playerId;
    if (!playerId) return;
    const current = this.participation.get(playerId) ?? {
      playerId,
      total: 0,
      byType: {},
      byCharacter: {},
    };
    current.total += 1;
    current.byType[activity.type] = (current.byType[activity.type] ?? 0) + 1;
    if (actor.characterId) {
      current.byCharacter[actor.characterId] = (current.byCharacter[actor.characterId] ?? 0) + 1;
    }
    this.participation.set(playerId, current);
  }

  snapshot() {
    return {
      log: clone(this.log),
      activeClaims: clone([...this.claims.values()]),
      participation: clone([...this.participation.values()]),
    };
  }
}

export function actorForAssignment(assignment, extra = {}) {
  return {
    playerId: assignment.playerId,
    characterId: assignment.characterId,
    assignmentId: assignment.assignmentId,
    ...extra,
  };
}
