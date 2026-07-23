import * as THREE from 'three';
import { itemForRoom } from '../content/items.js';

const BOONS = [
  { id: 'medical-waiver', name: 'MEDICAL WAIVER', description: 'Restores every operative and increases future healing.' },
  { id: 'late-permit', name: 'LATE PERMIT', description: 'Extends the safe window before the interlace.' },
  { id: 'salvage-premium', name: 'SALVAGE PREMIUM', description: 'Raises the field value of everything recovered this run.' },
  { id: 'accelerated-clearance', name: 'ACCELERATED CLEARANCE', description: 'Reduces ability and dodge cooldowns.' },
];

export class MissionSystem {
  constructor(renderer, mapState, events, combat) {
    this.renderer = renderer;
    this.mapState = mapState;
    this.events = events;
    this.combat = combat;
    this.rooms = new Map(mapState.rooms.map((room) => [room.id, room]));
    this.roomStates = new Map(mapState.rooms.map((room) => [room.id, {
      entered: false,
      cleared: room.type === 'entrance' || room.type === 'shrine',
      lootDropped: false,
    }]));
    this.loot = [];
    this.recovered = [];
    this.shrines = [];
    this.currentRoom = null;
    this.lastRoom = null;
    this.payoutMultiplier = 1;

    for (const room of mapState.rooms.filter((entry) => entry.type === 'shrine')) {
      const position = new THREE.Vector3(room.x, 0, room.z);
      const mesh = renderer.createShrine(position, 0x7fa4e8);
      this.shrines.push({
        roomId: room.id,
        position,
        mesh,
        used: false,
        phase: room.id * 0.83,
        boon: BOONS[(mapState.seed + room.id) % BOONS.length],
      });
    }
  }

  get recoveredValue() {
    return Math.round(this.recovered.reduce((sum, item) => sum + item.value, 0) * this.payoutMultiplier);
  }

  get clearedRoomCount() {
    return [...this.roomStates.values()].filter((state) => state.cleared).length;
  }

  get clearedRoomIds() {
    return [...this.roomStates.entries()].filter(([, state]) => state.cleared).map(([id]) => id);
  }

  get vaultCleared() {
    return Boolean(this.roomStates.get(this.mapState.vaultRoomId)?.cleared);
  }

  snapshot(extra = {}) {
    return {
      objects: this.recovered.length,
      value: this.recoveredValue,
      rooms: this.clearedRoomCount,
      vault: this.vaultCleared,
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
    if (typeof roomId !== 'number') return;
    const state = this.roomStates.get(roomId);
    if (!state || state.cleared || this.combat.hasLivingEnemy(roomId)) return;
    state.cleared = true;
    const room = this.rooms.get(roomId);
    this.events.onFeed?.(`${room.type.toUpperCase()} room stabilized.`, 'good');
    this.dropLoot(room);
    this.reportProgress();
  }

  dropLoot(room) {
    const state = this.roomStates.get(room.id);
    if (!state || state.lootDropped || room.type === 'entrance' || room.type === 'shrine') return;
    state.lootDropped = true;
    const item = itemForRoom(room, this.mapState.seed);
    const offset = ((room.dressingSeed % 5) - 2) * 0.5;
    const position = new THREE.Vector3(room.x + offset, 0, room.z - offset * 0.4);
    const mesh = this.renderer.createLoot(position, item.color);
    this.loot.push({ item, position, mesh, collected: false, phase: room.id });
    this.events.onFeed?.('Object density has become negotiable. Press E near the recovered object.', '');
  }

  interact(playerPosition) {
    const nearestLoot = this.loot
      .filter((entry) => !entry.collected)
      .sort((a, b) => a.position.distanceTo(playerPosition) - b.position.distanceTo(playerPosition))[0];
    if (nearestLoot && nearestLoot.position.distanceTo(playerPosition) < 2.4) {
      nearestLoot.collected = true;
      this.renderer.removeObject(nearestLoot.mesh);
      this.recovered.push(nearestLoot.item);
      this.events.onLoot?.(this.recoveredValue);
      this.events.onFeed?.(`Recovered: ${nearestLoot.item.name} — ₢ ${nearestLoot.item.value}.`, 'good');
      this.reportProgress();
      return false;
    }

    const nearestShrine = this.shrines
      .filter((entry) => !entry.used)
      .sort((a, b) => a.position.distanceTo(playerPosition) - b.position.distanceTo(playerPosition))[0];
    if (nearestShrine && nearestShrine.position.distanceTo(playerPosition) < 2.8) {
      nearestShrine.used = true;
      this.renderer.removeObject(nearestShrine.mesh);
      if (nearestShrine.boon.id === 'salvage-premium') this.payoutMultiplier *= 1.25;
      this.events.onBoon?.(nearestShrine.boon);
      this.events.onLoot?.(this.recoveredValue);
      this.events.onFeed?.(`${nearestShrine.boon.name}: ${nearestShrine.boon.description}`, 'good');
      this.reportProgress();
      return false;
    }

    const entrance = this.rooms.get(this.mapState.entranceRoomId);
    const portalDistance = Math.hypot(playerPosition.x - entrance.x, playerPosition.z - entrance.z);
    if (portalDistance < 3.1) {
      if (this.recovered.length === 0) {
        this.events.onFeed?.('Extraction refuses an empty manifest.', 'danger');
        return false;
      }
      return true;
    }
    this.events.onFeed?.('Nothing nearby accepts that request.', '');
    return false;
  }

  update(delta, playerPosition) {
    for (const entry of this.loot) {
      if (entry.collected) continue;
      entry.phase += delta * 1.5;
      entry.mesh.rotation.y += delta * 1.4;
      entry.mesh.position.y = 0.72 + Math.sin(entry.phase) * 0.13;
    }
    for (const shrine of this.shrines) {
      if (shrine.used) continue;
      shrine.phase += delta;
      shrine.mesh.userData.core.rotation.y += delta * 0.8;
      shrine.mesh.userData.core.position.y = 1.45 + Math.sin(shrine.phase * 1.7) * 0.12;
    }
    this.updateRoom(playerPosition);
  }

  updateRoom(playerPosition) {
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const room of this.mapState.rooms) {
      const distance = Math.hypot(playerPosition.x - room.x, playerPosition.z - room.z);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = room;
      }
    }
    this.currentRoom = nearest;
    if (!nearest || this.lastRoom?.id === nearest.id) return;
    this.lastRoom = nearest;
    const state = this.roomStates.get(nearest.id);
    if (state) state.entered = true;
    this.events.onRoom?.(nearest);
    this.reportProgress();
    if (nearest.type !== 'entrance') {
      this.events.onFeed?.(`Entered ${nearest.type.toUpperCase()} node ${String(nearest.id).padStart(2, '0')}.`, '');
    }
  }
}
