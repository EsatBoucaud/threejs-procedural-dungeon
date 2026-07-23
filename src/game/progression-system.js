const PROFILE_KEY = 'abrir.profile.v1';

const EMPTY_PROFILE = {
  version: 1,
  rank: 1,
  experience: 0,
  scrip: 0,
  successfulRuns: 0,
  failedRuns: 0,
  recoveredObjects: 0,
  bestPayout: 0,
  lastSeed: null,
  unlocks: ['socrates', 'zelia-amato', 'lia', 'kindred'],
};

function rankForExperience(experience) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, experience) / 180)) + 1);
}

export function loadProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null');
    if (!stored || stored.version !== 1) return structuredClone(EMPTY_PROFILE);
    return { ...structuredClone(EMPTY_PROFILE), ...stored };
  } catch {
    return structuredClone(EMPTY_PROFILE);
  }
}

export function recordRun(result) {
  const profile = loadProfile();
  profile.successfulRuns += result.success ? 1 : 0;
  profile.failedRuns += result.success ? 0 : 1;
  profile.recoveredObjects += result.recovered.length;
  profile.scrip += result.success ? result.payout : Math.floor(result.payout * 0.25);
  profile.experience += Math.round(
    result.recovered.length * 32
      + result.roomsCleared * 18
      + (result.interlaceTriggered ? 80 : 0)
      + (result.contractComplete ? 150 : 0)
      + (result.auditorDefeated ? 180 : 0),
  );
  profile.rank = rankForExperience(profile.experience);
  profile.bestPayout = Math.max(profile.bestPayout, result.payout);
  profile.lastSeed = result.seed;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Persistence is an adapter and may be blocked by browser policy.
  }
  return profile;
}

export function rankTitle(rank) {
  if (rank >= 12) return 'PASSAGE ARCHITECT';
  if (rank >= 9) return 'SENIOR TRAVERSER';
  if (rank >= 6) return 'FIELD SPECIALIST';
  if (rank >= 3) return 'LICENSED RECOVERER';
  return 'PROVISIONAL OPERATIVE';
}
