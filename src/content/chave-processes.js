export const CHAVE_PROCESSES = {
  auditor: {
    id: 'auditor',
    name: 'THE AUDITOR',
    role: 'ACCOUNTING INCURSION',
    description: 'Materializes inside the largest contradiction and converts distance, damage, and ownership into a single hostile ledger.',
    color: 0xe1c173,
  },
  'seizure-chief': {
    id: 'seizure-chief',
    name: 'THE SEIZURE CHIEF',
    role: 'OBJECT CONFISCATION',
    description: 'Removes the most valuable recovered object from the field manifest and holds it until defeated.',
    color: 0xd8614d,
  },
  'route-runner': {
    id: 'route-runner',
    name: 'THE ROUTE RUNNER',
    role: 'PASSAGE INTERFERENCE',
    description: 'Relocates through overlap coordinates, spikes map attention, and turns temporary bridges into firing lanes.',
    color: 0x72b7e8,
  },
  warden: {
    id: 'warden',
    name: 'THE WARDEN',
    role: 'EXTRACTION LOCKDOWN',
    description: 'Occupies the return passage and prevents extraction until its lock process is destroyed.',
    color: 0x9d79d8,
  },
};

const PROCESS_ORDER = ['auditor', 'seizure-chief', 'route-runner', 'warden'];

export function processById(id) {
  return CHAVE_PROCESSES[id] ?? CHAVE_PROCESSES.auditor;
}

export function processForMap(mapState) {
  const explicit = mapState.route?.chaveProcess;
  if (explicit && CHAVE_PROCESSES[explicit]) return CHAVE_PROCESSES[explicit];
  const id = PROCESS_ORDER[Math.abs(mapState.seed >>> 0) % PROCESS_ORDER.length];
  return CHAVE_PROCESSES[id];
}

export function isMajorProcess(archetype) {
  return Boolean(CHAVE_PROCESSES[archetype]);
}
