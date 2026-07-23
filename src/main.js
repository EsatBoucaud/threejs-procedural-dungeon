import './ui/styles.css';
import './ui/headquarters.css';
import './ui/processes.css';
import './ui/deployment-builder.css';
import './ui/shared-interactions.css';
import { applyDeployment } from './content/characters.js';
import { seedForRoute } from './content/routes.js';
import { generateMapState, validateMapState } from './core/dungeon-generator.js';
import {
  createDefaultDeployment,
  normalizeDeployment,
  validateDeployment,
} from './game/deployment-system.js';
import { InteractiveRunController } from './game/interactive-run-controller.js';
import { loadProfile, rankTitle } from './game/progression-system.js';
import { WorldRenderer } from './render/world-renderer.js';
import { DeploymentBuilder } from './ui/deployment-builder.js';
import { Headquarters } from './ui/headquarters.js';
import { Minimap } from './ui/minimap.js';
import { SharedInteractionPanel } from './ui/shared-interactions.js';

const canvas = document.querySelector('#game-canvas');
const renderer = new WorldRenderer(canvas);
const elements = {
  briefing: document.querySelector('#briefing'),
  debrief: document.querySelector('#debrief'),
  headquarters: document.querySelector('#headquarters'),
  deployment: document.querySelector('#deployment-builder'),
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
  interactionRoot: document.querySelector('#shared-interaction-root'),
  interactionHint: document.querySelector('#interaction-hint'),
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
let lastResult = null;
let pendingRoute = null;
let pendingDeployment = createDefaultDeployment('two-player');

const headquarters = new Headquarters(elements.headquarters, {
  onDeploy: (route) => deployRoute(route),
  onProfileChange: (profile) => updateProfile(profile),
});

const deploymentBuilder = new DeploymentBuilder(elements.deployment, {
  onChange: (deployment, validation) => {
    pendingDeployment = deployment;
    elements.begin.disabled = !validation.valid;
  },
});

const sharedPanel = new SharedInteractionPanel(elements.interactionRoot, {
  onAction: (action) => {
    const result = run?.handleSharedInteractionAction(action);
    if (result && result.success === false) feed(`Interaction request refused: ${result.reason}.`, 'danger');
  },
});

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
  elements.kit.textContent = `${operative.kitName ?? operative.role} // ${operative.combatFamily?.toUpperCase() ?? ''}`;
  elements.health.style.width = `${Math.max(0, (health / maxHealth) * 100)}%`;
}

function renderTeam(team) {
  elements.team.replaceChildren();
  for (const operative of team) {
    const card = document.createElement('article');
    card.className = `team-member${operative.active ? ' active' : ''}${operative.health <= 0 ? ' down' : ''}`;
    card.innerHTML = `
      <b>${operative.mark}</b>
      <span>
        <strong>${operative.name}</strong>
        <small>${operative.kitName ?? operative.role}</small>
        <i><em style="width:${Math.max(0, operative.health / operative.maxHealth * 100)}%"></em></i>
      </span>
    `;
    elements.team.append(card);
  }
}

function renderContract(contract, status) {
  elements.contractTitle.textContent = contract.title;
  elements.contractDescription.textContent = contract.description;
  elements.briefContractTitle.textContent = contract.title;
  const routePay = mapState?.route?.rewardMultiplier ?? 1;
  const processCopy = run?.majorProcess
    ? ` Expected response: ${run.majorProcess.name}, ${run.majorProcess.role.toLowerCase()}.`
    : '';
  elements.briefContractCopy.textContent = `${contract.description} Completion pays ${formatCurrency(contract.bonus)}, a ${contract.riskMultiplier.toFixed(2)}× contract multiplier, and ${routePay.toFixed(2)}× route accounting.${processCopy}`;
  if (!status) return;
  elements.contractChecks.replaceChildren();
  for (const check of status.checks) {
    const line = document.createElement('span');
    line.className = check.complete ? 'complete' : '';
    line.textContent = `${check.complete ? '◆' : '◇'} ${check.label}`;
    elements.contractChecks.append(line);
  }
}

function updateInteractionHint(hint) {
  if (!hint || sharedPanel.isOpen()) {
    elements.interactionHint.classList.remove('visible');
    elements.interactionHint.textContent = '';
    return;
  }
  elements.interactionHint.innerHTML = `<kbd>E</kbd><span>${hint.label}</span>`;
  elements.interactionHint.classList.add('visible');
}

function createRunEvents() {
  return {
    onOperative: updateOperative,
    onHealth: (health, maxHealth) => {
      elements.health.style.width = `${Math.max(0, (health / maxHealth) * 100)}%`;
    },
    onTeam: renderTeam,
    onRoom: (room) => {
      const origin = room.origin === 'interlace' ? 'R' : 'L';
      elements.room.textContent = `${origin}:${room.type.toUpperCase()} ${String(room.id)}`;
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
    onInterlace: (details) => {
      elements.timer.textContent = `${details.rooms}R / ${details.bridges}B`;
      elements.timer.style.color = '#e393e4';
      document.body.classList.add('interlaced');
      elements.interlaceFlash.classList.add('active');
      window.setTimeout(() => elements.interlaceFlash.classList.remove('active'), 1100);
      feed(
        `${details.rooms} remote rooms, ${details.connections} remote links, ${details.bridges} bridges, ${details.overlaps} overlaps. ${details.majorProcess?.name ?? 'A Chave Geral'} is assigned to the response.`,
        'danger',
      );
    },
    onInteractionHint: updateInteractionHint,
    onSharedInteraction: (snapshot) => {
      sharedPanel.update(snapshot);
      document.body.classList.toggle('shared-interaction-open', Boolean(snapshot.activeSession));
      if (snapshot.activeSession) elements.interactionHint.classList.remove('visible');
    },
    onInteractionEffect: ({ type, effect }) => {
      feed(`${type.replaceAll('-', ' ')} consequence registered: ${effect.replaceAll('-', ' ')}.`, effect.includes('loss') || effect.includes('risk') ? 'danger' : 'good');
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
    if (state.schemaVersion < 2) {
      return generateMapState({
        seed: state.seedLabel ?? 'ABRIR-001',
        roomCount: state.settings?.roomCount ?? state.rooms.length ?? 24,
        loopChance: state.settings?.loopChance ?? 0.34,
        interlaceAtSeconds: state.interlaceAtSeconds ?? 82,
      });
    }
    return state;
  } catch (error) {
    console.warn('Falling back to browser-generated map state.', error);
    return generateMapState({ seed: 'ABRIR-001', roomCount: 24, loopChance: 0.34, interlaceAtSeconds: 82 });
  }
}

function installRun(state, deployment = state.deployment ?? pendingDeployment) {
  const normalizedDeployment = normalizeDeployment(deployment);
  state.deployment = structuredClone(normalizedDeployment);
  applyDeployment(normalizedDeployment);

  mapState = state;
  renderer.resetEntities();
  renderer.buildMap(state);
  minimap = new Minimap(elements.minimap, state);
  run = new InteractiveRunController(renderer, state, createRunEvents());
  sharedPanel.setPerspective(normalizedDeployment.localPlayerId);
  const routeLabel = state.route?.name ? `${state.route.name} // ` : '';
  const modeLabel = normalizedDeployment.mode === 'two-player' ? '2P' : '4P';
  elements.seed.textContent = `${modeLabel} // ${routeLabel}${state.seedLabel} ↔ ${state.interlace?.seedLabel ?? 'PENDING'}`;
  elements.timer.style.color = '';
  elements.eventFeed.replaceChildren();
  elements.bossBanner.classList.remove('visible');
  elements.threatFill.style.width = '0%';
  elements.interactionHint.classList.remove('visible');
  document.body.classList.remove('interlaced', 'high-threat', 'shared-interaction-open');
  input.aimWorld = run.player.position.clone();
  input.aimWorld.z -= 5;
  updateProfile();
}

function begin() {
  const validation = validateDeployment(pendingDeployment);
  if (!validation.valid) {
    feed(validation.errors.join(' '), 'danger');
    return;
  }

  pendingDeployment = validation.deployment;
  installRun(mapState, pendingDeployment);
  started = true;
  elements.briefing.close();
  const routeName = pendingRoute?.name ?? mapState.route?.name ?? 'FIELD TEST';
  const ownership = pendingDeployment.mode === 'two-player'
    ? `${pendingDeployment.localPlayerId.toUpperCase()} controls two characters; Q swaps between that assigned pair.`
    : `${pendingDeployment.localPlayerId.toUpperCase()} controls one character; the other three belong to the other players.`;
  feed(`${routeName}: passage opened. ${ownership} Any player may lead field interactions.`, 'good');
  pendingRoute = null;
}

function showDebrief(result) {
  started = false;
  lastResult = result;
  elements.debriefTitle.textContent = result.success ? 'EXTRACTION COMPLETE' : 'FIELD TEAM LOST';
  const seizureCopy = result.seized.length > 0
    ? ` A Chave Geral retained ${result.seized.map((item) => item.name).join(', ')} outside the recovered filing.`
    : '';
  const retentionCopy = result.archiveRecord?.held?.length > 0
    ? ` Instituto Travessia retained ${result.archiveRecord.held.map((item) => item.name).join(', ')} under its object allowance.`
    : '';
  const remoteCopy = result.interlaceTriggered
    ? ` ${result.remoteObjects} remote object${result.remoteObjects === 1 ? '' : 's'} and ${result.remoteRoomsCleared} remote rooms survived accounting.`
    : '';
  const processCopy = result.majorProcessName
    ? ` ${result.majorProcessName} was ${result.majorProcessDefeated ? 'terminated in the field' : 'left active when the run closed'}.`
    : '';
  const participationCopy = result.activityParticipation?.length
    ? ` ${result.activityParticipation.length} player participation records were attached to the field account.`
    : '';
  elements.debriefCopy.textContent = result.success
    ? `${result.recovered.length} object${result.recovered.length === 1 ? '' : 's'} crossed back after ${result.roomsCleared} stabilized rooms.${remoteCopy}${processCopy}${seizureCopy}${retentionCopy}${participationCopy}`
    : `The passage closed around the team. ${result.majorProcessName ?? 'The assigned process'} remained ${result.majorProcessDefeated ? 'terminated' : 'active'}. Both generated map states remain reproducible; the loss does not.`;
  elements.debriefValue.textContent = formatCurrency(result.value);
  elements.debriefCut.textContent = formatCurrency(result.instituteCut);
  elements.debriefBonus.textContent = formatCurrency(result.contractBonus);
  elements.debriefPayout.textContent = formatCurrency(Math.round(result.payout * result.routeRewardMultiplier));
  elements.debriefRank.textContent = `${result.profile.rank} · ${rankTitle(result.profile.rank)}`;
  elements.debriefContract.textContent = result.contractComplete
    ? `CONTRACT COMPLETE — ${result.contract.title} // ${result.routeName}`
    : `CONTRACT INCOMPLETE — ${result.contract.title} / EMERGENCY RATE APPLIED`;
  elements.debriefContract.className = `contract-result ${result.contractComplete ? 'complete' : 'failed'}`;
  updateProfile(result.profile);
  elements.debrief.showModal();
}

function returnToInstitute() {
  elements.debrief.close();
  headquarters.open(lastResult);
}

function deployRoute(route) {
  const profile = loadProfile();
  const seed = seedForRoute(route, profile);
  const state = generateMapState({
    seed,
    roomCount: route.roomCount,
    loopChance: route.loopChance,
    interlaceAtSeconds: route.interlaceAtSeconds,
  });
  state.route = structuredClone(route);
  pendingRoute = route;
  pendingDeployment = normalizeDeployment(pendingDeployment);
  state.deployment = structuredClone(pendingDeployment);
  deploymentBuilder.setDeployment(pendingDeployment);
  elements.begin.disabled = !validateDeployment(pendingDeployment).valid;
  installRun(state, pendingDeployment);
  started = false;
  elements.briefing.showModal();
}

function exportMap() {
  const exportState = { ...mapState, contract: run?.contract, deployment: pendingDeployment };
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
  if (sharedPanel.isOpen()) return;
  if (event.code === 'KeyQ') {
    if (run.teamSnapshot().length > 1) run.switchOperative();
    else feed('Four-player ownership: this player has no reserve character to swap into.', '');
  }
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
  elements.crosshair.style.opacity = started && !sharedPanel.isOpen() ? '1' : '0';
});
canvas.addEventListener('pointerleave', () => { elements.crosshair.style.opacity = '0'; });
canvas.addEventListener('pointerdown', (event) => {
  if (!started || sharedPanel.isOpen() || event.button !== 0) return;
  input.aimWorld = renderer.screenToWorld(event.clientX, event.clientY);
  run.attack(input.aimWorld);
});

elements.begin.addEventListener('click', begin);
elements.restart.addEventListener('click', returnToInstitute);
elements.export.addEventListener('click', exportMap);

function frame(time) {
  const delta = Math.min(0.05, (time - previousTime) / 1000);
  previousTime = time;
  if (run) {
    const aim = input.aimWorld ?? run.player.position.clone();
    if (started) {
      const movement = sharedPanel.isOpen() ? { x: 0, z: 0 } : movementVector();
      run.update(delta, movement, aim);
    } else renderer.update(delta, run.player.position, aim);
  }
  requestAnimationFrame(frame);
}

mapState = await loadInitialMap();
pendingDeployment = createDefaultDeployment('two-player');
mapState.deployment = structuredClone(pendingDeployment);
deploymentBuilder.setDeployment(pendingDeployment);
installRun(mapState, pendingDeployment);
headquarters.open();
requestAnimationFrame(frame);
