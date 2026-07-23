export class DirectorSystem {
  constructor(mapState, combat, mission, events = {}) {
    this.mapState = mapState;
    this.combat = combat;
    this.mission = mission;
    this.events = events;
    this.threat = 0;
    this.waveIndex = 0;
    this.nextWaveAt = 24;
    this.auditorSpawned = false;
    this.auditorDefeated = false;
    this.auditorDelay = 0;
    this.auditorHealthMultiplier = 1;
  }

  update(delta, context) {
    if (context.finished) return;
    const recoveredPressure = Math.min(0.28, this.mission.recoveredValue / 4600);
    const remotePressure = this.mission.remoteRecoveredCount * 0.015;
    this.threat = Math.min(1, this.threat + delta * (0.006 + recoveredPressure * 0.01 + remotePressure * 0.002));
    this.events.onThreat?.(this.threat);

    if (context.elapsed >= this.nextWaveAt) {
      this.spawnPressureWave(context.playerPosition, context.interlaceTriggered);
      const cadence = Math.max(11, 26 - this.threat * 11 - (context.interlaceTriggered ? 5 : 0));
      this.nextWaveAt = context.elapsed + cadence;
    }

    if (
      context.interlaceTriggered
      && !this.auditorSpawned
      && context.elapsed >= this.mapState.interlaceAtSeconds + 24 + this.auditorDelay
      && this.mission.clearedRoomCount >= 4
    ) {
      this.spawnAuditor();
    }
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

  spawnAuditor() {
    this.auditorSpawned = true;
    const largestOverlap = [...(this.mapState.interlace?.overlaps ?? [])]
      .sort((a, b) => b.width * b.depth - a.width * a.depth)[0];
    const vault = this.mapState.rooms.find((room) => room.id === this.mapState.vaultRoomId);
    const spawn = largestOverlap ?? vault;
    const auditor = this.combat.spawnEnemy({
      x: spawn.x,
      z: spawn.z,
      roomId: 'auditor-incursion',
      elite: true,
      interlaced: true,
      difficulty: 1,
      archetype: 'auditor',
    });
    if (this.auditorHealthMultiplier !== 1) {
      auditor.maxHealth *= this.auditorHealthMultiplier;
      auditor.health = auditor.maxHealth;
      this.events.onBossHealth?.(auditor.health, auditor.maxHealth);
    }
    this.events.onBoss?.({ name: 'THE AUDITOR', state: 'arrived' });
    this.events.onFeed?.(
      this.auditorHealthMultiplier < 1
        ? 'THE AUDITOR HAS ARRIVED LATE, UNDERSTAFFED, AND FORMALLY EXEMPTED FROM CONFIDENCE.'
        : 'THE AUDITOR HAS MATERIALIZED INSIDE THE LARGEST ACCOUNTING CONTRADICTION.',
      'danger',
    );
  }

  handleEnemyKilled(enemy) {
    if (enemy.archetype !== 'auditor') return;
    this.auditorDefeated = true;
    this.threat = Math.max(0.25, this.threat - 0.4);
    this.events.onBoss?.({ name: 'THE AUDITOR', state: 'defeated' });
    this.events.onFeed?.('The Auditor has been removed from its own record.', 'good');
  }
}
