import * as THREE from 'three';
import { OPERATIVES } from '../content/characters.js';
import { contractForSeed, contractProgress } from '../content/contracts.js';
import { CombatSystem } from './combat-system.js';
import { DirectorSystem } from './director-system.js';
import { HazardSystem } from './hazard-system.js';
import { MissionSystem } from './mission-system.js';
import { createWalkability } from './navigation.js';
import { recordRun } from './progression-system.js';

const TMP = new THREE.Vector3();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class RunController {
  constructor(renderer, mapState, events = {}) {
    this.renderer = renderer;
    this.mapState = mapState;
    this.events = events;
    this.contract = mapState.contract ?? contractForSeed(mapState.seed);
    this.activeOperativeIndex = 0;
    this.healthByOperative = OPERATIVES.map((operative) => operative.maxHealth);
    this.abilityCooldowns = OPERATIVES.map(() => 0);
    this.dodgeCooldowns = OPERATIVES.map(() => 0);
    this.modifiers = {
      healing: 1,
      cooldownRate: 1,
      movement: 1,
    };
    this.player = {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      invulnerable: 0,
      attackCooldown: 0,
      hitCount: 0,
      damageResistance: 0,
    };
    this.elapsed = 0;
    this.finished = false;
    this.interlaceTriggered = false;
    this.isWalkable = createWalkability(mapState, () => this.interlaceTriggered);

    this.combat = new CombatSystem(renderer, {
      onFeed: (...args) => this.events.onFeed?.(...args),
      onHeal: (amount, squad) => this.heal(amount, squad),
      onPlayerDamage: (amount) => this.damagePlayer(amount),
      onBossHealth: (...args) => this.events.onBossHealth?.(...args),
      onEnemyKilled: (enemy) => {
        this.mission?.checkRoomClear(enemy.roomId);
        this.director?.handleEnemyKilled(enemy);
        this.reportProgress();
      },
    });

    const missionEvents = {
      ...events,
      onBoon: (boon) => this.applyBoon(boon),
      onProgress: () => this.reportProgress(),
    };
    this.mission = new MissionSystem(renderer, mapState, missionEvents, this.combat);
    this.director = new DirectorSystem(mapState, this.combat, this.mission, {
      onFeed: (...args) => this.events.onFeed?.(...args),
      onThreat: (value) => this.events.onThreat?.(value),
      onBoss: (state) => {
        this.events.onBoss?.(state);
        this.reportProgress();
      },
    });
    this.hazards = new HazardSystem(renderer, mapState, {
      onDamage: (amount) => this.damagePlayer(amount),
      onFeed: (...args) => this.events.onFeed?.(...args),
    });

    const entrance = this.mission.rooms.get(mapState.entranceRoomId);
    this.player.position.set(entrance.x, 0, entrance.z + Math.min(2.5, entrance.depth * 0.2));
    this.renderer.createPlayer(this.activeOperative.color, this.player.position);
    this.spawnBaseEnemies();
    this.mission.updateRoom(this.player.position);
    this.events.onContract?.(this.contract);
    this.events.onOperative?.(this.activeOperative, this.health, this.activeOperative.maxHealth);
    this.events.onTeam?.(this.teamSnapshot());
    this.events.onLoot?.(0);
    this.events.onTimer?.(mapState.interlaceAtSeconds);
    this.reportCooldowns();
    this.reportProgress();
  }

  get activeOperative() {
    return OPERATIVES[this.activeOperativeIndex];
  }

  get health() {
    return this.healthByOperative[this.activeOperativeIndex];
  }

  set health(value) {
    this.healthByOperative[this.activeOperativeIndex] = clamp(value, 0, this.activeOperative.maxHealth);
  }

  get recoveredValue() {
    return this.mission.recoveredValue;
  }

  teamSnapshot() {
    return OPERATIVES.map((operative, index) => ({
      ...operative,
      health: this.healthByOperative[index],
      active: index === this.activeOperativeIndex,
      abilityCooldown: this.abilityCooldowns[index],
      dodgeCooldown: this.dodgeCooldowns[index],
    }));
  }

  spawnBaseEnemies() {
    for (const room of this.mapState.rooms) {
      let count = 0;
      if (room.type === 'combat') count = 2 + (room.id % 2);
      if (room.type === 'archive' || room.type === 'treasure') count = 1;
      if (room.type === 'elite') count = 3;
      if (room.type === 'vault') count = 5;
      for (let index = 0; index < count; index += 1) {
        const angle = ((index + 1) / (count + 1)) * Math.PI * 2 + room.id * 0.73;
        const radius = Math.min(room.width, room.depth) * (0.18 + (index % 2) * 0.08);
        this.combat.spawnEnemy({
          x: room.x + Math.cos(angle) * radius,
          z: room.z + Math.sin(angle) * radius,
          roomId: room.id,
          elite: room.type === 'elite' || room.type === 'vault',
          interlaced: false,
          difficulty: room.difficulty,
          archetype: index === count - 1 && room.difficulty > 0.36 ? 'gunner' : 'pursuer',
        });
      }
    }
  }

  switchOperative() {
    if (this.finished) return;
    const fallen = this.healthByOperative.map((health) => health <= 0);
    for (let step = 1; step <= OPERATIVES.length; step += 1) {
      const candidate = (this.activeOperativeIndex + step) % OPERATIVES.length;
      if (!fallen[candidate]) {
        this.activeOperativeIndex = candidate;
        break;
      }
    }
    this.renderer.recolorPlayer(this.activeOperative.color);
    this.player.attackCooldown = Math.min(this.player.attackCooldown, 0.12);
    this.events.onOperative?.(this.activeOperative, this.health, this.activeOperative.maxHealth);
    this.events.onTeam?.(this.teamSnapshot());
    this.reportCooldowns();
    this.events.onFeed?.(`${this.activeOperative.name} takes the field.`, 'good');
  }

  attack(target) {
    if (this.finished || this.player.attackCooldown > 0) return;
    this.player.attackCooldown = this.activeOperative.attack.cooldown;
    this.combat.attack(this.player, this.activeOperative, target);
  }

  useAbility(target) {
    if (this.finished || this.abilityCooldowns[this.activeOperativeIndex] > 0) return;
    const ability = this.activeOperative.ability;
    this.abilityCooldowns[this.activeOperativeIndex] = ability.cooldown;
    const result = this.combat.useAbility(this.player, this.activeOperative, target, this.isWalkable);
    if (result?.position) {
      this.player.position.copy(result.position);
      this.player.velocity.set(0, 0, 0);
    }
    this.reportCooldowns();
  }

  dodge(movement, aimPosition) {
    if (this.finished || this.dodgeCooldowns[this.activeOperativeIndex] > 0) return;
    TMP.set(movement.x, 0, movement.z);
    if (TMP.lengthSq() < 0.01 && aimPosition) TMP.copy(aimPosition).sub(this.player.position).setY(0);
    if (TMP.lengthSq() < 0.01) TMP.set(0, 0, -1);
    TMP.normalize();
    const distance = this.activeOperative.dodge.distance;
    let destination = this.player.position.clone().addScaledVector(TMP, distance);
    while (!this.isWalkable(destination) && destination.distanceTo(this.player.position) > 0.8) {
      destination.addScaledVector(TMP, -0.55);
    }
    this.player.position.copy(destination);
    this.player.velocity.set(0, 0, 0);
    this.player.invulnerable = Math.max(this.player.invulnerable, 0.42);
    this.dodgeCooldowns[this.activeOperativeIndex] = this.activeOperative.dodge.cooldown;
    this.renderer.createPulse(this.player.position, this.activeOperative.color, 2.2);
    this.reportCooldowns();
  }

  interact() {
    if (this.finished) return;
    if (this.mission.interact(this.player.position)) this.finish(true);
  }

  forceInterlace() {
    if (!this.interlaceTriggered) this.triggerInterlace();
  }

  update(delta, movement, aimPosition) {
    if (this.finished) {
      this.renderer.update(delta, this.player.position, aimPosition);
      return;
    }

    this.elapsed += delta;
    this.player.attackCooldown = Math.max(0, this.player.attackCooldown - delta);
    this.player.invulnerable = Math.max(0, this.player.invulnerable - delta);
    this.player.damageResistance = Math.max(0, this.player.damageResistance - delta);
    for (let index = 0; index < OPERATIVES.length; index += 1) {
      this.abilityCooldowns[index] = Math.max(0, this.abilityCooldowns[index] - delta * this.modifiers.cooldownRate);
      this.dodgeCooldowns[index] = Math.max(0, this.dodgeCooldowns[index] - delta * this.modifiers.cooldownRate);
    }

    const remaining = Math.max(0, this.mapState.interlaceAtSeconds - this.elapsed);
    this.events.onTimer?.(remaining);
    if (!this.interlaceTriggered && remaining <= 0) this.triggerInterlace();

    const hazardState = this.hazards.update(delta, this.player.position);
    this.updatePlayer(delta, movement, hazardState.speedMultiplier);
    this.combat.update(delta, this.player, this.activeOperative, this.isWalkable);
    this.mission.update(delta, this.player.position);
    this.director.update(delta, {
      elapsed: this.elapsed,
      playerPosition: this.player.position,
      interlaceTriggered: this.interlaceTriggered,
      finished: this.finished,
    });

    this.renderer.playerMesh.position.set(this.player.position.x, 0, this.player.position.z);
    this.renderer.update(delta, this.player.position, aimPosition);
    this.reportCooldowns();
  }

  updatePlayer(delta, movement, hazardMultiplier = 1) {
    TMP.set(movement.x, 0, movement.z);
    if (TMP.lengthSq() > 1) TMP.normalize();
    const desired = TMP.multiplyScalar(this.activeOperative.moveSpeed * this.modifiers.movement * hazardMultiplier);
    this.player.velocity.lerp(desired, 1 - Math.exp(-delta * 12));
    const next = this.player.position.clone().addScaledVector(this.player.velocity, delta);
    if (this.isWalkable(next)) {
      this.player.position.copy(next);
      return;
    }
    const xOnly = this.player.position.clone();
    xOnly.x = next.x;
    const zOnly = this.player.position.clone();
    zOnly.z = next.z;
    if (this.isWalkable(xOnly)) this.player.position.copy(xOnly);
    else if (this.isWalkable(zOnly)) this.player.position.copy(zOnly);
    else this.player.velocity.multiplyScalar(0.2);
  }

  heal(amount, squad = false) {
    const scaled = amount * this.modifiers.healing;
    if (squad) {
      for (let index = 0; index < OPERATIVES.length; index += 1) {
        this.healthByOperative[index] = clamp(
          this.healthByOperative[index] + scaled,
          0,
          OPERATIVES[index].maxHealth,
        );
      }
    } else {
      this.health += scaled;
    }
    this.events.onHealth?.(this.health, this.activeOperative.maxHealth);
    this.events.onTeam?.(this.teamSnapshot());
  }

  applyBoon(boon) {
    if (boon.id === 'medical-waiver') {
      this.modifiers.healing *= 1.25;
      this.heal(32, true);
    }
    if (boon.id === 'late-permit') {
      this.mapState.interlaceAtSeconds += 24;
      this.events.onTimer?.(Math.max(0, this.mapState.interlaceAtSeconds - this.elapsed));
    }
    if (boon.id === 'accelerated-clearance') this.modifiers.cooldownRate *= 1.3;
    this.events.onBoon?.(boon);
  }

  damagePlayer(amount) {
    if (this.player.invulnerable > 0 || this.finished) return;
    this.player.invulnerable = 0.48;
    const multiplier = this.player.damageResistance > 0 ? 0.58 : 1;
    this.health -= amount * multiplier;
    this.events.onHealth?.(this.health, this.activeOperative.maxHealth);
    this.events.onTeam?.(this.teamSnapshot());
    this.events.onFeed?.(`Field damage: −${Math.round(amount * multiplier)}.`, 'danger');
    if (this.health > 0) return;

    const fallen = this.activeOperative;
    const replacement = this.healthByOperative.findIndex((health, index) => health > 0 && index !== this.activeOperativeIndex);
    if (replacement >= 0) {
      this.activeOperativeIndex = replacement;
      this.renderer.recolorPlayer(this.activeOperative.color);
      this.player.invulnerable = 2;
      this.events.onOperative?.(this.activeOperative, this.health, this.activeOperative.maxHealth);
      this.events.onTeam?.(this.teamSnapshot());
      this.reportCooldowns();
      this.events.onFeed?.(`${fallen.name} is down. ${this.activeOperative.name} assumes control.`, 'danger');
      return;
    }
    this.finish(false);
  }

  triggerInterlace() {
    this.interlaceTriggered = true;
    this.renderer.showInterlace();
    this.events.onInterlace?.();
    this.events.onFeed?.('SAFE WINDOW CLOSED. ANOTHER SERVER IS ENTERING THIS ONE.', 'danger');
    const candidates = this.mapState.interlace.rooms.filter((room) => room.difficulty > 0.48).slice(0, 8);
    for (const [index, room] of candidates.entries()) {
      this.combat.spawnEnemy({
        x: room.x + ((room.sourceRoomId % 3) - 1) * 1.2,
        z: room.z + (room.sourceRoomId % 2 ? 1.1 : -1.1),
        roomId: `interlace-${room.id}`,
        elite: room.type === 'elite' || room.type === 'vault',
        interlaced: true,
        difficulty: room.difficulty,
        archetype: index % 3 === 2 ? 'gunner' : 'pursuer',
      });
    }
    this.reportProgress();
  }

  reportCooldowns() {
    this.events.onCooldowns?.({
      ability: this.abilityCooldowns[this.activeOperativeIndex],
      abilityMax: this.activeOperative.ability.cooldown,
      abilityName: this.activeOperative.ability.name,
      dodge: this.dodgeCooldowns[this.activeOperativeIndex],
      dodgeMax: this.activeOperative.dodge.cooldown,
    });
  }

  reportProgress() {
    const snapshot = this.mission.snapshot({
      interlace: this.interlaceTriggered,
      auditor: this.director?.auditorDefeated ?? false,
    });
    const status = contractProgress(this.contract, snapshot);
    this.events.onObjective?.(this.contract, status, snapshot);
    this.events.onMap?.({
      currentRoomId: this.mission.currentRoom?.id ?? this.mapState.entranceRoomId,
      clearedRoomIds: this.mission.clearedRoomIds,
      interlaced: this.interlaceTriggered,
    });
    return status;
  }

  finish(success) {
    if (this.finished) return;
    this.finished = true;
    const contractStatus = this.reportProgress();
    const value = this.recoveredValue;
    const instituteCut = Math.ceil(value * 0.15);
    const baseFieldPayout = Math.max(0, value - instituteCut);
    const contractBonus = success && contractStatus.complete ? this.contract.bonus : 0;
    const multiplier = contractStatus.complete ? this.contract.riskMultiplier : 0.72;
    const payout = success ? Math.round(baseFieldPayout * multiplier + contractBonus) : Math.round(baseFieldPayout * 0.18);
    const result = {
      success,
      seed: this.mapState.seedLabel,
      elapsedSeconds: Math.round(this.elapsed),
      recovered: this.mission.recovered,
      value,
      instituteCut,
      baseFieldPayout,
      contractBonus,
      payout,
      contract: this.contract,
      contractComplete: contractStatus.complete,
      roomsCleared: this.mission.clearedRoomCount,
      auditorDefeated: this.director.auditorDefeated,
      interlaceTriggered: this.interlaceTriggered,
      timestamp: new Date().toISOString(),
    };
    result.profile = recordRun(result);
    try {
      const history = JSON.parse(localStorage.getItem('abrir.runHistory') ?? '[]');
      history.unshift(result);
      localStorage.setItem('abrir.runHistory', JSON.stringify(history.slice(0, 20)));
    } catch {
      // Storage is a temporary adapter; blocked storage must not break extraction.
    }
    this.events.onFinish?.(result);
  }
}
