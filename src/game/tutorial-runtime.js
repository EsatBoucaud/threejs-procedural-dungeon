import { CombatSystem } from './combat-system.js';
import { RunController } from './run-controller.js';
import { createTutorialPlan, TutorialSystem } from './tutorial-system.js';

const previousUpdate = RunController.prototype.update;
const previousSpawnBaseEnemies = RunController.prototype.spawnBaseEnemies;
const previousAttack = RunController.prototype.attack;
const previousAbility = RunController.prototype.useAbility;
const previousDodge = RunController.prototype.dodge;
const previousSwap = RunController.prototype.switchOperative;
const previousDamageEnemy = CombatSystem.prototype.damageEnemy;

const tutorialByCombat = new WeakMap();
let activeRuntime = null;

function forcedTutorialSetting() {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('tutorial');
  if (value === '1') return true;
  if (value === '0') return false;
  return null;
}

function tutorialEnabled() {
  const forced = forcedTutorialSetting();
  if (forced !== null) return forced;
  if (typeof localStorage === 'undefined') return true;
  try {
    return localStorage.getItem('abrir.firstRunTutorialComplete') !== 'true';
  } catch {
    return true;
  }
}

function completeTutorialStorage() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem('abrir.firstRunTutorialComplete', 'true');
  } catch {
    // Tutorial completion should not break when storage is blocked.
  }
}

function dispatch(snapshot, deployment, actor, event = 'update') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('abrir:tutorial', {
    detail: {
      event,
      snapshot: structuredClone(snapshot),
      deployment: structuredClone(deployment ?? null),
      activeActor: structuredClone(actor ?? null),
    },
  }));
  window.dispatchEvent(new CustomEvent('abrir:tutorial-target', {
    detail: { roomId: snapshot.currentTargetRoomId, completed: snapshot.completed },
  }));
}

function pulseRoom(controller, roomId, color = 0xe2c77e, radius = 4.2) {
  const room = controller.mission.rooms.get(roomId);
  if (!room) return;
  const point = controller.player.position.clone().set(room.x, 0, room.z);
  controller.renderer.createPulse(point, color, radius);
}

function baseEnemyCount(room) {
  if (room.type === 'combat') return 2 + (Number(room.id) % 2 || 0);
  if (room.type === 'archive' || room.type === 'treasure') return 1;
  if (room.type === 'elite') return 3;
  if (room.type === 'vault') return 5;
  return 0;
}

export class FirstRunTutorialRuntime {
  constructor(controller) {
    this.controller = controller;
    this.plan = controller.tutorialPlan ?? createTutorialPlan(controller.mapState);
    this.controller.tutorialPlan = this.plan;
    this.controller.mapState.tutorialPlan = structuredClone(this.plan);
    this.system = new TutorialSystem(this.plan, controller.mapState.deployment);
    this.marker = null;
    this.markerPhase = 0;
    this.inInspectionRange = false;
    this.lastRoomId = null;
    this.lastSnapshotKey = '';
    this.destroyed = false;
    this.completionEmitted = false;
    this.coverWrapper = null;
    this.originalBlocked = null;
    tutorialByCombat.set(controller.combat, this);
    this.installCoverObservation();
    this.createInspectionMarker();
    this.system.start();
    this.controller.mapState.tutorialTargetRoomId = this.system.currentTargetRoomId();
    this.controller.events.onFeed?.(
      'AFONSO: Cross the threshold. The gold T on the map marks the first stable room.',
      'good',
    );
    pulseRoom(controller, this.plan.orientationRoomId, 0xe2c77e, 4.4);
    this.emit('started');
  }

  installCoverObservation() {
    const renderer = this.controller.renderer;
    this.originalBlocked = renderer.isPointBlocked.bind(renderer);
    this.coverWrapper = (point, padding = 0) => {
      const blocked = this.originalBlocked(point, padding);
      const enemyProjectileRadius = padding >= 0.1 && padding <= 0.32;
      if (blocked && enemyProjectileRadius && this.system.phase === 'combat') {
        this.recordAction('cover', { x: point.x, z: point.z });
      }
      return blocked;
    };
    renderer.isPointBlocked = this.coverWrapper;
  }

  createInspectionMarker() {
    const room = this.controller.mission.rooms.get(this.plan.orientationRoomId);
    if (!room) return;
    const point = this.controller.player.position.clone().set(
      room.x + Math.min(1.2, room.width * 0.08),
      0,
      room.z - Math.min(1.2, room.depth * 0.08),
    );
    this.marker = this.controller.renderer.createShrine(point, 0xe2c77e);
    this.marker.scale.setScalar(0.66);
    this.marker.position.copy(point);
  }

  removeInspectionMarker() {
    if (!this.marker) return;
    this.controller.renderer.removeObject(this.marker);
    this.marker = null;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.removeInspectionMarker();
    if (this.coverWrapper && this.controller.renderer.isPointBlocked === this.coverWrapper) {
      this.controller.renderer.isPointBlocked = this.originalBlocked;
    }
    tutorialByCombat.delete(this.controller.combat);
  }

  emit(event = 'update') {
    const snapshot = this.system.snapshot();
    const key = JSON.stringify({ phase: snapshot.phase, tasks: snapshot.tasks, target: snapshot.currentTargetRoomId });
    if (event === 'update' && key === this.lastSnapshotKey) return;
    this.lastSnapshotKey = key;
    this.controller.mapState.tutorialTargetRoomId = snapshot.currentTargetRoomId;
    dispatch(snapshot, this.controller.mapState.deployment, this.controller.activeActor, event);
  }

  handlePhaseChange(before, after) {
    if (before.phase === after.phase) return;
    if (after.phase === 'inspect') {
      this.controller.events.onFeed?.('Stable room reached. Approach the gold field record and press E to inspect it.', 'good');
    }
    if (after.phase === 'ownership') {
      this.controller.events.onFeed?.('Two-player ownership: press Q. The swap may only enter your assigned reserve character.', 'good');
    }
    if (after.phase === 'combat-route') {
      const copy = after.deploymentMode === 'four-player'
        ? 'Four-player ownership confirmed: your character is fixed; the other three assignments are teammates, not swap options.'
        : 'Owned pair confirmed. Follow the new gold T to the first combat room.';
      this.controller.events.onFeed?.(copy, 'good');
      pulseRoom(this.controller, this.plan.combatRoomId, 0xe2c77e, 4.6);
    }
    if (after.phase === 'combat') {
      this.controller.events.onFeed?.(
        'LIVE COMBAT LESSON: land an attack, dodge, use your kit ability, and let solid architecture block hostile fire.',
        'danger',
      );
      pulseRoom(this.controller, this.plan.combatRoomId, 0xd86b58, 5.2);
    }
    if (after.phase === 'complete') {
      completeTutorialStorage();
      this.controller.events.onFeed?.(
        after.tasks.cover
          ? 'FIELD ORIENTATION COMPLETE. The team crossed, inspected, read ownership, used its kit, and proved the cover was real.'
          : 'FIELD ORIENTATION COMPLETE. Generated cover blocks real projectiles; use it when gunners establish a lane.',
        'good',
      );
    }
  }

  update(delta) {
    if (this.destroyed) return;
    if (this.system.completed) {
      if (!this.completionEmitted) {
        this.completionEmitted = true;
        this.emit('completed');
      }
      return;
    }

    if (this.marker) {
      this.markerPhase += delta;
      this.marker.rotation.y += delta * 0.7;
      const core = this.marker.userData.core;
      if (core) core.position.y = 1.45 + Math.sin(this.markerPhase * 1.8) * 0.12;
      this.inInspectionRange = this.marker.position.distanceTo(this.controller.player.position) < 2.8;
    } else {
      this.inInspectionRange = false;
    }

    const roomId = this.controller.mission.currentRoom?.id ?? this.controller.mapState.entranceRoomId;
    if (roomId !== this.lastRoomId) {
      this.lastRoomId = roomId;
      const before = this.system.snapshot();
      const after = this.system.enterRoom(roomId, this.controller.elapsed);
      this.handlePhaseChange(before, after);
    }

    if (this.controller.mission.roomStates.get(this.plan.combatRoomId)?.cleared) {
      const before = this.system.snapshot();
      const result = this.system.clearRoom(this.plan.combatRoomId);
      if (result.success) {
        this.controller.events.onFeed?.('Tutorial combat room stabilized.', 'good');
        this.handlePhaseChange(before, result.snapshot);
      }
    }
    this.emit();
  }

  interact() {
    if (this.destroyed || this.system.phase !== 'inspect' || !this.inInspectionRange) return false;
    const before = this.system.snapshot();
    const result = this.system.inspectOrientation(this.controller.activeActor);
    if (!result.success) return false;
    this.removeInspectionMarker();
    const roomState = this.controller.mission.roomStates.get(this.plan.orientationRoomId);
    if (roomState) roomState.lootDropped = true;
    this.controller.mission.checkRoomClear(this.plan.orientationRoomId);
    this.controller.renderer.createPulse(this.controller.player.position, 0x69cfc3, 3.2);
    this.controller.events.onFeed?.('Field record inspected. Exits, map state, and player ownership are now confirmed.', 'good');
    this.handlePhaseChange(before, result.snapshot);
    this.emit('inspection-complete');
    return true;
  }

  recordAction(action, context = {}) {
    if (this.destroyed) return false;
    const before = this.system.snapshot();
    const result = this.system.recordAction(action, context);
    if (!result.success) return false;
    const copy = {
      swap: 'Owned-character swap confirmed.',
      attack: 'Attack registered against live field pressure.',
      dodge: 'Dodge confirmed. Invulnerability belongs to the timing window, not the animation alone.',
      ability: 'Kit ability confirmed. Character identity did not reserve the combat role.',
      cover: 'HOSTILE SHOT BLOCKED BY GENERATED COVER.',
    }[action];
    if (copy) this.controller.events.onFeed?.(copy, action === 'cover' ? 'good' : '');
    this.handlePhaseChange(before, result.snapshot);
    this.emit(`action-${action}`);
    return true;
  }

  snapshot() {
    return this.system.snapshot();
  }
}

export function ensureFirstRunTutorial(controller) {
  if (!tutorialEnabled()) return null;
  if (controller.firstRunTutorial) return controller.firstRunTutorial;
  if (activeRuntime && activeRuntime.controller !== controller) activeRuntime.destroy();
  const runtime = new FirstRunTutorialRuntime(controller);
  controller.firstRunTutorial = runtime;
  activeRuntime = runtime;
  return runtime;
}

export function attemptTutorialInteraction() {
  if (!activeRuntime || activeRuntime.controller.finished) return false;
  return activeRuntime.interact();
}

RunController.prototype.spawnBaseEnemies = function tutorialSpawnBaseEnemies() {
  if (!tutorialEnabled()) return previousSpawnBaseEnemies.call(this);
  const plan = createTutorialPlan(this.mapState);
  this.tutorialPlan = plan;
  this.mapState.tutorialPlan = structuredClone(plan);

  for (const room of this.mapState.rooms) {
    if (room.id === plan.orientationRoomId) continue;
    let count = baseEnemyCount(room);
    const tutorialCombat = room.id === plan.combatRoomId;
    if (tutorialCombat) count = Math.max(3, count);
    for (let index = 0; index < count; index += 1) {
      const angle = ((index + 1) / (count + 1)) * Math.PI * 2 + Number(room.id) * 0.73;
      const radius = Math.min(room.width, room.depth) * (0.18 + (index % 2) * 0.08);
      const archetype = tutorialCombat && index === count - 1
        ? 'gunner'
        : index === count - 1 && room.difficulty > 0.36
          ? 'gunner'
          : 'pursuer';
      const enemy = this.combat.spawnEnemy({
        x: room.x + Math.cos(angle) * radius,
        z: room.z + Math.sin(angle) * radius,
        roomId: room.id,
        elite: room.type === 'elite' || room.type === 'vault',
        interlaced: false,
        difficulty: room.difficulty,
        archetype,
      });
      if (tutorialCombat && archetype === 'gunner') enemy.tutorialCoverTarget = true;
    }
  }
};

RunController.prototype.update = function tutorialUpdate(delta, movement, aimPosition) {
  const runtime = ensureFirstRunTutorial(this);
  const result = previousUpdate.call(this, delta, movement, aimPosition);
  runtime?.update(delta);
  return result;
};

RunController.prototype.attack = function tutorialAttack(target) {
  if (this.finished || this.player.attackCooldown > 0) return false;
  previousAttack.call(this, target);
  ensureFirstRunTutorial(this)?.recordAction('attack', { characterId: this.activeActor.characterId });
  return true;
};

RunController.prototype.useAbility = function tutorialAbility(target) {
  if (this.finished || this.abilityCooldowns[this.activeOperativeIndex] > 0) return false;
  previousAbility.call(this, target);
  ensureFirstRunTutorial(this)?.recordAction('ability', { characterId: this.activeActor.characterId });
  return true;
};

RunController.prototype.dodge = function tutorialDodge(movement, aimPosition) {
  if (this.finished || this.dodgeCooldowns[this.activeOperativeIndex] > 0) return false;
  previousDodge.call(this, movement, aimPosition);
  ensureFirstRunTutorial(this)?.recordAction('dodge', { characterId: this.activeActor.characterId });
  return true;
};

RunController.prototype.switchOperative = function tutorialSwap() {
  const before = this.activeOperativeIndex;
  previousSwap.call(this);
  const changed = before !== this.activeOperativeIndex;
  if (changed) ensureFirstRunTutorial(this)?.recordAction('swap', { characterId: this.activeActor.characterId });
  return changed;
};

CombatSystem.prototype.damageEnemy = function tutorialDamageEnemy(enemy, amount, operative, player) {
  const runtime = tutorialByCombat.get(this);
  if (enemy?.tutorialCoverTarget && runtime && runtime.system.phase === 'combat' && !runtime.system.tasks.cover) {
    const enteredAt = runtime.system.combatEnteredAt ?? runtime.controller.elapsed;
    const protectionActive = runtime.controller.elapsed - enteredAt < 8;
    if (protectionActive && enemy.health - amount <= 0) amount = Math.max(0, enemy.health - 1);
  }
  return previousDamageEnemy.call(this, enemy, amount, operative, player);
};
