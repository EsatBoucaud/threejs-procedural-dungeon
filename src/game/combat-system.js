import * as THREE from 'three';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distanceToSegment(point, start, end) {
  const segment = end.clone().sub(start);
  const lengthSq = segment.lengthSq();
  if (lengthSq <= 0.0001) return point.distanceTo(start);
  const t = clamp(point.clone().sub(start).dot(segment) / lengthSq, 0, 1);
  return point.distanceTo(start.clone().addScaledVector(segment, t));
}

export class CombatSystem {
  constructor(renderer, callbacks = {}) {
    this.renderer = renderer;
    this.callbacks = callbacks;
    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
  }

  spawnEnemy({ x, z, roomId, elite, interlaced, difficulty, archetype = 'pursuer' }) {
    const position = new THREE.Vector3(x, 0, z);
    const isAuditor = archetype === 'auditor';
    const isGunner = archetype === 'gunner';
    const baseHealth = isAuditor ? 720 : isGunner ? 48 : elite ? 112 : 58;
    const maxHealth = baseHealth * (1 + difficulty * (isAuditor ? 0.18 : 0.55)) * (interlaced ? 1.14 : 1);
    const mesh = this.renderer.createEnemy(position, elite, interlaced, archetype);
    const enemy = {
      mesh,
      position,
      roomId,
      elite,
      interlaced,
      archetype,
      maxHealth,
      health: maxHealth,
      speed: isAuditor ? 2.7 : isGunner ? 2.5 : (elite ? 4.1 : 3.5) * (interlaced ? 1.12 : 1),
      damage: (isAuditor ? 28 : isGunner ? 13 : elite ? 19 : 11) * (1 + difficulty * 0.35),
      attackCooldown: Math.random() * 0.4,
      rangedCooldown: isAuditor ? 1.3 : 1.8,
      stagger: 0,
      weakened: 0,
      slowed: 0,
      dead: false,
    };
    this.enemies.push(enemy);
    if (isAuditor) this.callbacks.onBossHealth?.(enemy.health, enemy.maxHealth);
    return enemy;
  }

  hasLivingEnemy(roomId, includeInterlaced = false) {
    return this.enemies.some((enemy) => (
      !enemy.dead && enemy.roomId === roomId && (includeInterlaced || !enemy.interlaced)
    ));
  }

  attack(player, operative, target) {
    const attack = operative.attack;
    if (attack.kind === 'projectile') {
      const direction = target.clone().sub(player.position).setY(0);
      if (direction.lengthSq() < 0.01) direction.set(0, 0, -1);
      direction.normalize();
      const mesh = this.renderer.createProjectile(player.position, operative.color);
      this.projectiles.push({
        mesh,
        position: player.position.clone(),
        velocity: direction.multiplyScalar(attack.projectileSpeed),
        damage: attack.damage,
        remaining: attack.range / attack.projectileSpeed,
        hitsRemaining: 1 + (attack.pierce ?? 0),
        hitEnemies: new Set(),
        operative,
      });
      return;
    }

    this.renderer.createPulse(player.position, operative.color, attack.radius);
    let hit = false;
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.position.distanceTo(player.position) > attack.radius) continue;
      hit = true;
      const push = enemy.position.clone().sub(player.position).setY(0);
      if (push.lengthSq() > 0.01) push.normalize().multiplyScalar(attack.knockback * 0.12);
      enemy.position.add(push);
      enemy.stagger = Math.max(enemy.stagger, 0.32);
      this.damageEnemy(enemy, attack.damage, operative, player);
    }
    if (!hit) this.callbacks.onFeed?.(`${operative.name} breaks the air. Nothing breaks back.`, '');
  }

  useAbility(player, operative, target, isWalkable) {
    if (operative.id === 'socrates') {
      this.renderer.createPulse(player.position, operative.color, 7.2);
      this.callbacks.onHeal?.(24, true);
      for (const enemy of this.enemies) {
        if (enemy.dead || enemy.position.distanceTo(player.position) > 7.2) continue;
        enemy.weakened = 6;
        enemy.stagger = Math.max(enemy.stagger, 0.5);
        this.damageEnemy(enemy, 20, operative, player);
      }
      this.callbacks.onFeed?.('Sócrates establishes a field clinic in disputed space.', 'good');
      return { position: player.position.clone() };
    }

    if (operative.id === 'zelia-amato') {
      this.renderer.createPulse(player.position, operative.color, 5.2);
      for (const enemy of this.enemies) {
        if (enemy.dead || enemy.position.distanceTo(player.position) > 5.2) continue;
        const push = enemy.position.clone().sub(player.position).setY(0);
        if (push.lengthSq() > 0.01) push.normalize().multiplyScalar(2.8);
        enemy.position.add(push);
        enemy.stagger = Math.max(enemy.stagger, 1.15);
        this.damageEnemy(enemy, 82, operative, player);
      }
      this.callbacks.onFeed?.('Zélia converts the floor into an argument.', 'good');
      return { position: player.position.clone() };
    }

    const direction = target.clone().sub(player.position).setY(0);
    if (direction.lengthSq() < 0.01) direction.set(0, 0, -1);
    direction.normalize();
    const maxDistance = operative.id === 'lia' ? 10.5 : 8.5;
    let destination = player.position.clone().addScaledVector(direction, maxDistance);
    while (!isWalkable(destination) && destination.distanceTo(player.position) > 1) {
      destination.addScaledVector(direction, -0.7);
    }
    this.renderer.createPulse(player.position, operative.color, 2.5);
    this.renderer.createPulse(destination, operative.color, operative.id === 'lia' ? 3.4 : 4.2);

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const routeDistance = distanceToSegment(enemy.position, player.position, destination);
      const hit = operative.id === 'lia' ? routeDistance < 1.4 : enemy.position.distanceTo(destination) < 4.2;
      if (!hit) continue;
      enemy.stagger = Math.max(enemy.stagger, operative.id === 'lia' ? 0.6 : 0.9);
      this.damageEnemy(enemy, operative.id === 'lia' ? 58 : 64, operative, player);
    }
    if (operative.id === 'kindred') player.invulnerable = Math.max(player.invulnerable, 1.1);
    this.callbacks.onFeed?.(
      operative.id === 'lia' ? 'Lia folds the route and refuses the distance.' : 'Kindred passes through the night between two coordinates.',
      'good',
    );
    return { position: destination };
  }

  update(delta, player, operative, isWalkable) {
    this.updateProjectiles(delta, player);
    this.updateEnemyProjectiles(delta, player);
    this.updateEnemies(delta, player, isWalkable);
  }

  updateProjectiles(delta, player) {
    for (const projectile of this.projectiles) {
      if (projectile.remaining <= 0) continue;
      projectile.remaining -= delta;
      projectile.position.addScaledVector(projectile.velocity, delta);
      projectile.mesh.position.x = projectile.position.x;
      projectile.mesh.position.z = projectile.position.z;
      for (const enemy of this.enemies) {
        if (
          enemy.dead
          || projectile.hitEnemies.has(enemy)
          || enemy.position.distanceTo(projectile.position) > (enemy.archetype === 'auditor' ? 1.9 : enemy.elite ? 1.4 : 1)
        ) continue;
        projectile.hitEnemies.add(enemy);
        projectile.hitsRemaining -= 1;
        player.hitCount += 1;
        if (projectile.operative.id === 'socrates' && player.hitCount % 3 === 0) this.callbacks.onHeal?.(3, false);
        const pierceBonus = projectile.operative.id === 'lia' && projectile.hitEnemies.size > 1 ? 1.35 : 1;
        this.damageEnemy(enemy, projectile.damage * pierceBonus, projectile.operative, player);
        if (projectile.hitsRemaining <= 0) {
          projectile.remaining = 0;
          break;
        }
      }
    }
    for (const projectile of this.projectiles.filter((entry) => entry.remaining <= 0)) {
      this.renderer.removeObject(projectile.mesh);
    }
    this.projectiles = this.projectiles.filter((entry) => entry.remaining > 0);
  }

  updateEnemyProjectiles(delta, player) {
    for (const projectile of this.enemyProjectiles) {
      projectile.remaining -= delta;
      projectile.position.addScaledVector(projectile.velocity, delta);
      projectile.mesh.position.x = projectile.position.x;
      projectile.mesh.position.z = projectile.position.z;
      if (projectile.position.distanceTo(player.position) < projectile.radius) {
        projectile.remaining = 0;
        this.callbacks.onPlayerDamage?.(projectile.damage);
      }
    }
    for (const projectile of this.enemyProjectiles.filter((entry) => entry.remaining <= 0)) {
      this.renderer.removeObject(projectile.mesh);
    }
    this.enemyProjectiles = this.enemyProjectiles.filter((entry) => entry.remaining > 0);
  }

  fireEnemyProjectile(enemy, player, large = false) {
    const direction = player.position.clone().sub(enemy.position).setY(0);
    if (direction.lengthSq() < 0.01) return;
    direction.normalize();
    const color = enemy.archetype === 'auditor' ? 0xe8c56e : enemy.interlaced ? 0xb777d5 : 0xe46b58;
    const mesh = this.renderer.createEnemyProjectile(enemy.position, color, large);
    this.enemyProjectiles.push({
      mesh,
      position: enemy.position.clone(),
      velocity: direction.multiplyScalar(enemy.archetype === 'auditor' ? 12 : 10),
      damage: enemy.damage * (enemy.weakened > 0 ? 0.58 : 1),
      remaining: 2.4,
      radius: large ? 1.05 : 0.72,
    });
  }

  updateEnemies(delta, player, isWalkable) {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta);
      enemy.rangedCooldown = Math.max(0, enemy.rangedCooldown - delta);
      enemy.stagger = Math.max(0, enemy.stagger - delta);
      enemy.weakened = Math.max(0, enemy.weakened - delta);
      enemy.slowed = Math.max(0, enemy.slowed - delta);
      enemy.mesh.rotation.y += delta * (enemy.archetype === 'auditor' ? 0.45 : enemy.elite ? 0.8 : 1.2);
      if (enemy.archetype !== 'auditor') enemy.mesh.rotation.x += delta * (enemy.interlaced ? 1.1 : 0.35);
      const distance = enemy.position.distanceTo(player.position);
      const isRanged = enemy.archetype === 'gunner' || enemy.archetype === 'auditor';
      const desiredMin = enemy.archetype === 'auditor' ? 6.5 : 7.5;
      const desiredMax = enemy.archetype === 'auditor' ? 13 : 12;

      if (enemy.stagger <= 0) {
        const direction = player.position.clone().sub(enemy.position).setY(0);
        if (direction.lengthSq() > 0.01) direction.normalize();
        let movement = 0;
        if (!isRanged && distance < 16) movement = 1;
        if (isRanged && distance > desiredMax) movement = 1;
        if (isRanged && distance < desiredMin) movement = -0.7;
        if (movement !== 0) {
          const slow = enemy.slowed > 0 ? 0.55 : 1;
          const next = enemy.position.clone().addScaledVector(direction, enemy.speed * slow * movement * delta);
          if (isWalkable(next)) enemy.position.copy(next);
        }
      }

      if (isRanged && distance < 16 && enemy.rangedCooldown <= 0) {
        enemy.rangedCooldown = enemy.archetype === 'auditor' ? 1.05 : 1.75;
        this.fireEnemyProjectile(enemy, player, enemy.archetype === 'auditor');
      }
      if (distance < (enemy.archetype === 'auditor' ? 2.6 : enemy.elite ? 1.9 : 1.35) && enemy.attackCooldown <= 0) {
        enemy.attackCooldown = enemy.archetype === 'auditor' ? 0.9 : enemy.elite ? 1.05 : 1.35;
        this.callbacks.onPlayerDamage?.(enemy.damage * (enemy.weakened > 0 ? 0.58 : 1));
      }
      enemy.mesh.position.x = enemy.position.x;
      enemy.mesh.position.z = enemy.position.z;
    }
  }

  damageEnemy(enemy, amount, operative, player) {
    enemy.health -= amount;
    const core = enemy.mesh.userData.core ?? enemy.mesh;
    const ratio = clamp(enemy.health / enemy.maxHealth, 0.2, 1);
    core.scale.setScalar(enemy.archetype === 'auditor' ? 0.82 + ratio * 0.18 : clamp(ratio, 0.45, 1));
    if (enemy.archetype === 'auditor') this.callbacks.onBossHealth?.(Math.max(0, enemy.health), enemy.maxHealth);
    if (enemy.health > 0) return;
    enemy.dead = true;
    this.renderer.removeObject(enemy.mesh);
    if (operative.id === 'zelia-amato') player.damageResistance = 2.8;
    if (operative.id === 'kindred') this.callbacks.onHeal?.(7, false);
    this.callbacks.onFeed?.(
      enemy.archetype === 'auditor' ? 'Audit process terminated.' : enemy.elite ? 'Elite process terminated.' : 'Hostile process terminated.',
      'good',
    );
    this.callbacks.onEnemyKilled?.(enemy);
  }
}
