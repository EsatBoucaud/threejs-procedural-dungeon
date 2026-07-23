import * as THREE from 'three';
import { OPERATIVES } from '../content/characters.js';
import { CombatSystem } from './combat-system.js';
import { createWalkability } from './navigation.js';
import { MissionSystem } from './mission-system.js';

const TMP = new THREE.Vector3();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class RunController {
  constructor(renderer, mapState, events = {}) {
    this.renderer = renderer;
    this.mapState = mapState;
    this.events = events;
    this.activeOperativeIndex = 0;
    this.healthByOperative = OPERATIVES.map((operative) => operative.maxHealth);
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
      onHeal: (amount) => this.heal(amount),
      onPlayerDamage: (amount) => this.damagePlayer(amount),
      onEnemyKilled: (enemy) => this.mission?.checkRoomClear(enemy.roomId),
    });
    this.mission = new MissionSystem(renderer, mapState, events, this.combat);

    const entrance = this.mission.rooms.get(mapState.entranceRoomId);
    this.player.position.set(entrance.x, 0, entrance.z + Math.min(2.5, entrance.depth * 0.2));
    this.renderer.createPlayer(this.activeOperative.color, this.player.position);
    this.spawnBaseEnemies();
    this.mission.updateRoom(this.player.position);
    this.events.onOperative?.(this.activeOperative, this.health, this.activeOperative.maxHealth);
    this.events.onLoot?.(0);
    this.events.onTimer?.(mapState.interlaceAtSeconds);
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
        });
      }
    }
  }

  switchOperative() {
    if (this.finished) return;
    this.activeOperativeIndex = (this.activeOperativeIndex + 1) % OPERATIVES.length;
    this.renderer.recolorPlayer(this.activeOperative.color);
    this.player.attackCooldown = Math.min(this.player.attackCooldown, 0.12);
    this.events.onOperative?.(this.activeOperative, this.health, this.activeOperative.maxHealth);
    this.events.onFeed?.(`${this.activeOperative.name} takes the field.`, 'good');
  }

  attack(target) {
    if (this.finished || this.player.attackCooldown > 0) return;
    this.player.attackCooldown = this.activeOperative.attack.cooldown;
    this.combat.attack(this.player, this.activeOperative, target);
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

    const remaining = Math.max(0, this.mapState.interlaceAtSeconds - this.elapsed);
    this.events.onTimer?.(remaining);
    if (!this.interlaceTriggered && remaining <= 0) this.triggerInterlace();

    this.updatePlayer(delta, movement);
    this.combat.update(delta, this.player, this.activeOperative, this.isWalkable);
    this.mission.update(delta, this.player.position);

    this.renderer.playerMesh.position.set(this.player.position.x, 0, this.player.position.z);
    this.renderer.update(delta, this.player.position, aimPosition);
  }

  updatePlayer(delta, movement) {
    TMP.set(movement.x, 0, movement.z);
    if (TMP.lengthSq() > 1) TMP.normalize();
    const desired = TMP.multiplyScalar(this.activeOperative.moveSpeed);
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

  heal(amount) {
    this.health += amount;
    this.events.onHealth?.(this.health, this.activeOperative.maxHealth);
  }

  damagePlayer(amount) {
    if (this.player.invulnerable > 0) return;
    this.player.invulnerable = 0.48;
    const multiplier = this.player.damageResistance > 0 ? 0.58 : 1;
    this.health -= amount * multiplier;
    this.events.onHealth?.(this.health, this.activeOperative.maxHealth);
    this.events.onFeed?.(`Field damage: −${Math.round(amount * multiplier)}.`, 'danger');
    if (this.health > 0) return;

    const fallen = this.activeOperative;
    const otherIndex = (this.activeOperativeIndex + 1) % OPERATIVES.length;
    if (this.healthByOperative[otherIndex] > 0) {
      this.activeOperativeIndex = otherIndex;
      this.renderer.recolorPlayer(this.activeOperative.color);
      this.player.invulnerable = 2;
      this.events.onOperative?.(this.activeOperative, this.health, this.activeOperative.maxHealth);
      this.events.onFeed?.(`${fallen.name} is down. Partner assumes control.`, 'danger');
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
    for (const room of candidates) {
      this.combat.spawnEnemy({
        x: room.x + ((room.sourceRoomId % 3) - 1) * 1.2,
        z: room.z + (room.sourceRoomId % 2 ? 1.1 : -1.1),
        roomId: `interlace-${room.id}`,
        elite: room.type === 'elite' || room.type === 'vault',
        interlaced: true,
        difficulty: room.difficulty,
      });
    }
  }

  finish(success) {
    if (this.finished) return;
    this.finished = true;
    const value = this.recoveredValue;
    const instituteCut = Math.ceil(value * 0.15);
    const result = {
      success,
      seed: this.mapState.seedLabel,
      elapsedSeconds: Math.round(this.elapsed),
      recovered: this.mission.recovered,
      value,
      instituteCut,
      payout: Math.max(0, value - instituteCut),
      interlaceTriggered: this.interlaceTriggered,
      timestamp: new Date().toISOString(),
    };
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
