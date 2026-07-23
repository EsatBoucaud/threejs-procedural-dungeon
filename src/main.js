import './ui/styles.css';
import { generateMapState, validateMapState } from './core/dungeon-generator.js';
import { RunController } from './game/run-controller.js';
import { loadProfile, rankTitle } from './game/progression-system.js';
import { WorldRenderer } from './render/world-renderer.js';
import { Minimap } from './ui/minimap.js';

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
  team: document.querySelector('#team-strip'),
  contractTitle: document.querySelector('#contract-title'),
  contractDescription: document.querySelector('#contract-description'),
  contractChecks: document.querySelector('#contract-checks'),
  briefContractTitle: document.querySelector('#brief-contract-title'),
  briefContractCopy: document.querySelector('#brief-contract-copy'),
  abilityName: document.querySelector('#ability-name'),
  abilityFill: document.querySelector('#ability-fill'),
  abilityTime: document.querySelector('#ability-time'),
  dodgeFill: document.querySelector('#dodge-fill'),
  dodgeTime: document.querySelector('#dodge-time'),
  threatFill: document.querySelector('#threat-fill'),
  bossBanner: document.querySelector('#boss-banner'),
  bossName: document.querySelector('#boss-name'),
  bossHealth: document.querySelector('#boss-health-fill'),
  interlaceFlash: document.querySelector('#interlace-flash'),
  profileRank: document.querySelector('#profile-rank'),
  profileTitle: document.querySelector('#profile-title'),
  profileScrip: document.querySelector('#profile-scrip'),
  debriefTitle: document.querySelector('#debrief-title'),
  debriefCopy: document.querySelector('#debrief-copy'),
  debriefValue: document.querySelector('#debrief-value'),
  debriefCut: document.querySelector('#debrief-cut'),
  debriefBonus: document.querySelector('#debrief-bonus'),
  debriefPayout: document.querySelector('#debrief-payout'),
  debriefRank: document.querySelector('#debrief-rank'),
  debriefContract: document.querySelector('#debrief-contract'),
  minimap: document.querySelector('#minimap-canvas'),
};

const input = {
  keys: new Set(),
  aim: { x: 0, y: 0 },
  aimWorld: null,
};

let mapState;
let run;
let minimap;
let started = false;
let previousTime = performance.now();

function formatCurrency(value) {
  return `₢ ${Math.round(value).toLocaleString()}`;
}

function formatTimer(seconds) {
  const total = Math.ceil(Math.max(0, seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function cooldownLabel(value) {
  return value <= 0.04 ? 'READY' : `${value.toFixed(value > 3 ? 0 : 1)}s`;
}

function feed(message, tone = '') {
  const item = document.createElement('div');
  item.className = `feed-item ${tone}`.trim();
  item.textContent = message;
  elements.eventFeed.prepend(item);
  while (elements.eventFeed.children.length > 9) elements.eventFeed.lastElementChild.remove();
  window.setTimeout(() => item.remove(), 8600);
}

function updateProfile(profile = loadProfile()) {
  elements.profileRank.textContent = `RANK ${profile.rank}`;
  elements.profileTitle.textContent = rankTitle(profile.rank);
  elements.profileScrip.textContent = `${formatCurrency(profile.scrip)} FIELD SCRIP`;
}

function updateOperative(operative, health, maxHealth) {
  elements.operativeName.textContent = operative.name;
  elements.operativeMark.textContent = operative.mark;
  elements.operativeMark.style.setProperty('--operative-color', `#${operative.color.toString(16).padStart(6, '0')}`);
  elements.kit.textContent = operative.role;
  elements.health.style.width = `${Math.max(0, (health / maxHealth) * 100)}%`;
}

function renderTeam(team) {
  elements.team.replaceChildren();
  for (const operative of team) {
    const card = document.createElement('article');
    card.className = `team-member${operative.active ? ' active' : ''}${operative.health <= 0 ? ' down' : ''}`;
    card.innerHTML = `
      <b>${operative.mark}</b>
      <span><strong>${operative.name}</strong><i><em style="width:${Math.max(0, operative.health / operative.maxHealth * 100)}%"></em></i></span>
    `;
    elements.team.append(card);
  }
}

function renderContract(contract, status) {
  elements.contractTitle.textContent = contract.title;
  elements.contractDescription.textContent = contract.description;
  elements.briefContractTitle.textContent = contract.title;
  elements.briefContractCopy.textContent = `${contract.description} Completion pays ${formatCurrency(contract.bonus)} plus a ${contract.riskMultiplier.toFixed(2)}× field multiplier.`;
  if (!status) return;
  elements.contractChecks.replaceChildren();
  for (const check of status.checks) {
    const line = document.createElement('span');
    line.className = check.complete ? 'complete' : '';
    line.textContent = `${check.complete ? '◆' : '◇'} ${check.label}`;
    elements.contractChecks.append(line);
  }
}

function createRunEvents() {
  return {
    onOperative: updateOperative,
    onHealth: (health, maxHealth) => {
      elements.health.style.width = `${Math.max(0, (health / maxHealth) * 100)}%`;
    },
    onTeam: renderTeam,
    onRoom: (room) => {
      elements.room.textContent = `${room.type.toUpperCase()} ${String(room.id).padStart(2, '0')}`;
    },
    onLoot: (value) => {
      elements.loot.textContent = formatCurrency(value);
    },
    onTimer: (seconds) => {
      if (!document.body.classList.contains('interlaced')) elements.timer.textContent = formatTimer(seconds);
    },
    onContract: (contract) => renderContract(contract),
    onObjective: (contract, status) => renderContract(contract, status),
    onMap: (state) => minimap?.setState(state),
    onCooldowns: ({ ability, abilityMax, abilityName, dodge, dodgeMax }) => {
      elements.abilityName.textContent = abilityName;
      elements.abilityFill.style.width = `${Math.max(0, 100 * (1 - ability / abilityMax))}%`;
      elements.abilityTime.textContent = cooldownLabel(ability);
      elements.dodgeFill.style.width = `${Math.max(0, 100 * (1 - dodge / dodgeMax))}%`;
      elements.dodgeTime.textContent = cooldownLabel(dodge);
    },
    onThreat: (value) => {
      elements.threatFill.style.width = `${Math.round(value * 100)}%`;
      document.body.classList.toggle('high-threat', value > 0.72);
    },
    onBoss: ({ name, state }) => {
      elements.bossName.textContent = name;
      elements.bossBanner.classList.toggle('visible', state === 'arrived');
      if (state === 'defeated') window.setTimeout(() => elements.bossBanner.classList.remove('visible'), 1200);
    },
    onBossHealth: (health, maxHealth) => {
      elements.bossHealth.style.width = `${Math.max(0, health / maxHealth * 100)}%`;
    },
    onBoon: () => {
      document.body.classList.add('boon-active');
      window.setTimeout(() => document.body.classList.remove('boon-active'), 700);
    },
    onInterlace: () => {
      elements.timer.textContent = 'INTERLACED';
      elements.timer.style.color = '#e393e4';
      document.body.classList.add('interlaced');
      elements.interlaceFlash.classList.add('active');
      window.setTimeout(() => elements.interlaceFlash.classList.remove('active'), 1100);
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
    return generateMapState({ seed: 'ABRIR-001', roomCount: 24, loopChance: 0.34, interlaceAtSeconds: 82 });
  }
}

function installRun(state) {
  mapState = state;
  renderer.resetEntities();
  renderer.buildMap(state);
  minimap = new Minimap(elements.minimap, state);
  run = new RunController(renderer, state, createRunEvents());
  elements.seed.textContent = `${state.seedLabel} / ${state.seed}`;
  elements.timer.style.color = '';
  elements.eventFeed.replaceChildren();
  elements.bossBanner.classList.remove('visible');
  elements.threatFill.style.width = '0%';
  document.body.classList.remove('interlaced', 'high-threat');
  input.aimWorld = run.player.position.clone();
  input.aimWorld.z -= 5;
  updateProfile();
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
    ? `${result.recovered.length} object${result.recovered.length === 1 ? '' : 's'} crossed back into the stable world after ${result.roomsCleared} stabilized rooms.`
    : 'The passage closed around the team. The map state remains reproducible; the loss does not.';
  elements.debriefValue.textContent = formatCurrency(result.value);
  elements.debriefCut.textContent = formatCurrency(result.instituteCut);
  elements.debriefBonus.textContent = formatCurrency(result.contractBonus);
  elements.debriefPayout.textContent = formatCurrency(result.payout);
  elements.debriefRank.textContent = `${result.profile.rank} · ${rankTitle(result.profile.rank)}`;
  elements.debriefContract.textContent = result.contractComplete
    ? `CONTRACT COMPLETE — ${result.contract.title}`
    : `CONTRACT INCOMPLETE — ${result.contract.title} / EMERGENCY RATE APPLIED`;
  elements.debriefContract.className = `contract-result ${result.contractComplete ? 'complete' : 'failed'}`;
  updateProfile(result.profile);
  elements.debrief.showModal();
}

function restart() {
  elements.debrief.close();
  const seed = `ABRIR-${Date.now().toString(36).toUpperCase()}`;
  installRun(generateMapState({ seed, roomCount: 24, loopChance: 0.34, interlaceAtSeconds: 82 }));
  started = true;
  feed('A new deterministic state has been forged.', 'good');
}

function exportMap() {
  const exportState = { ...mapState, contract: run?.contract };
  const blob = new Blob([`${JSON.stringify(exportState, null, 2)}\n`], { type: 'application/json' });
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
  if (event.code === 'Space') event.preventDefault();
  if (!started || event.repeat) return;
  if (event.code === 'KeyQ') run.switchOperative();
  if (event.code === 'KeyE') run.interact();
  if (event.code === 'KeyR') run.useAbility(input.aimWorld ?? run.player.position);
  if (event.code === 'Space') run.dodge(movementVector(), input.aimWorld);
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
    const aim = input.aimWorld ?? run.player.position.clone();
    if (started) run.update(delta, movementVector(), aim);
    else renderer.update(delta, run.player.position, aim);
  }
  requestAnimationFrame(frame);
}

mapState = await loadInitialMap();
installRun(mapState);
elements.briefing.showModal();
requestAnimationFrame(frame);
