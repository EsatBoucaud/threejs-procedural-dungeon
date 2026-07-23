export const ROOM_SKINS = {
  travessia: {
    floor: 0x6e706f,
    floorSecondary: 0x8a826e,
    wall: 0x2d3338,
    wallSecondary: 0x41484e,
    trim: 0xc5a55d,
    accent: 0x67d6cf,
    fog: 0x081018,
    ambient: 0x9db3c5,
    portal: 0x67d6cf,
  },
  chave: {
    floor: 0x30343a,
    floorSecondary: 0x4c3f42,
    wall: 0x17191e,
    wallSecondary: 0x352329,
    trim: 0xa84236,
    accent: 0xd25749,
    fog: 0x0c080a,
    ambient: 0x8b7780,
    portal: 0xd25749,
  },
  interlace: {
    floor: 0x2a3850,
    floorSecondary: 0x463047,
    wall: 0x19202e,
    wallSecondary: 0x2e2a48,
    trim: 0x688bdb,
    accent: 0xc379d4,
    fog: 0x090711,
    ambient: 0x7c87aa,
    portal: 0x9a6ce0,
  },
};

export const ROUTE_SKINS = {
  'recife-ledger': {
    floor: 0x716b5d,
    floorSecondary: 0x8b795e,
    wall: 0x31393a,
    wallSecondary: 0x4b5450,
    trim: 0xc69a55,
    accent: 0x62c8bc,
    fog: 0x0b1214,
    ambient: 0xa6b9b2,
    portal: 0x63d4c6,
  },
  'luanda-night-line': {
    floor: 0x3d4651,
    floorSecondary: 0x66583f,
    wall: 0x202934,
    wallSecondary: 0x354457,
    trim: 0xd0a653,
    accent: 0x5aa8d7,
    fog: 0x07101b,
    ambient: 0x809fb6,
    portal: 0x61d2c7,
  },
  'maputo-glass-office': {
    floor: 0x465452,
    floorSecondary: 0x64736e,
    wall: 0x263230,
    wallSecondary: 0x46615b,
    trim: 0x9db9a7,
    accent: 0x69d7bd,
    fog: 0x081411,
    ambient: 0x9fbab3,
    portal: 0x63d4c6,
  },
  'porto-reliquary': {
    floor: 0x625c55,
    floorSecondary: 0x81745e,
    wall: 0x302f31,
    wallSecondary: 0x4a4644,
    trim: 0xc6a86c,
    accent: 0x7eb4bd,
    fog: 0x0d1014,
    ambient: 0xaaa59d,
    portal: 0x6fcfc9,
  },
  'praia-weather-room': {
    floor: 0x6c6854,
    floorSecondary: 0x8b8060,
    wall: 0x29343a,
    wallSecondary: 0x3f5259,
    trim: 0xc8ad62,
    accent: 0x68bfd1,
    fog: 0x0a1418,
    ambient: 0xa7b9b7,
    portal: 0x67d6cf,
  },
  'macau-return-desk': {
    floor: 0x4f4444,
    floorSecondary: 0x6b5650,
    wall: 0x251f24,
    wallSecondary: 0x49333b,
    trim: 0xc2975c,
    accent: 0xb95f55,
    fog: 0x10090c,
    ambient: 0x9d8d91,
    portal: 0x67d6cf,
  },
};

function remoteSkin(local) {
  return {
    floor: local.floorSecondary,
    floorSecondary: ROOM_SKINS.interlace.floorSecondary,
    wall: ROOM_SKINS.interlace.wall,
    wallSecondary: local.wallSecondary,
    trim: ROOM_SKINS.interlace.trim,
    accent: local.accent,
    fog: ROOM_SKINS.interlace.fog,
    ambient: ROOM_SKINS.interlace.ambient,
    portal: ROOM_SKINS.interlace.portal,
  };
}

export function skinForRoute(routeId, remote = false) {
  const local = ROUTE_SKINS[routeId] ?? ROOM_SKINS.travessia;
  return remote ? remoteSkin(local) : local;
}
