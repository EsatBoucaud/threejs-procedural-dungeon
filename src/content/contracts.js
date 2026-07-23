const CONTRACTS = [
  {
    id: 'deep-claim',
    title: 'DEEP CLAIM',
    description: 'Reach both vault routes, recover priority objects, and return after the worlds interlace.',
    requirements: {
      objects: 4,
      remoteObjects: 1,
      value: 760,
      rooms: 7,
      vault: true,
      interlace: true,
    },
    bonus: 360,
    riskMultiplier: 1.36,
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
    description: 'Enter multiple shared coordinates and leave with contradictory evidence from the remote server.',
    requirements: {
      objects: 3,
      remoteObjects: 2,
      value: 840,
      rooms: 7,
      remoteRooms: 2,
      overlaps: 2,
      vault: false,
      interlace: true,
    },
    bonus: 420,
    riskMultiplier: 1.42,
  },
  {
    id: 'hostile-audit',
    title: 'HOSTILE AUDIT',
    description: 'Clear the critical route, enter the remote graph, and terminate the Chave Geral audit process.',
    requirements: {
      objects: 3,
      remoteObjects: 1,
      value: 680,
      rooms: 8,
      remoteRooms: 2,
      vault: true,
      interlace: true,
      auditor: true,
    },
    bonus: 560,
    riskMultiplier: 1.58,
  },
  {
    id: 'double-entry',
    title: 'DOUBLE-ENTRY RECOVERY',
    description: 'Stabilize both vaults and return with objects whose provenance disagrees.',
    requirements: {
      objects: 5,
      remoteObjects: 2,
      value: 1100,
      rooms: 10,
      remoteRooms: 4,
      vault: true,
      remoteVault: true,
      interlace: true,
    },
    bonus: 680,
    riskMultiplier: 1.68,
  },
  {
    id: 'bridge-inspection',
    title: 'BRIDGE INSPECTION',
    description: 'Cross enough shared coordinates to prove the temporary routes can carry matter both ways.',
    requirements: {
      objects: 3,
      remoteObjects: 1,
      value: 620,
      rooms: 6,
      overlaps: 3,
      interlace: true,
    },
    bonus: 390,
    riskMultiplier: 1.4,
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
  if (req.remoteObjects) {
    checks.push({
      id: 'remote-objects',
      label: `Remote objects ${snapshot.remoteObjects}/${req.remoteObjects}`,
      complete: snapshot.remoteObjects >= req.remoteObjects,
    });
  }
  if (req.remoteRooms) {
    checks.push({
      id: 'remote-rooms',
      label: `Remote rooms ${snapshot.remoteRooms}/${req.remoteRooms}`,
      complete: snapshot.remoteRooms >= req.remoteRooms,
    });
  }
  if (req.overlaps) {
    checks.push({
      id: 'overlaps',
      label: `Overlaps ${snapshot.overlaps}/${req.overlaps}`,
      complete: snapshot.overlaps >= req.overlaps,
    });
  }
  if (req.vault) checks.push({ id: 'vault', label: 'Local vault stabilized', complete: snapshot.vault });
  if (req.remoteVault) checks.push({ id: 'remote-vault', label: 'Remote vault stabilized', complete: snapshot.remoteVault });
  if (req.interlace) checks.push({ id: 'interlace', label: 'Interlace survived', complete: snapshot.interlace });
  if (req.auditor) checks.push({ id: 'auditor', label: 'Auditor terminated', complete: snapshot.auditor });
  return {
    checks,
    complete: checks.every((check) => check.complete),
  };
}
