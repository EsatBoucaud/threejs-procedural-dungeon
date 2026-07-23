const CONTRACTS = [
  {
    id: 'deep-claim',
    title: 'DEEP CLAIM',
    description: 'Reach the vault, recover its priority object, and return after the worlds interlace.',
    requirements: { objects: 3, value: 460, rooms: 5, vault: true, interlace: true },
    bonus: 280,
    riskMultiplier: 1.32,
  },
  {
    id: 'quiet-repossession',
    title: 'QUIET REPOSSESSION',
    description: 'Recover a high-value manifest before the safe window collapses.',
    requirements: { objects: 4, value: 620, rooms: 4, vault: false, interlace: false },
    bonus: 220,
    riskMultiplier: 1.18,
  },
  {
    id: 'proof-of-overlap',
    title: 'PROOF OF OVERLAP',
    description: 'Survive an interlace and leave with enough contradictory evidence to force a report.',
    requirements: { objects: 2, value: 340, rooms: 6, vault: false, interlace: true },
    bonus: 250,
    riskMultiplier: 1.27,
  },
  {
    id: 'hostile-audit',
    title: 'HOSTILE AUDIT',
    description: 'Clear the critical route and terminate the Chave Geral audit process.',
    requirements: { objects: 2, value: 300, rooms: 7, vault: true, interlace: true, auditor: true },
    bonus: 420,
    riskMultiplier: 1.5,
  },
];

export function contractForSeed(seed) {
  return structuredClone(CONTRACTS[Math.abs(seed >>> 0) % CONTRACTS.length]);
}

export function contractProgress(contract, snapshot) {
  const req = contract.requirements;
  const checks = [
    { id: 'objects', label: `Objects ${snapshot.objects}/${req.objects}`, complete: snapshot.objects >= req.objects },
    { id: 'value', label: `Value ₢ ${snapshot.value}/${req.value}`, complete: snapshot.value >= req.value },
    { id: 'rooms', label: `Rooms ${snapshot.rooms}/${req.rooms}`, complete: snapshot.rooms >= req.rooms },
  ];
  if (req.vault) checks.push({ id: 'vault', label: 'Vault stabilized', complete: snapshot.vault });
  if (req.interlace) checks.push({ id: 'interlace', label: 'Interlace survived', complete: snapshot.interlace });
  if (req.auditor) checks.push({ id: 'auditor', label: 'Auditor terminated', complete: snapshot.auditor });
  return {
    checks,
    complete: checks.every((check) => check.complete),
  };
}
