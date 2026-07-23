export const SHARED_CARD_DECK = Object.freeze([
  {
    id: 'claim',
    name: 'CLAIM',
    value: 3,
    description: 'State what the team is entitled to and force the table to answer directly.',
  },
  {
    id: 'witness',
    name: 'WITNESS',
    value: 2,
    description: 'Add testimony. Gains strength when a different player follows the last play.',
  },
  {
    id: 'counterseal',
    name: 'COUNTERSEAL',
    value: 1,
    guard: 3,
    description: 'Reduce the next hostile filing and keep the argument alive.',
  },
  {
    id: 'contradiction',
    name: 'CONTRADICTION',
    value: 4,
    backlash: 2,
    description: 'Expose incompatible records. Strong, but gives the opposing process room to retaliate.',
  },
]);

const LOCAL_DIALOGUE = {
  id: 'local-custodian',
  speaker: 'ROOM CUSTODIAN',
  title: 'THE CUSTODIAN HAS NOT BEEN INFORMED THAT THE BUILDING IS UNREAL',
  opening: 'The custodian asks which department authorized the team to remove anything from this room.',
  choices: [
    {
      id: 'state-contract',
      label: 'State the Institute contract plainly.',
      outcome: 'The custodian records the contract number and points out an object the Institute omitted from its manifest.',
      effect: 'reveal-object',
    },
    {
      id: 'ask-local-claim',
      label: 'Ask who still depends on the objects here.',
      outcome: 'The conversation becomes slower and more useful. The team learns which object can be removed without harming the room’s remaining occupants.',
      effect: 'reduce-threat',
    },
    {
      id: 'offer-return-mark',
      label: 'Offer to mark one recovered object for return.',
      outcome: 'The custodian accepts the promise without trusting it. The route gains a local-return annotation.',
      effect: 'mark-return',
      consequential: true,
    },
  ],
};

const REMOTE_DIALOGUE = {
  id: 'remote-double',
  speaker: 'A PERSON LISTED AS ABSENT',
  title: 'THE SAME CONVERSATION IS ALREADY IN PROGRESS SOMEWHERE ELSE',
  opening: 'A person in the remote room recognizes the team, although this is the first recorded meeting.',
  choices: [
    {
      id: 'ask-future',
      label: 'Ask what the team does next.',
      outcome: 'They describe an extraction attempt that has not happened yet and name the object most likely to be seized.',
      effect: 'protect-object',
    },
    {
      id: 'deny-recognition',
      label: 'Deny that the meeting has happened before.',
      outcome: 'The remote room destabilizes around the denial. A temporary bridge becomes easier to cross, but map attention rises.',
      effect: 'bridge-risk',
    },
    {
      id: 'trade-memory',
      label: 'Trade one team memory for their route information.',
      outcome: 'The route becomes legible. The official activity log records a gap where the offered memory should be.',
      effect: 'route-reveal',
      consequential: true,
    },
  ],
};

const LOCAL_CARD = {
  id: 'local-filing-table',
  title: 'MUNICIPAL FILING DISPUTE',
  opponent: 'AUTOMATED CLAIMS TABLE',
  opening: 'The table refuses to release a room record until the team proves that at least one version of its authorization is valid.',
  teamTarget: 14,
  opponentTarget: 12,
  reward: 'The room releases a sealed appraisal note and lowers map attention.',
};

const REMOTE_CARD = {
  id: 'remote-counterclaim',
  title: 'COUNTERCLAIM FROM THE OTHER SERVER',
  opponent: 'DUPLICATE AUTHORITY',
  opening: 'The remote authority claims the team has already lost this argument and presents the unsigned result as evidence.',
  teamTarget: 18,
  opponentTarget: 16,
  reward: 'The remote authority releases a contradictory object and suspends one seizure attempt.',
};

function selectRoom(rooms, preferredTypes, fallbackIndex = 0) {
  return rooms.find((room) => preferredTypes.includes(room.type))
    ?? rooms.filter((room) => room.type !== 'entrance' && room.type !== 'breach')[fallbackIndex]
    ?? null;
}

export function buildInteractionNodes(mapState) {
  const localRooms = mapState.rooms ?? [];
  const remoteRooms = mapState.interlace?.rooms ?? [];
  const localTalkRoom = selectRoom(localRooms, ['archive', 'shrine'], 0);
  const localCardRoom = selectRoom(localRooms, ['treasure', 'elite'], 1);
  const remoteTalkRoom = selectRoom(remoteRooms, ['archive', 'shrine'], 0);
  const remoteCardRoom = selectRoom(remoteRooms, ['treasure', 'elite', 'vault'], 1);

  const nodes = [];
  if (localTalkRoom) nodes.push({
    ...structuredClone(LOCAL_DIALOGUE),
    nodeId: `talk:${localTalkRoom.id}`,
    type: 'dialogue',
    roomId: localTalkRoom.id,
    origin: 'base',
    position: { x: localTalkRoom.x - Math.min(2.2, localTalkRoom.width * 0.18), z: localTalkRoom.z },
  });
  if (localCardRoom) nodes.push({
    ...structuredClone(LOCAL_CARD),
    nodeId: `card:${localCardRoom.id}`,
    type: 'card-battle',
    roomId: localCardRoom.id,
    origin: 'base',
    position: { x: localCardRoom.x + Math.min(2.2, localCardRoom.width * 0.18), z: localCardRoom.z },
  });
  if (remoteTalkRoom) nodes.push({
    ...structuredClone(REMOTE_DIALOGUE),
    nodeId: `talk:${remoteTalkRoom.id}`,
    type: 'dialogue',
    roomId: remoteTalkRoom.id,
    origin: 'interlace',
    position: { x: remoteTalkRoom.x - Math.min(2.2, remoteTalkRoom.width * 0.18), z: remoteTalkRoom.z },
  });
  if (remoteCardRoom) nodes.push({
    ...structuredClone(REMOTE_CARD),
    nodeId: `card:${remoteCardRoom.id}`,
    type: 'card-battle',
    roomId: remoteCardRoom.id,
    origin: 'interlace',
    position: { x: remoteCardRoom.x + Math.min(2.2, remoteCardRoom.width * 0.18), z: remoteCardRoom.z },
  });
  return nodes;
}

export function objectDecisionFor(item) {
  return {
    title: item.name,
    subtitle: `${item.rarity.toUpperCase()} // ${item.condition.toUpperCase()} // ₢ ${item.value}`,
    readings: [
      {
        label: 'INSTITUTE APPRAISAL',
        value: `Recoverable field value: ₢ ${item.value}. The Institute will classify it under ${item.rarity}.`,
      },
      {
        label: 'NETWORK RELEVANCE',
        value: item.origin === 'interlace'
          ? 'A Chave Geral can use its contradictory provenance to dispute ownership, reroute access, or justify seizure.'
          : 'Celeste’s network may know why the object was omitted from the official route manifest.',
      },
      {
        label: 'LOCAL MEANING',
        value: item.provenance ?? 'The object belonged to a room before it became a field value. Removing it changes that room’s remaining story.',
      },
    ],
    options: [
      {
        id: 'recover',
        label: 'RECOVER',
        description: 'Add the object to the shared manifest. Any player may physically carry out the recovery.',
        consequential: false,
      },
      {
        id: 'mark-return',
        label: 'RECOVER + MARK FOR RETURN',
        description: 'Take it now, but formally record that the team intends to return it to its place or claimant.',
        consequential: true,
      },
      {
        id: 'contest',
        label: 'RECOVER + CONTEST CLASSIFICATION',
        description: 'Take it while disputing the Institute’s ownership and appraisal language.',
        consequential: true,
      },
      {
        id: 'leave',
        label: 'LEAVE IT',
        description: 'Keep the object in the room and close the interaction without recovery.',
        consequential: true,
      },
    ],
  };
}
