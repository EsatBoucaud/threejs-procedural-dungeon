import { CHARACTERS } from '../content/characters.js';
import { COMBAT_KITS } from '../content/combat-kits.js';

export const MULTIPLAYER_MODES = {
  TWO_PLAYER: 'two-player',
  FOUR_PLAYER: 'four-player',
};

const DEFAULT_CHARACTER_ORDER = ['zelia-amato', 'socrates', 'lia', 'chilindo'];
const DEFAULT_KIT_ORDER = ['breacher', 'field-medic', 'route-controller', 'night-skirmisher'];

function playerIdsForMode(mode) {
  return mode === MULTIPLAYER_MODES.FOUR_PLAYER
    ? ['player-1', 'player-2', 'player-3', 'player-4']
    : ['player-1', 'player-2'];
}

function assignmentsForMode(mode) {
  if (mode === MULTIPLAYER_MODES.FOUR_PLAYER) {
    return DEFAULT_CHARACTER_ORDER.map((characterId, index) => ({
      assignmentId: `slot-${index + 1}`,
      playerId: `player-${index + 1}`,
      characterId,
      kitId: DEFAULT_KIT_ORDER[index],
    }));
  }
  return DEFAULT_CHARACTER_ORDER.map((characterId, index) => ({
    assignmentId: `slot-${index + 1}`,
    playerId: index < 2 ? 'player-1' : 'player-2',
    characterId,
    kitId: DEFAULT_KIT_ORDER[index],
  }));
}

export function createDefaultDeployment(mode = MULTIPLAYER_MODES.TWO_PLAYER) {
  const safeMode = mode === MULTIPLAYER_MODES.FOUR_PLAYER
    ? MULTIPLAYER_MODES.FOUR_PLAYER
    : MULTIPLAYER_MODES.TWO_PLAYER;
  return {
    schemaVersion: 1,
    mode: safeMode,
    playerCount: safeMode === MULTIPLAYER_MODES.FOUR_PLAYER ? 4 : 2,
    localPlayerId: 'player-1',
    players: playerIdsForMode(safeMode).map((id, index) => ({
      id,
      label: `PLAYER ${index + 1}`,
    })),
    assignments: assignmentsForMode(safeMode),
    compositionRule: 'player-choice',
  };
}

export function normalizeDeployment(input) {
  const mode = input?.mode === MULTIPLAYER_MODES.FOUR_PLAYER
    ? MULTIPLAYER_MODES.FOUR_PLAYER
    : MULTIPLAYER_MODES.TWO_PLAYER;
  const fallback = createDefaultDeployment(mode);
  const candidate = {
    ...fallback,
    ...structuredClone(input ?? {}),
    mode,
    playerCount: mode === MULTIPLAYER_MODES.FOUR_PLAYER ? 4 : 2,
  };
  const validPlayerIds = new Set(playerIdsForMode(mode));
  if (!validPlayerIds.has(candidate.localPlayerId)) candidate.localPlayerId = 'player-1';
  candidate.players = fallback.players;
  candidate.assignments = Array.isArray(candidate.assignments)
    ? candidate.assignments.map((assignment, index) => ({
      assignmentId: assignment.assignmentId ?? `slot-${index + 1}`,
      playerId: validPlayerIds.has(assignment.playerId)
        ? assignment.playerId
        : fallback.assignments[index]?.playerId,
      characterId: assignment.characterId ?? fallback.assignments[index]?.characterId,
      kitId: assignment.kitId ?? fallback.assignments[index]?.kitId,
    }))
    : fallback.assignments;
  return candidate;
}

export function validateDeployment(input) {
  const deployment = normalizeDeployment(input);
  const errors = [];
  const characterIds = new Set(CHARACTERS.map((character) => character.id));
  const kitIds = new Set(COMBAT_KITS.map((kit) => kit.id));
  const expectedPerPlayer = deployment.mode === MULTIPLAYER_MODES.FOUR_PLAYER ? 1 : 2;

  if (deployment.assignments.length !== 4) errors.push('Exactly four character assignments are required.');

  const selectedCharacters = deployment.assignments.map((assignment) => assignment.characterId);
  if (new Set(selectedCharacters).size !== selectedCharacters.length) {
    errors.push('Every field character must be assigned exactly once.');
  }

  for (const assignment of deployment.assignments) {
    if (!characterIds.has(assignment.characterId)) errors.push(`Unknown character: ${assignment.characterId}.`);
    if (!kitIds.has(assignment.kitId)) errors.push(`Unknown combat kit: ${assignment.kitId}.`);
  }

  for (const player of deployment.players) {
    const count = deployment.assignments.filter((assignment) => assignment.playerId === player.id).length;
    if (count !== expectedPerPlayer) {
      errors.push(`${player.label} must control ${expectedPerPlayer} character${expectedPerPlayer === 1 ? '' : 's'}.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    deployment,
  };
}

export function assignmentsForPlayer(input, playerId) {
  const deployment = normalizeDeployment(input);
  return deployment.assignments.filter((assignment) => assignment.playerId === playerId);
}

export function updateAssignment(input, assignmentId, patch) {
  const deployment = normalizeDeployment(input);
  deployment.assignments = deployment.assignments.map((assignment) => (
    assignment.assignmentId === assignmentId ? { ...assignment, ...patch } : assignment
  ));
  return deployment;
}

export function changeDeploymentMode(input, mode) {
  const next = createDefaultDeployment(mode);
  const current = normalizeDeployment(input);
  next.localPlayerId = next.players.some((player) => player.id === current.localPlayerId)
    ? current.localPlayerId
    : 'player-1';
  return next;
}

export function compositionSummary(input) {
  const deployment = normalizeDeployment(input);
  const counts = new Map(COMBAT_KITS.map((kit) => [kit.family, 0]));
  for (const assignment of deployment.assignments) {
    const kit = COMBAT_KITS.find((entry) => entry.id === assignment.kitId);
    if (kit) counts.set(kit.family, (counts.get(kit.family) ?? 0) + 1);
  }
  return Object.fromEntries(counts);
}
