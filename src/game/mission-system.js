import * as THREE from 'three';
import { itemForRoom } from '../content/items.js';

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
    this.currentRoom = null;
    this.lastRoom = null;
    this.payoutMultiplier = 1;
    this.remotePayoutMultiplier = 1;
    this.interlaceActive = false;
    this.overlapsVisited = new Set();

    for (const room of this.baseRooms.filter((entry) => entry.type === 'shrine')) {
      this.createShrine(room, false);
    }
  }

  createShrine(room, remote) {
    const position = new THREE.Vector3(room.x, 0, room.z);
    const mesh = this.renderer.createShrine(position, remote ? 0xc77bd6 : 0x7fa4e8);
    this.shrines.push({
      roomId: room.id,
      position,
      mesh,
      used: false,
      remote,
      phase: (room.dressingSeed ?? 1) * 0.00083,
      boon: BOONS[(this.mapState.seed + (room.dressingSeed ?? 0)) % BOONS.length],
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
      item,
      position,
      mesh,
      collected: false,
      phase: (room.dressingSeed ?? 1) * 0.0001,
      roomId: room.id,
    });
    this.events.onFeed?.(
      interlaced
        ? 'A contradictory object has stabilized long enough to be stolen. Press E.'
        : 'Object density has become negotiable. Press E near the recovered object.',
      interlaced ? 'danger' : '',
    );
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

  interact(playerPosition) {
    const nearestLoot = this.loot
      .filter((entry) => !entry.collected)
      .sort((a, b) => a.position.distanceTo(playerPosition) - b.position.distanceTo(playerPosition))[0];
    if (nearestLoot && nearestLoot.position.distanceTo(playerPosition) < 2.4) {
      nearestLoot.collected = true;
      this.renderer.removeObject(nearestLoot.mesh);
      this.recovered.push(nearestLoot.item);
      this.events.onLoot?.(this.recoveredValue);
      this.events.onFeed?.(
        `Recovered: ${nearestLoot.item.name} — ₢ ${nearestLoot.item.value} / ${nearestLoot.item.condition}.`,
        nearestLoot.item.origin === 'interlace' ? 'danger' : 'good',
      );
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
      if (nearestShrine.boon.id === 'dual-citizenship') this.remotePayoutMultiplier *= 1.4;
      this.events.onBoon?.(nearestShrine.boon);
      this.events.onLoot?.(this.recoveredValue);
      this.events.onFeed?.(`${nearestShrine.boon.name}: ${nearestShrine.boon.description}`, 'good');
      this.reportProgress();
      return false;
    }

    const entrance = this.rooms.get(this.mapState.entranceRoomId);
    const portalDistance = Math.hypot(playerPosition.x - entrance.x, playerPosition.z - entrance.z);
    if (portalDistance < 3.1) {
      if (this.recovered.length === 0 && this.processSeized.length === 0) {
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
