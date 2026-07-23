export const ITEM_TABLE = [
  { id: 'saint-radio', name: 'Radio of an Unlicensed Saint', value: 180, rarity: 'rare', color: 0x77cfc7 },
  { id: 'municipal-key', name: 'Municipal Key Without a Municipality', value: 72, rarity: 'uncommon', color: 0xd1b367 },
  { id: 'salt-camera', name: 'Camera Filled with Sea Salt', value: 115, rarity: 'uncommon', color: 0x8ab8d9 },
  { id: 'warm-ledger', name: 'Ledger That Remains Warm', value: 215, rarity: 'rare', color: 0xdb765f },
  { id: 'false-passport', name: 'Passport for a Country That Never Existed', value: 310, rarity: 'exceptional', color: 0xb17ae0 },
  { id: 'talking-spool', name: 'Film Spool That Whispers Directions', value: 96, rarity: 'uncommon', color: 0xc8c2a7 },
  { id: 'glass-receipt', name: 'Glass Receipt', value: 44, rarity: 'common', color: 0xd7e7df },
  { id: 'black-orange', name: 'Black Orange, Still Fresh', value: 63, rarity: 'common', color: 0xe27a40 },
];

export function itemForRoom(room, seedValue) {
  const weight = Math.max(0, Math.min(1, room.difficulty ?? 0));
  const index = Math.floor((seedValue * 997 + room.id * 13 + weight * 17) % ITEM_TABLE.length);
  return ITEM_TABLE[index];
}
