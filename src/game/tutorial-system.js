function clone(value) {
  return structuredClone(value);
}

function roomDepth(room) {
  return Number.isFinite(room?.graphDepth) ? room.graphDepth : Number.MAX_SAFE_INTEGER;
}

function sortByDepth(rooms) {
  return [...rooms].sort((a, b) => roomDepth(a) - roomDepth(b) || String(a.id).localeCompare(String(b.id)));
}

export function createTutorialPlan(mapState) {
  const rooms = mapState.rooms ?? [];
  const entranceId = mapState.entranceRoomId;
  const critical = sortByDepth(rooms.filter((room) => room.id !== entranceId && room.onCriticalPath));
  const nonEntrance = sortByDepth(rooms.filter((room) => room.id !== entranceId));
  const orientationRoom = critical[0] ?? nonEntrance[0] ?? rooms.find((room) => room.id === entranceId) ?? null;
  const afterOrientation = (room) => room.id !== orientationRoom?.id && roomDepth(room) > roomDepth(orientationRoom);
  const combatRoom = sortByDepth([
    ...critical.filter((room) => afterOrientation(room) && ['combat', 'elite'].includes(room.type)),
    ...rooms.filter((room) => afterOrientation(room) && ['combat', 'elite'].includes(room.type)),
  ])[0]
    ?? rooms.find((room) => room.id === mapState.vaultRoomId)
    ?? nonEntrance.find((room) => room.id !== orientationRoom?.id)
    ?? orientationRoom;

  return {
    entranceRoomId: entranceId,
    orientationRoomId: orientationRoom?.id ?? entranceId,
    combatRoomId: combatRoom?.id ?? mapState.vaultRoomId,
    orientationPosition: orientationRoom ? { x: orientationRoom.x, z: orientationRoom.z } : null,
    combatPosition: combatRoom ? { x: combatRoom.x, z: combatRoom.z } : null,
  };
}

export class TutorialSystem {
  constructor(plan, deployment) {
    this.plan = clone(plan);
    this.deployment = clone(deployment ?? { mode: 'two-player', players: [], assignments: [] });
    this.phase = 'inactive';
    this.completed = false;
    this.started = false;
    this.sequence = 0;
    this.history = [];
    this.combatEnteredAt = null;
    this.tasks = {
      threshold: false,
      inspect: false,
      ownership: false,
      combatEntered: false,
      attack: false,
      dodge: false,
      ability: false,
      cover: false,
      roomClear: false,
    };
  }

  transition(phase, reason) {
    if (this.phase === phase) return false;
    const previous = this.phase;
    this.phase = phase;
    this.history.push({ sequence: ++this.sequence, event: 'phase', previous, phase, reason });
    return true;
  }

  start() {
    if (this.started) return this.snapshot();
    this.started = true;
    this.transition('threshold', 'run-started');
    return this.snapshot();
  }

  enterRoom(roomId, elapsedSeconds = 0) {
    if (!this.started || this.completed) return this.snapshot();
    if (roomId === this.plan.orientationRoomId && !this.tasks.threshold) {
      this.tasks.threshold = true;
      this.history.push({ sequence: ++this.sequence, event: 'task', task: 'threshold', roomId });
      this.transition('inspect', 'orientation-room-entered');
    }
    if (roomId === this.plan.combatRoomId && this.tasks.inspect && !this.tasks.combatEntered) {
      this.tasks.combatEntered = true;
      this.combatEnteredAt = elapsedSeconds;
      this.history.push({ sequence: ++this.sequence, event: 'task', task: 'combatEntered', roomId });
      this.transition('combat', 'tutorial-combat-entered');
    }
    return this.snapshot();
  }

  inspectOrientation(actor = {}) {
    if (this.phase !== 'inspect' || this.tasks.inspect) return { success: false, snapshot: this.snapshot() };
    this.tasks.inspect = true;
    this.history.push({
      sequence: ++this.sequence,
      event: 'task',
      task: 'inspect',
      playerId: actor.playerId ?? null,
      characterId: actor.characterId ?? null,
    });
    if (this.deployment.mode === 'two-player') {
      this.transition('ownership', 'inspection-complete');
    } else {
      this.tasks.ownership = true;
      this.history.push({ sequence: ++this.sequence, event: 'task', task: 'ownership', mode: 'four-player' });
      this.transition('combat-route', 'fixed-ownership-confirmed');
    }
    return { success: true, snapshot: this.snapshot() };
  }

  recordAction(action, context = {}) {
    if (!this.started || this.completed) return { success: false, snapshot: this.snapshot() };
    if (action === 'swap' && this.phase === 'ownership' && this.deployment.mode === 'two-player') {
      this.tasks.ownership = true;
      this.history.push({ sequence: ++this.sequence, event: 'task', task: 'ownership', mode: 'two-player', ...clone(context) });
      this.transition('combat-route', 'owned-character-swapped');
      return { success: true, snapshot: this.snapshot() };
    }
    if (this.phase !== 'combat') return { success: false, snapshot: this.snapshot() };
    if (!['attack', 'dodge', 'ability', 'cover'].includes(action) || this.tasks[action]) {
      return { success: false, snapshot: this.snapshot() };
    }
    this.tasks[action] = true;
    this.history.push({ sequence: ++this.sequence, event: 'task', task: action, ...clone(context) });
    this.checkCompletion();
    return { success: true, snapshot: this.snapshot() };
  }

  clearRoom(roomId) {
    if (!this.started || this.completed || roomId !== this.plan.combatRoomId || this.tasks.roomClear) {
      return { success: false, snapshot: this.snapshot() };
    }
    this.tasks.roomClear = true;
    this.history.push({ sequence: ++this.sequence, event: 'task', task: 'roomClear', roomId });
    this.checkCompletion();
    return { success: true, snapshot: this.snapshot() };
  }

  checkCompletion() {
    const required = ['threshold', 'inspect', 'ownership', 'combatEntered', 'attack', 'dodge', 'ability', 'roomClear'];
    if (!required.every((task) => this.tasks[task])) return false;
    this.completed = true;
    this.transition('complete', this.tasks.cover ? 'combat-and-cover-complete' : 'combat-core-complete');
    this.history.push({ sequence: ++this.sequence, event: 'tutorial-complete', coverObserved: this.tasks.cover });
    return true;
  }

  currentTargetRoomId() {
    if (['threshold', 'inspect', 'ownership'].includes(this.phase)) return this.plan.orientationRoomId;
    if (['combat-route', 'combat'].includes(this.phase)) return this.plan.combatRoomId;
    return null;
  }

  snapshot() {
    return {
      started: this.started,
      completed: this.completed,
      phase: this.phase,
      tasks: clone(this.tasks),
      plan: clone(this.plan),
      deploymentMode: this.deployment.mode,
      currentTargetRoomId: this.currentTargetRoomId(),
      combatEnteredAt: this.combatEnteredAt,
      history: clone(this.history),
    };
  }
}
