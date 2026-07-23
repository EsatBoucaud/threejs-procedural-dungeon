const PROFILE_KEY = 'abrir.profile.v2';
const LEGACY_PROFILE_KEY = 'abrir.profile.v1';

const EMPTY_PROFILE = {
  version: 2,
  rank: 1,
  experience: 0,
  scrip: 0,
  successfulRuns: 0,
  failedRuns: 0,
  recoveredObjects: 0,
  remoteObjects: 0,
  bestPayout: 0,
  lastSeed: null,
  lastRouteId: null,
  unlocks: ['socrates', 'zelia-amato', 'lia', 'kindred'],
  upgrades: [],
  statistics: {
    majorProcessesDefeated: 0,
    auditorsDefeated: 0,
    overlapsVisited: 0,
    objectsSeized: 0,
    remoteVaultsCleared: 0,
    processDefeats: {
      auditor: 0,
      'seizure-chief': 0,
      'route-runner': 0,
      warden: 0,
    },
  },
};

function rankForExperience(experience) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, experience) / 180)) + 1);
}

function normalizeProfile(stored) {
  const storedStatistics = stored?.statistics ?? {};
  const profile = {
    ...structuredClone(EMPTY_PROFILE),
    ...stored,
    version: 2,
    upgrades: Array.isArray(stored?.upgrades) ? stored.upgrades : [],
    statistics: {
      ...structuredClone(EMPTY_PROFILE.statistics),
      ...storedStatistics,
      processDefeats: {
        ...structuredClone(EMPTY_PROFILE.statistics.processDefeats),
        ...(storedStatistics.processDefeats ?? {}),
      },
    },
  };
  profile.rank = rankForExperience(profile.experience);
  return profile;
}

export function saveProfile(profile) {
  const normalized = normalizeProfile(profile);
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(normalized));
  } catch {
    // Persistence is an adapter and may be blocked by browser policy.
  }
  return normalized;
}

export function loadProfile() {
  try {
    const current = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null');
    if (current) return normalizeProfile(current);
    const legacy = JSON.parse(localStorage.getItem(LEGACY_PROFILE_KEY) ?? 'null');
    if (legacy) return saveProfile(legacy);
    return structuredClone(EMPTY_PROFILE);
  } catch {
    return structuredClone(EMPTY_PROFILE);
  }
}

export function recordRun(result) {
  const profile = loadProfile();
  const routeMultiplier = result.routeRewardMultiplier ?? 1;
  profile.successfulRuns += result.success ? 1 : 0;
  profile.failedRuns += result.success ? 0 : 1;
  profile.recoveredObjects += result.recovered.length;
  profile.remoteObjects += result.remoteObjects ?? 0;
  profile.scrip += Math.round((result.success ? result.payout : Math.floor(result.payout * 0.25)) * routeMultiplier);
  profile.experience += Math.round(
    result.recovered.length * 32
      + result.roomsCleared * 18
      + (result.remoteRoomsCleared ?? 0) * 24
      + (result.interlaceTriggered ? 80 : 0)
      + (result.contractComplete ? 150 : 0)
      + (result.majorProcessDefeated ? 180 : 0)
      + (result.remoteVaultCleared ? 160 : 0),
  );
  profile.rank = rankForExperience(profile.experience);
  profile.bestPayout = Math.max(profile.bestPayout, result.payout);
  profile.lastSeed = result.seed;
  profile.lastRouteId = result.routeId ?? profile.lastRouteId;
  profile.statistics.majorProcessesDefeated += result.majorProcessDefeated ? 1 : 0;
  profile.statistics.auditorsDefeated += result.majorProcessId === 'auditor' && result.majorProcessDefeated ? 1 : 0;
  profile.statistics.overlapsVisited += result.overlapsVisited ?? 0;
  profile.statistics.objectsSeized += result.seized?.length ?? 0;
  profile.statistics.remoteVaultsCleared += result.remoteVaultCleared ? 1 : 0;
  if (result.majorProcessId && result.majorProcessDefeated) {
    profile.statistics.processDefeats[result.majorProcessId] = (profile.statistics.processDefeats[result.majorProcessId] ?? 0) + 1;
  }
  return saveProfile(profile);
}

export function grantScrip(amount) {
  const profile = loadProfile();
  profile.scrip += Math.max(0, Math.round(amount));
  return saveProfile(profile);
}

export function spendScrip(amount) {
  const profile = loadProfile();
  const cost = Math.max(0, Math.round(amount));
  if (profile.scrip < cost) return { success: false, profile };
  profile.scrip -= cost;
  return { success: true, profile: saveProfile(profile) };
}

export function purchaseUpgrade(upgrade) {
  const profile = loadProfile();
  if (profile.upgrades.includes(upgrade.id)) return { success: false, reason: 'owned', profile };
  if (profile.rank < upgrade.rankRequired) return { success: false, reason: 'rank', profile };
  if (profile.scrip < upgrade.cost) return { success: false, reason: 'scrip', profile };
  profile.scrip -= upgrade.cost;
  profile.upgrades.push(upgrade.id);
  return { success: true, profile: saveProfile(profile) };
}

export function hasUpgrade(profile, id) {
  return profile.upgrades.includes(id);
}

export function rankTitle(rank) {
  if (rank >= 12) return 'PASSAGE ARCHITECT';
  if (rank >= 9) return 'SENIOR TRAVERSER';
  if (rank >= 6) return 'FIELD SPECIALIST';
  if (rank >= 3) return 'LICENSED RECOVERER';
  return 'PROVISIONAL OPERATIVE';
}
