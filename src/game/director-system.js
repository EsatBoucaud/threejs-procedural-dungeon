import * as THREE from 'three';
import { processForMap } from '../content/chave-processes.js';

export class DirectorSystem {
  constructor(mapState, combat, mission, events = {}) {
    this.mapState = mapState;
    this.combat = combat;
    this.mission = mission;
    this.events = events;
    this.threat = 0;
    this.waveIndex = 0;
    this.nextWaveAt = 24;
    this.process = processForMap(mapState);
    this.majorSpawned = false;
    this.majorDefeated = false;
    this.majorEnemy = null;
    this.nextProcessActionAt = 0;
    this.auditorSpawned = false;
    this.auditorDefeated = false;
    this.auditorDelay = 0;
    this.auditorHealthMultiplier = 1;
  }

  get extractionLocked() {
    return this.process.id === 'warden' && this.majorSpawned && !this.majorDefeated;
  }

  update(delta, context) {
    if (context.finished) return;
    const recoveredPressure = Math.min(0.28, this.mission.recoveredValue / 4600);
    const remotePressure = this.mission.remoteRecoveredCount * 0.015;
    const runnerPressure = this.process.id === 'route-runner' && this.majorSpawned && !this.majorDefeated ? 0.0025 : 0;
    this.threat = Math.min(1, this.threat + delta * (0.006 + recoveredPressure * 0.01 + remotePressure * 0.002 + runnerPressure));
    this.events.onThreat?.(this.threat);

    if (context.elapsed >= this.nextWaveAt) {
      this.spawnPressureWave(context.playerPosition, context.interlaceTriggered);
      const cadence = Math.max(11, 26 - this.threat * 11 - (context.interlaceTriggered ? 5 : 0));
      this.nextWaveAt = context.elapsed + cadence;
    }

    if (!this.majorSpawned && this.shouldSpawnMajor(context)) this.spawnMajorProcess(context);
    this.updateMajorProcess(context);
  }

  shouldSpawnMajor(context) {
    if (!context.interlaceTriggered) return false;
    const elapsedAfterInterlace = context.elapsed - this.mapState.interlaceAtSeconds;
    if (this.process.id === 'auditor') {
      return elapsedAfterInterlace >= 24 + this.auditorDelay && this.mission.clearedRoomCount >= 4;
    }
    if (this.process.id === 'seizure-chief') {
      return elapsedAfterInterlace >= 16 && this.mission.remoteRecoveredCount >= 1;
    }
    if (this.process.id === 'route-runner') {
      return elapsedAfterInterlace >= 12 && this.mission.overlapsVisited.size >= 1;
    }
    if (this.process.id === 'warden') {
      return elapsedAfterInterlace >= 16 && (this.mission.vaultCleared || this.mission.remoteVaultCleared);
    }
    return false;
  }

  spawnPressureWave(playerPosition, interlaced) {
    const pool = interlaced
      ? [...this.mapState.rooms, ...(this.mapState.interlace?.rooms ?? [])]
      : this.mapState.rooms;
    const candidates = pool
      .filter((room) => room.type !== 'entrance' && room.type !== 'breach' && room.type !== 'shrine')
      .map((room) => ({ room, distance: Math.hypot(room.x - playerPosition.x, room.z - playerPosition.z) }))
      .filter((entry) => entry.distance > 12)
      .sort((a, b) => b.distance - a.distance);
    if (candidates.length === 0) return;
    const pick = candidates[(this.mapState.seed + this.waveIndex * 7) % Math.min(candidates.length, 9)].room;
    const count = 2 + Math.floor(this.threat * 3) + (interlaced ? 1 : 0);
    for (let index = 0; index < count; index += 1) {
      const angle = (index / Math.max(1, count)) * Math.PI * 2 + this.waveIndex * 0.61;
      const archetype = index === count - 1 && this.waveIndex % 2 === 1 ? 'gunner' : 'pursuer';
      this.combat.spawnEnemy({
        x: pick.x + Math.cos(angle) * Math.min(3.4, pick.width * 0.22),
        z: pick.z + Math.sin(angle) * Math.min(3.4, pick.depth * 0.22),
        roomId: pick.id,
        elite: this.threat > 0.72 && index === 0,
        interlaced: pick.origin === 'interlace' || interlaced,
        difficulty: Math.max(pick.difficulty, this.threat),
        archetype,
      });
    }
    this.waveIndex += 1;
    this.events.onFeed?.(
      pick.origin === 'interlace'
        ? 'A Chave Geral has routed a hostile process through the remote graph.'
        : interlaced
          ? 'A Chave Geral has crossed a temporary bridge into the mapped state.'
          : 'The map has noticed the recovered objects moving.',
      'danger',
    );
  }

  majorSpawnPoint() {
    const largestOverlap = [...(this.mapState.interlace?.overlaps ?? [])]
      .sort((a, b) => b.width * b.depth - a.width * a.depth)[0];
    const localEntrance = this.mapState.rooms.find((room) => room.id === this.mapState.entranceRoomId);
    const localVault = this.mapState.rooms.find((room) => room.id === this.mapState.vaultRoomId);
    const remoteVault = this.mapState.interlace?.rooms?.find((room) => room.id === this.mapState.interlace?.vaultRoomId);
    const remoteEntrance = this.mapState.interlace?.rooms?.find((room) => room.id === this.mapState.interlace?.entranceRoomId);

    if (this.process.id === 'seizure-chief') return remoteVault ?? largestOverlap ?? localVault;
    if (this.process.id === 'route-runner') return largestOverlap ?? remoteEntrance ?? localVault;
    if (this.process.id === 'warden') {
      return {
        x: localEntrance.x,
        z: localEntrance.z + Math.min(4, localEntrance.depth * 0.28),
      };
    }
    return largestOverlap ?? localVault;
  }

  spawnMajorProcess(context) {
    this.majorSpawned = true;
    this.auditorSpawned = this.process.id === 'auditor';
    const spawn = this.majorSpawnPoint();
    this.majorEnemy = this.combat.spawnEnemy({
      x: spawn.x,
      z: spawn.z,
      roomId: `major-process-${this.process.id}`,
      elite: true,
      interlaced: true,
      difficulty: 1,
      archetype: this.process.id,
    });

    if (this.process.id === 'auditor' && this.auditorHealthMultiplier !== 1) {
      this.majorEnemy.maxHealth *= this.auditorHealthMultiplier;
      this.majorEnemy.health = this.majorEnemy.maxHealth;
      this.combat.callbacks.onBossHealth?.(this.majorEnemy.health, this.majorEnemy.maxHealth);
    }

    this.events.onBoss?.({ name: this.process.name, state: 'arrived', role: this.process.role });
    this.nextProcessActionAt = context.elapsed + 7;

    if (this.process.id === 'seizure-chief') this.attemptConfiscation();
    if (this.process.id === 'auditor') {
      this.events.onFeed?.(
        this.auditorHealthMultiplier < 1
          ? 'THE AUDITOR HAS ARRIVED LATE, UNDERSTAFFED, AND FORMALLY EXEMPTED FROM CONFIDENCE.'
          : 'THE AUDITOR HAS MATERIALIZED INSIDE THE LARGEST ACCOUNTING CONTRADICTION.',
        'danger',
      );
    }
    if (this.process.id === 'seizure-chief') {
      this.events.onFeed?.('THE SEIZURE CHIEF HAS OPENED A LIVE CONFISCATION FILE.', 'danger');
    }
    if (this.process.id === 'route-runner') {
      this.events.onFeed?.('THE ROUTE RUNNER IS USING THE OVERLAP AS A PRIVATE TRANSIT NETWORK.', 'danger');
    }
    if (this.process.id === 'warden') {
      this.events.onFeed?.('THE WARDEN HAS LOCKED THE RETURN PASSAGE. EXTRACTION IS SUSPENDED.', 'danger');
    }
  }

  updateMajorProcess(context) {
    if (!this.majorEnemy || this.majorEnemy.dead || this.majorDefeated) return;
    if (context.elapsed < this.nextProcessActionAt) return;

    if (this.process.id === 'seizure-chief') {
      this.attemptConfiscation();
      this.nextProcessActionAt = context.elapsed + 14;
      return;
    }

    if (this.process.id === 'route-runner') {
      const overlaps = this.mapState.interlace?.overlaps ?? [];
      const bridges = this.mapState.interlace?.bridges ?? [];
      const points = [
        ...overlaps.map((overlap) => ({ x: overlap.x, z: overlap.z })),
        ...bridges.map((bridge) => {
          const points = bridge.corridor.points;
          const midpoint = points[Math.floor(points.length / 2)];
          return { x: midpoint.x, z: midpoint.z };
        }),
      ];
      if (points.length > 0) {
        const index = (this.waveIndex + this.mission.overlapsVisited.size + Math.floor(context.elapsed)) % points.length;
        const destination = new THREE.Vector3(points[index].x, 0, points[index].z);
        this.combat.relocateEnemy(this.majorEnemy, destination);
        this.combat.renderer.createPulse(destination, this.process.color, 4.2);
        this.threat = Math.min(1, this.threat + 0.08);
        this.events.onFeed?.('The Route Runner changed coordinates without changing rooms.', 'danger');
      }
      this.nextProcessActionAt = context.elapsed + 7.5;
    }
  }

  attemptConfiscation() {
    const alreadyHeld = this.mission.processSeized.some((entry) => entry.processId === this.process.id);
    if (alreadyHeld) return null;
    const item = this.mission.seizeHighestRecovered(this.process.id);
    if (item) {
      this.events.onFeed?.(`${item.name} has been removed from the field manifest by seizure order.`, 'danger');
    }
    return item;
  }

  canExtract() {
    return !this.extractionLocked;
  }

  handleEnemyKilled(enemy) {
    if (!enemy.major || enemy.archetype !== this.process.id) return;
    this.majorDefeated = true;
    this.auditorDefeated = enemy.archetype === 'auditor';
    this.threat = Math.max(0.2, this.threat - 0.45);
    const restored = this.mission.restoreProcessSeizure(enemy.archetype);
    this.events.onBoss?.({ name: this.process.name, state: 'defeated', role: this.process.role });

    if (enemy.archetype === 'auditor') {
      this.events.onFeed?.('The Auditor has been removed from its own record.', 'good');
    }
    if (enemy.archetype === 'seizure-chief') {
      this.events.onFeed?.(
        restored.length > 0
          ? `The Seizure Chief dropped ${restored.map((item) => item.name).join(', ')} back into the manifest.`
          : 'The Seizure Chief has lost authority over every object in the room.',
        'good',
      );
    }
    if (enemy.archetype === 'route-runner') {
      this.events.onFeed?.('The temporary routes have stopped moving on behalf of A Chave Geral.', 'good');
    }
    if (enemy.archetype === 'warden') {
      this.events.onFeed?.('The extraction lock is broken. The return passage is accepting personnel again.', 'good');
    }
  }
}
