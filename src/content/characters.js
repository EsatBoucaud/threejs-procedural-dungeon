import { combatKitById } from './combat-kits.js';

export const CHARACTERS = [
  {
    id: 'zelia-amato',
    name: 'Zélia Amato',
    mark: 'Z',
    color: 0xe0b660,
    durability: 1.08,
    mobility: 0.96,
    fieldNote: 'Direct, physically committed, and unwilling to leave a teammate behind without an argument.',
    defaultKitId: 'breacher',
  },
  {
    id: 'lia',
    name: 'Lia',
    mark: 'L',
    color: 0x7ea8ff,
    durability: 0.94,
    mobility: 1.06,
    fieldNote: 'Reads routes quickly and treats distance as something that can be negotiated.',
    defaultKitId: 'route-controller',
  },
  {
    id: 'chilindo',
    name: 'Chilindo',
    mark: 'C',
    color: 0xd68bd2,
    durability: 1,
    mobility: 1.04,
    fieldNote: 'Moves well under unstable conditions and remains difficult to predict after the safe window.',
    defaultKitId: 'night-skirmisher',
  },
  {
    id: 'socrates',
    name: 'Sócrates',
    mark: 'S',
    color: 0x58d2c7,
    durability: 0.98,
    mobility: 1,
    fieldNote: 'Keeps the team functioning while paying close attention to what the Institute leaves out.',
    defaultKitId: 'field-medic',
  },
];

// This array represents the characters controlled by the current local player.
// In two-player mode it contains two resolved character/kit combinations.
// In four-player mode it contains one. The network layer will provide the
// other players' live entities later without changing this ownership contract.
export const OPERATIVES = [];

export function characterById(id) {
  return CHARACTERS.find((character) => character.id === id) ?? CHARACTERS[0];
}

export function resolveCharacterLoadout(assignment) {
  const character = characterById(assignment.characterId);
  const kit = combatKitById(assignment.kitId ?? character.defaultKitId);
  return {
    // CombatSystem currently uses this field to select behavior. Character
    // identity remains separate so any character can equip any combat kit.
    id: kit.behaviorId,
    characterId: character.id,
    kitId: kit.id,
    playerId: assignment.playerId,
    assignmentId: assignment.assignmentId,
    name: character.name,
    mark: character.mark,
    color: character.color,
    role: kit.role,
    kitName: kit.name,
    combatFamily: kit.family,
    maxHealth: Math.round(kit.maxHealth * character.durability),
    moveSpeed: Number((kit.moveSpeed * character.mobility).toFixed(2)),
    attack: structuredClone(kit.attack),
    ability: structuredClone(kit.ability),
    dodge: structuredClone(kit.dodge),
    fieldTrait: kit.fieldTrait,
    fieldNote: character.fieldNote,
  };
}

export function applyDeployment(deployment) {
  const localPlayerId = deployment?.localPlayerId ?? 'player-1';
  const assignments = Array.isArray(deployment?.assignments)
    ? deployment.assignments.filter((assignment) => assignment.playerId === localPlayerId)
    : [];
  const fallbackAssignments = [
    { assignmentId: 'slot-1', playerId: 'player-1', characterId: 'zelia-amato', kitId: 'breacher' },
    { assignmentId: 'slot-2', playerId: 'player-1', characterId: 'socrates', kitId: 'field-medic' },
  ];
  const resolved = (assignments.length > 0 ? assignments : fallbackAssignments)
    .map(resolveCharacterLoadout);
  OPERATIVES.splice(0, OPERATIVES.length, ...resolved);
  return OPERATIVES;
}

export function operativeById(id) {
  return OPERATIVES.find((operative) => operative.characterId === id || operative.id === id) ?? OPERATIVES[0];
}
