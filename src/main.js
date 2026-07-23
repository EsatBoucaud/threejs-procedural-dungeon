import './ui/styles.css';
import { WorldRenderer } from './render/world-renderer.js';
import { RunController } from './game/run-controller.js';
import { generateMapState, validateMapState } from './core/dungeon-generator.js';

const canvas = document.querySelector('#game-canvas');
const renderer = new WorldRenderer(canvas);
const elements = {
  briefing: document.querySelector('#briefing'),
  debrief: document.querySelector('#debrief'),
  begin: document.querySelector('#begin-button'),
  restart: document.querySelector('#restart-button'),
  export: document.querySelector('#export-button'),
  seed: document.querySelector('#seed-label'),
  operativeName: document.querySelector('#operative-name'),
  operativeMark: document.querySelector('#operative-mark'),
  kit: document.querySelector('#kit-label'),
  health: document.querySelector('#health-fill'),
  room: document.querySelector('#room-label'),
  loot: document.querySelector('#loot-label'),
  timer: document.querySelector('#timer-label'),
  eventFeed: document.querySelector('#event-feed'),
  crosshair: document.querySelector('#crosshair'),
  debriefTitle: document.querySelector('#debrief-title'),
  debriefCopy: document.querySelector('#debrief-copy'),
  debriefValue: document.querySelector('#debrief-value'),
  debriefCut: document.querySelector('#debrief-cut'),
  debriefPayout: document.querySelector('#debrief-payout'),
};

const input = {
  keys: new Set(),
  aim: { x: 0, y: 0 },
  aimWorld: null,
};

let mapState;
let run;
let started = false;
let previousTime = performance.now();

function formatCurrency(value) {
  return `₢ ${Math.round(value).toLocaleString()}`;
}

function formatTimer(seconds) {
  const total = Math.ceil(Math.max(0, seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function feed(message, tone = '') {
  const item = document.createElement('div');
  item.className = `feed-item ${tone}`.trim();
  item.textContent = message;
  elements.eventFeed.prepend(item);
  while (elements.eventFeed.children.length > 7) elements.eventFeed.lastElementChild.remove();
  window.setTimeout(() => item.remove(), 7800);
}

function updateOperative(operative, health, maxHealth) {
  elements.operativeName.textContent = operative.name;
  elements.operativeMark.textContent = operative.mark;
  elements.kit.textContent = operative.role;
  elements.health.style.width = `${Math.max(0, (health / maxHealth) * 100)}%`;
}

function createRunEvents() {
  return {
    onOperative: updateOperative,
    onHealth: (health, maxHealth) => {
      elements.health.style.width = `${Math.max(0, (health / maxHealth) * 100)}%`;
    },
    onRoom: (room) => {
      elements.room.textContent = `${room.type.toUpperCase()} ${String(room.id).padStart(2, '0')}`;
    },
    onLoot: (value) => {
      elements.loot.textContent = formatCurrency(value);
    },
    onTimer: (seconds) => {
      elements.timer.textContent = formatTimer(seconds);
    },
    onInterlace: () => {
      elements.timer.textContent = 'INTERLACED';
      elements.timer.style.color = '#d985d8';
      document.body.classList.add('interlaced');
    },
    onFeed: feed,
    onFinish: showDebrief,
  };
}

async function loadInitialMap() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}maps/abrir-001.json`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Map request failed: ${response.status}`);
    const state = await response.json();
    const validation = validateMapState(state);
    if (!validation.valid) throw new Error(validation.errors.join(' '));
    return state;
  } catch (error) {
    console.warn('Falling back to browser-generated map state.', error);
    return generateMapState({ seed: 'ABRIR-001', roomCount: 20, loopChance: 0.3, interlaceAtSeconds: 90 });
  }
}

function installRun(state) {
  mapState = state;
  renderer.resetEntities();
  renderer.buildMap(state);
  run = new RunController(renderer, state, createRunEvents());
  elements.seed.textContent = `${state.seedLabel} / ${state.seed}`;
  elements.timer.style.color = '';
  elements.eventFeed.replaceChildren();
  document.body.classList.remove('interlaced');
  input.aimWorld = run.player.position.clone().add({ x: 0, y: 0, z: -5 });
}

function begin() {
  started = true;
  elements.briefing.close();
  feed('Passage opened. The field clock is already running.', 'good');
}

function showDebrief(result) {
  started = false;
  elements.debriefTitle.textContent = result.success ? 'EXTRACTION COMPLETE' : 'FIELD TEAM LOST';
  elements.debriefCopy.textContent = result.success
    ? `${result.recovered.length} object${result.recovered.length === 1 ? '' : 's'} crossed back into the stable world. The Institute has already calculated its share.`
    : `The passage closed around the team. The map state remains reproducible; the loss does not.`;
  elements.debriefValue.textContent = formatCurrency(result.value);
  elements.debriefCut.textContent = formatCurrency(result.instituteCut);
  elements.debriefPayout.textContent = formatCurrency(result.payout);
  elements.debrief.showModal();
}

function restart() {
  elements.debrief.close();
  const seed = `ABRIR-${Date.now().toString(36).toUpperCase()}`;
  installRun(generateMapState({ seed, roomCount: 20, loopChance: 0.3, interlaceAtSeconds: 90 }));
  started = true;
  feed('A new deterministic state has been forged.', 'good');
}

function exportMap() {
  const blob = new Blob([`${JSON.stringify(mapState, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${String(mapState.seedLabel).replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function movementVector() {
  return {
    x: (input.keys.has('KeyD') ? 1 : 0) - (input.keys.has('KeyA') ? 1 : 0),
    z: (input.keys.has('KeyS') ? 1 : 0) - (input.keys.has('KeyW') ? 1 : 0),
  };
}

window.addEventListener('keydown', (event) => {
  input.keys.add(event.code);
  if (!started || event.repeat) return;
  if (event.code === 'KeyQ') run.switchOperative();
  if (event.code === 'KeyE') run.interact();
  if (event.code === 'KeyI') run.forceInterlace();
});
window.addEventListener('keyup', (event) => input.keys.delete(event.code));
canvas.addEventListener('pointermove', (event) => {
  input.aim.x = event.clientX;
  input.aim.y = event.clientY;
  input.aimWorld = renderer.screenToWorld(event.clientX, event.clientY);
  elements.crosshair.style.left = `${event.clientX}px`;
  elements.crosshair.style.top = `${event.clientY}px`;
  elements.crosshair.style.opacity = started ? '1' : '0';
});
canvas.addEventListener('pointerleave', () => { elements.crosshair.style.opacity = '0'; });
canvas.addEventListener('pointerdown', (event) => {
  if (!started || event.button !== 0) return;
  input.aimWorld = renderer.screenToWorld(event.clientX, event.clientY);
  run.attack(input.aimWorld);
});

elements.begin.addEventListener('click', begin);
elements.restart.addEventListener('click', restart);
elements.export.addEventListener('click', exportMap);

function frame(time) {
  const delta = Math.min(0.05, (time - previousTime) / 1000);
  previousTime = time;
  if (run) {
    const aim = input.aimWorld ?? run.player.position.clone().add({ x: 0, y: 0, z: -5 });
    if (started) run.update(delta, movementVector(), aim);
    else renderer.update(delta, run.player.position, aim);
  }
  requestAnimationFrame(frame);
}

mapState = await loadInitialMap();
installRun(mapState);
elements.briefing.showModal();
requestAnimationFrame(frame);
