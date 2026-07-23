import { grantScrip, spendScrip } from './progression-system.js';

const ARCHIVE_KEY = 'abrir.archive.v1';

const EMPTY_ARCHIVE = {
  version: 1,
  objects: [],
  totalRecovered: 0,
  totalSold: 0,
  totalBuybacks: 0,
  totalHeldByInstitute: 0,
};

function conditionMultiplier(condition) {
  if (condition === 'stable') return 1;
  if (condition === 'weathered') return 0.88;
  if (condition === 'contested') return 1.12;
  if (condition === 'unstable') return 1.28;
  return 1;
}

function appraise(item) {
  const originMultiplier = item.origin === 'interlace' ? 1.18 : 1;
  return Math.max(1, Math.round(item.value * conditionMultiplier(item.condition) * originMultiplier));
}

export function loadArchive() {
  try {
    const stored = JSON.parse(localStorage.getItem(ARCHIVE_KEY) ?? 'null');
    if (!stored || stored.version !== 1) return structuredClone(EMPTY_ARCHIVE);
    return {
      ...structuredClone(EMPTY_ARCHIVE),
      ...stored,
      objects: Array.isArray(stored.objects) ? stored.objects : [],
    };
  } catch {
    return structuredClone(EMPTY_ARCHIVE);
  }
}

export function saveArchive(archive) {
  try {
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  } catch {
    // Archive persistence is an adapter and may be blocked by browser policy.
  }
  return archive;
}

export function recordRecoveredObjects(result) {
  const archive = loadArchive();
  const recovered = result.recovered ?? [];
  const retentionCount = Math.floor(recovered.length * 0.15);
  const retainedIds = new Set(
    [...recovered]
      .sort((a, b) => appraise(b) - appraise(a))
      .slice(0, retentionCount)
      .map((item) => item.instanceId),
  );
  const entries = recovered.map((item, index) => {
    const instituteHeld = retainedIds.has(item.instanceId);
    return {
      ...item,
      archiveId: `${result.seed}:${item.instanceId}:${index}`,
      appraisal: appraise(item),
      status: instituteHeld ? 'institute-held' : 'stored',
      routeId: result.routeId ?? null,
      runSeed: result.seed,
      remoteSeed: result.remoteSeed ?? null,
      recoveredAt: result.timestamp,
      heldReason: instituteHeld ? 'Instituto Travessia exercised its object-retention allowance.' : null,
    };
  });
  archive.objects.unshift(...entries);
  archive.totalRecovered += entries.length;
  archive.totalHeldByInstitute += entries.filter((entry) => entry.status === 'institute-held').length;
  saveArchive(archive);
  return {
    entries,
    held: entries.filter((entry) => entry.status === 'institute-held'),
    stored: entries.filter((entry) => entry.status === 'stored'),
  };
}

export function sellArchivedObject(archiveId) {
  const archive = loadArchive();
  const entry = archive.objects.find((object) => object.archiveId === archiveId);
  if (!entry || entry.status !== 'stored') return { success: false, reason: 'unavailable', archive };
  const payout = Math.max(1, Math.round(entry.appraisal * 0.72));
  entry.status = 'sold';
  entry.soldFor = payout;
  entry.soldAt = new Date().toISOString();
  archive.totalSold += 1;
  saveArchive(archive);
  const profile = grantScrip(payout);
  return { success: true, payout, entry, archive, profile };
}

export function buyBackObject(archiveId) {
  const archive = loadArchive();
  const entry = archive.objects.find((object) => object.archiveId === archiveId);
  if (!entry || entry.status !== 'institute-held') return { success: false, reason: 'unavailable', archive };
  const cost = Math.max(1, Math.round(entry.appraisal * 1.08));
  const payment = spendScrip(cost);
  if (!payment.success) return { success: false, reason: 'scrip', cost, archive, profile: payment.profile };
  entry.status = 'stored';
  entry.buybackCost = cost;
  entry.boughtBackAt = new Date().toISOString();
  archive.totalBuybacks += 1;
  saveArchive(archive);
  return { success: true, cost, entry, archive, profile: payment.profile };
}

export function archiveSummary(archive = loadArchive()) {
  const counts = {
    stored: 0,
    held: 0,
    sold: 0,
    local: 0,
    remote: 0,
    totalAppraisal: 0,
  };
  for (const entry of archive.objects) {
    if (entry.status === 'stored') counts.stored += 1;
    if (entry.status === 'institute-held') counts.held += 1;
    if (entry.status === 'sold') counts.sold += 1;
    if (entry.origin === 'interlace') counts.remote += 1;
    else counts.local += 1;
    if (entry.status !== 'sold') counts.totalAppraisal += entry.appraisal;
  }
  return counts;
}
