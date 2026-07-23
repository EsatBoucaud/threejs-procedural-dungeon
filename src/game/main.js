import * as THREE from 'three';
import mapState from '../../content/maps/generated/abrir-mvp-seed-20260723.json';
import './styles.css';

const FLOOR = 1;
const WALL = 2;
const POOL = 3;
const PLAYER_RADIUS = 0.3;
const EXPLORE_SPEED = 5.4;
const MAX_TIME = 3;
const HAND_SIZE = 5;
const LANE_NAMES = ['FRONT', 'MID', 'REAR'];

const viewport = document.querySelector('#viewport');
const worldLabels = document.querySelector('#world-labels');
const mapName = document.querySelector('#map-name');
const mapMeta = document.querySelector('#map-meta');
const roomReadout = document.querySelector('#room-readout');
const objectiveReadout = document.querySelector('#objective-readout');
const interlaceReadout = document.querySelector('#interlace-readout');
const interlaceFill = document.querySelector('#interlace-fill');
const encounterBanner = document.querySelector('#encounter-banner');
const encounterKicker = document.querySelector('#encounter-kicker');
const encounterMessage = document.querySelector('#encounter-message');
const handElement = document.querySelector('#hand');
const endTurnButton = document.querySelector('#end-turn');

const combatUi = {
  enemyCount: document.querySelector('#enemy-count'),
  eliteCount: document.querySelector('#elite-count'),
  objective: document.querySelector('#combat-objective'),
  turn: document.querySelector('#turn-count'),
  activePortrait: document.querySelector('#active-portrait'),
  activeName: document.querySelector('#active-name'),
  activeHealth: document.querySelector('#active-health'),
  activeHealthFill: document.querySelector('#active-health-fill'),
  activeBlock: document.querySelector('#active-block'),
  timeCopy: document.querySelector('#time-copy'),
  timePips: document.querySelector('#time-pips'),
  drawCount: document.querySelector('#draw-count'),
  discardCount: document.querySelector('#discard-count'),
  partyButtons: [...document.querySelectorAll('.party-portrait[data-operative]')],
};

function assertMapState(state) {
  const width = state?.generated?.dimensions?.width;
  const height = state?.generated?.dimensions?.height;
  const cellCount = width * height;
  if (state?.schemaVersion !== 1) throw new Error('Unsupported ABRIR map schema.');
  if (!Number.isInteger(width) || !Number.isInteger(height)) throw new Error('Invalid map dimensions.');
  for (const layerName of ['grid', 'roomId', 'doorway']) {
    if (state.generated.layers[layerName]?.length !== cellCount) {
      throw new Error(`${layerName} layer size mismatch.`);
    }
  }
}

assertMapState(mapState);

const generated = mapState.generated;
const { width, height } = generated.dimensions;
const { grid, roomId, doorway } = generated.layers;
const roomById = new Map(generated.rooms.map((room) => [room.id, room]));
const entrance = roomById.get(generated.entranceRoomId);
if (!entrance) throw new Error('Saved map entrance room is missing.');

const targetCombatRoom = [...generated.rooms]
  .filter((room) => room.type === 'combat' && room.depth > 0 && Math.min(room.w, room.h) >= 8)
  .sort((a, b) => a.depth - b.depth || b.w * b.h - a.w * a.h)[0];
if (!targetCombatRoom) throw new Error('Saved map has no usable combat room.');

mapName.textContent = generated.name;
mapMeta.textContent =
  `seed ${mapState.generator.seed} · ${generated.rooms.length} rooms · ` +
  `${generated.edges.length} links · saved Three.js state`;
objectiveReadout.textContent = `Reach room ${String(targetCombatRoom.id).padStart(2, '0')} to begin card combat.`;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const dormantBackground = new THREE.Color(0x030508);
const activeBackground = new THREE.Color(0x12050a);
scene.background = dormantBackground;
scene.fog = new THREE.FogExp2(dormantBackground, 0.025);

const camera = new THREE.OrthographicCamera(-12, 12, 12, -12, 0.1, 180);
const cameraTarget = new THREE.Vector3();
const combatCenter = new THREE.Vector3(worldX(targetCombatRoom.cx), 0, worldZ(targetCombatRoom.cy));

const ambient = new THREE.HemisphereLight(0x92a6b7, 0x160f0b, 1.7);
scene.add(ambient);
const keyLight = new THREE.DirectionalLight(0xffd59c, 2.6);
keyLight.position.set(16, 28, 13);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -24;
keyLight.shadow.camera.right = 24;
keyLight.shadow.camera.top = 24;
keyLight.shadow.camera.bottom = -24;
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x4f91be, 0.85);
rimLight.position.set(-18, 14, -11);
scene.add(rimLight);

function worldX(cellX) {
  return cellX - width / 2;
}

function worldZ(cellY) {
  return cellY - height / 2;
}

function cellIndex(cellX, cellY) {
  return cellY * width + cellX;
}

function cellFromWorld(x, z) {
  return { x: Math.round(x + width / 2), y: Math.round(z + height / 2) };
}

function roomAtWorld(x, z) {
  const cell = cellFromWorld(x, z);
  if (cell.x < 0 || cell.y < 0 || cell.x >= width || cell.y >= height) return null;
  return roomById.get(roomId[cellIndex(cell.x, cell.y)]) ?? null;
}

function floorAtWorld(x, z) {
  const cell = cellFromWorld(x, z);
  if (cell.x < 0 || cell.y < 0 || cell.x >= width || cell.y >= height) return false;
  return grid[cellIndex(cell.x, cell.y)] === FLOOR;
}

const typeColors = {
  entrance: 0x577563,
  combat: 0x665c49,
  elite: 0x675176,
  treasure: 0x94703b,
  shrine: 0x3a6270,
  boss: 0x793f38,
};
const corridorColor = new THREE.Color(0x484641);
const targetRoomColor = new THREE.Color(0x8a713b);
const interlaceA = new THREE.Color(0x8b2137);
const interlaceB = new THREE.Color(0x2543b8);

const floorCells = [];
const wallCells = [];
const poolCells = [];
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const index = cellIndex(x, y);
    if (grid[index] === FLOOR) floorCells.push({ x, y, index });
    else if (grid[index] === WALL) wallCells.push({ x, y, index });
    else if (grid[index] === POOL) poolCells.push({ x, y, index });
  }
}

const matrix = new THREE.Matrix4();
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.94,
  metalness: 0.02,
  vertexColors: true,
});
const floorMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(0.97, 0.12, 0.97),
  floorMaterial,
  floorCells.length,
);
floorMesh.receiveShadow = true;
scene.add(floorMesh);
const baseFloorColors = [];
const tempColor = new THREE.Color();
for (let i = 0; i < floorCells.length; i += 1) {
  const cell = floorCells[i];
  matrix.makeTranslation(worldX(cell.x), 0, worldZ(cell.y));
  floorMesh.setMatrixAt(i, matrix);
  const room = roomById.get(roomId[cell.index]);
  let color = room ? new THREE.Color(typeColors[room.type] ?? typeColors.combat) : corridorColor.clone();
  if (room?.id === targetCombatRoom.id) color = color.lerp(targetRoomColor, 0.52);
  color.multiplyScalar(0.66 + (room?.difficulty ?? 0.25) * 0.18);
  baseFloorColors.push(color);
  floorMesh.setColorAt(i, color);
}
floorMesh.instanceMatrix.needsUpdate = true;
floorMesh.instanceColor.needsUpdate = true;

const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x24251f, roughness: 0.98, metalness: 0.02 });
const wallMesh = new THREE.InstancedMesh(
  new THREE.BoxGeometry(0.99, 1.8, 0.99),
  wallMaterial,
  wallCells.length,
);
wallMesh.castShadow = true;
wallMesh.receiveShadow = true;
scene.add(wallMesh);
for (let i = 0; i < wallCells.length; i += 1) {
  const cell = wallCells[i];
  matrix.makeTranslation(worldX(cell.x), 0.9, worldZ(cell.y));
  wallMesh.setMatrixAt(i, matrix);
}
wallMesh.instanceMatrix.needsUpdate = true;

if (poolCells.length > 0) {
  const poolMaterial = new THREE.MeshStandardMaterial({
    color: 0x294f55,
    emissive: 0x0b2e37,
    emissiveIntensity: 0.7,
    roughness: 0.32,
    metalness: 0.18,
  });
  const poolMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.94, 0.04, 0.94),
    poolMaterial,
    poolCells.length,
  );
  scene.add(poolMesh);
  for (let i = 0; i < poolCells.length; i += 1) {
    const cell = poolCells[i];
    matrix.makeTranslation(worldX(cell.x), -0.07, worldZ(cell.y));
    poolMesh.setMatrixAt(i, matrix);
  }
  poolMesh.instanceMatrix.needsUpdate = true;
}

function makeRing(color, radius = 0.62) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(radius, 0.065, 8, 30),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82 }),
  );
  ring.rotation.x = Math.PI / 2;
  return ring;
}

const entranceMarker = makeRing(0x53d0aa);
entranceMarker.position.set(worldX(entrance.cx), 0.16, worldZ(entrance.cy));
scene.add(entranceMarker);

const targetMarker = new THREE.Group();
const targetRing = makeRing(0xe0b958, 0.82);
targetMarker.add(targetRing);
const targetBeam = new THREE.Mesh(
  new THREE.CylinderGeometry(0.08, 0.34, 3.8, 10, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xe0b958, transparent: true, opacity: 0.18, side: THREE.DoubleSide }),
);
targetBeam.position.y = 1.9;
targetMarker.add(targetBeam);
targetMarker.position.set(combatCenter.x, 0.15, combatCenter.z);
scene.add(targetMarker);

const barrierGroup = new THREE.Group();
scene.add(barrierGroup);
const barrierMaterial = new THREE.MeshStandardMaterial({
  color: 0x9a332c,
  emissive: 0x711f23,
  emissiveIntensity: 1.4,
  transparent: true,
  opacity: 0.84,
  roughness: 0.45,
});
const targetDoorCells = [];
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const index = cellIndex(x, y);
    if (!doorway[index]) continue;
    const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
    const touchesTarget = neighbors.some(([nx, ny]) => {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return false;
      return roomId[cellIndex(nx, ny)] === targetCombatRoom.id;
    });
    if (touchesTarget) targetDoorCells.push({ x, y });
  }
}
for (const cell of targetDoorCells) {
  const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.55, 0.18), barrierMaterial);
  barrier.position.set(worldX(cell.x), 0.82, worldZ(cell.y));
  const horizontalDoor =
    (cell.x > 0 && roomId[cellIndex(cell.x - 1, cell.y)] === targetCombatRoom.id) ||
    (cell.x < width - 1 && roomId[cellIndex(cell.x + 1, cell.y)] === targetCombatRoom.id);
  if (horizontalDoor) barrier.rotation.y = Math.PI / 2;
  barrier.castShadow = true;
  barrierGroup.add(barrier);
}
barrierGroup.visible = false;

const laneGuides = new THREE.Group();
scene.add(laneGuides);
const laneSpacing = Math.max(1.35, Math.min(2.05, targetCombatRoom.h / 4.2));
const laneOffsets = [-laneSpacing, 0, laneSpacing];
for (let lane = 0; lane < 3; lane += 1) {
  const points = [
    new THREE.Vector3(combatCenter.x - Math.min(4.5, targetCombatRoom.w * 0.35), 0.16, combatCenter.z + laneOffsets[lane]),
    new THREE.Vector3(combatCenter.x + Math.min(4.5, targetCombatRoom.w * 0.35), 0.16, combatCenter.z + laneOffsets[lane]),
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0x4f8fc8, transparent: true, opacity: 0.34 });
  laneGuides.add(new THREE.Line(geometry, material));
}
laneGuides.visible = false;

const coreFragment = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.62, 0),
  new THREE.MeshStandardMaterial({
    color: 0xe2aa50,
    emissive: 0x6c3c0d,
    emissiveIntensity: 1.2,
    metalness: 0.48,
    roughness: 0.26,
  }),
);
coreFragment.position.set(combatCenter.x, 0.82, combatCenter.z);
coreFragment.castShadow = true;
coreFragment.visible = false;
scene.add(coreFragment);

const OPERATIVE_DEFS = [
  {
    id: 'socrates',
    name: 'SÓCRATES',
    role: 'FIELD MEDIC',
    maxHealth: 42,
    color: 0xd2b58c,
    accent: 0x3f9dd8,
    symbol: 'S',
  },
  {
    id: 'zelia',
    name: 'ZÉLIA',
    role: 'VANGUARD',
    maxHealth: 52,
    color: 0xa74d52,
    accent: 0x56b190,
    symbol: 'Z',
  },
];

function createOperative(definition) {
  const group = new THREE.Group();
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.43, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.36, 0.78, 12),
    new THREE.MeshStandardMaterial({ color: definition.color, roughness: 0.72, metalness: 0.08 }),
  );
  body.position.y = 0.47;
  body.castShadow = true;
  group.add(body);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.34, 0.055, 7, 20),
    new THREE.MeshStandardMaterial({
      color: definition.accent,
      emissive: definition.accent,
      emissiveIntensity: 0.55,
      roughness: 0.45,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.12;
  group.add(ring);
  return {
    definition,
    group,
    health: definition.maxHealth,
    block: 0,
    lane: definition.id === 'socrates' ? 0 : 2,
    alive: true,
    label: null,
  };
}

const operatives = OPERATIVE_DEFS.map(createOperative);
const entrancePosition = new THREE.Vector3(worldX(entrance.cx), 0.08, worldZ(entrance.cy));
operatives[0].group.position.copy(entrancePosition);
operatives[1].group.position.copy(entrancePosition).add(new THREE.Vector3(0.7, 0, 0.7));
for (const operative of operatives) scene.add(operative.group);

let activeOperativeIndex = 0;
let mode = 'explore';
let interlacingActive = false;
let recoveredValue = 0;
let bannerTimer = 0;
let coreCollected = false;
const keys = new Set();

function activeOperative() {
  return operatives[activeOperativeIndex];
}

function inactiveOperative() {
  return operatives[1 - activeOperativeIndex];
}

function canOccupy(x, z, radius = PLAYER_RADIUS) {
  const samples = [
    [x - radius, z - radius],
    [x + radius, z - radius],
    [x - radius, z + radius],
    [x + radius, z + radius],
  ];
  return samples.every(([sampleX, sampleZ]) => floorAtWorld(sampleX, sampleZ));
}

function moveWithCollision(group, dx, dz) {
  const nextX = group.position.x + dx;
  const nextZ = group.position.z + dz;
  if (canOccupy(nextX, group.position.z)) group.position.x = nextX;
  if (canOccupy(group.position.x, nextZ)) group.position.z = nextZ;
}

function showBanner(kicker, message, duration = 1.35) {
  encounterKicker.textContent = kicker;
  encounterMessage.textContent = message;
  encounterBanner.classList.add('show');
  bannerTimer = duration;
}

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result = (result + Math.imul(result ^ (result >>> 7), 61 | result)) ^ result;
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(mapState.generator.seed ^ 0xa8b1c2d3);
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const CARD_LIBRARY = {
  advance: {
    id: 'advance',
    name: 'TACTICAL ADVANCE',
    cost: 1,
    type: 'MOVE',
    icon: '➤',
    color: '#61aef2',
    glow: 'rgba(55, 143, 226, 0.35)',
    target: 'self',
    text: 'Move the active operative to the next lane. Gain 1 Block.',
  },
  restrain: {
    id: 'restrain',
    name: 'RESTRAIN',
    cost: 1,
    type: 'CONTROL',
    icon: '⌘',
    color: '#e1a65a',
    glow: 'rgba(208, 128, 37, 0.35)',
    target: 'enemy',
    operative: 1,
    text: 'Apply 2 Restrain. The target loses its next action.',
  },
  suppress: {
    id: 'suppress',
    name: 'SUPPRESS',
    cost: 1,
    type: 'ATTACK',
    icon: '✦',
    color: '#f0c36d',
    glow: 'rgba(226, 157, 49, 0.35)',
    target: 'enemy',
    operative: 0,
    text: 'Deal 7 damage. Apply 1 Weak.',
  },
  shield: {
    id: 'shield',
    name: 'SHIELD UP',
    cost: 0,
    type: 'DEFEND',
    icon: '⬡',
    color: '#64b7ff',
    glow: 'rgba(47, 141, 230, 0.35)',
    target: 'self',
    text: 'Gain 6 Block. Draw 1 card.',
  },
  investigate: {
    id: 'investigate',
    name: 'INVESTIGATE',
    cost: 2,
    type: 'UTILITY',
    icon: '⌕',
    color: '#6ec6d6',
    glow: 'rgba(45, 153, 179, 0.35)',
    target: 'self',
    operative: 0,
    text: 'Draw 2 cards. Gain 1 bonus Time next turn.',
  },
  treatment: {
    id: 'treatment',
    name: 'FIELD TREATMENT',
    cost: 1,
    type: 'RECOVER',
    icon: '✚',
    color: '#6fc58c',
    glow: 'rgba(60, 163, 99, 0.35)',
    target: 'self',
    operative: 0,
    text: 'Restore 8 Health to the most injured operative.',
  },
  heavyArc: {
    id: 'heavyArc',
    name: 'HEAVY ARC',
    cost: 2,
    type: 'ATTACK',
    icon: '◒',
    color: '#e26d64',
    glow: 'rgba(185, 55, 56, 0.36)',
    target: 'enemy',
    operative: 1,
    text: 'Deal 12 damage. Deal 16 when Zélia shares the target lane.',
  },
  crossfire: {
    id: 'crossfire',
    name: 'CROSSFIRE',
    cost: 2,
    type: 'ATTACK',
    icon: '✣',
    color: '#c991e9',
    glow: 'rgba(141, 75, 185, 0.35)',
    target: 'self',
    text: 'Deal 4 damage to every enemy. Both operatives gain 2 Block.',
  },
};

const DECK_RECIPE = [
  'advance',
  'advance',
  'restrain',
  'suppress',
  'suppress',
  'shield',
  'shield',
  'investigate',
  'treatment',
  'heavyArc',
  'heavyArc',
  'crossfire',
];

const combat = {
  turn: 0,
  time: MAX_TIME,
  bonusTimeNextTurn: 0,
  drawPile: [],
  discardPile: [],
  hand: [],
  selectedHandIndex: null,
  resolving: false,
  enemies: [],
};

function lanePosition(side, lane) {
  const xDistance = Math.max(2.25, Math.min(3.5, targetCombatRoom.w * 0.24));
  return new THREE.Vector3(
    combatCenter.x + (side === 'ally' ? -xDistance : xDistance),
    0.08,
    combatCenter.z + laneOffsets[lane],
  );
}

function createEnemy(index, lane, elite = false) {
  const group = new THREE.Group();
  const color = elite ? 0x8e422f : index % 2 === 0 ? 0x6d302c : 0x4c3b58;
  const body = new THREE.Mesh(
    elite ? new THREE.IcosahedronGeometry(0.52, 0) : new THREE.DodecahedronGeometry(0.42, 0),
    new THREE.MeshStandardMaterial({
      color,
      emissive: elite ? 0x4d1a09 : 0x1d1018,
      emissiveIntensity: elite ? 0.8 : 0.5,
      roughness: 0.76,
    }),
  );
  body.position.y = elite ? 0.58 : 0.48;
  body.castShadow = true;
  group.add(body);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(elite ? 0.56 : 0.46, 0.045, 6, 18),
    new THREE.MeshBasicMaterial({ color: elite ? 0xff8b3d : 0xe34a3d, transparent: true, opacity: 0.78 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  group.add(ring);
  group.position.copy(lanePosition('enemy', lane));
  scene.add(group);
  const maxHealth = elite ? 28 : 18 + index * 3;
  return {
    id: `enemy-${index}`,
    name: elite ? 'SEIZURE ENFORCER' : `WARDEN UNIT ${index + 1}`,
    group,
    lane,
    elite,
    health: maxHealth,
    maxHealth,
    block: 0,
    restrain: 0,
    weak: 0,
    alive: true,
    intent: null,
    label: null,
  };
}

function createUnitLabel(unit, kind) {
  const wrapper = document.createElement('div');
  wrapper.className = `world-unit-label ${kind}${unit.elite ? ' elite' : ''}`;
  const button = document.createElement('button');
  button.type = 'button';
  if (kind === 'ally') button.disabled = true;
  button.innerHTML = `
    <strong><span class="unit-name"></span><span class="unit-hp"></span></strong>
    <span class="unit-health"><i></i></span>
    <small class="unit-intent"></small>
  `;
  wrapper.appendChild(button);
  worldLabels.appendChild(wrapper);
  if (kind === 'enemy') {
    button.addEventListener('click', () => playSelectedCardOn(unit));
  }
  unit.label = { wrapper, button };
}

function removeCombatLabels() {
  for (const operative of operatives) {
    operative.label?.wrapper.remove();
    operative.label = null;
  }
  for (const enemy of combat.enemies) {
    enemy.label?.wrapper.remove();
    enemy.label = null;
  }
}

function assignEnemyIntents() {
  for (const enemy of combat.enemies) {
    if (!enemy.alive) continue;
    if (enemy.restrain > 0) {
      enemy.intent = { type: 'restrained', label: 'RESTRAINED', value: 0 };
      continue;
    }
    const roll = random();
    if (roll < 0.65) {
      const base = enemy.elite ? 10 : 5 + Math.floor(random() * 4);
      enemy.intent = { type: 'attack', label: `ATTACK ${base}`, value: base };
    } else if (roll < 0.86) {
      const value = enemy.elite ? 8 : 5;
      enemy.intent = { type: 'guard', label: `GUARD ${value}`, value };
    } else {
      enemy.intent = { type: 'pressure', label: 'PRESSURE', value: 1 };
    }
  }
}

function startCombat() {
  if (mode !== 'explore') return;
  mode = 'combat';
  document.body.classList.add('combat-mode');
  targetMarker.visible = false;
  barrierGroup.visible = true;
  laneGuides.visible = true;
  coreFragment.visible = true;
  objectiveReadout.textContent = 'Card combat active · spend Time, read intents, secure the core.';
  combatUi.objective.textContent = 'Secure the core fragment';

  operatives[0].lane = 0;
  operatives[1].lane = 2;
  for (const operative of operatives) {
    operative.block = 0;
    operative.group.position.copy(lanePosition('ally', operative.lane));
    operative.group.rotation.y = -Math.PI / 2;
    createUnitLabel(operative, 'ally');
  }

  const enemyCount = interlacingActive ? 4 : 3;
  for (let index = 0; index < enemyCount; index += 1) {
    const lane = index % 3;
    const elite = index === enemyCount - 1 && interlacingActive;
    const enemy = createEnemy(index, lane, elite);
    createUnitLabel(enemy, 'enemy');
    combat.enemies.push(enemy);
  }

  combat.drawPile = shuffle([...DECK_RECIPE]);
  combat.discardPile = [];
  combat.hand = [];
  combat.turn = 0;
  combat.time = MAX_TIME;
  combat.bonusTimeNextTurn = 0;
  combat.selectedHandIndex = null;
  assignEnemyIntents();
  beginPlayerTurn();
  showBanner('INTERLACED CONTACT', 'CARD COMBAT ENGAGED', 1.7);
  resize();
}

function refillDrawPile() {
  if (combat.drawPile.length > 0 || combat.discardPile.length === 0) return;
  combat.drawPile = shuffle(combat.discardPile.splice(0));
}

function drawCards(count) {
  for (let i = 0; i < count; i += 1) {
    refillDrawPile();
    if (combat.drawPile.length === 0) break;
    combat.hand.push(combat.drawPile.pop());
  }
}

function beginPlayerTurn() {
  combat.turn += 1;
  combat.resolving = false;
  endTurnButton.disabled = false;
  combat.time = MAX_TIME + combat.bonusTimeNextTurn;
  combat.bonusTimeNextTurn = 0;
  combat.selectedHandIndex = null;
  for (const operative of operatives) operative.block = 0;
  drawCards(Math.max(0, HAND_SIZE - combat.hand.length));
  assignEnemyIntents();
  renderCombatHud();
  showBanner('YOUR TURN', `${combat.time} TIME AVAILABLE`, 0.8);
}

function cardOwnerAlive(card) {
  return card.operative === undefined || operatives[card.operative].alive;
}

function renderHand() {
  handElement.replaceChildren();
  combat.hand.forEach((cardId, index) => {
    const card = CARD_LIBRARY[cardId];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `card${combat.selectedHandIndex === index ? ' selected' : ''}`;
    button.style.setProperty('--card-color', card.color);
    button.style.setProperty('--card-glow', card.glow);
    button.disabled = combat.resolving || card.cost > combat.time || !cardOwnerAlive(card);
    button.innerHTML = `
      <span class="card-cost">${card.cost}</span>
      <h3>${card.name}</h3>
      <div class="card-art">${card.icon}</div>
      <span class="card-type">${card.type}</span>
      <p>${card.text}</p>
    `;
    button.addEventListener('click', () => selectCard(index));
    handElement.appendChild(button);
  });
}

function renderTime() {
  combatUi.timeCopy.textContent = `${combat.time} / ${MAX_TIME}`;
  combatUi.timePips.replaceChildren();
  for (let index = 0; index < Math.max(MAX_TIME, combat.time); index += 1) {
    const pip = document.createElement('i');
    if (index >= combat.time) pip.classList.add('empty');
    combatUi.timePips.appendChild(pip);
  }
}

function renderCombatHud() {
  if (mode !== 'combat') return;
  const active = activeOperative();
  combatUi.activeName.textContent = active.definition.name;
  combatUi.activePortrait.className = `portrait portrait-${active.definition.id}`;
  combatUi.activePortrait.innerHTML = `<span>${active.definition.symbol}</span>`;
  combatUi.activeHealth.textContent = `${Math.ceil(active.health)} / ${active.definition.maxHealth}`;
  combatUi.activeHealthFill.style.width = `${Math.max(0, active.health / active.definition.maxHealth) * 100}%`;
  combatUi.activeBlock.textContent = String(active.block);
  combatUi.enemyCount.textContent = String(combat.enemies.filter((enemy) => enemy.alive).length);
  combatUi.eliteCount.textContent = String(combat.enemies.filter((enemy) => enemy.alive && enemy.elite).length);
  combatUi.turn.textContent = String(combat.turn);
  combatUi.drawCount.textContent = String(combat.drawPile.length);
  combatUi.discardCount.textContent = String(combat.discardPile.length);
  combatUi.partyButtons.forEach((button, index) => {
    button.classList.toggle('active', index === activeOperativeIndex);
    button.disabled = !operatives[index].alive || combat.resolving;
  });
  renderTime();
  renderHand();
  updateWorldLabelContent();
}

function selectCard(index) {
  if (mode !== 'combat' || combat.resolving) return;
  const card = CARD_LIBRARY[combat.hand[index]];
  if (!card || card.cost > combat.time || !cardOwnerAlive(card)) return;
  if (card.target === 'enemy') {
    combat.selectedHandIndex = combat.selectedHandIndex === index ? null : index;
    renderCombatHud();
    return;
  }
  playCard(index, null);
}

function playSelectedCardOn(enemy) {
  if (mode !== 'combat' || combat.selectedHandIndex === null || !enemy.alive) return;
  const card = CARD_LIBRARY[combat.hand[combat.selectedHandIndex]];
  if (card?.target !== 'enemy') return;
  playCard(combat.selectedHandIndex, enemy);
}

function absorbDamage(unit, amount) {
  const blocked = Math.min(unit.block, amount);
  unit.block -= blocked;
  const healthDamage = Math.max(0, amount - blocked);
  unit.health = Math.max(0, unit.health - healthDamage);
  if (unit.health <= 0) {
    unit.alive = false;
    unit.group.visible = false;
  }
  unit.group.scale.set(1.18, 0.84, 1.18);
  return { blocked, healthDamage };
}

function damageEnemy(enemy, amount) {
  if (!enemy.alive) return;
  absorbDamage(enemy, amount);
  if (!enemy.alive) {
    enemy.label?.wrapper.classList.remove('targetable');
    showBanner('HOSTILE REMOVED', enemy.name, 0.65);
  }
}

function healOperative(operative, amount) {
  if (!operative.alive) return;
  operative.health = Math.min(operative.definition.maxHealth, operative.health + amount);
  operative.group.scale.set(1.08, 1.12, 1.08);
}

function moveOperativeToLane(operative, lane) {
  operative.lane = (lane + 3) % 3;
  operative.group.position.copy(lanePosition('ally', operative.lane));
}

function applyCardEffect(card, target) {
  if (card.operative !== undefined) activeOperativeIndex = card.operative;
  const active = activeOperative();

  switch (card.id) {
    case 'advance':
      moveOperativeToLane(active, active.lane + 1);
      active.block += 1;
      break;
    case 'restrain':
      target.restrain += 2;
      target.intent = { type: 'restrained', label: 'RESTRAINED', value: 0 };
      break;
    case 'suppress':
      damageEnemy(target, 7);
      target.weak += 1;
      break;
    case 'shield':
      active.block += 6;
      drawCards(1);
      break;
    case 'investigate':
      drawCards(2);
      combat.bonusTimeNextTurn += 1;
      break;
    case 'treatment': {
      const patient = [...operatives]
        .filter((operative) => operative.alive)
        .sort((a, b) => a.health / a.definition.maxHealth - b.health / b.definition.maxHealth)[0];
      if (patient) healOperative(patient, 8);
      break;
    }
    case 'heavyArc': {
      const amount = active.lane === target.lane ? 16 : 12;
      damageEnemy(target, amount);
      break;
    }
    case 'crossfire':
      for (const enemy of combat.enemies) if (enemy.alive) damageEnemy(enemy, 4);
      for (const operative of operatives) if (operative.alive) operative.block += 2;
      break;
    default:
      break;
  }
}

function playCard(index, target) {
  const cardId = combat.hand[index];
  const card = CARD_LIBRARY[cardId];
  if (!card || card.cost > combat.time || combat.resolving) return;
  combat.time -= card.cost;
  combat.hand.splice(index, 1);
  combat.discardPile.push(cardId);
  combat.selectedHandIndex = null;
  applyCardEffect(card, target);
  if (combat.enemies.every((enemy) => !enemy.alive)) {
    winCombat();
    return;
  }
  renderCombatHud();
}

function chooseEnemyTarget(enemy) {
  const sameLane = operatives.find((operative) => operative.alive && operative.lane === enemy.lane);
  if (sameLane) return sameLane;
  if (activeOperative().alive) return activeOperative();
  return operatives.find((operative) => operative.alive) ?? null;
}

function delay(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function endTurn() {
  if (mode !== 'combat' || combat.resolving) return;
  combat.resolving = true;
  endTurnButton.disabled = true;
  combat.selectedHandIndex = null;
  combat.discardPile.push(...combat.hand.splice(0));
  renderCombatHud();
  showBanner('ENEMY TURN', 'INTENTS RESOLVING', 0.75);
  await delay(550);

  for (const enemy of combat.enemies) {
    if (!enemy.alive) continue;
    enemy.group.scale.lerp(new THREE.Vector3(1, 1, 1), 1);
    if (enemy.restrain > 0) {
      enemy.restrain = Math.max(0, enemy.restrain - 1);
      enemy.intent = { type: 'restrained', label: 'ACTION LOST', value: 0 };
      updateWorldLabelContent();
      await delay(380);
      continue;
    }

    const intent = enemy.intent;
    if (intent?.type === 'attack') {
      const target = chooseEnemyTarget(enemy);
      if (target) {
        const weakPenalty = enemy.weak > 0 ? 2 : 0;
        const pressureBonus = interlacingActive ? 2 : 0;
        absorbDamage(target, Math.max(1, intent.value - weakPenalty + pressureBonus));
        if (enemy.weak > 0) enemy.weak -= 1;
        if (!target.alive) showBanner('OPERATIVE DOWN', target.definition.name, 0.75);
      }
    } else if (intent?.type === 'guard') {
      enemy.block += intent.value;
    } else if (intent?.type === 'pressure') {
      combat.bonusTimeNextTurn = Math.max(-1, combat.bonusTimeNextTurn - 1);
      for (const operative of operatives) operative.block = Math.max(0, operative.block - 2);
    }

    enemy.group.scale.set(1.18, 0.84, 1.18);
    updateWorldLabelContent();
    await delay(430);
    if (operatives.every((operative) => !operative.alive)) {
      loseCombat();
      return;
    }
  }

  const firstAlive = operatives.findIndex((operative) => operative.alive);
  if (!operatives[activeOperativeIndex].alive && firstAlive >= 0) activeOperativeIndex = firstAlive;
  beginPlayerTurn();
}

function switchOperative(index = 1 - activeOperativeIndex) {
  if (!operatives[index]?.alive || combat.resolving) return;
  activeOperativeIndex = index;
  if (mode === 'combat') renderCombatHud();
  else showBanner('FIELD PAIR', `${activeOperative().definition.name} ACTIVE`, 0.65);
}

function winCombat() {
  combat.resolving = true;
  mode = 'victory';
  document.body.classList.add('victory-mode');
  barrierGroup.visible = false;
  combatUi.objective.textContent = 'Core fragment secured';
  objectiveReadout.textContent = 'Room clear · collect the core fragment.';
  showBanner('ROOM CLEAR', 'CORE FRAGMENT EXPOSED', 1.6);
  endTurnButton.disabled = true;
  window.setTimeout(() => {
    removeCombatLabels();
    for (const enemy of combat.enemies) scene.remove(enemy.group);
    combat.enemies.length = 0;
    document.body.classList.remove('combat-mode', 'victory-mode');
    laneGuides.visible = false;
    mode = 'explore';
    coreFragment.visible = true;
    for (const operative of operatives) {
      if (!operative.alive) {
        operative.alive = true;
        operative.health = Math.ceil(operative.definition.maxHealth * 0.35);
        operative.group.visible = true;
      }
      operative.block = 0;
      operative.group.position.copy(lanePosition('ally', operative.lane));
    }
    resize();
  }, 1750);
}

function loseCombat() {
  combat.resolving = true;
  mode = 'defeat';
  endTurnButton.disabled = true;
  showBanner('FIELD TEAM LOST', 'RESETTING COMBAT TEST', 2);
  window.setTimeout(resetCombatTest, 2200);
}

function resetCombatTest() {
  removeCombatLabels();
  for (const enemy of combat.enemies) scene.remove(enemy.group);
  combat.enemies.length = 0;
  combat.hand = [];
  combat.drawPile = [];
  combat.discardPile = [];
  barrierGroup.visible = false;
  laneGuides.visible = false;
  coreFragment.visible = false;
  targetMarker.visible = true;
  document.body.classList.remove('combat-mode', 'victory-mode');
  mode = 'explore';
  activeOperativeIndex = 0;
  for (let i = 0; i < operatives.length; i += 1) {
    const operative = operatives[i];
    operative.health = operative.definition.maxHealth;
    operative.block = 0;
    operative.alive = true;
    operative.group.visible = true;
    operative.group.position.copy(entrancePosition).add(new THREE.Vector3(i * 0.7, 0, i * 0.7));
  }
  objectiveReadout.textContent = `Reach room ${String(targetCombatRoom.id).padStart(2, '0')} to retry card combat.`;
  resize();
}

function updateWorldLabelContent() {
  if (mode !== 'combat') return;
  const selectedCard = combat.selectedHandIndex === null ? null : CARD_LIBRARY[combat.hand[combat.selectedHandIndex]];
  for (const operative of operatives) {
    if (!operative.label) continue;
    const { button, wrapper } = operative.label;
    wrapper.style.display = operative.alive ? 'block' : 'none';
    button.querySelector('.unit-name').textContent = `${operative.definition.name} · ${LANE_NAMES[operative.lane]}`;
    button.querySelector('.unit-hp').textContent = `${Math.ceil(operative.health)}/${operative.definition.maxHealth}`;
    button.querySelector('.unit-health i').style.width = `${Math.max(0, operative.health / operative.definition.maxHealth) * 100}%`;
    button.querySelector('.unit-intent').textContent = operative.block > 0 ? `BLOCK ${operative.block}` : '';
  }
  for (const enemy of combat.enemies) {
    if (!enemy.label) continue;
    const { button, wrapper } = enemy.label;
    wrapper.style.display = enemy.alive ? 'block' : 'none';
    wrapper.classList.toggle('targetable', Boolean(selectedCard?.target === 'enemy' && enemy.alive));
    button.querySelector('.unit-name').textContent = `${enemy.name} · ${LANE_NAMES[enemy.lane]}`;
    button.querySelector('.unit-hp').textContent = `${Math.ceil(enemy.health)}/${enemy.maxHealth}`;
    button.querySelector('.unit-health i').style.width = `${Math.max(0, enemy.health / enemy.maxHealth) * 100}%`;
    const status = [enemy.intent?.label, enemy.block > 0 ? `BLOCK ${enemy.block}` : '', enemy.weak > 0 ? `WEAK ${enemy.weak}` : '']
      .filter(Boolean)
      .join(' · ');
    button.querySelector('.unit-intent').textContent = status;
  }
}

function positionWorldLabel(unit) {
  if (!unit.label || !unit.group.visible) return;
  const position = unit.group.position.clone();
  position.y += unit.elite ? 1.55 : 1.25;
  position.project(camera);
  const x = (position.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-position.y * 0.5 + 0.5) * window.innerHeight;
  unit.label.wrapper.style.left = `${x}px`;
  unit.label.wrapper.style.top = `${y}px`;
}

function updateExploration(delta) {
  if (mode !== 'explore') return;
  const active = activeOperative();
  let inputX = 0;
  let inputZ = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) inputX -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) inputX += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) inputZ -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) inputZ += 1;
  const length = Math.hypot(inputX, inputZ);
  if (length > 0) {
    inputX /= length;
    inputZ /= length;
    moveWithCollision(active.group, inputX * EXPLORE_SPEED * delta, inputZ * EXPLORE_SPEED * delta);
    active.group.rotation.y = Math.atan2(-inputX, -inputZ);
  }

  const partner = inactiveOperative();
  if (partner.alive) {
    const desired = active.group.position.clone().add(new THREE.Vector3(0.8, 0, 0.8));
    const offset = desired.sub(partner.group.position);
    if (offset.length() > 0.25) {
      offset.normalize();
      moveWithCollision(partner.group, offset.x * EXPLORE_SPEED * 0.9 * delta, offset.z * EXPLORE_SPEED * 0.9 * delta);
    }
  }

  const room = roomAtWorld(active.group.position.x, active.group.position.z);
  roomReadout.textContent = room
    ? `ROOM ${String(room.id).padStart(2, '0')} · ${room.type.toUpperCase()} · DEPTH ${room.depth}`
    : 'CORRIDOR · BETWEEN ROOMS';
  if (room?.id === targetCombatRoom.id && !coreCollected) startCombat();

  if (coreFragment.visible && !coreCollected && active.group.position.distanceTo(coreFragment.position) < 0.95) {
    coreCollected = true;
    coreFragment.visible = false;
    recoveredValue = interlacingActive ? 250 : 125;
    objectiveReadout.textContent = `Core fragment recovered · value ₵ ${recoveredValue}. Extraction is the next milestone.`;
    showBanner('OBJECT RECOVERED', `VALUE ₵ ${recoveredValue}`, 1.5);
  }
}

function applyInterlacing(active) {
  interlacingActive = active;
  scene.background = active ? activeBackground : dormantBackground;
  scene.fog.color.copy(active ? activeBackground : dormantBackground);
  ambient.color.set(active ? 0xa35d87 : 0x92a6b7);
  keyLight.color.set(active ? 0xff7358 : 0xffd59c);
  rimLight.color.set(active ? 0x555cff : 0x4f91be);
  for (let i = 0; i < baseFloorColors.length; i += 1) {
    if (active) {
      const phaseColor = i % 2 === 0 ? interlaceA : interlaceB;
      tempColor.copy(baseFloorColors[i]).lerp(phaseColor, 0.43);
      floorMesh.setColorAt(i, tempColor);
    } else {
      floorMesh.setColorAt(i, baseFloorColors[i]);
    }
  }
  floorMesh.instanceColor.needsUpdate = true;
  interlaceReadout.textContent = active ? 'ACTIVE' : 'DORMANT';
  interlaceReadout.classList.toggle('active', active);
  interlaceFill.style.width = active ? '100%' : '12%';
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Tab') event.preventDefault();
  keys.add(event.code);
  if (event.repeat) return;
  if (event.code === 'KeyI') applyInterlacing(!interlacingActive);
  else if (event.code === 'KeyQ' || event.code === 'Tab') switchOperative();
  else if (event.code === 'Enter' && mode === 'combat') endTurn();
  else if (/^Digit[1-5]$/.test(event.code) && mode === 'combat') {
    const index = Number(event.code.slice(-1)) - 1;
    if (combat.hand[index]) selectCard(index);
  }
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
endTurnButton.addEventListener('click', endTurn);
combatUi.partyButtons.forEach((button) => {
  button.addEventListener('click', () => switchOperative(Number(button.dataset.operative)));
});

function updateCamera() {
  const target = mode === 'combat' || mode === 'victory' || mode === 'defeat' ? combatCenter : activeOperative().group.position;
  cameraTarget.lerp(target, 0.12);
  camera.position.set(cameraTarget.x + 9.3, 15.5, cameraTarget.z + 9.3);
  camera.lookAt(cameraTarget.x, 0, cameraTarget.z);
}

function resize() {
  const aspect = window.innerWidth / window.innerHeight;
  const size = mode === 'combat' ? 8.7 : 10.7;
  camera.left = -size * aspect;
  camera.right = size * aspect;
  camera.top = size;
  camera.bottom = -size;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;
  if (bannerTimer > 0) {
    bannerTimer -= delta;
    if (bannerTimer <= 0) encounterBanner.classList.remove('show');
  }

  updateExploration(delta);
  updateCamera();
  entranceMarker.scale.setScalar(0.92 + Math.sin(elapsed * 2.1) * 0.08);
  targetMarker.rotation.y += delta * 0.45;
  coreFragment.rotation.y += delta * 1.25;
  coreFragment.position.y = 0.78 + Math.sin(elapsed * 2.4) * 0.11;

  for (const operative of operatives) {
    operative.group.scale.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.exp(-delta * 12));
    if (mode === 'combat') positionWorldLabel(operative);
  }
  for (const enemy of combat.enemies) {
    enemy.group.scale.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.exp(-delta * 12));
    enemy.group.rotation.y += delta * (enemy.elite ? 0.55 : 0.28);
    if (mode === 'combat') positionWorldLabel(enemy);
  }

  renderer.render(scene, camera);
}

roomReadout.textContent = `ROOM ${String(entrance.id).padStart(2, '0')} · ENTRANCE · DEPTH 0`;
frame();
