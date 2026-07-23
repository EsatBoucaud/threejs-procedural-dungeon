import * as THREE from 'three';

const HAZARD_TYPES = [
  { id: 'static', label: 'STATIC FIELD', color: 0xb86ad7, radius: 3.4, damage: 8, slow: 0.86 },
  { id: 'seep', label: 'MEMORY SEEP', color: 0x5fc6b3, radius: 3.8, damage: 4, slow: 0.58 },
  { id: 'fracture', label: 'GEOMETRY FRACTURE', color: 0xe58b55, radius: 2.8, damage: 13, slow: 0.78 },
];

export class HazardSystem {
  constructor(renderer, mapState, callbacks = {}) {
    this.renderer = renderer;
    this.callbacks = callbacks;
    this.hazards = [];
    this.contactCooldown = 0;
    const candidates = mapState.rooms
      .filter((room) => room.type !== 'entrance' && room.type !== 'shrine' && room.difficulty > 0.2)
      .sort((a, b) => a.id - b.id);
    const count = Math.min(6, Math.max(3, Math.floor(candidates.length / 4)));
    for (let index = 0; index < count; index += 1) {
      const room = candidates[(mapState.seed + index * 5) % candidates.length];
      const type = HAZARD_TYPES[(mapState.seed + room.id + index) % HAZARD_TYPES.length];
      const angle = ((room.dressingSeed % 360) / 180) * Math.PI;
      const position = new THREE.Vector3(
        room.x + Math.cos(angle) * Math.min(2.2, room.width * 0.18),
        0,
        room.z + Math.sin(angle) * Math.min(2.2, room.depth * 0.18),
      );
      const mesh = renderer.createHazard(position, type.color, type.radius);
      this.hazards.push({ ...type, position, mesh, phase: index * 1.7 });
    }
  }

  update(delta, playerPosition) {
    this.contactCooldown = Math.max(0, this.contactCooldown - delta);
    let speedMultiplier = 1;
    for (const hazard of this.hazards) {
      hazard.phase += delta;
      hazard.mesh.rotation.z += delta * (hazard.id === 'fracture' ? -0.7 : 0.35);
      const pulse = 0.86 + Math.sin(hazard.phase * 2.1) * 0.12;
      hazard.mesh.scale.setScalar(pulse);
      const distance = hazard.position.distanceTo(playerPosition);
      if (distance > hazard.radius) continue;
      speedMultiplier = Math.min(speedMultiplier, hazard.slow);
      if (this.contactCooldown <= 0) {
        this.contactCooldown = 0.75;
        this.callbacks.onDamage?.(hazard.damage);
        this.callbacks.onFeed?.(`${hazard.label}: the room is charging rent in blood.`, 'danger');
      }
    }
    return { speedMultiplier };
  }
}
