export const ITEM_TABLE = [
  { id: 'saint-radio', name: 'Radio of an Unlicensed Saint', value: 180, rarity: 'rare', color: 0x77cfc7 },
  { id: 'municipal-key', name: 'Municipal Key Without a Municipality', value: 72, rarity: 'uncommon', color: 0xd1b367 },
  { id: 'salt-camera', name: 'Camera Filled with Sea Salt', value: 115, rarity: 'uncommon', color: 0x8ab8d9 },
  { id: 'warm-ledger', name: 'Ledger That Remains Warm', value: 215, rarity: 'rare', color: 0xdb765f },
  { id: 'false-passport', name: 'Passport for a Country That Never Existed', value: 310, rarity: 'exceptional', color: 0xb17ae0 },
  { id: 'talking-spool', name: 'Film Spool That Whispers Directions', value: 96, rarity: 'uncommon', color: 0xc8c2a7 },
  { id: 'glass-receipt', name: 'Glass Receipt', value: 44, rarity: 'common', color: 0xd7e7df },
  { id: 'black-orange', name: 'Black Orange, Still Fresh', value: 63, rarity: 'common', color: 0xe27a40 },
  { id: 'weatherless-umbrella', name: 'Umbrella Registered to No Weather', value: 138, rarity: 'rare', color: 0x6791b8 },
  { id: 'sealed-voice', name: 'Voice Sealed in a Medicine Bottle', value: 244, rarity: 'exceptional', color: 0x62c6a3 },
];

export const INTERLACE_ITEM_TABLE = [
  { id: 'tomorrow-receipt', name: 'Receipt Issued Tomorrow', value: 390, rarity: 'contradictory', color: 0xe18adf },
  { id: 'wrong-door-key', name: 'Key Cut from the Wrong Door', value: 345, rarity: 'contradictory', color: 0xc9a4ff },
  { id: 'elsewhere-map', name: 'Map of the Room While It Was Elsewhere', value: 520, rarity: 'impossible', color: 0x79d5ef },
  { id: 'seized-shadow', name: 'Seized Shadow in a Glass Folder', value: 610, rarity: 'impossible', color: 0x9c72e8 },
  { id: 'second-voice-radio', name: 'Saint’s Radio, Second Voice', value: 465, rarity: 'contradictory', color: 0x74e0ce },
  { id: 'duplicate-hour', name: 'Duplicate Hour in a Brass Case', value: 575, rarity: 'impossible', color: 0xe8bd6d },
  { id: 'unborn-photograph', name: 'Photograph of an Event Not Yet Born', value: 430, rarity: 'contradictory', color: 0xa3b9f2 },
  { id: 'audit-skin', name: 'Discarded Skin of an Audit', value: 720, rarity: 'seized', color: 0xe47e63 },
];

function stableNumber(value) {
  if (Number.isFinite(value)) return value >>> 0;
  const text = String(value ?? 'room');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function itemForRoom(room, seedValue, options = {}) {
  const interlaced = options.interlaced ?? room.origin === 'interlace' ?? false;
  const table = interlaced ? INTERLACE_ITEM_TABLE : ITEM_TABLE;
  const weight = Math.max(0, Math.min(1, room.difficulty ?? 0));
  const roomKey = stableNumber(room.id);
  const index = Math.floor((stableNumber(seedValue) * 997 + roomKey * 13 + Math.round(weight * 170)) % table.length);
  const base = table[index];
  const conditionRoll = (roomKey + stableNumber(seedValue) * 7) % 4;
  const condition = ['stable', 'weathered', 'contested', 'unstable'][conditionRoll];
  const difficultyPremium = Math.round(base.value * weight * (interlaced ? 0.38 : 0.18));
  return {
    ...base,
    instanceId: `${base.id}:${String(room.id)}:${stableNumber(seedValue).toString(16)}`,
    value: base.value + difficultyPremium,
    origin: interlaced ? 'interlace' : 'base',
    condition,
    sourceRoomId: room.id,
    provenance: interlaced
      ? 'Recovered from an independently generated server during active overlap.'
      : 'Recovered from an Instituto Travessia mapped state.',
  };
}
