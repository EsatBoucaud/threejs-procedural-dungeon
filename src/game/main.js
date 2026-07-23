import * as THREE from 'three';
import mapState from '../../content/maps/generated/abrir-mvp-seed-20260723.json';
import './styles.css';

const FLOOR = 1;
const WALL = 2;
const POOL = 3;
const PLAYER_RADIUS = 0.3;
const ENEMY_RADIUS = 0.3;
const EXPLORE_SPEED = 5.4;
const MAX_TIME = 3;
const HAND_SIZE = 5;
const LANE_NAMES = ['FRONT', 'MID', 'REAR'];

const viewport = document.querySelector('#viewport');
const worldLabels = document.querySelector('#world-labels');
const damageVignette = document.querySelector('#damage-vignette');
const mapName = document.querySelector('#map-name');
const mapMeta = document.querySelector('#map-meta');
const roomReadout = document.querySelector('#room-readout');
const objectiveReadout = document.querySelector('#objective-readout');
const interlaceReadout = document.querySelector('#interlace-readout');
const interlaceFill = document.querySelector('#interlace-fill');
const recoveredValueReadout = document.querySelector('#recovered-value');
const skirmishStateReadout = document.querySelector('#skirmish-state');
const tacticalStateReadout = document.querySelector('#tactical-state');
const encounterBanner = document.querySelector('#encounter-banner');
const encounterKicker = document.querySelector('#encounter-kicker');
const encounterMessage = document.querySelector('#encounter-message');
const handElement = document.querySelector('#hand');
const endTurnButton = document.querySelector('#end-turn');
const extractionPanel = document.querySelector('#extraction-panel');
const extractionCopy = document.querySelector('#extraction-copy');
const extractionValue = document.querySelector('#extraction-value');
const extractNowButton = document.querySelector('#extract-now');
const stayLateButton = document.querySelector('#stay-late');
const resultsPanel = document.querySelector('#results-panel');
const resultTitle = document.querySelector('#result-title');
const resultGross = document.querySelector('#result-gross');
const resultRetained = document.querySelector('#result-retained');
const resultSecured = document.querySelector('#result-secured');
const restartRunButton = document.querySelector('#restart-run');

const cardUi = {
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

const realtimeUi = {
  agentCards: [document.querySelector('#rt-agent-0'), document.querySelector('#rt-agent-1')],
  healthFills: [document.querySelector('#rt-health-0'), document.querySelector('#rt-health-1')],
  healthCopies: [document.querySelector('#rt-health-copy-0'), document.querySelector('#rt-health-copy-1')],
  primary: document.querySelector('#rt-primary'),
  secondary: document.querySelector('#rt-secondary'),
  dodge: document.querySelector('#rt-dodge'),
  primaryName: document.querySelector('#rt-primary-name'),
  primaryCopy: document.querySelector('#rt-primary-copy'),
  secondaryName: document.querySelector('#rt-secondary-name'),
  secondaryCopy: document.querySelector('#rt-secondary-copy'),
  enemyCount: document.querySelector('#rt-enemy-count'),
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

const combatRooms = [...generated.rooms]
  .filter((room) => room.type === 'combat' && room.depth > 0)
  .sort((a, b) => a.depth - b.depth || b.w * b.h - a.w * a.h);
const eliteRooms = [...generated.rooms]
  .filter((room) => room.type === 'elite')
  .sort((a, b) => a.depth - b.depth || b.w * b.h - a.w * a.h);

const realtimeRoom = combatRooms[0];
const cardRoom =
  eliteRooms.find((room) => Math.min(room.w, room.h) >= 6) ??
  [...combatRooms].reverse().find((room) => room.id !== realtimeRoom?.id && Math.min(room.w, room.h) >= 6) ??
  roomById.get(generated.bossRoomId);

if (!realtimeRoom || !cardRoom || realtimeRoom.id === cardRoom.id) {
  throw new Error('Saved map needs distinct real-time and card combat rooms.');
}

mapName.textContent = generated.name;
mapMeta.textContent =
  `seed ${mapState.generator.seed} · ${generated.rooms.length} rooms · ` +
  `${generated.edges.length} links · saved Three.js state`;

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
const realtimeCenter = new THREE.Vector3(worldX(realtimeRoom.cx), 0, worldZ(realtimeRoom.cy));
const cardCenter = new THREE.Vector3(worldX(cardRoom.cx), 0, worldZ(cardRoom.cy));

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
const realtimeRoomColor = new THREE.Color(0x956044);
const cardRoomColor = new THREE.Color(0x4c729b);
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
  if (room?.id === realtimeRoom.id) color = color.lerp(realtimeRoomColor, 0.58);
  if (room?.id === cardRoom.id) color = color.lerp(cardRoomColor, 0.58);
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

function createEncounterMarker(room, color) {
  const group = new THREE.Group();
  const ring = makeRing(color, 0.82);
  group.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.34, 3.8, 10, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide }),
  );
  beam.position.y = 1.9;
  group.add(beam);
  group.position.set(worldX(room.cx), 0.15, worldZ(room.cy));
  scene.add(group);
  return group;
}

const entranceMarker = makeRing(0x53d0aa);
entranceMarker.position.set(worldX(entrance.cx), 0.16, worldZ(entrance.cy));
scene.add(entranceMarker);
const realtimeMarker = createEncounterMarker(realtimeRoom, 0xe07a4d);
const cardMarker = createEncounterMarker(cardRoom, 0x58aaff);

function createRoomBarrier(room, color) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 0.82,
    roughness: 0.45,
  });
  const doorCells = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = cellIndex(x, y);
      if (!doorway[index]) continue;
      const neighbors = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
      const touchesRoom = neighbors.some(([nx, ny]) => {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) return false;
        return roomId[cellIndex(nx, ny)] === room.id;
      });
      if (touchesRoom) doorCells.push({ x, y });
    }
  }
  for (const cell of doorCells) {
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.55, 0.18), material);
    barrier.position.set(worldX(cell.x), 0.82, worldZ(cell.y));
    const horizontalDoor =
      (cell.x > 0 && roomId[cellIndex(cell.x - 1, cell.y)] === room.id) ||
      (cell.x < width - 1 && roomId[cellIndex(cell.x + 1, cell.y)] === room.id);
    if (horizontalDoor) barrier.rotation.y = Math.PI / 2;
    barrier.castShadow = true;
    group.add(barrier);
  }
  group.visible = false;
  scene.add(group);
  return group;
}

const realtimeBarrier = createRoomBarrier(realtimeRoom, 0xa63b28);
const cardBarrier = createRoomBarrier(cardRoom, 0x315ca8);

const laneGuides = new THREE.Group();
scene.add(laneGuides);
const laneSpacing = Math.max(1.25, Math.min(2.0, cardRoom.h / 4.2));
const laneOffsets = [-laneSpacing, 0, laneSpacing];
for (let lane = 0; lane < 3; lane += 1) {
  const points = [
    new THREE.Vector3(cardCenter.x - Math.min(4.5, cardRoom.w * 0.35), 0.16, cardCenter.z + laneOffsets[lane]),
    new THREE.Vector3(cardCenter.x + Math.min(4.5, cardRoom.w * 0.35), 0.16, cardCenter.z + laneOffsets[lane]),
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color: 0x4f8fc8, transparent: true, opacity: 0.34 });
  laneGuides.add(new THREE.Line(geometry, material));
}
laneGuides.visible = false;

function createRewardMesh(color, emissive) {
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.48, 0),
    new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity: 1.0,
      metalness: 0.48,
      roughness: 0.26,
    }),
  );
  mesh.castShadow = true;
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
}

const skirmishReward = createRewardMesh(0xd37648, 0x6a2813);
skirmishReward.position.set(realtimeCenter.x, 0.78, realtimeCenter.z);
const tacticalReward = createRewardMesh(0x5f9ed7, 0x173b68);
tacticalReward.position.set(cardCenter.x, 0.78, cardCenter.z);

const OPERATIVE_DEFS = [
  {
    id: 'socrates',
    name: 'SÓCRATES',
    role: 'FIELD MEDIC',
    maxHealth: 42,
    color: 0xd2b58c,
    accent: 0x3f9dd8,
    symbol: 'S',
    speed: 5.7,
    primaryName: 'PRECISION SHOT',
    primaryCopy: 'Fast ranged projectile',
    primaryCooldown: 0.28,
    primaryDamage: 12,
    secondaryName: 'FIELD TREATMENT',
    secondaryCopy: 'Restore both operatives',
    secondaryCooldown: 9,
  },
  {
    id: 'zelia',
    name: 'ZÉLIA',
    role: 'VANGUARD',
    maxHealth: 52,
    color: 0xa74d52,
    accent: 0x56b190,
    symbol: 'Z',
    speed: 5.15,
    primaryName: 'HEAVY ARC',
    primaryCopy: 'Wide close-range strike',
    primaryCooldown: 0.58,
    primaryDamage: 20,
    secondaryName: 'GROUND BREAK',
    secondaryCopy: 'Damage nearby enemies',
    secondaryCooldown: 7.5,
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
  const direction = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 0.34, 9),
    new THREE.MeshStandardMaterial({ color: definition.accent, roughness: 0.5 }),
  );
  direction.rotation.x = Math.PI / 2;
  direction.position.set(0, 0.46, -0.39);
  group.add(direction);
  return {
    definition,
    group,
    health: definition.maxHealth,
    block: 0,
    lane: definition.id === 'socrates' ? 0 : 2,
    alive: true,
    label: null,
    cooldowns: { primary: 0, secondary: 0, dodge: 0 },
    dodgeTimer: 0,
    invulnerableTimer: 0,
    dodgeDirection: new THREE.Vector3(0, 0, -1),
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
let stayUsed = false;
let phase = 1;
let extractionOpen = false;
const cleared = { realtime: false, card: false };
const rewardCollected = { realtime: false, card: false };
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

function canOccupyInRoom(x, z, room, radius = PLAYER_RADIUS) {
  return canOccupy(x, z, radius) && roomAtWorld(x, z)?.id === room.id;
}

function moveWithCollision(group, dx, dz, collisionTest = canOccupy) {
  const nextX = group.position.x + dx;
  const nextZ = group.position.z + dz;
  if (collisionTest(nextX, group.position.z)) group.position.x = nextX;
  if (collisionTest(group.position.x, nextZ)) group.position.z = nextZ;
}

function showBanner(kicker, message, duration = 1.35) {
  encounterKicker.textContent = kicker;
  encounterMessage.textContent = message;
  encounterBanner.classList.add('show');
  bannerTimer = duration;
}

function flashDamage() {
  damageVignette.classList.remove('hit');
  void damageVignette.offsetWidth;
  damageVignette.classList.add('hit');
  window.setTimeout(() => damageVignette.classList.remove('hit'), 130);
}

function updateRunLedger() {
  recoveredValueReadout.textContent = `₵ ${String(recoveredValue).padStart(3, '0')}`;
  skirmishStateReadout.textContent = rewardCollected.realtime ? 'RECOVERED' : cleared.realtime ? 'OBJECT EXPOSED' : 'OPEN';
  tacticalStateReadout.textContent = rewardCollected.card ? 'RECOVERED' : cleared.card ? 'OBJECT EXPOSED' : 'OPEN';
  skirmishStateReadout.classList.toggle('cleared', cleared.realtime);
  tacticalStateReadout.classList.toggle('cleared', cleared.card);
}

function updateObjective() {
  if (mode !== 'explore') return;
  if (!cleared.realtime || !cleared.card) {
    const tasks = [];
    if (!cleared.realtime) tasks.push(`Room ${String(realtimeRoom.id).padStart(2, '0')} · REAL-TIME SKIRMISH`);
    if (!cleared.card) tasks.push(`Room ${String(cardRoom.id).padStart(2, '0')} · CARD COMBAT`);
    objectiveReadout.textContent = `Open encounters: ${tasks.join('  /  ')}`;
    return;
  }
  if (!rewardCollected.realtime || !rewardCollected.card) {
    objectiveReadout.textContent = 'Both rooms are clear · recover the exposed objects.';
    return;
  }
  objectiveReadout.textContent = 'Return to the entrance portal to extract or remain after night.';
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

let random = mulberry32(mapState.generator.seed ^ 0xa8b1c2d3);
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function createUnitLabel(unit, kind, interactive = false) {
  const wrapper = document.createElement('div');
  wrapper.className = `world-unit-label ${kind}${unit.elite ? ' elite' : ''}`;
  const button = document.createElement('button');
  button.type = 'button';
  button.disabled = !interactive;
  button.innerHTML = `
    <strong><span class="unit-name"></span><span class="unit-hp"></span></strong>
    <span class="unit-health"><i></i></span>
    <small class="unit-intent"></small>
  `;
  wrapper.appendChild(button);
  worldLabels.appendChild(wrapper);
  if (interactive) button.addEventListener('click', () => playSelectedCardOn(unit));
  unit.label = { wrapper, button };
}

function removeUnitLabel(unit) {
  unit.label?.wrapper.remove();
  unit.label = null;
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

function forwardFor(group) {
  return new THREE.Vector3(-Math.sin(group.rotation.y), 0, -Math.cos(group.rotation.y));
}

function damageOperative(operative, amount) {
  if (!operative.alive || operative.invulnerableTimer > 0) return;
  const blocked = Math.min(operative.block, amount);
  operative.block -= blocked;
  operative.health = Math.max(0, operative.health - Math.max(0, amount - blocked));
  operative.invulnerableTimer = 0.22;
  if (operative === activeOperative()) flashDamage();
  operative.group.scale.set(1.16, 0.84, 1.16);
  if (operative.health <= 0) {
    operative.alive = false;
    operative.group.visible = false;
    removeUnitLabel(operative);
    const next = operatives.findIndex((candidate) => candidate.alive);
    if (next >= 0) {
      activeOperativeIndex = next;
      showBanner('OPERATIVE DOWN', `${activeOperative().definition.name} TAKES CONTROL`, 1.2);
    } else {
      handleTeamDefeat();
    }
  }
}

function healOperative(operative, amount) {
  if (!operative.alive) return;
  operative.health = Math.min(operative.definition.maxHealth, operative.health + amount);
  operative.group.scale.set(1.08, 1.12, 1.08);
}

function handleTeamDefeat() {
  mode = 'defeat';
  showBanner('FIELD TEAM LOST', 'THE CURRENT HAUL IS AT RISK', 1.8);
  window.setTimeout(() => {
    recoveredValue = Math.floor(recoveredValue * 0.75);
    resetCurrentEncounter();
  }, 1900);
}

const realtime = {
  enemies: [],
  projectiles: [],
  effects: [],
  aimPoint: realtimeCenter.clone().add(new THREE.Vector3(0, 0, -3)),
};

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.12);

function updatePointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  raycaster.ray.intersectPlane(aimPlane, realtime.aimPoint);
}

function createRealtimeEnemy(index) {
  const elite = interlacingActive && index === 3;
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    elite ? new THREE.IcosahedronGeometry(0.5, 0) : new THREE.DodecahedronGeometry(0.4, 0),
    new THREE.MeshStandardMaterial({
      color: elite ? 0x93432f : index % 2 === 0 ? 0x6d302c : 0x4c3b58,
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
  const angle = (index / (interlacingActive ? 4 : 3)) * Math.PI * 2;
  group.position.set(realtimeCenter.x + Math.cos(angle) * 2.4, 0.08, realtimeCenter.z + Math.sin(angle) * 2.4);
  scene.add(group);
  const maxHealth = elite ? 64 : 34 + realtimeRoom.depth * 3;
  const enemy = {
    id: `rt-enemy-${index}`,
    name: elite ? 'SEIZURE ENFORCER' : `WARDEN ${index + 1}`,
    group,
    elite,
    health: maxHealth,
    maxHealth,
    speed: elite ? 2.15 : 1.7 + index * 0.08,
    damage: elite ? 8 : 4 + Math.floor(realtimeRoom.depth / 3),
    attackTimer: random() * 0.4,
    alive: true,
    label: null,
  };
  createUnitLabel(enemy, 'enemy', false);
  return enemy;
}

function clearRealtimeEntities() {
  for (const enemy of realtime.enemies) {
    removeUnitLabel(enemy);
    scene.remove(enemy.group);
  }
  realtime.enemies.length = 0;
  for (const projectile of realtime.projectiles) scene.remove(projectile.mesh);
  realtime.projectiles.length = 0;
  for (const effect of realtime.effects) scene.remove(effect.mesh);
  realtime.effects.length = 0;
}

function startRealtimeCombat() {
  if (mode !== 'explore' || cleared.realtime) return;
  mode = 'realtime';
  document.body.classList.add('realtime-mode');
  realtimeBarrier.visible = true;
  realtimeMarker.visible = false;
  objectiveReadout.textContent = 'Real-time room locked · clear the hostile wave.';
  const offsets = [new THREE.Vector3(-1.1, 0, 0.8), new THREE.Vector3(-1.1, 0, -0.8)];
  for (let i = 0; i < operatives.length; i += 1) {
    const operative = operatives[i];
    operative.group.position.copy(realtimeCenter).add(offsets[i]);
    operative.group.rotation.y = -Math.PI / 2;
    operative.block = 0;
    operative.cooldowns.primary = 0;
    operative.cooldowns.secondary = 0;
    operative.cooldowns.dodge = 0;
  }
  const count = interlacingActive ? 4 : 3;
  for (let index = 0; index < count; index += 1) realtime.enemies.push(createRealtimeEnemy(index));
  showBanner('ROOM MODE', 'REAL-TIME SKIRMISH', 1.5);
  updateRealtimeHud();
  resize();
}

function createPulse(position, color, startScale = 0.2, endScale = 2.0, duration = 0.3) {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false });
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 8, 28), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.copy(position);
  mesh.position.y = 0.22;
  mesh.scale.setScalar(startScale);
  scene.add(mesh);
  realtime.effects.push({ mesh, material, age: 0, duration, startScale, endScale });
}

function damageRealtimeEnemy(enemy, amount) {
  if (!enemy.alive) return;
  enemy.health = Math.max(0, enemy.health - amount);
  enemy.group.scale.set(1.18, 0.82, 1.18);
  createPulse(enemy.group.position, 0xffd06a, 0.16, 0.75, 0.2);
  if (enemy.health <= 0) {
    enemy.alive = false;
    enemy.group.visible = false;
    removeUnitLabel(enemy);
    if (realtime.enemies.every((candidate) => !candidate.alive)) finishRealtimeCombat();
  }
}

function useRealtimePrimary() {
  if (mode !== 'realtime') return;
  const operative = activeOperative();
  if (!operative.alive || operative.cooldowns.primary > 0) return;
  operative.cooldowns.primary = operative.definition.primaryCooldown;
  if (activeOperativeIndex === 0) {
    const direction = realtime.aimPoint.clone().sub(operative.group.position);
    direction.y = 0;
    if (direction.lengthSq() < 0.01) direction.copy(forwardFor(operative.group));
    direction.normalize();
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd06a }),
    );
    mesh.position.copy(operative.group.position);
    mesh.position.y = 0.48;
    scene.add(mesh);
    realtime.projectiles.push({
      mesh,
      velocity: direction.multiplyScalar(12),
      damage: operative.definition.primaryDamage,
      ttl: 1.4,
    });
  } else {
    const forward = forwardFor(operative.group);
    for (const enemy of realtime.enemies) {
      if (!enemy.alive) continue;
      const offset = enemy.group.position.clone().sub(operative.group.position);
      const distance = offset.length();
      if (distance > 1.55) continue;
      offset.normalize();
      if (forward.dot(offset) > -0.2) damageRealtimeEnemy(enemy, operative.definition.primaryDamage);
    }
    createPulse(operative.group.position, operative.definition.accent, 0.25, 1.7, 0.26);
  }
}

function useRealtimeSecondary() {
  if (mode !== 'realtime') return;
  const operative = activeOperative();
  if (!operative.alive || operative.cooldowns.secondary > 0) return;
  operative.cooldowns.secondary = operative.definition.secondaryCooldown;
  if (activeOperativeIndex === 0) {
    for (const teammate of operatives) healOperative(teammate, 8);
    createPulse(operative.group.position, 0x66d697, 0.3, 2.1, 0.5);
  } else {
    for (const enemy of realtime.enemies) {
      if (enemy.alive && enemy.group.position.distanceTo(operative.group.position) < 2.5) {
        damageRealtimeEnemy(enemy, 18);
      }
    }
    createPulse(operative.group.position, 0xff7a62, 0.25, 2.8, 0.48);
  }
}

function startDodge() {
  if (mode !== 'realtime') return;
  const operative = activeOperative();
  if (!operative.alive || operative.cooldowns.dodge > 0) return;
  let inputX = 0;
  let inputZ = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) inputX -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) inputX += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) inputZ -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) inputZ += 1;
  if (Math.hypot(inputX, inputZ) > 0) operative.dodgeDirection.set(inputX, 0, inputZ).normalize();
  else operative.dodgeDirection.copy(forwardFor(operative.group));
  operative.cooldowns.dodge = 1.05;
  operative.dodgeTimer = 0.19;
  operative.invulnerableTimer = 0.3;
  createPulse(operative.group.position, operative.definition.accent, 0.2, 1.1, 0.22);
}

function finishRealtimeCombat() {
  if (mode !== 'realtime') return;
  cleared.realtime = true;
  realtimeBarrier.visible = false;
  skirmishReward.visible = true;
  showBanner('SKIRMISH CLEAR', 'RECOVERED OBJECT EXPOSED', 1.5);
  objectiveReadout.textContent = 'Skirmish clear · collect the orange recovered object.';
  window.setTimeout(() => {
    clearRealtimeEntities();
    document.body.classList.remove('realtime-mode');
    mode = 'explore';
    updateRunLedger();
    updateObjective();
    resize();
  }, 1150);
}

function updateRealtimeMovement(delta) {
  const operative = activeOperative();
  if (!operative.alive) return;
  const aimOffset = realtime.aimPoint.clone().sub(operative.group.position);
  aimOffset.y = 0;
  if (aimOffset.lengthSq() > 0.1) operative.group.rotation.y = Math.atan2(-aimOffset.x, -aimOffset.z);
  let inputX = 0;
  let inputZ = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) inputX -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) inputX += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) inputZ -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) inputZ += 1;
  let direction = new THREE.Vector3(inputX, 0, inputZ);
  if (operative.dodgeTimer > 0) direction = operative.dodgeDirection.clone();
  else if (direction.lengthSq() > 0) direction.normalize();
  else return;
  const multiplier = operative.dodgeTimer > 0 ? 2.75 : 1;
  const step = operative.definition.speed * multiplier * delta;
  moveWithCollision(
    operative.group,
    direction.x * step,
    direction.z * step,
    (x, z) => canOccupyInRoom(x, z, realtimeRoom),
  );
}

function updateRealtimePartner(delta) {
  const active = activeOperative();
  const partner = inactiveOperative();
  if (!active.alive || !partner.alive) return;
  const desired = active.group.position.clone().add(new THREE.Vector3(0.85, 0, 0.85));
  const offset = desired.sub(partner.group.position);
  if (offset.length() > 0.24) {
    offset.normalize();
    moveWithCollision(
      partner.group,
      offset.x * (partner.definition.speed + 0.6) * delta,
      offset.z * (partner.definition.speed + 0.6) * delta,
      (x, z) => canOccupyInRoom(x, z, realtimeRoom),
    );
    partner.group.rotation.y = Math.atan2(-offset.x, -offset.z);
  }
}

function updateRealtimeProjectiles(delta) {
  for (let index = realtime.projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = realtime.projectiles[index];
    projectile.ttl -= delta;
    projectile.mesh.position.addScaledVector(projectile.velocity, delta);
    let remove = projectile.ttl <= 0 || !canOccupyInRoom(projectile.mesh.position.x, projectile.mesh.position.z, realtimeRoom, 0.05);
    if (!remove) {
      for (const enemy of realtime.enemies) {
        if (!enemy.alive) continue;
        if (enemy.group.position.distanceTo(projectile.mesh.position) < 0.52) {
          damageRealtimeEnemy(enemy, projectile.damage);
          remove = true;
          break;
        }
      }
    }
    if (remove) {
      scene.remove(projectile.mesh);
      realtime.projectiles.splice(index, 1);
    }
  }
}

function updateRealtimeEnemies(delta) {
  const target = activeOperative();
  if (!target.alive) return;
  for (const enemy of realtime.enemies) {
    if (!enemy.alive) continue;
    enemy.attackTimer = Math.max(0, enemy.attackTimer - delta);
    const offset = target.group.position.clone().sub(enemy.group.position);
    offset.y = 0;
    const distance = offset.length();
    if (distance > 0.74) {
      offset.normalize();
      moveWithCollision(
        enemy.group,
        offset.x * enemy.speed * delta,
        offset.z * enemy.speed * delta,
        (x, z) => canOccupyInRoom(x, z, realtimeRoom, ENEMY_RADIUS),
      );
      enemy.group.rotation.y = Math.atan2(-offset.x, -offset.z);
    } else if (enemy.attackTimer <= 0) {
      damageOperative(target, enemy.damage + (interlacingActive ? 2 : 0));
      enemy.attackTimer = enemy.elite ? 0.55 : 0.78;
    }
  }
}

function setCooldownVisual(element, remaining, maximum) {
  const fraction = maximum > 0 ? THREE.MathUtils.clamp(remaining / maximum, 0, 1) : 0;
  element.classList.toggle('ready', fraction <= 0);
  const mask = element.querySelector('.cooldown-mask');
  if (mask) mask.style.height = `${fraction * 100}%`;
}

function updateRealtimeHud() {
  const active = activeOperative();
  for (let index = 0; index < operatives.length; index += 1) {
    const operative = operatives[index];
    realtimeUi.agentCards[index].classList.toggle('active', index === activeOperativeIndex);
    realtimeUi.healthFills[index].style.width = `${Math.max(0, operative.health / operative.definition.maxHealth) * 100}%`;
    realtimeUi.healthCopies[index].textContent = `${Math.ceil(operative.health)} / ${operative.definition.maxHealth}`;
  }
  realtimeUi.primaryName.textContent = active.definition.primaryName;
  realtimeUi.primaryCopy.textContent = active.definition.primaryCopy;
  realtimeUi.secondaryName.textContent = active.definition.secondaryName;
  realtimeUi.secondaryCopy.textContent = active.definition.secondaryCopy;
  setCooldownVisual(realtimeUi.primary, active.cooldowns.primary, active.definition.primaryCooldown);
  setCooldownVisual(realtimeUi.secondary, active.cooldowns.secondary, active.definition.secondaryCooldown);
  setCooldownVisual(realtimeUi.dodge, active.cooldowns.dodge, 1.05);
  const alive = realtime.enemies.filter((enemy) => enemy.alive).length;
  realtimeUi.enemyCount.textContent = `${alive} HOSTILE${alive === 1 ? '' : 'S'}`;
  updateRealtimeLabelContent();
}

function updateRealtimeLabelContent() {
  for (const enemy of realtime.enemies) {
    if (!enemy.label) continue;
    enemy.label.wrapper.style.display = enemy.alive ? 'block' : 'none';
    enemy.label.button.querySelector('.unit-name').textContent = enemy.name;
    enemy.label.button.querySelector('.unit-hp').textContent = `${Math.ceil(enemy.health)}/${enemy.maxHealth}`;
    enemy.label.button.querySelector('.unit-health i').style.width = `${Math.max(0, enemy.health / enemy.maxHealth) * 100}%`;
    enemy.label.button.querySelector('.unit-intent').textContent = enemy.elite ? 'ELITE' : '';
  }
}

function updateRealtime(delta) {
  updateRealtimeMovement(delta);
  updateRealtimePartner(delta);
  updateRealtimeProjectiles(delta);
  updateRealtimeEnemies(delta);
  for (const operative of operatives) {
    operative.cooldowns.primary = Math.max(0, operative.cooldowns.primary - delta);
    operative.cooldowns.secondary = Math.max(0, operative.cooldowns.secondary - delta);
    operative.cooldowns.dodge = Math.max(0, operative.cooldowns.dodge - delta);
    operative.dodgeTimer = Math.max(0, operative.dodgeTimer - delta);
    operative.invulnerableTimer = Math.max(0, operative.invulnerableTimer - delta);
  }
  for (let index = realtime.effects.length - 1; index >= 0; index -= 1) {
    const effect = realtime.effects[index];
    effect.age += delta;
    const progress = Math.min(1, effect.age / effect.duration);
    const scale = THREE.MathUtils.lerp(effect.startScale, effect.endScale, 1 - (1 - progress) ** 3);
    effect.mesh.scale.setScalar(scale);
    effect.material.opacity = 0.85 * (1 - progress);
    if (progress >= 1) {
      scene.remove(effect.mesh);
      realtime.effects.splice(index, 1);
    }
  }
  updateRealtimeHud();
}

const CARD_LIBRARY = {
  advance: {
    id: 'advance', name: 'TACTICAL ADVANCE', cost: 1, type: 'MOVE', icon: '➤',
    color: '#61aef2', glow: 'rgba(55, 143, 226, 0.35)', target: 'self',
    text: 'Move the active operative to the next lane. Gain 1 Block.',
  },
  restrain: {
    id: 'restrain', name: 'RESTRAIN', cost: 1, type: 'CONTROL', icon: '⌘',
    color: '#e1a65a', glow: 'rgba(208, 128, 37, 0.35)', target: 'enemy', operative: 1,
    text: 'Apply 2 Restrain. The target loses its next action.',
  },
  suppress: {
    id: 'suppress', name: 'SUPPRESS', cost: 1, type: 'ATTACK', icon: '✦',
    color: '#f0c36d', glow: 'rgba(226, 157, 49, 0.35)', target: 'enemy', operative: 0,
    text: 'Deal 7 damage. Apply 1 Weak.',
  },
  shield: {
    id: 'shield', name: 'SHIELD UP', cost: 0, type: 'DEFEND', icon: '⬡',
    color: '#64b7ff', glow: 'rgba(47, 141, 230, 0.35)', target: 'self',
    text: 'Gain 6 Block. Draw 1 card.',
  },
  investigate: {
    id: 'investigate', name: 'INVESTIGATE', cost: 2, type: 'UTILITY', icon: '⌕',
    color: '#6ec6d6', glow: 'rgba(45, 153, 179, 0.35)', target: 'self', operative: 0,
    text: 'Draw 2 cards. Gain 1 bonus Time next turn.',
  },
  treatment: {
    id: 'treatment', name: 'FIELD TREATMENT', cost: 1, type: 'RECOVER', icon: '✚',
    color: '#6fc58c', glow: 'rgba(60, 163, 99, 0.35)', target: 'self', operative: 0,
    text: 'Restore 8 Health to the most injured operative.',
  },
  heavyArc: {
    id: 'heavyArc', name: 'HEAVY ARC', cost: 2, type: 'ATTACK', icon: '◒',
    color: '#e26d64', glow: 'rgba(185, 55, 56, 0.36)', target: 'enemy', operative: 1,
    text: 'Deal 12 damage. Deal 16 when Zélia shares the target lane.',
  },
  crossfire: {
    id: 'crossfire', name: 'CROSSFIRE', cost: 2, type: 'ATTACK', icon: '✣',
    color: '#c991e9', glow: 'rgba(141, 75, 185, 0.35)', target: 'self',
    text: 'Deal 4 damage to every enemy. Both operatives gain 2 Block.',
  },
};

const DECK_RECIPE = [
  'advance', 'advance', 'restrain', 'suppress', 'suppress', 'shield',
  'shield', 'investigate', 'treatment', 'heavyArc', 'heavyArc', 'crossfire',
];

const card = {
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
  const xDistance = Math.max(2.25, Math.min(3.5, cardRoom.w * 0.24));
  return new THREE.Vector3(
    cardCenter.x + (side === 'ally' ? -xDistance : xDistance),
    0.08,
    cardCenter.z + laneOffsets[lane],
  );
}

function createCardEnemy(index, lane, elite = false) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    elite ? new THREE.IcosahedronGeometry(0.52, 0) : new THREE.DodecahedronGeometry(0.42, 0),
    new THREE.MeshStandardMaterial({
      color: elite ? 0x8e422f : index % 2 === 0 ? 0x6d302c : 0x4c3b58,
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
  const maxHealth = elite ? 32 + phase * 4 : 18 + index * 3 + (interlacingActive ? 4 : 0);
  const enemy = {
    id: `card-enemy-${index}`,
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
  createUnitLabel(enemy, 'enemy', true);
  return enemy;
}

function clearCardEntities() {
  for (const enemy of card.enemies) {
    removeUnitLabel(enemy);
    scene.remove(enemy.group);
  }
  card.enemies.length = 0;
  for (const operative of operatives) removeUnitLabel(operative);
  card.hand.length = 0;
  card.drawPile.length = 0;
  card.discardPile.length = 0;
}

function assignEnemyIntents() {
  for (const enemy of card.enemies) {
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

function startCardCombat() {
  if (mode !== 'explore' || cleared.card) return;
  mode = 'card';
  document.body.classList.add('card-mode');
  cardBarrier.visible = true;
  cardMarker.visible = false;
  laneGuides.visible = true;
  objectiveReadout.textContent = 'Tactical room locked · spend Time and resolve enemy intents.';
  cardUi.objective.textContent = phase > 1 ? 'Secure the interlaced core' : 'Secure the core fragment';
  operatives[0].lane = 0;
  operatives[1].lane = 2;
  for (const operative of operatives) {
    operative.block = 0;
    operative.group.position.copy(lanePosition('ally', operative.lane));
    operative.group.rotation.y = -Math.PI / 2;
    createUnitLabel(operative, 'ally', false);
  }
  const enemyCount = interlacingActive ? 4 : 3;
  for (let index = 0; index < enemyCount; index += 1) {
    const lane = index % 3;
    const elite = index === enemyCount - 1 && interlacingActive;
    card.enemies.push(createCardEnemy(index, lane, elite));
  }
  card.drawPile = shuffle([...DECK_RECIPE]);
  card.discardPile = [];
  card.hand = [];
  card.turn = 0;
  card.time = MAX_TIME;
  card.bonusTimeNextTurn = 0;
  card.selectedHandIndex = null;
  card.resolving = false;
  beginPlayerTurn();
  showBanner('ROOM MODE', 'TURN-BASED CARD COMBAT', 1.7);
  resize();
}

function refillDrawPile() {
  if (card.drawPile.length > 0 || card.discardPile.length === 0) return;
  card.drawPile = shuffle(card.discardPile.splice(0));
}

function drawCards(count) {
  for (let index = 0; index < count; index += 1) {
    refillDrawPile();
    if (card.drawPile.length === 0) break;
    card.hand.push(card.drawPile.pop());
  }
}

function beginPlayerTurn() {
  card.turn += 1;
  card.resolving = false;
  endTurnButton.disabled = false;
  card.time = Math.max(1, MAX_TIME + card.bonusTimeNextTurn);
  card.bonusTimeNextTurn = 0;
  card.selectedHandIndex = null;
  for (const operative of operatives) operative.block = 0;
  drawCards(Math.max(0, HAND_SIZE - card.hand.length));
  assignEnemyIntents();
  renderCardHud();
  showBanner('YOUR TURN', `${card.time} TIME AVAILABLE`, 0.8);
}

function cardOwnerAlive(cardDefinition) {
  return cardDefinition.operative === undefined || operatives[cardDefinition.operative].alive;
}

function renderHand() {
  handElement.replaceChildren();
  card.hand.forEach((cardId, index) => {
    const cardDefinition = CARD_LIBRARY[cardId];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `card${card.selectedHandIndex === index ? ' selected' : ''}`;
    button.style.setProperty('--card-color', cardDefinition.color);
    button.style.setProperty('--card-glow', cardDefinition.glow);
    button.disabled = card.resolving || cardDefinition.cost > card.time || !cardOwnerAlive(cardDefinition);
    button.innerHTML = `
      <span class="card-cost">${cardDefinition.cost}</span>
      <h3>${cardDefinition.name}</h3>
      <div class="card-art">${cardDefinition.icon}</div>
      <span class="card-type">${cardDefinition.type}</span>
      <p>${cardDefinition.text}</p>
    `;
    button.addEventListener('click', () => selectCard(index));
    handElement.appendChild(button);
  });
}

function renderTime() {
  cardUi.timeCopy.textContent = `${card.time} / ${MAX_TIME}`;
  cardUi.timePips.replaceChildren();
  for (let index = 0; index < Math.max(MAX_TIME, card.time); index += 1) {
    const pip = document.createElement('i');
    if (index >= card.time) pip.classList.add('empty');
    cardUi.timePips.appendChild(pip);
  }
}

function renderCardHud() {
  if (mode !== 'card') return;
  const active = activeOperative();
  cardUi.activeName.textContent = active.definition.name;
  cardUi.activePortrait.className = `portrait portrait-${active.definition.id}`;
  cardUi.activePortrait.innerHTML = `<span>${active.definition.symbol}</span>`;
  cardUi.activeHealth.textContent = `${Math.ceil(active.health)} / ${active.definition.maxHealth}`;
  cardUi.activeHealthFill.style.width = `${Math.max(0, active.health / active.definition.maxHealth) * 100}%`;
  cardUi.activeBlock.textContent = String(active.block);
  cardUi.enemyCount.textContent = String(card.enemies.filter((enemy) => enemy.alive).length);
  cardUi.eliteCount.textContent = String(card.enemies.filter((enemy) => enemy.alive && enemy.elite).length);
  cardUi.turn.textContent = String(card.turn);
  cardUi.drawCount.textContent = String(card.drawPile.length);
  cardUi.discardCount.textContent = String(card.discardPile.length);
  cardUi.partyButtons.forEach((button, index) => {
    button.classList.toggle('active', index === activeOperativeIndex);
    button.disabled = !operatives[index].alive || card.resolving;
  });
  renderTime();
  renderHand();
  updateCardLabelContent();
}

function updateCardLabelContent() {
  const selectedCard = card.selectedHandIndex === null ? null : CARD_LIBRARY[card.hand[card.selectedHandIndex]];
  for (const operative of operatives) {
    if (!operative.label) continue;
    const { button, wrapper } = operative.label;
    wrapper.style.display = operative.alive ? 'block' : 'none';
    button.querySelector('.unit-name').textContent = `${operative.definition.name} · ${LANE_NAMES[operative.lane]}`;
    button.querySelector('.unit-hp').textContent = `${Math.ceil(operative.health)}/${operative.definition.maxHealth}`;
    button.querySelector('.unit-health i').style.width = `${Math.max(0, operative.health / operative.definition.maxHealth) * 100}%`;
    button.querySelector('.unit-intent').textContent = operative.block > 0 ? `BLOCK ${operative.block}` : '';
  }
  for (const enemy of card.enemies) {
    if (!enemy.label) continue;
    const { button, wrapper } = enemy.label;
    wrapper.style.display = enemy.alive ? 'block' : 'none';
    wrapper.classList.toggle('targetable', Boolean(selectedCard?.target === 'enemy' && enemy.alive));
    button.querySelector('.unit-name').textContent = `${enemy.name} · ${LANE_NAMES[enemy.lane]}`;
    button.querySelector('.unit-hp').textContent = `${Math.ceil(enemy.health)}/${enemy.maxHealth}`;
    button.querySelector('.unit-health i').style.width = `${Math.max(0, enemy.health / enemy.maxHealth) * 100}%`;
    const status = [
      enemy.intent?.label,
      enemy.block > 0 ? `BLOCK ${enemy.block}` : '',
      enemy.weak > 0 ? `WEAK ${enemy.weak}` : '',
    ].filter(Boolean).join(' · ');
    button.querySelector('.unit-intent').textContent = status;
  }
}

function selectCard(index) {
  if (mode !== 'card' || card.resolving) return;
  const cardDefinition = CARD_LIBRARY[card.hand[index]];
  if (!cardDefinition || cardDefinition.cost > card.time || !cardOwnerAlive(cardDefinition)) return;
  if (cardDefinition.target === 'enemy') {
    card.selectedHandIndex = card.selectedHandIndex === index ? null : index;
    renderCardHud();
    return;
  }
  playCard(index, null);
}

function playSelectedCardOn(enemy) {
  if (mode !== 'card' || card.selectedHandIndex === null || !enemy.alive) return;
  const cardDefinition = CARD_LIBRARY[card.hand[card.selectedHandIndex]];
  if (cardDefinition?.target !== 'enemy') return;
  playCard(card.selectedHandIndex, enemy);
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
}

function damageCardEnemy(enemy, amount) {
  if (!enemy.alive) return;
  absorbDamage(enemy, amount);
  if (!enemy.alive) {
    removeUnitLabel(enemy);
    showBanner('HOSTILE REMOVED', enemy.name, 0.65);
  }
}

function moveOperativeToLane(operative, lane) {
  operative.lane = (lane + 3) % 3;
  operative.group.position.copy(lanePosition('ally', operative.lane));
}

function applyCardEffect(cardDefinition, target) {
  if (cardDefinition.operative !== undefined) activeOperativeIndex = cardDefinition.operative;
  const active = activeOperative();
  switch (cardDefinition.id) {
    case 'advance':
      moveOperativeToLane(active, active.lane + 1);
      active.block += 1;
      break;
    case 'restrain':
      target.restrain += 2;
      target.intent = { type: 'restrained', label: 'RESTRAINED', value: 0 };
      break;
    case 'suppress':
      damageCardEnemy(target, 7);
      target.weak += 1;
      break;
    case 'shield':
      active.block += 6;
      drawCards(1);
      break;
    case 'investigate':
      drawCards(2);
      card.bonusTimeNextTurn += 1;
      break;
    case 'treatment': {
      const patient = [...operatives]
        .filter((operative) => operative.alive)
        .sort((a, b) => a.health / a.definition.maxHealth - b.health / b.definition.maxHealth)[0];
      if (patient) healOperative(patient, 8);
      break;
    }
    case 'heavyArc':
      damageCardEnemy(target, active.lane === target.lane ? 16 : 12);
      break;
    case 'crossfire':
      for (const enemy of card.enemies) if (enemy.alive) damageCardEnemy(enemy, 4);
      for (const operative of operatives) if (operative.alive) operative.block += 2;
      break;
    default:
      break;
  }
}

function playCard(index, target) {
  const cardId = card.hand[index];
  const cardDefinition = CARD_LIBRARY[cardId];
  if (!cardDefinition || cardDefinition.cost > card.time || card.resolving) return;
  card.time -= cardDefinition.cost;
  card.hand.splice(index, 1);
  card.discardPile.push(cardId);
  card.selectedHandIndex = null;
  applyCardEffect(cardDefinition, target);
  if (card.enemies.every((enemy) => !enemy.alive)) {
    finishCardCombat();
    return;
  }
  renderCardHud();
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
  if (mode !== 'card' || card.resolving) return;
  card.resolving = true;
  endTurnButton.disabled = true;
  card.selectedHandIndex = null;
  card.discardPile.push(...card.hand.splice(0));
  renderCardHud();
  showBanner('ENEMY TURN', 'INTENTS RESOLVING', 0.75);
  await delay(550);
  for (const enemy of card.enemies) {
    if (!enemy.alive) continue;
    if (enemy.restrain > 0) {
      enemy.restrain = Math.max(0, enemy.restrain - 1);
      enemy.intent = { type: 'restrained', label: 'ACTION LOST', value: 0 };
      updateCardLabelContent();
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
        if (!target.alive) {
          removeUnitLabel(target);
          showBanner('OPERATIVE DOWN', target.definition.name, 0.75);
        }
      }
    } else if (intent?.type === 'guard') {
      enemy.block += intent.value;
    } else if (intent?.type === 'pressure') {
      card.bonusTimeNextTurn = Math.max(-1, card.bonusTimeNextTurn - 1);
      for (const operative of operatives) operative.block = Math.max(0, operative.block - 2);
    }
    enemy.group.scale.set(1.18, 0.84, 1.18);
    updateCardLabelContent();
    await delay(430);
    if (operatives.every((operative) => !operative.alive)) {
      handleTeamDefeat();
      return;
    }
  }
  const firstAlive = operatives.findIndex((operative) => operative.alive);
  if (!operatives[activeOperativeIndex].alive && firstAlive >= 0) activeOperativeIndex = firstAlive;
  beginPlayerTurn();
}

function finishCardCombat() {
  if (mode !== 'card') return;
  card.resolving = true;
  cleared.card = true;
  cardBarrier.visible = false;
  tacticalReward.visible = true;
  cardUi.objective.textContent = 'Core fragment exposed';
  objectiveReadout.textContent = 'Card room clear · collect the blue recovered object.';
  showBanner('TACTICAL CLEAR', 'CORE FRAGMENT EXPOSED', 1.6);
  endTurnButton.disabled = true;
  window.setTimeout(() => {
    clearCardEntities();
    document.body.classList.remove('card-mode');
    laneGuides.visible = false;
    mode = 'explore';
    updateRunLedger();
    updateObjective();
    resize();
  }, 1500);
}

function switchOperative(index = 1 - activeOperativeIndex) {
  if (!operatives[index]?.alive) return;
  if (mode === 'card' && card.resolving) return;
  activeOperativeIndex = index;
  if (mode === 'card') renderCardHud();
  else if (mode === 'realtime') updateRealtimeHud();
  else showBanner('FIELD PAIR', `${activeOperative().definition.name} ACTIVE`, 0.65);
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
  if (room?.id === realtimeRoom.id && !cleared.realtime) startRealtimeCombat();
  else if (room?.id === cardRoom.id && !cleared.card) startCardCombat();

  if (skirmishReward.visible && !rewardCollected.realtime && active.group.position.distanceTo(skirmishReward.position) < 0.95) {
    rewardCollected.realtime = true;
    skirmishReward.visible = false;
    const value = interlacingActive ? 150 : 75;
    recoveredValue += value;
    showBanner('RECOVERED OBJECT', `SKIRMISH VALUE +${value}`, 1.4);
    updateRunLedger();
    updateObjective();
  }
  if (tacticalReward.visible && !rewardCollected.card && active.group.position.distanceTo(tacticalReward.position) < 0.95) {
    rewardCollected.card = true;
    tacticalReward.visible = false;
    const value = interlacingActive ? 250 : 125;
    recoveredValue += value;
    showBanner('RECOVERED OBJECT', `TACTICAL VALUE +${value}`, 1.4);
    updateRunLedger();
    updateObjective();
  }

  if (
    rewardCollected.realtime &&
    rewardCollected.card &&
    active.group.position.distanceTo(entrancePosition) < 1.1 &&
    !extractionOpen
  ) {
    openExtractionDecision();
  }
}

function openExtractionDecision() {
  extractionOpen = true;
  mode = 'extraction';
  document.body.classList.add('extraction-mode');
  extractionValue.textContent = `₵ ${String(recoveredValue).padStart(3, '0')}`;
  stayLateButton.disabled = stayUsed;
  extractionCopy.textContent = stayUsed
    ? 'The portal is stable. The interlaced room has already been resolved; further delay is not available in this slice.'
    : 'The portal is stable. Staying will interlace the tactical room and place the current haul at risk.';
  extractionPanel.setAttribute('aria-hidden', 'false');
}

function closeExtractionDecision() {
  extractionOpen = false;
  document.body.classList.remove('extraction-mode');
  extractionPanel.setAttribute('aria-hidden', 'true');
}

function stayAfterNight() {
  if (stayUsed) return;
  stayUsed = true;
  phase = 2;
  closeExtractionDecision();
  applyInterlacing(true);
  cleared.card = false;
  rewardCollected.card = false;
  tacticalReward.visible = false;
  cardMarker.visible = true;
  for (const operative of operatives) {
    if (!operative.alive) {
      operative.alive = true;
      operative.group.visible = true;
    }
    operative.health = Math.max(operative.health, Math.ceil(operative.definition.maxHealth * 0.55));
  }
  mode = 'explore';
  objectiveReadout.textContent = `Night has interlaced room ${String(cardRoom.id).padStart(2, '0')} · return for an elite card encounter.`;
  showBanner('NIGHT THRESHOLD', 'TACTICAL ROOM INTERLACED', 1.8);
  updateRunLedger();
  resize();
}

function showResults() {
  closeExtractionDecision();
  mode = 'results';
  document.body.classList.add('results-mode');
  const retained = Math.floor(recoveredValue * 0.15);
  const secured = recoveredValue - retained;
  resultTitle.textContent = stayUsed ? 'Late extraction complete' : 'Extraction complete';
  resultGross.textContent = `₵ ${String(recoveredValue).padStart(3, '0')}`;
  resultRetained.textContent = `₵ ${String(retained).padStart(3, '0')}`;
  resultSecured.textContent = `₵ ${String(secured).padStart(3, '0')}`;
  resultsPanel.setAttribute('aria-hidden', 'false');
}

function resetCurrentEncounter() {
  clearRealtimeEntities();
  clearCardEntities();
  document.body.classList.remove('realtime-mode', 'card-mode', 'extraction-mode', 'results-mode');
  realtimeBarrier.visible = false;
  cardBarrier.visible = false;
  laneGuides.visible = false;
  mode = 'explore';
  const encounterWasCard = roomAtWorld(activeOperative().group.position.x, activeOperative().group.position.z)?.id === cardRoom.id;
  for (let index = 0; index < operatives.length; index += 1) {
    const operative = operatives[index];
    operative.alive = true;
    operative.group.visible = true;
    operative.health = Math.max(1, Math.ceil(operative.definition.maxHealth * 0.6));
    operative.block = 0;
    const center = encounterWasCard ? cardCenter : realtimeCenter;
    operative.group.position.copy(center).add(new THREE.Vector3(-1 + index * 0.7, 0.08, -1 + index * 0.7));
  }
  if (encounterWasCard) startCardCombat();
  else startRealtimeCombat();
  updateRunLedger();
}

function resetRun() {
  clearRealtimeEntities();
  clearCardEntities();
  document.body.classList.remove('realtime-mode', 'card-mode', 'extraction-mode', 'results-mode');
  resultsPanel.setAttribute('aria-hidden', 'true');
  extractionPanel.setAttribute('aria-hidden', 'true');
  random = mulberry32(mapState.generator.seed ^ 0xa8b1c2d3);
  mode = 'explore';
  phase = 1;
  stayUsed = false;
  extractionOpen = false;
  recoveredValue = 0;
  cleared.realtime = false;
  cleared.card = false;
  rewardCollected.realtime = false;
  rewardCollected.card = false;
  realtimeBarrier.visible = false;
  cardBarrier.visible = false;
  laneGuides.visible = false;
  realtimeMarker.visible = true;
  cardMarker.visible = true;
  skirmishReward.visible = false;
  tacticalReward.visible = false;
  applyInterlacing(false);
  activeOperativeIndex = 0;
  for (let index = 0; index < operatives.length; index += 1) {
    const operative = operatives[index];
    operative.health = operative.definition.maxHealth;
    operative.block = 0;
    operative.alive = true;
    operative.group.visible = true;
    operative.cooldowns.primary = 0;
    operative.cooldowns.secondary = 0;
    operative.cooldowns.dodge = 0;
    operative.group.position.copy(entrancePosition).add(new THREE.Vector3(index * 0.7, 0, index * 0.7));
  }
  updateRunLedger();
  updateObjective();
  resize();
}

function applyInterlacing(active) {
  interlacingActive = active;
  scene.background = active ? activeBackground : dormantBackground;
  scene.fog.color.copy(active ? activeBackground : dormantBackground);
  ambient.color.set(active ? 0xa35d87 : 0x92a6b7);
  keyLight.color.set(active ? 0xff7358 : 0xffd59c);
  rimLight.color.set(active ? 0x555cff : 0x4f91be);
  for (let index = 0; index < baseFloorColors.length; index += 1) {
    if (active) {
      const phaseColor = index % 2 === 0 ? interlaceA : interlaceB;
      tempColor.copy(baseFloorColors[index]).lerp(phaseColor, 0.43);
      floorMesh.setColorAt(index, tempColor);
    } else {
      floorMesh.setColorAt(index, baseFloorColors[index]);
    }
  }
  floorMesh.instanceColor.needsUpdate = true;
  interlaceReadout.textContent = active ? 'ACTIVE' : 'DORMANT';
  interlaceReadout.classList.toggle('active', active);
  interlaceFill.style.width = active ? '100%' : '12%';
}

renderer.domElement.addEventListener('pointermove', updatePointer);
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || mode !== 'realtime') return;
  updatePointer(event);
  useRealtimePrimary();
});
renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());

window.addEventListener('keydown', (event) => {
  if (event.code === 'Tab') event.preventDefault();
  keys.add(event.code);
  if (event.repeat) return;
  if (event.code === 'KeyI' && mode === 'explore') applyInterlacing(!interlacingActive);
  else if (event.code === 'KeyQ' || event.code === 'Tab') switchOperative();
  else if (mode === 'realtime' && (event.code === 'Digit1' || event.code === 'Numpad1')) useRealtimePrimary();
  else if (mode === 'realtime' && (event.code === 'Digit2' || event.code === 'Numpad2')) useRealtimeSecondary();
  else if (mode === 'realtime' && (event.code === 'ShiftLeft' || event.code === 'ShiftRight')) startDodge();
  else if (mode === 'card' && event.code === 'Enter') endTurn();
  else if (mode === 'card' && /^Digit[1-5]$/.test(event.code)) {
    const index = Number(event.code.slice(-1)) - 1;
    if (card.hand[index]) selectCard(index);
  }
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());
endTurnButton.addEventListener('click', endTurn);
cardUi.partyButtons.forEach((button) => {
  button.addEventListener('click', () => switchOperative(Number(button.dataset.operative)));
});
extractNowButton.addEventListener('click', showResults);
stayLateButton.addEventListener('click', stayAfterNight);
restartRunButton.addEventListener('click', resetRun);

function updateCamera() {
  let target = activeOperative().group.position;
  if (mode === 'realtime' || (mode === 'defeat' && roomAtWorld(target.x, target.z)?.id === realtimeRoom.id)) target = realtimeCenter;
  else if (mode === 'card' || (mode === 'defeat' && roomAtWorld(target.x, target.z)?.id === cardRoom.id)) target = cardCenter;
  cameraTarget.lerp(target, 0.12);
  camera.position.set(cameraTarget.x + 9.3, 15.5, cameraTarget.z + 9.3);
  camera.lookAt(cameraTarget.x, 0, cameraTarget.z);
}

function resize() {
  const aspect = window.innerWidth / window.innerHeight;
  const size = mode === 'card' ? 8.7 : mode === 'realtime' ? 9.2 : 10.7;
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
  if (mode === 'explore') updateExploration(delta);
  else if (mode === 'realtime') updateRealtime(delta);
  updateCamera();
  entranceMarker.scale.setScalar(0.92 + Math.sin(elapsed * 2.1) * 0.08);
  realtimeMarker.rotation.y += delta * 0.45;
  cardMarker.rotation.y -= delta * 0.38;
  skirmishReward.rotation.y += delta * 1.25;
  tacticalReward.rotation.y -= delta * 1.15;
  skirmishReward.position.y = 0.78 + Math.sin(elapsed * 2.4) * 0.11;
  tacticalReward.position.y = 0.78 + Math.sin(elapsed * 2.4 + 1.7) * 0.11;
  for (const operative of operatives) {
    operative.group.scale.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.exp(-delta * 12));
    operative.invulnerableTimer = Math.max(0, operative.invulnerableTimer - delta);
    if (mode === 'card' && operative.label) positionWorldLabel(operative);
  }
  for (const enemy of realtime.enemies) {
    enemy.group.scale.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.exp(-delta * 12));
    if (enemy.label) positionWorldLabel(enemy);
  }
  for (const enemy of card.enemies) {
    enemy.group.scale.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.exp(-delta * 12));
    enemy.group.rotation.y += delta * (enemy.elite ? 0.55 : 0.28);
    if (enemy.label) positionWorldLabel(enemy);
  }
  renderer.render(scene, camera);
}

roomReadout.textContent = `ROOM ${String(entrance.id).padStart(2, '0')} · ENTRANCE · DEPTH 0`;
updateRunLedger();
updateObjective();
frame();
