import * as THREE from 'three';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class CombatSystem {
  constructor(renderer, callbacks = {}) {
    this.renderer = renderer;
    this.callbacks = callbacks;
    this.enemies = [];
    this.projectiles = [];
  }

  spawnEnemy({ x, z, roomId, elite, interlaced, difficulty }) {
    const position = new THREE.Vector3(x, 0, z);
    const maxHealth = (elite ? 105 : 58) * (1 + difficulty * 0.55) * (interlaced ? 1.14 : 1);
    const mesh = this.renderer.createEnemy(position, elite, interlaced);
    this.enemies.push({
      mesh,
      position,
      roomId,
      elite,
      interlaced,
      maxHealth,
      health: maxHealth,
      speed: (elite ? 4.1 : 3.5) * (interlaced ? 1.12 : 1),
      damage: (elite ? 19 : 11) * (1 + difficulty * 0.35),
      attackCooldown: Math.random() * 0.4,
      stagger: 0,
      dead: false,
    });
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
      });
      return;
    }

    this.renderer.createPulse(player.position, operative.color, attack.radius);
    let hit = false;
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.position.distanceTo(player.position) > attack.radius) continue;
      hit = true;
      const push = enemy.position.clone().sub(player.position).setY(0).normalize().multiplyScalar(attack.knockback * 0.12);
      enemy.position.add(push);
      enemy.stagger = 0.32;
      this.damageEnemy(enemy, attack.damage, operative, player);
    }
    if (!hit) this.callbacks.onFeed?.('Zélia breaks the air. Nothing breaks back.', '');
  }

  update(delta, player, operative, isWalkable) {
    this.updateProjectiles(delta, player, operative);
    this.updateEnemies(delta, player, isWalkable);
  }

  updateProjectiles(delta, player, operative) {
    for (const projectile of this.projectiles) {
      if (projectile.remaining <= 0) continue;
      projectile.remaining -= delta;
      projectile.position.addScaledVector(projectile.velocity, delta);
      projectile.mesh.position.x = projectile.position.x;
      projectile.mesh.position.z = projectile.position.z;
      for (const enemy of this.enemies) {
        if (enemy.dead || enemy.position.distanceTo(projectile.position) > (enemy.elite ? 1.4 : 1)) continue;
        projectile.remaining = 0;
        player.hitCount += 1;
        if (player.hitCount % 3 === 0) this.callbacks.onHeal?.(3);
        this.damageEnemy(enemy, projectile.damage, operative, player);
        break;
      }
    }
    for (const projectile of this.projectiles.filter((entry) => entry.remaining <= 0)) {
      this.renderer.removeObject(projectile.mesh);
    }
    this.projectiles = this.projectiles.filter((entry) => entry.remaining > 0);
  }

  updateEnemies(delta, player, isWalkable) {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.attackCooldown = Math.max(0, enemy.attackCooldown - delta);
      enemy.stagger = Math.max(0, enemy.stagger - delta);
      enemy.mesh.rotation.x += delta * (enemy.interlaced ? 1.1 : 0.35);
      enemy.mesh.rotation.y += delta * (enemy.elite ? 0.8 : 1.2);
      const distance = enemy.position.distanceTo(player.position);
      if (distance < 16 && enemy.stagger <= 0) {
        const direction = player.position.clone().sub(enemy.position).setY(0);
        if (direction.lengthSq() > 0.01) direction.normalize();
        const next = enemy.position.clone().addScaledVector(direction, enemy.speed * delta);
        if (isWalkable(next)) enemy.position.copy(next);
      }
      if (distance < (enemy.elite ? 1.9 : 1.35) && enemy.attackCooldown <= 0) {
        enemy.attackCooldown = enemy.elite ? 1.05 : 1.35;
        this.callbacks.onPlayerDamage?.(enemy.damage);
      }
      enemy.mesh.position.x = enemy.position.x;
      enemy.mesh.position.z = enemy.position.z;
    }
  }

  damageEnemy(enemy, amount, operative, player) {
    enemy.health -= amount;
    enemy.mesh.scale.setScalar(clamp(enemy.health / enemy.maxHealth, 0.45, 1));
    if (enemy.health > 0) return;
    enemy.dead = true;
    this.renderer.removeObject(enemy.mesh);
    if (operative.id === 'zelia-amato') player.damageResistance = 2.8;
    this.callbacks.onFeed?.(enemy.elite ? 'Elite process terminated.' : 'Hostile process terminated.', 'good');
    this.callbacks.onEnemyKilled?.(enemy);
  }
}
