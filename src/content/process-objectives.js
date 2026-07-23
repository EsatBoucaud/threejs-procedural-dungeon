export const PROCESS_OBJECTIVES = {
  auditor: {
    processId: 'auditor',
    archetype: 'ledger-stamp',
    singular: 'LEDGER STAMP',
    plural: 'LEDGER STAMPS',
    count: 3,
    health: 130,
    color: 0xe3c36f,
    instruction: 'Destroy the ledger stamps to remove The Auditor’s damage reduction and stop their threat surcharge.',
  },
  'seizure-chief': {
    processId: 'seizure-chief',
    archetype: 'claim-lock',
    singular: 'CLAIM LOCK',
    plural: 'CLAIM LOCKS',
    count: 1,
    health: 190,
    color: 0xd9614d,
    instruction: 'Break the claim lock to restore confiscated objects and prevent another live seizure.',
  },
  'route-runner': {
    processId: 'route-runner',
    archetype: 'route-anchor',
    singular: 'ROUTE ANCHOR',
    plural: 'ROUTE ANCHORS',
    count: 3,
    health: 105,
    color: 0x72b7e8,
    instruction: 'Destroy route anchors to remove teleport destinations and slow The Route Runner’s network.',
  },
  warden: {
    processId: 'warden',
    archetype: 'lock-pylon',
    singular: 'LOCK PYLON',
    plural: 'LOCK PYLONS',
    count: 3,
    health: 150,
    color: 0x9d79d8,
    instruction: 'Destroy every lock pylon and The Warden to reopen extraction.',
  },
};

const OBJECTIVES_BY_ARCHETYPE = Object.fromEntries(
  Object.values(PROCESS_OBJECTIVES).map((objective) => [objective.archetype, objective]),
);

export function objectivesForProcess(processId) {
  return PROCESS_OBJECTIVES[processId] ?? PROCESS_OBJECTIVES.auditor;
}

export function objectiveByArchetype(archetype) {
  return OBJECTIVES_BY_ARCHETYPE[archetype] ?? null;
}

export function isProcessObjective(archetype) {
  return Boolean(OBJECTIVES_BY_ARCHETYPE[archetype]);
}
