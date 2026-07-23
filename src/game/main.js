import * as THREE from 'three';
import mapState from '../../content/maps/generated/abrir-mvp-seed-20260723.json';
import './styles.css';

const FLOOR = 1;
const WALL = 2;
const POOL = 3;
const PLAYER_RADIUS = 0.28;
const MOVE_SPEED = 5.4;

const viewport = document.querySelector('#viewport');
const mapName = document.querySelector('#map-name');
const mapMeta = document.querySelector('#map-meta');
const roomReadout = document.querySelector('#room-readout');
const interlaceReadout = document.querySelector('#interlace-readout');

function assertMapState(state) {
  const width = state?.generated?.dimensions?.width;
  const height = state?.generated?.dimensions?.height;
  const cellCount = width * height;

  if (state?.schemaVersion !== 1) throw new Error('Unsupported ABRIR map schema.');
  if (!Number.isInteger(width) || !Number.isInteger(height)) throw new Error('Invalid map dimensions.');
  if (state.generated.layers.grid?.length !== cellCount) throw new Error('Grid layer size mismatch.');
  if (state.generated.layers.roomId?.length !== cellCount) throw new Error('Room layer size mismatch.');
}

assertMapState(mapState);

const generated = mapState.generated;
const { width, height } = generated.dimensions;
const { grid, roomId } = generated.layers;
const roomById = new Map(generated.rooms.map((room) => [room.id, room]));
const entrance = roomById.get(generated.entranceRoomId);

if (!entrance) throw new Error('Saved map entrance room is missing.');

mapName.textContent = generated.name;
mapMeta.textContent =
  `seed ${mapState.generator.seed} · ${generated.rooms.length} rooms · ` +
  `${generated.edges.length} links · saved Three.js state`;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const dormantBackground = new THREE.Color(0x05070c);
const activeBackground = new THREE.Color(0x10050b);
scene.background = dormantBackground;
scene.fog = new THREE.FogExp2(dormantBackground, 0.018);

const CAMERA_SIZE = 25;
const camera = new THREE.OrthographicCamera(-CAMERA_SIZE, CAMERA_SIZE, CAMERA_SIZE, -CAMERA_SIZE, 0.1, 180);
const cameraTarget = new THREE.Vector3();

const ambient = new THREE.HemisphereLight(0x8caac4, 0x11131a, 1.5);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0xffe0a3, 2.8);
keyLight.position.set(18, 30, 14);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -30;
keyLight.shadow.camera.right = 30;
keyLight.shadow.camera.top = 30;
keyLight.shadow.camera.bottom = -30;
scene.add(keyLight);

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

const typeColors = {
  entrance: 0x42cbb9,
  combat: 0x7d8591,
  elite: 0x9368d1,
  treasure: 0xd1a245,
  shrine: 0x5189d8,
  boss: 0xcf5148,
};
const corridorColor = new THREE.Color(0x535b68);
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
const floorGeometry = new THREE.BoxGeometry(0.96, 0.12, 0.96);
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.9,
  metalness: 0.03,
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
  const color = room ? new THREE.Color(typeColors[room.type] ?? typeColors.combat) : corridorColor.clone();
  color.multiplyScalar(0.7 + (room?.difficulty ?? 0.25) * 0.24);
  baseFloorColors.push(color);
  floorMesh.setColorAt(i, color);
}
floorMesh.instanceMatrix.needsUpdate = true;
floorMesh.instanceColor.needsUpdate = true;

const wallGeometry = new THREE.BoxGeometry(0.98, 1.65, 0.98);
const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0x242a34,
  roughness: 0.96,
  metalness: 0.05,
});
const wallMesh = new THREE.InstancedMesh(wallGeometry, wallMaterial, wallCells.length);
wallMesh.castShadow = true;
wallMesh.receiveShadow = true;
scene.add(wallMesh);
for (let i = 0; i < wallCells.length; i += 1) {
  const cell = wallCells[i];
  matrix.makeTranslation(worldX(cell.x), 0.82, worldZ(cell.y));
  wallMesh.setMatrixAt(i, matrix);
}
wallMesh.instanceMatrix.needsUpdate = true;

if (poolCells.length > 0) {
  const poolGeometry = new THREE.BoxGeometry(0.94, 0.04, 0.94);
  const poolMaterial = new THREE.MeshStandardMaterial({
    color: 0x25445e,
    emissive: 0x0a243c,
    emissiveIntensity: 0.65,
    roughness: 0.35,
    metalness: 0.25,
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

const semanticMarkers = [];
const markerGeometry = new THREE.TorusGeometry(0.56, 0.055, 8, 30);
for (const room of generated.rooms) {
  if (!['entrance', 'treasure', 'shrine', 'boss'].includes(room.type)) continue;
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: typeColors[room.type],
    transparent: true,
    opacity: 0.9,
  });
  const marker = new THREE.Mesh(markerGeometry, markerMaterial);
  marker.rotation.x = Math.PI / 2;
  marker.position.set(worldX(room.cx), 0.14, worldZ(room.cy));
  marker.userData.phase = room.id * 0.73;
  scene.add(marker);
  semanticMarkers.push(marker);
}

const player = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.CylinderGeometry(0.28, 0.34, 0.78, 12),
  new THREE.MeshStandardMaterial({ color: 0xe9e0ca, roughness: 0.65, metalness: 0.1 }),
);
body.position.y = 0.47;
body.castShadow = true;
player.add(body);

const direction = new THREE.Mesh(
  new THREE.ConeGeometry(0.18, 0.42, 10),
  new THREE.MeshStandardMaterial({ color: 0xe1a746, roughness: 0.55 }),
);
direction.rotation.x = Math.PI / 2;
direction.position.set(0, 0.52, -0.42);
direction.castShadow = true;
player.add(direction);

player.position.set(worldX(entrance.cx), 0.08, worldZ(entrance.cy));
scene.add(player);

cameraTarget.copy(player.position);

function updateCamera() {
  camera.position.set(cameraTarget.x + 17, 24, cameraTarget.z + 17);
  camera.lookAt(cameraTarget.x, 0, cameraTarget.z);
}
updateCamera();

const keys = new Set();
let interlacingActive = false;

function applyInterlacing(active) {
  interlacingActive = active;
  scene.background = active ? activeBackground : dormantBackground;
  scene.fog.color.copy(active ? activeBackground : dormantBackground);
  ambient.color.set(active ? 0x9c5c88 : 0x8caac4);
  keyLight.color.set(active ? 0xff765f : 0xffe0a3);

  for (let i = 0; i < baseFloorColors.length; i += 1) {
    if (active) {
      const phaseColor = i % 2 === 0 ? interlaceA : interlaceB;
      tempColor.copy(baseFloorColors[i]).lerp(phaseColor, 0.46);
      floorMesh.setColorAt(i, tempColor);
    } else {
      floorMesh.setColorAt(i, baseFloorColors[i]);
    }
  }
  floorMesh.instanceColor.needsUpdate = true;
  interlaceReadout.textContent = `INTERLACING · ${active ? 'ACTIVE' : 'DORMANT'}`;
  interlaceReadout.classList.toggle('active', active);
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'KeyI' && !event.repeat) applyInterlacing(!interlacingActive);
  keys.add(event.code);
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => keys.clear());

function canOccupy(x, z) {
  const samples = [
    [x - PLAYER_RADIUS, z - PLAYER_RADIUS],
    [x + PLAYER_RADIUS, z - PLAYER_RADIUS],
    [x - PLAYER_RADIUS, z + PLAYER_RADIUS],
    [x + PLAYER_RADIUS, z + PLAYER_RADIUS],
  ];

  return samples.every(([sampleX, sampleZ]) => {
    const cell = cellFromWorld(sampleX, sampleZ);
    if (cell.x < 0 || cell.y < 0 || cell.x >= width || cell.y >= height) return false;
    return grid[cellIndex(cell.x, cell.y)] === FLOOR;
  });
}

function currentRoom() {
  const cell = cellFromWorld(player.position.x, player.position.z);
  if (cell.x < 0 || cell.y < 0 || cell.x >= width || cell.y >= height) return null;
  return roomById.get(roomId[cellIndex(cell.x, cell.y)]) ?? null;
}

let lastRoomId = null;
function updateRoomReadout() {
  const room = currentRoom();
  if (room?.id === lastRoomId) return;
  lastRoomId = room?.id ?? null;
  roomReadout.textContent = room
    ? `ROOM ${String(room.id).padStart(2, '0')} · ${room.type.toUpperCase()} · DEPTH ${room.depth}`
    : 'CORRIDOR · BETWEEN ROOMS';
}

function updateMovement(delta) {
  let inputX = 0;
  let inputZ = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) inputX -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) inputX += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) inputZ -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) inputZ += 1;

  const length = Math.hypot(inputX, inputZ);
  if (length === 0) return;

  inputX /= length;
  inputZ /= length;
  const step = MOVE_SPEED * delta;
  const nextX = player.position.x + inputX * step;
  const nextZ = player.position.z + inputZ * step;

  if (canOccupy(nextX, player.position.z)) player.position.x = nextX;
  if (canOccupy(player.position.x, nextZ)) player.position.z = nextZ;

  player.rotation.y = Math.atan2(-inputX, -inputZ);
}

function resize() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.left = -CAMERA_SIZE * aspect;
  camera.right = CAMERA_SIZE * aspect;
  camera.top = CAMERA_SIZE;
  camera.bottom = -CAMERA_SIZE;
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

  updateMovement(delta);
  cameraTarget.lerp(player.position, 1 - Math.exp(-delta * 7));
  updateCamera();
  updateRoomReadout();

  for (const marker of semanticMarkers) {
    const pulse = 0.85 + Math.sin(elapsed * 2.2 + marker.userData.phase) * 0.12;
    marker.scale.setScalar(pulse);
    marker.material.opacity = 0.62 + Math.sin(elapsed * 2.2 + marker.userData.phase) * 0.18;
  }

  renderer.render(scene, camera);
}

updateRoomReadout();
frame();
