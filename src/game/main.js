import * as THREE from 'three';
import mapState from '../../content/maps/generated/abrir-mvp-seed-20260723.json';
import './styles.css';

const FLOOR = 1;
const WALL = 2;
const POOL = 3;
const PLAYER_RADIUS = 0.3;
const ENEMY_RADIUS = 0.3;
const CAMERA_SIZE = 10.5;

const viewport = document.querySelector('#viewport');
const mapName = document.querySelector('#map-name');
const mapMeta = document.querySelector('#map-meta');
const roomReadout = document.querySelector('#room-readout');
const objectiveReadout = document.querySelector('#objective-readout');
const interlaceReadout = document.querySelector('#interlace-readout');
const interlaceFill = document.querySelector('#interlace-fill');
const encounterBanner = document.querySelector('#encounter-banner');
const encounterKicker = document.querySelector('#encounter-kicker');
const encounterMessage = document.querySelector('#encounter-message');
const damageVignette = document.querySelector('#damage-vignette');
const lootValue = document.querySelector('#loot-value');

const hud = {
  rangedCard: document.querySelector('#agent-card-ranged'),
  meleeCard: document.querySelector('#agent-card-melee'),
  rangedHealth: document.querySelector('#health-ranged'),
  meleeHealth: document.querySelector('#health-melee'),
  rangedHealthCopy: document.querySelector('#health-ranged-copy'),
  meleeHealthCopy: document.querySelector('#health-melee-copy'),
  activeName: document.querySelector('#active-agent-name'),
  activePortrait: document.querySelector('#active-mini-portrait'),
  primary: document.querySelector('#ability-primary'),
  secondary: document.querySelector('#ability-secondary'),
  dodge: document.querySelector('#ability-dodge'),
  primaryName: document.querySelector('#ability-primary-name'),
  primaryCopy: document.querySelector('#ability-primary-copy'),
  secondaryName: document.querySelector('#ability-secondary-name'),
  secondaryCopy: document.querySelector('#ability-secondary-copy'),
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
  .filter((room) => room.type === 'combat' && room.depth > 0)
  .sort((a, b) => a.depth - b.depth || b.w * b.h - a.w * a.h)[0];

if (!targetCombatRoom) throw new Error('Saved map has no usable combat room.');

mapName.textContent = generated.name;
mapMeta.textContent =
  `seed ${mapState.generator.seed} · ${generated.rooms.length} rooms · ` +
  `${generated.edges.length} links · saved Three.js state`;
objectiveReadout.textContent = `Reach room ${String(targetCombatRoom.id).padStart(2, '0')} and clear the lock.`;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const dormantBackground = new THREE.Color(0x05070c);
const activeBackground = new THREE.Color(0x11060b);
scene.background = dormantBackground;
scene.fog = new THREE.FogExp2(dormantBackground, 0.026);

const camera = new THREE.OrthographicCamera(-CAMERA_SIZE, CAMERA_SIZE, CAMERA_SIZE, -CAMERA_SIZE, 0.1, 180);
const cameraTarget = new THREE.Vector3();

const ambient = new THREE.HemisphereLight(0x94a7a0, 0x17130f, 1.7);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffddaa, 2.5);
keyLight.position.set(16, 28, 13);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -24;
keyLight.shadow.camera.right = 24;
keyLight.shadow.camera.top = 24;
keyLight.shadow.camera.bottom = -24;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x5ba6a2, 0.9);
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
  return {
    x: Math.round(x + width / 2),
    y: Math.round(z + height / 2),
  };
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
  entrance: 0x597d61,
  combat: 0x726c55,
  elite: 0x665279,
  treasure: 0x92713c,
  shrine: 0x3c6473,
  boss: 0x793f38,
};
const corridorColor = new THREE.Color(0x4b4943);
const targetRoomColor = new THREE.Color(0x827443);
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
const floorGeometry = new THREE.BoxGeometry(0.97, 0.12, 0.97);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.94,
  metalness: 0.02,
  vertexColors: true,
});
const floorMesh = new THREE.InstancedMesh(floorGeometry, floorMaterial, floorCells.length);
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
  if (room?.id === targetCombatRoom.id) color = color.lerp(targetRoomColor, 0.5);
  color.multiplyScalar(0.65 + (room?.difficulty ?? 0.25) * 0.18);
  baseFloorColors.push(color);
  floorMesh.setColorAt(i, color);
}
floorMesh.instanceMatrix.needsUpdate = true;
floorMesh.instanceColor.needsUpdate = true;

const wallGeometry = new THREE.BoxGeometry(0.99, 1.8, 0.99);
const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0x242822,
  roughness: 0.98,
  metalness: 0.02,
});
const wallMesh = new THREE.InstancedMesh(wallGeometry, wallMaterial, wallCells.length);
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
  const poolGeometry = new THREE.BoxGeometry(0.94, 0.04, 0.94);
  const poolMaterial = new THREE.MeshStandardMaterial({
    color: 0x294f55,
    emissive: 0x0b2e37,
    emissiveIntensity: 0.7,
    roughness: 0.32,
    metalness: 0.18,
  });
  const poolMesh = new THREE.InstancedMesh(poolGeometry, poolMaterial, poolCells.length);
  scene.add(poolMesh);
  for (let i = 0; i < poolCells.length; i += 1) {
    const cell = poolCells[i];
    matrix.makeTranslation(worldX(cell.x), -0.07, worldZ(cell.y));
    poolMesh.setMatrixAt(i, matrix);
  }
  poolMesh.instanceMatrix.needsUpdate = true;
}

const entranceMarker = new THREE.Mesh(
  new THREE.TorusGeometry(0.62, 0.065, 8, 30),
  new THREE.MeshBasicMaterial({ color: 0x53d0aa, transparent: true, opacity: 0.82 }),
);
entranceMarker.rotation.x = Math.PI / 2;
entranceMarker.position.set(worldX(entrance.cx), 0.16, worldZ(entrance.cy));
scene.add(entranceMarker);

const targetMarker = new THREE.Group();
const targetRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.82, 0.09, 10, 36),
  new THREE.MeshBasicMaterial({ color: 0xe0b958, transparent: true, opacity: 0.88 }),
);
targetRing.rotation.x = Math.PI / 2;
targetMarker.add(targetRing);
const targetBeam = new THREE.Mesh(
  new THREE.CylinderGeometry(0.08, 0.34, 3.8, 10, 1, true),
  new THREE.MeshBasicMaterial({ color: 0xe0b958, transparent: true, opacity: 0.18, side: THREE.DoubleSide }),
);
targetBeam.position.y = 1.9;
targetMarker.add(targetBeam);
targetMarker.position.set(worldX(targetCombatRoom.cx), 0.15, worldZ(targetCombatRoom.cy));
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

    const neighbors = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
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

const AGENT_DEFS = [
  {
    id: 'ranged',
    label: 'RANGED',
    role: 'FIELD MEDIC',
    color: 0xd9c39a,
    accent: 0x3f8888,
    maxHealth: 100,
    speed: 5.7,
    primaryName: 'PRECISION SHOT',
    primaryCopy: 'Fast ranged projectile',
    primaryCooldown: 0.28,
    primaryDamage: 24,
    secondaryName: 'FIELD TREATMENT',
    secondaryCopy: 'Restore both operatives',
    secondaryCooldown: 12,
  },
  {
    id: 'melee',
    label: 'MELEE',
    role: 'VANGUARD',
    color: 0xb84d5d,
    accent: 0x48a7a4,
    maxHealth: 145,
    speed: 5.15,
    primaryName: 'HEAVY ARC',
    primaryCopy: 'Wide close-range strike',
    primaryCooldown: 0.58,
    primaryDamage: 43,
    secondaryName: 'GROUND BREAK',
    secondaryCopy: 'Damage nearby enemies',
    secondaryCooldown: 8.5,
  },
];

function createAgent(definition) {
  const group = new THREE.Group();

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.43, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: definition.color,
    roughness: 0.72,
    metalness: 0.08,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.36, 0.78, 12), bodyMaterial);
  body.position.y = 0.47;
  body.castShadow = true;
  group.add(body);

  const accent = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.055, 7, 20),
    new THREE.MeshStandardMaterial({
      color: definition.accent,
      emissive: definition.accent,
      emissiveIntensity: 0.45,
      roughness: 0.45,
    }),
  );
  accent.rotation.x = Math.PI / 2;
  accent.position.y = 0.55;
  group.add(accent);

  const direction = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.38, 9),
    new THREE.MeshStandardMaterial({ color: definition.accent, roughness: 0.5 }),
  );
  direction.rotation.x = Math.PI / 2;
  direction.position.set(0, 0.48, -0.42);
  direction.castShadow = true;
  group.add(direction);

  return {
    definition,
    group,
    bodyMaterial,
    health: definition.maxHealth,
    cooldowns: { primary: 0, secondary: 0, dodge: 0 },
    dodgeTimer: 0,
    invulnerableTimer: 0,
    dodgeDirection: new THREE.Vector3(0, 0, -1),
    alive: true,
  };
}

const agents = AGENT_DEFS.map(createAgent);
const entrancePosition = new THREE.Vector3(worldX(entrance.cx), 0.08, worldZ(entrance.cy));
agents[0].group.position.copy(entrancePosition);
agents[1].group.position.copy(entrancePosition).add(new THREE.Vector3(0.75, 0, 0.75));
for (const agent of agents) scene.add(agent.group);
let activeAgentIndex = 0;

const keys = new Set();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.12);
const aimPoint = entrancePosition.clone().add(new THREE.Vector3(0, 0, -3));
const projectiles = [];
const effects = [];
const enemies = [];
let encounterState = 'waiting';
let interlacingActive = false;
let recoveredValue = 0;
let lootPickup = null;
let bannerTimer = 0;
let restartTimer = 0;

function activeAgent() {
  return agents[activeAgentIndex];
}

function inactiveAgent() {
  return agents[1 - activeAgentIndex];
}

function forwardFor(group) {
  return new THREE.Vector3(-Math.sin(group.rotation.y), 0, -Math.cos(group.rotation.y));
}

function isInsideLockedRoom(x, z) {
  if (encounterState !== 'active') return true;
  return roomAtWorld(x, z)?.id === targetCombatRoom.id;
}

function canOccupyBase(x, z, radius = PLAYER_RADIUS) {
  const samples = [
    [x - radius, z - radius],
    [x + radius, z - radius],
    [x - radius, z + radius],
    [x + radius, z + radius],
  ];
  return samples.every(([sampleX, sampleZ]) => floorAtWorld(sampleX, sampleZ));
}

function canOccupyAgent(x, z) {
  return canOccupyBase(x, z, PLAYER_RADIUS) && isInsideLockedRoom(x, z);
}

function canOccupyEnemy(x, z) {
  return canOccupyBase(x, z, ENEMY_RADIUS) && roomAtWorld(x, z)?.id === targetCombatRoom.id;
}

function moveWithCollision(group, dx, dz, collisionTest) {
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

function createPulse(position, color, startScale = 0.2, endScale = 2.2, duration = 0.32) {
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 8, 28), material);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.copy(position);
  mesh.position.y = 0.22;
  mesh.scale.setScalar(startScale);
  scene.add(mesh);
  effects.push({ mesh, material, age: 0, duration, startScale, endScale });
}

function damageEnemy(enemy, amount) {
  if (!enemy.alive) return;
  enemy.health -= amount;
  enemy.group.scale.set(1.18, 0.82, 1.18);
  createPulse(enemy.group.position, 0xffd06a, 0.16, 0.75, 0.2);

  if (enemy.health <= 0) {
    enemy.alive = false;
    enemy.group.visible = false;
    if (enemies.every((candidate) => !candidate.alive)) clearEncounter();
  }
}

function damageAgent(agent, amount) {
  if (!agent.alive || agent.invulnerableTimer > 0 || restartTimer > 0) return;
  agent.health = Math.max(0, agent.health - amount);
  agent.invulnerableTimer = 0.28;
  if (agent === activeAgent()) flashDamage();

  if (agent.health <= 0) {
    agent.alive = false;
    agent.group.visible = false;
    const otherIndex = agents.indexOf(agent) === 0 ? 1 : 0;
    if (agents[otherIndex].alive) {
      activeAgentIndex = otherIndex;
      showBanner('OPERATIVE DOWN', 'CONTROL TRANSFERRED', 1.2);
    } else {
      showBanner('FIELD TEAM LOST', 'RESTARTING TEST', 1.8);
      restartTimer = 2;
    }
  }
}

function createEnemy(position, index) {
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: index % 2 === 0 ? 0x6f352f : 0x51415f,
    emissive: index % 2 === 0 ? 0x29100e : 0x1d1326,
    emissiveIntensity: 0.55,
    roughness: 0.78,
  });
  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4, 0), bodyMaterial);
  body.position.y = 0.48;
  body.castShadow = true;
  group.add(body);

  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xffb54f }),
  );
  eye.position.set(0, 0.52, -0.34);
  group.add(eye);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.43, 0.04, 6, 18),
    new THREE.MeshBasicMaterial({ color: 0xd55d44, transparent: true, opacity: 0.72 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.1;
  group.add(ring);

  group.position.copy(position);
  scene.add(group);

  return {
    group,
    bodyMaterial,
    health: 48 + targetCombatRoom.depth * 5,
    maxHealth: 48 + targetCombatRoom.depth * 5,
    speed: 1.75 + index * 0.08,
    damage: 11 + Math.floor(targetCombatRoom.depth / 2),
    attackTimer: Math.random() * 0.4,
    alive: true,
  };
}

function spawnEncounter() {
  encounterState = 'active';
  barrierGroup.visible = true;
  targetMarker.visible = false;

  const inactive = inactiveAgent();
  if (roomAtWorld(inactive.group.position.x, inactive.group.position.z)?.id !== targetCombatRoom.id) {
    inactive.group.position.copy(activeAgent().group.position).add(new THREE.Vector3(0.65, 0, 0.65));
  }

  const savedSpawns = (generated.markers?.spawns ?? []).filter(
    (spawn) => spawn.roomId === targetCombatRoom.id,
  );
  const fallback = [
    [-1.8, -1.4],
    [1.8, -1.1],
    [0.2, 1.9],
    [-2.1, 1.4],
  ];
  const count = Math.min(4, Math.max(3, savedSpawns.length));

  for (let i = 0; i < count; i += 1) {
    const saved = savedSpawns[i];
    const position = saved
      ? new THREE.Vector3(worldX(saved.x), 0.08, worldZ(saved.y))
      : new THREE.Vector3(
          worldX(targetCombatRoom.cx) + fallback[i][0],
          0.08,
          worldZ(targetCombatRoom.cy) + fallback[i][1],
        );
    enemies.push(createEnemy(position, i));
  }

  objectiveReadout.textContent = `Room locked · ${enemies.length} hostile signatures.`;
  showBanner('INTERLACED CONTACT', 'ROOM LOCKED', 1.5);
}

function spawnLoot() {
  const material = new THREE.MeshStandardMaterial({
    color: 0xd5a94f,
    emissive: 0x6f3f12,
    emissiveIntensity: 0.85,
    metalness: 0.45,
    roughness: 0.32,
  });
  const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), material);
  mesh.position.set(worldX(targetCombatRoom.cx), 0.65, worldZ(targetCombatRoom.cy));
  mesh.castShadow = true;
  scene.add(mesh);
  lootPickup = { mesh, material, collected: false, phase: 0 };
}

function clearEncounter() {
  encounterState = 'cleared';
  barrierGroup.visible = false;
  objectiveReadout.textContent = 'Room clear · recover the stabilized object.';
  showBanner('ROOM STATE', 'LOCK RELEASED', 1.35);
  spawnLoot();
}

function resetRun() {
  for (const enemy of enemies) scene.remove(enemy.group);
  enemies.length = 0;
  for (const projectile of projectiles) scene.remove(projectile.mesh);
  projectiles.length = 0;
  if (lootPickup) scene.remove(lootPickup.mesh);
  lootPickup = null;

  encounterState = 'waiting';
  barrierGroup.visible = false;
  targetMarker.visible = true;
  activeAgentIndex = 0;
  recoveredValue = 0;
  lootValue.textContent = '₵ 000';

  for (let i = 0; i < agents.length; i += 1) {
    const agent = agents[i];
    agent.health = agent.definition.maxHealth;
    agent.alive = true;
    agent.group.visible = true;
    agent.cooldowns.primary = 0;
    agent.cooldowns.secondary = 0;
    agent.cooldowns.dodge = 0;
    agent.invulnerableTimer = 0;
    agent.dodgeTimer = 0;
    agent.group.position.copy(entrancePosition).add(new THREE.Vector3(i * 0.75, 0, i * 0.75));
  }

  objectiveReadout.textContent = `Reach room ${String(targetCombatRoom.id).padStart(2, '0')} and clear the lock.`;
  restartTimer = 0;
}

function fireRanged(agent) {
  const forward = forwardFor(agent.group);
  const material = new THREE.MeshBasicMaterial({ color: 0x7ce1dc });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), material);
  mesh.position.copy(agent.group.position).addScaledVector(forward, 0.54);
  mesh.position.y = 0.54;
  scene.add(mesh);
  projectiles.push({
    mesh,
    velocity: forward.multiplyScalar(13.5),
    damage: agent.definition.primaryDamage,
    ttl: 1.35,
  });
  createPulse(agent.group.position, 0x7ce1dc, 0.1, 0.58, 0.16);
}

function swingMelee(agent) {
  const forward = forwardFor(agent.group);
  createPulse(agent.group.position.clone().addScaledVector(forward, 0.62), 0xf3c65f, 0.25, 1.6, 0.28);

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const offset = enemy.group.position.clone().sub(agent.group.position);
    const distance = offset.length();
    if (distance > 1.65) continue;
    offset.y = 0;
    offset.normalize();
    if (offset.dot(forward) > -0.1) damageEnemy(enemy, agent.definition.primaryDamage);
  }
}

function usePrimary() {
  const agent = activeAgent();
  if (!agent.alive || agent.cooldowns.primary > 0 || restartTimer > 0) return;
  agent.cooldowns.primary = agent.definition.primaryCooldown;
  if (agent.definition.id === 'ranged') fireRanged(agent);
  else swingMelee(agent);
}

function useSecondary() {
  const agent = activeAgent();
  if (!agent.alive || agent.cooldowns.secondary > 0 || restartTimer > 0) return;
  agent.cooldowns.secondary = agent.definition.secondaryCooldown;

  if (agent.definition.id === 'ranged') {
    for (const member of agents) {
      if (!member.alive) continue;
      member.health = Math.min(member.definition.maxHealth, member.health + 32);
      createPulse(member.group.position, 0x77d8b8, 0.25, 1.4, 0.4);
    }
    showBanner('FIELD ACTION', 'TREATMENT APPLIED', 0.9);
  } else {
    createPulse(agent.group.position, 0xe0a94d, 0.35, 3.1, 0.44);
    for (const enemy of enemies) {
      if (enemy.alive && enemy.group.position.distanceTo(agent.group.position) <= 2.7) {
        damageEnemy(enemy, 35);
      }
    }
  }
}

function startDodge() {
  const agent = activeAgent();
  if (!agent.alive || agent.cooldowns.dodge > 0 || restartTimer > 0) return;

  let inputX = 0;
  let inputZ = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) inputX -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) inputX += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) inputZ -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) inputZ += 1;

  if (Math.hypot(inputX, inputZ) > 0) {
    agent.dodgeDirection.set(inputX, 0, inputZ).normalize();
  } else {
    agent.dodgeDirection.copy(forwardFor(agent.group));
  }

  agent.cooldowns.dodge = 1.05;
  agent.dodgeTimer = 0.19;
  agent.invulnerableTimer = 0.3;
  createPulse(agent.group.position, agent.definition.accent, 0.2, 1.1, 0.22);
}

function switchAgent() {
  const next = 1 - activeAgentIndex;
  if (!agents[next].alive || restartTimer > 0) return;
  activeAgentIndex = next;
  showBanner('FIELD PAIR', `${activeAgent().definition.label} ACTIVE`, 0.72);
}

function applyInterlacing(active) {
  interlacingActive = active;
  scene.background = active ? activeBackground : dormantBackground;
  scene.fog.color.copy(active ? activeBackground : dormantBackground);
  ambient.color.set(active ? 0x9c5c88 : 0x94a7a0);
  keyLight.color.set(active ? 0xff755c : 0xffddaa);
  rimLight.color.set(active ? 0x555cff : 0x5ba6a2);

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

function updatePointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  raycaster.ray.intersectPlane(aimPlane, aimPoint);
}

renderer.domElement.addEventListener('pointermove', updatePointer);
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  updatePointer(event);
  usePrimary();
});
renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());

window.addEventListener('keydown', (event) => {
  if (event.code === 'Tab') event.preventDefault();
  keys.add(event.code);

  if (event.repeat) return;
  if (event.code === 'KeyI') applyInterlacing(!interlacingActive);
  else if (event.code === 'KeyQ' || event.code === 'Tab') switchAgent();
  else if (event.code === 'Digit1' || event.code === 'Numpad1') usePrimary();
  else if (event.code === 'Digit2' || event.code === 'Numpad2') useSecondary();
  else if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') startDodge();
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

function updateCooldowns(delta) {
  for (const agent of agents) {
    agent.cooldowns.primary = Math.max(0, agent.cooldowns.primary - delta);
    agent.cooldowns.secondary = Math.max(0, agent.cooldowns.secondary - delta);
    agent.cooldowns.dodge = Math.max(0, agent.cooldowns.dodge - delta);
    agent.dodgeTimer = Math.max(0, agent.dodgeTimer - delta);
    agent.invulnerableTimer = Math.max(0, agent.invulnerableTimer - delta);
    agent.group.scale.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.exp(-delta * 18));
  }
}

function updateActiveMovement(delta) {
  const agent = activeAgent();
  if (!agent.alive || restartTimer > 0) return;

  const aimOffset = aimPoint.clone().sub(agent.group.position);
  aimOffset.y = 0;
  if (aimOffset.lengthSq() > 0.1) {
    agent.group.rotation.y = Math.atan2(-aimOffset.x, -aimOffset.z);
  }

  let inputX = 0;
  let inputZ = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) inputX -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) inputX += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) inputZ -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) inputZ += 1;

  let direction = new THREE.Vector3(inputX, 0, inputZ);
  if (agent.dodgeTimer > 0) direction = agent.dodgeDirection.clone();
  else if (direction.lengthSq() > 0) direction.normalize();
  else return;

  const multiplier = agent.dodgeTimer > 0 ? 2.75 : 1;
  const step = agent.definition.speed * multiplier * delta;
  moveWithCollision(agent.group, direction.x * step, direction.z * step, canOccupyAgent);
}

function updatePartner(delta) {
  const active = activeAgent();
  const partner = inactiveAgent();
  if (!partner.alive || !active.alive || restartTimer > 0) return;

  const backOffset = new THREE.Vector3(
    Math.sin(active.group.rotation.y) * 1.15,
    0,
    Math.cos(active.group.rotation.y) * 1.15,
  );
  const sideOffset = new THREE.Vector3(
    Math.cos(active.group.rotation.y) * 0.52,
    0,
    -Math.sin(active.group.rotation.y) * 0.52,
  );
  const desired = active.group.position.clone().add(backOffset).add(sideOffset);
  const toDesired = desired.sub(partner.group.position);
  const distance = toDesired.length();

  if (distance > 4.5) {
    const rescue = active.group.position.clone().add(backOffset.multiplyScalar(0.55));
    if (canOccupyAgent(rescue.x, rescue.z)) partner.group.position.copy(rescue);
    return;
  }

  if (distance > 0.2) {
    toDesired.normalize();
    const step = Math.min(distance, (partner.definition.speed + 0.9) * delta);
    moveWithCollision(partner.group, toDesired.x * step, toDesired.z * step, canOccupyAgent);
    partner.group.rotation.y = Math.atan2(-toDesired.x, -toDesired.z);
  }
}

function updateProjectiles(delta) {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const projectile = projectiles[i];
    projectile.ttl -= delta;
    projectile.mesh.position.addScaledVector(projectile.velocity, delta);

    let remove = projectile.ttl <= 0 || !floorAtWorld(projectile.mesh.position.x, projectile.mesh.position.z);
    if (!remove) {
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (enemy.group.position.distanceTo(projectile.mesh.position) < 0.5) {
          damageEnemy(enemy, projectile.damage);
          remove = true;
          break;
        }
      }
    }

    if (remove) {
      scene.remove(projectile.mesh);
      projectiles.splice(i, 1);
    }
  }
}

function updateEnemies(delta) {
  if (encounterState !== 'active' || restartTimer > 0) return;
  const target = activeAgent();
  if (!target.alive) return;

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.attackTimer = Math.max(0, enemy.attackTimer - delta);
    enemy.group.scale.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.exp(-delta * 15));

    const offset = target.group.position.clone().sub(enemy.group.position);
    offset.y = 0;
    const distance = offset.length();
    if (distance > 0.72) {
      offset.normalize();
      const speed = enemy.speed * (interlacingActive ? 1.32 : 1);
      moveWithCollision(enemy.group, offset.x * speed * delta, offset.z * speed * delta, canOccupyEnemy);
      enemy.group.rotation.y = Math.atan2(-offset.x, -offset.z);
    } else if (enemy.attackTimer <= 0) {
      damageAgent(target, enemy.damage * (interlacingActive ? 1.35 : 1));
      enemy.attackTimer = interlacingActive ? 0.58 : 0.78;
    }
  }
}

function updateEncounter() {
  if (encounterState !== 'waiting') return;
  const room = roomAtWorld(activeAgent().group.position.x, activeAgent().group.position.z);
  if (room?.id === targetCombatRoom.id) spawnEncounter();
}

function updateLoot(delta, elapsed) {
  if (!lootPickup || lootPickup.collected) return;
  lootPickup.mesh.rotation.y += delta * 1.9;
  lootPickup.mesh.position.y = 0.62 + Math.sin(elapsed * 2.6) * 0.12;

  if (activeAgent().group.position.distanceTo(lootPickup.mesh.position) < 0.9) {
    lootPickup.collected = true;
    recoveredValue += interlacingActive ? 250 : 125;
    lootValue.textContent = `₵ ${String(recoveredValue).padStart(3, '0')}`;
    createPulse(lootPickup.mesh.position, 0xffd467, 0.2, 2.4, 0.5);
    scene.remove(lootPickup.mesh);
    objectiveReadout.textContent = 'Combat loop connected · map, pair, lock and loot verified.';
    showBanner('RECOVERED OBJECT', interlacingActive ? 'UNSTABLE VALUE +250' : 'STABLE VALUE +125', 1.5);
  }
}

function updateEffects(delta) {
  for (let i = effects.length - 1; i >= 0; i -= 1) {
    const effect = effects[i];
    effect.age += delta;
    const progress = Math.min(1, effect.age / effect.duration);
    const scale = THREE.MathUtils.lerp(effect.startScale, effect.endScale, 1 - (1 - progress) ** 3);
    effect.mesh.scale.setScalar(scale);
    effect.material.opacity = 0.85 * (1 - progress);
    if (progress >= 1) {
      scene.remove(effect.mesh);
      effects.splice(i, 1);
    }
  }
}

function setCooldownVisual(element, remaining, maximum) {
  const fraction = maximum > 0 ? THREE.MathUtils.clamp(remaining / maximum, 0, 1) : 0;
  element.classList.toggle('ready', fraction <= 0);
  element.querySelector('.cooldown-mask').style.height = `${fraction * 100}%`;
}

function updateHud() {
  const ranged = agents[0];
  const melee = agents[1];
  const active = activeAgent();

  const rangedFraction = ranged.health / ranged.definition.maxHealth;
  const meleeFraction = melee.health / melee.definition.maxHealth;
  hud.rangedHealth.style.width = `${Math.max(0, rangedFraction) * 100}%`;
  hud.meleeHealth.style.width = `${Math.max(0, meleeFraction) * 100}%`;
  hud.rangedHealthCopy.textContent = `${Math.ceil(ranged.health)} / ${ranged.definition.maxHealth}`;
  hud.meleeHealthCopy.textContent = `${Math.ceil(melee.health)} / ${melee.definition.maxHealth}`;
  hud.rangedCard.classList.toggle('active', activeAgentIndex === 0);
  hud.meleeCard.classList.toggle('active', activeAgentIndex === 1);

  hud.activeName.textContent = active.definition.label;
  hud.activePortrait.className = `portrait portrait-${active.definition.id}`;
  hud.activePortrait.innerHTML = `<span>${active.definition.id === 'ranged' ? 'R' : 'M'}</span>`;
  hud.primaryName.textContent = active.definition.primaryName;
  hud.primaryCopy.textContent = active.definition.primaryCopy;
  hud.secondaryName.textContent = active.definition.secondaryName;
  hud.secondaryCopy.textContent = active.definition.secondaryCopy;
  setCooldownVisual(hud.primary, active.cooldowns.primary, active.definition.primaryCooldown);
  setCooldownVisual(hud.secondary, active.cooldowns.secondary, active.definition.secondaryCooldown);
  setCooldownVisual(hud.dodge, active.cooldowns.dodge, 1.05);
}

let lastRoomId = Symbol('unset');
function updateRoomReadout() {
  const room = roomAtWorld(activeAgent().group.position.x, activeAgent().group.position.z);
  const nextId = room?.id ?? null;
  if (nextId === lastRoomId) return;
  lastRoomId = nextId;
  roomReadout.textContent = room
    ? `ROOM ${String(room.id).padStart(2, '0')} · ${room.type.toUpperCase()} · DEPTH ${room.depth}`
    : 'CORRIDOR · BETWEEN ROOMS';
}

function updateCamera() {
  camera.position.set(cameraTarget.x + 9.5, 16, cameraTarget.z + 9.5);
  camera.lookAt(cameraTarget.x, 0, cameraTarget.z);
}

function resize() {
  const rect = viewport.getBoundingClientRect();
  const aspect = rect.width / rect.height;
  camera.left = -CAMERA_SIZE * aspect;
  camera.right = CAMERA_SIZE * aspect;
  camera.top = CAMERA_SIZE;
  camera.bottom = -CAMERA_SIZE;
  camera.updateProjectionMatrix();
  renderer.setSize(rect.width, rect.height);
}
window.addEventListener('resize', resize);
resize();

applyInterlacing(false);
updateRoomReadout();
showBanner('FIELD TEST', 'PAIR DEPLOYED', 1.2);

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const delta = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  if (restartTimer > 0) {
    restartTimer = Math.max(0, restartTimer - delta);
    if (restartTimer === 0) resetRun();
  }

  bannerTimer = Math.max(0, bannerTimer - delta);
  if (bannerTimer === 0) encounterBanner.classList.remove('show');

  updateCooldowns(delta);
  updateActiveMovement(delta);
  updatePartner(delta);
  updateProjectiles(delta);
  updateEnemies(delta);
  updateEncounter();
  updateLoot(delta, elapsed);
  updateEffects(delta);
  updateHud();
  updateRoomReadout();

  cameraTarget.lerp(activeAgent().group.position, 1 - Math.exp(-delta * 7.5));
  updateCamera();

  const markerPulse = 0.88 + Math.sin(elapsed * 2.4) * 0.13;
  entranceMarker.scale.setScalar(0.92 + Math.sin(elapsed * 1.7) * 0.08);
  targetRing.scale.setScalar(markerPulse);
  targetRing.material.opacity = 0.7 + Math.sin(elapsed * 2.4) * 0.18;
  targetBeam.material.opacity = 0.12 + Math.sin(elapsed * 1.8) * 0.05;
  barrierMaterial.emissiveIntensity = 1.25 + Math.sin(elapsed * 7) * 0.35;

  renderer.render(scene, camera);
}

frame();
