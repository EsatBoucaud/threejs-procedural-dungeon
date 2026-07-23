import * as THREE from 'three';
import { buildInteractionNodes } from '../content/interaction-content.js';
import { itemForRoom } from '../content/items.js';
import { ACTIVITY_TYPES, ActivityAuthority } from './activity-authority.js';

const BOONS = [
  { id: 'medical-waiver', name: 'MEDICAL WAIVER', description: 'Restores every operative and increases future healing.' },
  { id: 'late-permit', name: 'LATE PERMIT', description: 'Extends the safe window before the interlace.' },
  { id: 'salvage-premium', name: 'SALVAGE PREMIUM', description: 'Raises the field value of everything recovered this run.' },
  { id: 'accelerated-clearance', name: 'ACCELERATED CLEARANCE', description: 'Reduces ability and dodge cooldowns.' },
  { id: 'dual-citizenship', name: 'DUAL-STATE CLEARANCE', description: 'Raises the value of objects recovered from the remote server.' },
];

function roomState(room, active = true) {
  return {
    entered: false,
    active,
    cleared: active && (room.type === 'entrance' || room.type === 'shrine'),
    lootDropped: false,
  };
}

export class MissionSystem {
  constructor(renderer, mapState, events, combat) {
    this.renderer = renderer;
    this.mapState = mapState;
    this.events = events;
    this.combat = combat;
    this.baseRooms = mapState.rooms;
    this.remoteRooms = mapState.interlace?.rooms ?? [];
    this.rooms = new Map([
      ...this.baseRooms.map((room) => [room.id, room]),
      ...this.remoteRooms.map((room) => [room.id, room]),
    ]);
    this.roomStates = new Map([
      ...this.baseRooms.map((room) => [room.id, roomState(room, true)]),
      ...this.remoteRooms.map((room) => [room.id, roomState(room, false)]),
    ]);
    this.loot = [];
    this.recovered = [];
    this.processSeized = [];
    this.shrines = [];
    this.interactionNodes = [];
    this.returnMarks = [];
    this.classificationDisputes = [];
    this.currentRoom = null;
    this.lastRoom = null;
    this.lastInteractionHint = null;
    this.payoutMultiplier = 1;
    this.remotePayoutMultiplier = 1;
    this.interlaceActive = false;
    this.overlapsVisited = new Set();
    this.activityAuthority = new ActivityAuthority(mapState.deployment, {
      onActivity: (activity) => this.events.onActivity?.(activity),
    });

    for (const room of this.baseRooms.filter((entry) => entry.type === 'shrine')) {
      this.createShrine(room, false);
    }
    for (const node of buildInteractionNodes(mapState).filter((entry) => entry.origin === 'base')) {
      this.createInteractionNode(node);
    }
  }

  defaultActor() {
    const deployment = this.mapState.deployment ?? {};
    const playerId = deployment.localPlayerId ?? deployment.players?.[0]?.id ?? 'player-1';
    const assignment = deployment.assignments?.find((entry) => entry.playerId === playerId)
      ?? deployment.assignments?.[0];
    return {
      playerId,
      characterId: assignment?.characterId ?? 'unknown-character',
      assignmentId: assignment?.assignmentId ?? 'unknown-assignment',
    };
  }

  normalizeActor(actor = {}) {
    return { ...this.defaultActor(), ...actor };
  }

  beginActivity(type, actor, target, context = {}) {
    const normalizedActor = this.normalizeActor(actor);
    const attempt = this.activityAuthority.attempt(type, normalizedActor, target, context);
    if (attempt.status === 'denied') {
      this.events.onFeed?.(
        `${normalizedActor.characterId} could not begin ${type}: ${attempt.denialReasons.join(', ')}.`,
        'danger',
      );
    }
    return attempt;
  }

  completeActivity(activity, resolution = {}) {
    if (!activity || activity.status === 'denied') return activity;
    this.activityAuthority.resolve(activity.activityId, {
      status: 'completed',
      ...resolution,
    });
    return activity;
  }

  startFieldActivity(type, actor, target, context = {}) {
    return this.beginActivity(type, actor, target, context);
  }

  resolveFieldActivity(activityId, resolution = {}) {
    return this.activityAuthority.resolve(activityId, resolution);
  }

  activitySnapshot() {
    return this.activityAuthority.snapshot();
  }

  createShrine(room, remote) {
    const position = new THREE.Vector3(room.x, 0, room.z);
    const mesh = this.renderer.createShrine(position, remote ? 0xc77bd6 : 0x7fa4e8);
    this.shrines.push({
      shrineId: `shrine:${room.id}`,
      roomId: room.id,
      position,
      mesh,
      used: false,
      remote,
      phase: (room.dressingSeed ?? 1) * 0.00083,
      boon: BOONS[(this.mapState.seed + (room.dressingSeed ?? 0)) % BOONS.length],
    });
  }

  createInteractionNode(node) {
    const position = new THREE.Vector3(node.position.x, 0, node.position.z);
    const color = node.type === 'dialogue'
      ? node.origin === 'interlace' ? 0xd68bd2 : 0x69c9bd
      : node.origin === 'interlace' ? 0xa279df : 0xd5b76d;
    const mesh = this.renderer.createShrine(position, color);
    mesh.scale.setScalar(node.type === 'card-battle' ? 0.86 : 0.72);
    this.interactionNodes.push({
      ...structuredClone(node),
      position,
      mesh,
      used: false,
      active: node.origin === 'base',
      phase: ((node.roomId?.toString().length ?? 1) + this.interactionNodes.length) * 0.73,
    });
  }

  activateInterlace() {
    if (this.interlaceActive) return;
    this.interlaceActive = true;
    for (const room of this.remoteRooms) {
      const state = this.roomStates.get(room.id);
      if (!state) continue;
      state.active = true;
      state.cleared = room.type === 'breach' || room.type === 'shrine';
      if (room.type === 'shrine') this.createShrine(room, true);
    }
    for (const node of buildInteractionNodes(this.mapState).filter((entry) => entry.origin === 'interlace')) {
      this.createInteractionNode(node);
      const created = this.interactionNodes.at(-1);
      created.active = true;
    }
    this.events.onFeed?.(
      `${this.remoteRooms.length} remote rooms and ${(this.mapState.interlace?.bridges ?? []).length} cross-state routes are now physically negotiable.`,
      'danger',
    );
    this.reportProgress();
  }

  get recoveredValue() {
    return Math.round(this.recovered.reduce((sum, item) => {
      const multiplier = item.origin === 'interlace' ? this.remotePayoutMultiplier : 1;
      return sum + item.value * multiplier;
    }, 0) * this.payoutMultiplier);
  }

  get remoteRecoveredCount() {
    return this.recovered.filter((item) => item.origin === 'interlace').length;
  }

  get clearedRoomCount() {
    return [...this.roomStates.values()].filter((state) => state.active && state.cleared).length;
  }

  get remoteClearedRoomCount() {
    return this.remoteRooms.filter((room) => this.roomStates.get(room.id)?.cleared).length;
  }

  get clearedRoomIds() {
    return [...this.roomStates.entries()]
      .filter(([, state]) => state.active && state.cleared)
      .map(([id]) => id);
  }

  get vaultCleared() {
    return Boolean(this.roomStates.get(this.mapState.vaultRoomId)?.cleared);
  }

  get remoteVaultCleared() {
    return Boolean(this.roomStates.get(this.mapState.interlace?.vaultRoomId)?.cleared);
  }

  snapshot(extra = {}) {
    return {
      objects: this.recovered.length,
      remoteObjects: this.remoteRecoveredCount,
      value: this.recoveredValue,
      rooms: this.clearedRoomCount,
      remoteRooms: this.remoteClearedRoomCount,
      vault: this.vaultCleared,
      remoteVault: this.remoteVaultCleared,
      overlaps: this.overlapsVisited.size,
      processSeized: this.processSeized.length,
      returnMarks: this.returnMarks.length,
      classificationDisputes: this.classificationDisputes.length,
      activityParticipation: this.activitySnapshot().participation,
      ...extra,
    };
  }

  reportProgress(extra = {}) {
    this.events.onProgress?.({
      ...this.snapshot(extra),
      currentRoomId: this.currentRoom?.id ?? this.mapState.entranceRoomId,
      clearedRoomIds: this.clearedRoomIds,
    });
  }

  checkRoomClear(roomId) {
    const state = this.roomStates.get(roomId);
    if (!state || !state.active || state.cleared || this.combat.hasLivingEnemy(roomId, true)) return;
    state.cleared = true;
    const room = this.rooms.get(roomId);
    if (!room) return;
    const label = room.origin === 'interlace' ? `REMOTE ${room.type.toUpperCase()}` : room.type.toUpperCase();
    this.events.onFeed?.(`${label} room stabilized.`, 'good');
    this.dropLoot(room);
    this.reportProgress();
  }

  dropLoot(room) {
    const state = this.roomStates.get(room.id);
    if (
      !state
      || state.lootDropped
      || room.type === 'entrance'
      || room.type === 'breach'
      || room.type === 'shrine'
    ) return;
    state.lootDropped = true;
    const interlaced = room.origin === 'interlace';
    const item = itemForRoom(room, interlaced ? this.mapState.interlace.seed : this.mapState.seed, { interlaced });
    const offset = (((room.dressingSeed ?? 0) % 5) - 2) * 0.5;
    const position = new THREE.Vector3(room.x + offset, 0, room.z - offset * 0.4);
    const mesh = this.renderer.createLoot(position, item.color);
    this.loot.push({
      lootId: `loot:${String(room.id)}:${item.instanceId}`,
      item,
      position,
      mesh,
      collected: false,
      resolved: false,
      decision: null,
      phase: (room.dressingSeed ?? 1) * 0.0001,
      roomId: room.id,
    });
    this.events.onFeed?.(
      interlaced
        ? 'A contradictory object has stabilized. Any player may inspect it and propose what happens next.'
        : 'Object density has become negotiable. Any player in range may open the object record.',
      interlaced ? 'danger' : '',
    );
  }

  resolveObjectDecision(lootId, optionId, actor = {}) {
    const normalizedActor = this.normalizeActor(actor);
    const entry = this.loot.find((loot) => loot.lootId === lootId);
    if (!entry || entry.collected || entry.resolved) return { success: false, reason: 'object-unavailable' };
    entry.resolved = true;
    entry.decision = optionId;

    if (optionId === 'leave') {
      entry.leftByPlayerId = normalizedActor.playerId;
      entry.leftByCharacterId = normalizedActor.characterId;
      this.events.onFeed?.(`${normalizedActor.characterId} left ${entry.item.name} in the room.`, '');
      this.reportProgress();
      return { success: true, recovered: false, entry };
    }

    const activity = this.beginActivity(
      ACTIVITY_TYPES.LOOT,
      normalizedActor,
      {
        id: entry.item.instanceId ?? entry.lootId,
        roomId: entry.roomId,
        itemName: entry.item.name,
      },
      { requiresProximity: true, inRange: true },
    );
    if (activity.status === 'denied') {
      entry.resolved = false;
      entry.decision = null;
      return { success: false, reason: activity.denialReasons.join(',') };
    }

    entry.collected = true;
    this.renderer.removeObject(entry.mesh);
    const recoveredItem = {
      ...entry.item,
      recoveredByPlayerId: normalizedActor.playerId,
      recoveredByCharacterId: normalizedActor.characterId,
      fieldDecision: optionId,
      markedForReturn: optionId === 'mark-return',
      classificationContested: optionId === 'contest',
    };
    this.recovered.push(recoveredItem);
    if (recoveredItem.markedForReturn) this.returnMarks.push(recoveredItem.instanceId);
    if (recoveredItem.classificationContested) this.classificationDisputes.push(recoveredItem.instanceId);
    this.completeActivity(activity, { itemName: entry.item.name, fieldDecision: optionId });
    this.events.onLoot?.(this.recoveredValue);
    this.events.onFeed?.(
      `${normalizedActor.characterId} recovered ${entry.item.name} under decision ${optionId.toUpperCase()}.`,
      entry.item.origin === 'interlace' ? 'danger' : 'good',
    );
    this.reportProgress();
    return { success: true, recovered: true, entry, item: recoveredItem };
  }

  resolveDialogue(nodeId, choice, actor = {}) {
    const node = this.interactionNodes.find((entry) => entry.nodeId === nodeId && entry.type === 'dialogue');
    if (!node || node.used) return { success: false, reason: 'dialogue-unavailable' };
    node.used = true;
    this.renderer.removeObject(node.mesh);
    if (choice.effect === 'reveal-object') {
      const room = this.rooms.get(node.roomId);
      if (room) this.dropLoot(room);
    }
    if (choice.effect === 'mark-return') {
      this.returnMarks.push(`promise:${node.nodeId}:${this.normalizeActor(actor).playerId}`);
    }
    this.events.onInteractionEffect?.({
      type: 'dialogue',
      effect: choice.effect,
      nodeId,
      roomId: node.roomId,
      actor: this.normalizeActor(actor),
    });
    this.events.onFeed?.(`${node.speaker}: ${choice.outcome}`, 'good');
    this.reportProgress();
    return { success: true, node };
  }

  resolveCardBattle(nodeId, won, participants = []) {
    const node = this.interactionNodes.find((entry) => entry.nodeId === nodeId && entry.type === 'card-battle');
    if (!node || node.used) return { success: false, reason: 'card-battle-unavailable' };
    node.used = true;
    this.renderer.removeObject(node.mesh);
    if (won) {
      const room = this.rooms.get(node.roomId);
      if (room) this.dropLoot(room);
    }
    this.events.onInteractionEffect?.({
      type: 'card-battle',
      effect: won ? 'card-win' : 'card-loss',
      nodeId,
      roomId: node.roomId,
      participants: structuredClone(participants),
    });
    this.events.onFeed?.(
      won ? `${node.opponent} released its claim. ${node.reward}` : `${node.opponent} closed the filing against the team.`,
      won ? 'good' : 'danger',
    );
    this.reportProgress();
    return { success: true, node, won };
  }

  seizeHighestRecovered(processId) {
    if (this.recovered.length === 0) return null;
    let targetIndex = 0;
    let targetValue = -1;
    for (let index = 0; index < this.recovered.length; index += 1) {
      const item = this.recovered[index];
      const value = item.value * (item.origin === 'interlace' ? this.remotePayoutMultiplier : 1);
      if (value <= targetValue) continue;
      targetValue = value;
      targetIndex = index;
    }
    const [item] = this.recovered.splice(targetIndex, 1);
    this.processSeized.push({ processId, item });
    this.events.onLoot?.(this.recoveredValue);
    this.reportProgress();
    return item;
  }

  restoreProcessSeizure(processId) {
    const restored = this.processSeized.filter((entry) => entry.processId === processId);
    if (restored.length === 0) return [];
    this.processSeized = this.processSeized.filter((entry) => entry.processId !== processId);
    this.recovered.push(...restored.map((entry) => entry.item));
    this.events.onLoot?.(this.recoveredValue);
    this.reportProgress();
    return restored.map((entry) => entry.item);
  }

  drainProcessSeizures() {
    const items = this.processSeized.map((entry) => entry.item);
    this.processSeized = [];
    return items;
  }

  nearestInteractable(playerPosition) {
    const nearestLoot = this.loot
      .filter((entry) => !entry.collected && !entry.resolved)
      .map((entry) => ({ kind: 'object', distance: entry.position.distanceTo(playerPosition), entry }))
      .filter((entry) => entry.distance < 2.4)
      .sort((a, b) => a.distance - b.distance)[0];
    if (nearestLoot) return nearestLoot;

    const nearestNode = this.interactionNodes
      .filter((entry) => entry.active && !entry.used)
      .map((entry) => ({ kind: entry.type, distance: entry.position.distanceTo(playerPosition), entry }))
      .filter((entry) => entry.distance < 2.8)
      .sort((a, b) => a.distance - b.distance)[0];
    if (nearestNode) return nearestNode;

    const nearestShrine = this.shrines
      .filter((entry) => !entry.used)
      .map((entry) => ({ kind: 'shrine', distance: entry.position.distanceTo(playerPosition), entry }))
      .filter((entry) => entry.distance < 2.8)
      .sort((a, b) => a.distance - b.distance)[0];
    if (nearestShrine) return nearestShrine;

    const entrance = this.rooms.get(this.mapState.entranceRoomId);
    const portalDistance = Math.hypot(playerPosition.x - entrance.x, playerPosition.z - entrance.z);
    if (portalDistance < 3.1) return { kind: 'extraction', distance: portalDistance, entry: entrance };
    return null;
  }

  interact(playerPosition, actor = {}) {
    const normalizedActor = this.normalizeActor(actor);
    const interaction = this.nearestInteractable(playerPosition);
    if (!interaction) {
      this.events.onFeed?.('Nothing nearby accepts that request.', '');
      return { kind: 'none' };
    }

    if (interaction.kind === 'object') {
      return { kind: 'object', loot: interaction.entry };
    }
    if (interaction.kind === 'dialogue') {
      return { kind: 'dialogue', node: interaction.entry };
    }
    if (interaction.kind === 'card-battle') {
      return { kind: 'card-battle', node: interaction.entry };
    }
    if (interaction.kind === 'shrine') {
      const nearestShrine = interaction.entry;
      const activity = this.beginActivity(
        ACTIVITY_TYPES.SHRINE,
        normalizedActor,
        { id: nearestShrine.shrineId, roomId: nearestShrine.roomId },
        { requiresProximity: true, inRange: true },
      );
      if (activity.status === 'denied') return { kind: 'denied' };
      nearestShrine.used = true;
      this.renderer.removeObject(nearestShrine.mesh);
      if (nearestShrine.boon.id === 'salvage-premium') this.payoutMultiplier *= 1.25;
      if (nearestShrine.boon.id === 'dual-citizenship') this.remotePayoutMultiplier *= 1.4;
      this.completeActivity(activity, { boonId: nearestShrine.boon.id });
      this.events.onBoon?.(nearestShrine.boon);
      this.events.onLoot?.(this.recoveredValue);
      this.events.onFeed?.(`${nearestShrine.boon.name}: ${nearestShrine.boon.description}`, 'good');
      this.reportProgress();
      return { kind: 'resolved', activity: 'shrine' };
    }
    if (interaction.kind === 'extraction') {
      if (this.recovered.length === 0 && this.processSeized.length === 0) {
        this.events.onFeed?.('Extraction refuses an empty manifest.', 'danger');
        return { kind: 'denied' };
      }
      return { kind: 'extraction', entrance: interaction.entry };
    }
    return { kind: 'none' };
  }

  update(delta, playerPosition) {
    for (const entry of this.loot) {
      if (entry.collected) continue;
      entry.phase += delta * 1.5;
      entry.mesh.rotation.y += delta * 1.4;
      entry.mesh.position.y = 0.72 + Math.sin(entry.phase) * 0.13;
      if (entry.resolved && entry.decision === 'leave') entry.mesh.material.opacity = 0.42;
    }
    for (const shrine of this.shrines) {
      if (shrine.used) continue;
      shrine.phase += delta;
      shrine.mesh.userData.core.rotation.y += delta * 0.8;
      shrine.mesh.userData.core.position.y = 1.45 + Math.sin(shrine.phase * 1.7) * 0.12;
    }
    for (const node of this.interactionNodes) {
      if (!node.active || node.used) continue;
      node.phase += delta;
      node.mesh.userData.core.rotation.y += delta * (node.type === 'card-battle' ? -0.9 : 0.55);
      node.mesh.userData.core.position.y = 1.45 + Math.sin(node.phase * 1.4) * 0.16;
    }
    const hint = this.nearestInteractable(playerPosition);
    const hintKey = hint ? `${hint.kind}:${hint.entry?.lootId ?? hint.entry?.nodeId ?? hint.entry?.shrineId ?? 'passage'}` : null;
    if (hintKey !== this.lastInteractionHint) {
      this.lastInteractionHint = hintKey;
      this.events.onInteractionHint?.(hint ? {
        kind: hint.kind,
        label: hint.kind === 'object'
          ? `Inspect ${hint.entry.item.name}`
          : hint.kind === 'dialogue'
            ? `Talk to ${hint.entry.speaker}`
            : hint.kind === 'card-battle'
              ? `Open card battle: ${hint.entry.title}`
              : hint.kind === 'shrine'
                ? `Activate ${hint.entry.boon.name}`
                : 'Request extraction',
      } : null);
    }
    this.updateOverlap(playerPosition);
    this.updateRoom(playerPosition);
  }

  updateOverlap(playerPosition) {
    if (!this.interlaceActive) return;
    for (const overlap of this.mapState.interlace?.overlaps ?? []) {
      if (this.overlapsVisited.has(overlap.id)) continue;
      const inside = (
        Math.abs(playerPosition.x - overlap.x) <= overlap.width / 2
        && Math.abs(playerPosition.z - overlap.z) <= overlap.depth / 2
      );
      if (!inside) continue;
      this.overlapsVisited.add(overlap.id);
      this.events.onFeed?.(
        `Overlap ${overlap.id.replace('overlap-', '').padStart(2, '0')} entered. Both rooms are insisting they were here first.`,
        'danger',
      );
      this.reportProgress();
    }
  }

  updateRoom(playerPosition) {
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    const candidates = this.interlaceActive ? [...this.baseRooms, ...this.remoteRooms] : this.baseRooms;
    for (const room of candidates) {
      const distance = Math.hypot(playerPosition.x - room.x, playerPosition.z - room.z);
      const inside = distance <= Math.hypot(room.width / 2, room.depth / 2);
      if (!inside || distance >= nearestDistance) continue;
      nearestDistance = distance;
      nearest = room;
    }
    if (!nearest) return;
    this.currentRoom = nearest;
    if (this.lastRoom?.id === nearest.id) return;
    this.lastRoom = nearest;
    const state = this.roomStates.get(nearest.id);
    if (state) state.entered = true;
    this.events.onRoom?.(nearest);
    this.reportProgress();
    if (nearest.type !== 'entrance' && nearest.type !== 'breach') {
      const origin = nearest.origin === 'interlace' ? 'REMOTE' : 'LOCAL';
      this.events.onFeed?.(`Entered ${origin} ${nearest.type.toUpperCase()} node ${String(nearest.id)}.`, '');
    }
  }
}
