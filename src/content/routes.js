export const FIELD_ROUTES = [
  {
    id: 'recife-ledger',
    name: 'THE RECIFE LEDGER',
    region: 'BRAZIL // COASTAL MUNICIPAL ARCHIVE',
    description: 'Tight civic rooms, short safe window, dense recoverable records, and aggressive audit pressure.',
    seedPrefix: 'ABRIR-RECIFE',
    roomCount: 22,
    loopChance: 0.28,
    interlaceAtSeconds: 72,
    risk: 3,
    rewardMultiplier: 1.14,
  },
  {
    id: 'luanda-night-line',
    name: 'LUANDA NIGHT LINE',
    region: 'ANGOLA // DISUSED TRANSIT SERVER',
    description: 'Long routes, broad chambers, fewer loops, and a remote graph that tends to intersect the critical path.',
    seedPrefix: 'ABRIR-LUANDA',
    roomCount: 26,
    loopChance: 0.22,
    interlaceAtSeconds: 88,
    risk: 4,
    rewardMultiplier: 1.24,
  },
  {
    id: 'maputo-glass-office',
    name: 'THE GLASS OFFICE',
    region: 'MOZAMBIQUE // ABANDONED PROCUREMENT FLOOR',
    description: 'Compact loops, frequent overlap zones, unstable appraisal objects, and high contradictory-object premiums.',
    seedPrefix: 'ABRIR-MAPUTO',
    roomCount: 24,
    loopChance: 0.42,
    interlaceAtSeconds: 78,
    risk: 4,
    rewardMultiplier: 1.3,
  },
  {
    id: 'porto-reliquary',
    name: 'PORTO RELIQUARY',
    region: 'PORTUGAL // SUBTERRANEAN STORAGE AUTHORITY',
    description: 'Large rooms, guarded vaults, slow escalation, and valuable physical objects with unusually clean provenance.',
    seedPrefix: 'ABRIR-PORTO',
    roomCount: 28,
    loopChance: 0.3,
    interlaceAtSeconds: 102,
    risk: 3,
    rewardMultiplier: 1.18,
  },
  {
    id: 'praia-weather-room',
    name: 'THE WEATHER ROOM',
    region: 'CABO VERDE // UNREGISTERED FORECAST FACILITY',
    description: 'Sparse local graph, violent remote incursion, environmental anomalies, and a higher chance of impossible objects.',
    seedPrefix: 'ABRIR-PRAIA',
    roomCount: 20,
    loopChance: 0.2,
    interlaceAtSeconds: 68,
    risk: 5,
    rewardMultiplier: 1.45,
  },
  {
    id: 'macau-return-desk',
    name: 'THE RETURN DESK',
    region: 'MACAU // CLOSED CUSTOMS ANNEX',
    description: 'A bureaucratic maze built for seizure, buyback, duplicate manifests, and contested route ownership.',
    seedPrefix: 'ABRIR-MACAU',
    roomCount: 25,
    loopChance: 0.38,
    interlaceAtSeconds: 82,
    risk: 5,
    rewardMultiplier: 1.5,
  },
];

export function routeById(id) {
  return FIELD_ROUTES.find((route) => route.id === id) ?? FIELD_ROUTES[0];
}

export function seedForRoute(route, profile) {
  const runNumber = (profile.successfulRuns ?? 0) + (profile.failedRuns ?? 0) + 1;
  return `${route.seedPrefix}-${String(runNumber).padStart(3, '0')}`;
}
