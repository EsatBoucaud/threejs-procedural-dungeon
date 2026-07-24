const OPPORTUNITY_PRIORITY = {
  vault: 6,
  treasure: 5,
  archive: 4,
  elite: 3,
  shrine: 2,
  combat: 1,
  breach: 0,
};

const OPPORTUNITY_COPY = {
  vault: 'Remote vault geometry carries the strongest difficulty premium and the full impossible-object table.',
  treasure: 'A remote treasure room exposes contradictory objects without requiring the deepest route.',
  archive: 'A remote archive can reveal provenance and network records unavailable in the mapped state.',
  elite: 'An elite remote room offers a high-value recovery behind concentrated resistance.',
  shrine: 'A remote shrine can issue permissions that only exist after both states overlap.',
  combat: 'A remote combat room offers contradictory salvage once its hostile processes are cleared.',
  breach: 'The breach is the first stable foothold into the second state.',
};

const DANGER_COPY = {
  auditor: 'The Auditor will eventually materialize inside the largest contradiction and turn the overlap into a hostile ledger.',
  'seizure-chief': 'The Seizure Chief can remove the highest-value recovered object from the live manifest.',
  'route-runner': 'The Route Runner will use overlaps and temporary bridges as a private firing network.',
  warden: 'The Warden can occupy the return passage and suspend extraction until destroyed.',
};

function roomScore(room) {
  return (OPPORTUNITY_PRIORITY[room.type] ?? 0) * 1000
    + Math.round((room.difficulty ?? 0) * 100)
    + Number(room.localId ?? 0);
}

function clonePoint(point) {
  if (!point) return { x: 0, z: 0, roomId: null };
  return {
    x: Number(point.x ?? 0),
    z: Number(point.z ?? 0),
    roomId: point.id ?? point.roomId ?? null,
  };
}

export function createInterlaceForecast(mapState, majorProcess, dangerPoint = null) {
  const remoteRooms = [...(mapState.interlace?.rooms ?? [])];
  const opportunityRoom = remoteRooms
    .filter((room) => room.type !== 'entrance')
    .sort((a, b) => roomScore(b) - roomScore(a))[0]
    ?? remoteRooms[0]
    ?? null;
  const routeRisk = Number(mapState.route?.risk ?? 3);
  const warningSeconds = Math.max(18, Math.min(28, Math.round(mapState.interlaceAtSeconds * 0.32)));
  const finalSeconds = Math.max(7, Math.min(11, Math.round(mapState.interlaceAtSeconds * 0.13)));

  return {
    routeId: mapState.route?.id ?? null,
    remoteSeed: mapState.interlace?.seedLabel ?? 'UNKNOWN REMOTE STATE',
    warningSeconds,
    finalSeconds,
    opportunity: {
      roomId: opportunityRoom?.id ?? null,
      roomType: opportunityRoom?.type ?? 'breach',
      label: opportunityRoom ? `REMOTE ${String(opportunityRoom.type).toUpperCase()}` : 'REMOTE BREACH',
      difficulty: Number(opportunityRoom?.difficulty ?? 0),
      description: OPPORTUNITY_COPY[opportunityRoom?.type] ?? OPPORTUNITY_COPY.breach,
      position: opportunityRoom
        ? { x: Number(opportunityRoom.x), z: Number(opportunityRoom.z) }
        : null,
    },
    danger: {
      processId: majorProcess.id,
      label: `${majorProcess.name} // ${majorProcess.role}`,
      description: DANGER_COPY[majorProcess.id] ?? majorProcess.description,
      severity: routeRisk,
      position: clonePoint(dangerPoint),
    },
    returnOption: {
      label: 'RETURN DURING SAFE WINDOW',
      description: 'Reach the entrance and request extraction before zero. The run still counts as a successful filing.',
    },
    stayOption: {
      label: 'STAY FOR THE INTERLACE',
      description: 'Remain in the field past zero. The remote branch opens with one forecast opportunity and an immediate hostile vanguard.',
    },
  };
}
