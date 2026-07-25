import * as THREE from 'three';

const POSITION_OFFSETS = (() => {
  const offsets = [[0, 0]];
  for (const radius of [1.25, 2.5, 3.75, 5]) {
    for (let step = 0; step < 12; step += 1) {
      const angle = (step / 12) * Math.PI * 2;
      offsets.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
    }
  }
  return offsets;
})();

function result(success, action, message, extra = {}) {
  return { success, action, message, ...extra };
}

function acceptsObject(room) {
  return room && !['entrance', 'breach', 'shrine'].includes(room.type);
}

export class DemoAssist {
  constructor(run) {
    this.run = run;
    this.enabled = Boolean(run?.mapState?.demoMode?.assistEnabled);
  }

  guard(action) {
    if (!this.enabled) return result(false, action, 'Demo assists are available only in an explicit demo run.');
    if (!this.run || this.run.finished) return result(false, action, 'The current demo run is not active.');
    return null;
  }

  safePosition(target) {
    const base = target instanceof THREE.Vector3
      ? target.clone()
      : new THREE.Vector3(target?.x ?? 0, 0, target?.z ?? 0);
    for (const [x, z] of POSITION_OFFSETS) {
      const candidate = base.clone().add(new THREE.Vector3(x, 0, z));
      if (this.run.isWalkable(candidate)) return candidate;
    }
    return null;
  }

  teleport(target, label = 'demo target') {
    const denied = this.guard('teleport');
    if (denied) return denied;
    const destination = this.safePosition(target);
    if (!destination) return result(false, 'teleport', `No walkable point could be found near ${label}. Use RESTART FIXED RUN rather than presenting from the wrong coordinate.`);
    this.run.player.position.copy(destination);
    this.run.player.velocity.set(0, 0, 0);
    this.run.player.invulnerable = Math.max(this.run.player.invulnerable, 2.5);
    if (this.run.renderer?.playerMesh) this.run.renderer.playerMesh.position.copy(destination);
    this.run.mission.updateRoom(destination);
    this.run.reportProgress();
    return result(true, 'teleport', `Moved to ${label}.`, { position: destination.clone() });
  }

  restoreSquad() {
    const denied = this.guard('restore-squad');
    if (denied) return denied;
    const team = this.run.teamSnapshot();
    this.run.healthByOperative = team.map((operative) => operative.maxHealth);
    this.run.abilityCooldowns.fill(0);
    this.run.dodgeCooldowns.fill(0);
    this.run.player.attackCooldown = 0;
    this.run.player.invulnerable = Math.max(this.run.player.invulnerable, 6);
    this.run.player.damageResistance = Math.max(this.run.player.damageResistance, 6);
    this.run.events.onHealth?.(this.run.health, this.run.activeOperative.maxHealth);
    this.run.events.onOperative?.(this.run.activeOperative, this.run.health, this.run.activeOperative.maxHealth);
    this.run.events.onTeam?.(this.run.teamSnapshot());
    this.run.reportCooldowns();
    return result(true, 'restore-squad', 'Squad restored, cooldowns cleared, and six seconds of demo protection applied.');
  }

  combatRoom() {
    const denied = this.guard('combat-room');
    if (denied) return denied;
    const room = this.run.mapState.rooms.find((entry) => entry.type === 'combat')
      ?? this.run.mapState.rooms.find((entry) => entry.type === 'archive')
      ?? this.run.mapState.rooms[0];
    const moved = this.teleport(room, `${room.type} room ${room.id}`);
    return { ...moved, action: 'combat-room', roomId: room.id };
  }

  interaction(kind = 'dialogue') {
    const denied = this.guard(`interaction-${kind}`);
    if (denied) return denied;
    const node = this.run.mission.interactionNodes.find((entry) => entry.active && !entry.used && entry.type === kind)
      ?? this.run.mission.interactionNodes.find((entry) => entry.active && !entry.used);
    if (!node) return result(false, `interaction-${kind}`, 'No unused active shared interaction remains.');
    const moved = this.teleport(node.position, `${node.type} interaction`);
    return { ...moved, action: `interaction-${node.type}`, nodeId: node.nodeId };
  }

  stageObject() {
    const denied = this.guard('stage-object');
    if (denied) return denied;
    const existing = this.run.mission.loot.find((entry) => !entry.collected && !entry.resolved);
    if (existing) {
      const moved = this.teleport(existing.position, `object ${existing.item.name}`);
      return { ...moved, action: 'stage-object', lootId: existing.lootId, staged: false };
    }

    const current = this.run.mission.currentRoom;
    const candidates = [
      ...(acceptsObject(current) ? [current] : []),
      ...this.run.mapState.rooms.filter((entry) => ['archive', 'treasure'].includes(entry.type)),
      ...this.run.mapState.rooms.filter((entry) => acceptsObject(entry)),
    ];
    const room = candidates.find((entry, index) => (
      candidates.findIndex((candidate) => candidate.id === entry.id) === index
      && !this.run.mission.roomStates.get(entry.id)?.lootDropped
    ));
    if (!room) return result(false, 'stage-object', 'No unused local room can stage another recoverable object. Restart the fixed run.');

    this.run.mission.dropLoot(room);
    const staged = [...this.run.mission.loot].reverse().find((entry) => entry.roomId === room.id && !entry.collected && !entry.resolved);
    if (!staged) return result(false, 'stage-object', 'The selected room refused to create a recoverable object.');
    const moved = this.teleport(staged.position, `staged object ${staged.item.name}`);
    return { ...moved, action: 'stage-object', lootId: staged.lootId, staged: true, roomId: room.id };
  }

  activateInterlace() {
    const denied = this.guard('activate-interlace');
    if (denied) return denied;
    const alreadyActive = this.run.interlaceTriggered;
    this.run.forceInterlace();
    return result(true, 'activate-interlace', alreadyActive ? 'Interlace was already active.' : 'Interlace activated immediately.');
  }

  overlap() {
    const denied = this.guard('overlap');
    if (denied) return denied;
    this.run.forceInterlace();
    const overlap = this.run.mapState.interlace?.overlaps?.[0];
    if (!overlap) return result(false, 'overlap', 'This deterministic state has no overlap coordinate.');
    const moved = this.teleport(overlap, `overlap ${overlap.id}`);
    return { ...moved, action: 'overlap', overlapId: overlap.id };
  }

  extraction() {
    const denied = this.guard('extraction');
    if (denied) return denied;
    const entrance = this.run.mission.rooms.get(this.run.mapState.entranceRoomId);
    if (!entrance) return result(false, 'extraction', 'The entrance room is unavailable.');
    const moved = this.teleport(entrance, 'return passage');
    return { ...moved, action: 'extraction', roomId: entrance.id };
  }

  snapshot() {
    return {
      enabled: this.enabled,
      interlaced: Boolean(this.run?.interlaceTriggered),
      roomId: this.run?.mission?.currentRoom?.id ?? this.run?.mapState?.entranceRoomId ?? null,
      activeCharacter: this.run?.activeOperative?.name ?? null,
      recoveredObjects: this.run?.mission?.recovered?.length ?? 0,
      availableObjects: this.run?.mission?.loot?.filter((entry) => !entry.collected && !entry.resolved).length ?? 0,
      activeInteractions: this.run?.mission?.interactionNodes?.filter((entry) => entry.active && !entry.used).length ?? 0,
      finished: Boolean(this.run?.finished),
    };
  }
}
