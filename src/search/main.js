import searchScene from '../../content/search/relay-apartment.json';
import './styles.css';

const sceneTitle = document.querySelector('#scene-title');
const sceneImage = document.querySelector('#scene-image');
const hitboxLayer = document.querySelector('#hitbox-layer');
const sceneMessage = document.querySelector('#scene-message');
const timeRemaining = document.querySelector('#time-remaining');
const timerPanel = document.querySelector('#timer-panel');
const teammateStatus = document.querySelector('#teammate-status');
const capacityCopy = document.querySelector('#capacity-copy');
const capacityFill = document.querySelector('#capacity-fill');
const totalValue = document.querySelector('#total-value');
const targetList = document.querySelector('#target-list');
const selectedSlots = document.querySelector('#selected-slots');
const hintPips = document.querySelector('#hint-pips');
const useHintButton = document.querySelector('#use-hint');
const finishSearchButton = document.querySelector('#finish-search');

const moralityTitle = document.querySelector('#morality-title');
const moralityCopy = document.querySelector('#morality-copy');
const confirmTakeButton = document.querySelector('#confirm-take');
const cancelTakeButton = document.querySelector('#cancel-take');

const dialogueTitle = document.querySelector('#dialogue-title');
const dialogueCopy = document.querySelector('#dialogue-copy');
const dialogueActions = document.querySelector('#dialogue-actions');

const outcomeValue = document.querySelector('#outcome-value');
const outcomeTrust = document.querySelector('#outcome-trust');
const outcomeArena = document.querySelector('#outcome-arena');
const outcomeCards = document.querySelector('#outcome-cards');
const outcomeDialogue = document.querySelector('#outcome-dialogue');
const restartSearchButton = document.querySelector('#restart-search');

function assertSearchScene(scene) {
  if (scene?.schemaVersion !== 1) throw new Error('Unsupported search-scene schema.');
  if (!scene.id || !scene.title || !scene.image) throw new Error('Search scene metadata is incomplete.');
  if (!Number.isFinite(scene.durationSeconds) || scene.durationSeconds <= 0) {
    throw new Error('Search scene duration must be positive.');
  }
  if (!Number.isInteger(scene.capacity) || scene.capacity <= 0) {
    throw new Error('Search scene capacity must be a positive integer.');
  }
  const ids = new Set();
  for (const object of scene.objects ?? []) {
    if (!object.id || ids.has(object.id)) throw new Error(`Duplicate or missing search object id: ${object.id}`);
    ids.add(object.id);
    const box = object.hitbox;
    if (!box || [box.x, box.y, box.w, box.h].some((value) => !Number.isFinite(value))) {
      throw new Error(`Invalid hitbox for ${object.id}.`);
    }
    if (box.x < 0 || box.y < 0 || box.w <= 0 || box.h <= 0 || box.x + box.w > 1 || box.y + box.h > 1) {
      throw new Error(`Hitbox for ${object.id} must remain inside normalized image bounds.`);
    }
  }
}

assertSearchScene(searchScene);

const objectById = new Map(searchScene.objects.map((object) => [object.id, object]));
const targetObjects = searchScene.objects.filter((object) => object.target);
const state = {
  selected: new Set(),
  acknowledgedMorality: new Set(),
  pendingMoralObjectId: null,
  hintsRemaining: searchScene.hintCount,
  running: false,
  startedAt: 0,
  timePenalty: 0,
  remainingSeconds: searchScene.durationSeconds,
  timerId: null,
  messageTimer: null,
  finishReason: null,
  dialogueQueue: [],
  dialogueChoices: [],
  returnedFacts: [],
};

function formatValue(value) {
  return `₵ ${String(Math.max(0, Math.round(value))).padStart(3, '0')}`;
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function selectedObjects() {
  return [...state.selected].map((id) => objectById.get(id)).filter(Boolean);
}

function selectedValue() {
  return selectedObjects().reduce((sum, object) => sum + object.value, 0);
}

function showSceneMessage(message, duration = 1500) {
  window.clearTimeout(state.messageTimer);
  sceneMessage.textContent = message;
  sceneMessage.classList.add('show');
  state.messageTimer = window.setTimeout(() => sceneMessage.classList.remove('show'), duration);
}

function renderHitboxes() {
  hitboxLayer.replaceChildren();
  for (const object of searchScene.objects) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `object-hitbox${object.target ? '' : ' decoy'}`;
    button.dataset.objectId = object.id;
    button.dataset.icon = object.icon;
    button.setAttribute('aria-label', object.target ? `Select ${object.name}` : `Inspect ${object.name}`);
    button.style.left = `${object.hitbox.x * 100}%`;
    button.style.top = `${object.hitbox.y * 100}%`;
    button.style.width = `${object.hitbox.w * 100}%`;
    button.style.height = `${object.hitbox.h * 100}%`;
    button.classList.toggle('selected', state.selected.has(object.id));
    button.disabled = !state.running;
    button.addEventListener('click', () => handleObjectClick(object.id));
    hitboxLayer.appendChild(button);
  }
}

function renderTargetList() {
  targetList.replaceChildren();
  for (const object of targetObjects) {
    const row = document.createElement('article');
    row.className = `target-row${state.selected.has(object.id) ? ' selected' : ''}${object.morality ? ' moral' : ''}`;
    row.innerHTML = `
      <span class="target-icon">${object.icon}</span>
      <div><strong>${object.name}</strong><small>${formatValue(object.value)}</small></div>
      <em>${state.selected.has(object.id) ? 'SELECTED' : object.category.toUpperCase()}</em>
    `;
    targetList.appendChild(row);
  }
}

function renderSelectedSlots() {
  selectedSlots.replaceChildren();
  const selected = selectedObjects();
  for (let index = 0; index < searchScene.capacity; index += 1) {
    const object = selected[index];
    if (!object) {
      const empty = document.createElement('span');
      empty.className = 'selected-slot';
      empty.textContent = '+';
      selectedSlots.appendChild(empty);
      continue;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'selected-slot';
    button.innerHTML = `<span><strong>${object.name}</strong><small>${formatValue(object.value)} · REMOVE</small></span>`;
    button.disabled = !state.running;
    button.addEventListener('click', () => removeObject(object.id, true));
    selectedSlots.appendChild(button);
  }
}

function renderHints() {
  hintPips.replaceChildren();
  for (let index = 0; index < searchScene.hintCount; index += 1) {
    const pip = document.createElement('i');
    if (index >= state.hintsRemaining) pip.classList.add('used');
    hintPips.appendChild(pip);
  }
  useHintButton.disabled = !state.running || state.hintsRemaining <= 0 || state.selected.size >= targetObjects.length;
}

function renderStatus() {
  const count = state.selected.size;
  capacityCopy.textContent = `${count} / ${searchScene.capacity}`;
  capacityFill.style.width = `${Math.min(1, count / searchScene.capacity) * 100}%`;
  totalValue.textContent = formatValue(selectedValue());
  renderHitboxes();
  renderTargetList();
  renderSelectedSlots();
  renderHints();
}

function addObject(object) {
  if (!state.running || state.selected.has(object.id)) return;
  if (state.selected.size >= searchScene.capacity) {
    showSceneMessage('Capacity reached. Remove an item before selecting another.');
    return;
  }
  state.selected.add(object.id);
  showSceneMessage(`${object.name} added · ${formatValue(object.value)}`);
  renderStatus();
}

function removeObject(objectId, announce = false) {
  const object = objectById.get(objectId);
  if (!object || !state.selected.delete(objectId)) return;
  if (announce) showSceneMessage(`${object.name} returned to the room.`);
  renderStatus();
}

function openMoralityPrompt(object) {
  state.pendingMoralObjectId = object.id;
  moralityTitle.textContent = object.name;
  moralityCopy.textContent = object.morality.prompt;
  document.body.classList.add('morality-open');
}

function closeMoralityPrompt() {
  state.pendingMoralObjectId = null;
  document.body.classList.remove('morality-open');
}

function handleObjectClick(objectId) {
  if (!state.running) return;
  const object = objectById.get(objectId);
  if (!object) return;
  if (!object.target) {
    state.timePenalty += 1.5;
    showSceneMessage('Clutter. No recoverable value · 1.5 seconds lost.');
    return;
  }
  if (state.selected.has(object.id)) {
    removeObject(object.id, true);
    return;
  }
  if (object.morality && !state.acknowledgedMorality.has(object.id)) {
    openMoralityPrompt(object);
    return;
  }
  addObject(object);
}

function useHint() {
  if (!state.running || state.hintsRemaining <= 0) return;
  const candidate = targetObjects
    .filter((object) => !state.selected.has(object.id))
    .sort((a, b) => b.value - a.value)[0];
  if (!candidate) return;
  state.hintsRemaining -= 1;
  renderHints();
  const hitbox = hitboxLayer.querySelector(`[data-object-id="${candidate.id}"]`);
  hitbox?.classList.add('hinted');
  showSceneMessage(`Hint: ${candidate.name} has been marked.`, 2200);
  window.setTimeout(() => hitbox?.classList.remove('hinted'), 2400);
}

function teammateStatusCopy() {
  if (state.selected.has('power-regulator')) {
    return `${searchScene.teammateCombat.operative} · lights lost · enemy speed increased`;
  }
  const ratio = state.remainingSeconds / searchScene.durationSeconds;
  if (ratio > 0.72) return `${searchScene.teammateCombat.operative} · holding the arena entrance`;
  if (ratio > 0.4) return `${searchScene.teammateCombat.operative} · combat pressure rising`;
  if (ratio > 0.14) return `${searchScene.teammateCombat.operative} · finishing the exchange`;
  return `${searchScene.teammateCombat.operative} · disengaging now`;
}

function updateTimer() {
  if (!state.running) return;
  const elapsed = (performance.now() - state.startedAt) / 1000 + state.timePenalty;
  state.remainingSeconds = Math.max(0, searchScene.durationSeconds - elapsed);
  timeRemaining.textContent = formatTime(state.remainingSeconds);
  teammateStatus.textContent = teammateStatusCopy();
  timerPanel.classList.toggle('warning', state.remainingSeconds <= 15 && state.remainingSeconds > 6);
  timerPanel.classList.toggle('danger', state.remainingSeconds <= 6);
  if (state.remainingSeconds <= 0) finishSearch('teammate-combat-ended');
}

function stopTimer() {
  state.running = false;
  window.clearInterval(state.timerId);
  state.timerId = null;
  finishSearchButton.disabled = true;
  renderStatus();
}

function dialogueEventFor(object) {
  const events = {
    'medicine-bottle': {
      title: '“That medicine is not merchandise.”',
      copy: 'A resident reaches the doorway as the arena fight ends. Returning the bottle removes its value and restores the dialogue branch that depends on their trust.',
      keep: 'KEEP THE MEDICINE',
      return: 'RETURN IT',
    },
    'family-photo': {
      title: '“That is the only photograph I have.”',
      copy: 'The photograph is worth less than most equipment, but keeping it will be remembered in later conversations.',
      keep: 'KEEP THE PHOTO',
      return: 'RETURN IT',
    },
    'pocket-watch': {
      title: '“The name inside belonged to my father.”',
      copy: 'You can keep the watch for its market value or return it before leaving the hidden room.',
      keep: 'KEEP THE WATCH',
      return: 'RETURN IT',
    },
    'power-regulator': {
      title: '“You cut power while I was still in there.”',
      copy: 'Your teammate survived the arena section, but the regulator changed the encounter. Reinstalling it removes the item and clears its arena modifiers.',
      keep: 'KEEP THE REGULATOR',
      return: 'REINSTALL IT',
    },
  };
  return events[object.id] ? { objectId: object.id, ...events[object.id] } : null;
}

function buildDialogueQueue() {
  const severityRank = { high: 0, medium: 1, low: 2 };
  state.dialogueQueue = selectedObjects()
    .filter((object) => object.morality)
    .sort((a, b) => (severityRank[a.morality.severity] ?? 9) - (severityRank[b.morality.severity] ?? 9))
    .map(dialogueEventFor)
    .filter(Boolean);
}

function showNextDialogue() {
  const event = state.dialogueQueue.shift();
  if (!event) {
    document.body.classList.remove('dialogue-open');
    showOutcome();
    return;
  }
  const object = objectById.get(event.objectId);
  dialogueTitle.textContent = event.title;
  dialogueCopy.textContent = event.copy;
  dialogueActions.replaceChildren();

  const keepButton = document.createElement('button');
  keepButton.type = 'button';
  keepButton.textContent = event.keep;
  keepButton.addEventListener('click', () => {
    state.dialogueChoices.push({ objectId: event.objectId, choice: 'keep' });
    showNextDialogue();
  });

  const returnButton = document.createElement('button');
  returnButton.type = 'button';
  returnButton.textContent = event.return;
  returnButton.addEventListener('click', () => {
    state.dialogueChoices.push({ objectId: event.objectId, choice: 'return' });
    state.returnedFacts.push(`${event.objectId}_returned`);
    state.selected.delete(event.objectId);
    renderStatus();
    showNextDialogue();
  });

  dialogueActions.append(keepButton, returnButton);
  document.body.classList.add('dialogue-open');
}

function aggregateConsequences() {
  const result = {
    residentTrust: 0,
    arenaModifiers: new Set(),
    cardUnlocks: new Set(),
    dialogueFacts: new Set(state.returnedFacts),
    notes: [],
  };
  for (const object of selectedObjects()) {
    const consequences = object.consequences ?? {};
    result.residentTrust += consequences.residentTrust ?? 0;
    for (const modifier of consequences.arenaModifiers ?? []) result.arenaModifiers.add(modifier);
    for (const unlock of consequences.cardUnlocks ?? []) result.cardUnlocks.add(unlock);
    for (const fact of consequences.dialogueFacts ?? []) result.dialogueFacts.add(fact);
    if (consequences.notes) result.notes.push(consequences.notes);
  }
  return {
    residentTrust: result.residentTrust,
    arenaModifiers: [...result.arenaModifiers],
    cardUnlocks: [...result.cardUnlocks],
    dialogueFacts: [...result.dialogueFacts],
    notes: result.notes,
  };
}

function persistOutcome(consequences) {
  const payload = {
    schemaVersion: 1,
    sceneId: searchScene.id,
    completedAt: new Date().toISOString(),
    finishReason: state.finishReason,
    durationSeconds: searchScene.durationSeconds,
    timeRemaining: Math.max(0, Number(state.remainingSeconds.toFixed(2))),
    capacity: searchScene.capacity,
    selectedObjectIds: [...state.selected],
    selectedObjects: selectedObjects().map((object) => ({
      id: object.id,
      name: object.name,
      value: object.value,
      category: object.category,
    })),
    grossValue: selectedValue(),
    consequences,
    dialogueChoices: state.dialogueChoices,
    teammateCombat: {
      mode: searchScene.teammateCombat.mode,
      operative: searchScene.teammateCombat.operative,
      synchronizedWindowSeconds: searchScene.teammateCombat.estimatedSeconds,
      status: state.finishReason === 'teammate-combat-ended' ? 'resolved' : 'searcher_finished_early',
    },
  };
  localStorage.setItem('abrir.search.latestResult', JSON.stringify(payload));
  return payload;
}

function showOutcome() {
  const consequences = aggregateConsequences();
  const payload = persistOutcome(consequences);
  outcomeValue.textContent = formatValue(payload.grossValue);
  outcomeTrust.textContent = String(consequences.residentTrust);
  outcomeArena.textContent = consequences.arenaModifiers.length ? consequences.arenaModifiers.join(', ') : 'NONE';
  outcomeCards.textContent = consequences.cardUnlocks.length ? consequences.cardUnlocks.join(', ') : 'NONE';
  outcomeDialogue.textContent = consequences.dialogueFacts.length ? consequences.dialogueFacts.join(', ') : 'NONE';
  document.body.classList.add('outcome-open');
}

function finishSearch(reason = 'manual-finish') {
  if (!state.running) return;
  state.finishReason = reason;
  stopTimer();
  showSceneMessage(reason === 'teammate-combat-ended' ? 'The teammate combat section ended. Search window closed.' : 'Search ended early.');
  buildDialogueQueue();
  window.setTimeout(() => {
    if (state.dialogueQueue.length > 0) showNextDialogue();
    else showOutcome();
  }, 350);
}

function resetSearch() {
  window.clearInterval(state.timerId);
  state.selected.clear();
  state.acknowledgedMorality.clear();
  state.pendingMoralObjectId = null;
  state.hintsRemaining = searchScene.hintCount;
  state.running = true;
  state.startedAt = performance.now();
  state.timePenalty = 0;
  state.remainingSeconds = searchScene.durationSeconds;
  state.finishReason = null;
  state.dialogueQueue = [];
  state.dialogueChoices = [];
  state.returnedFacts = [];
  document.body.classList.remove('morality-open', 'dialogue-open', 'outcome-open');
  timerPanel.classList.remove('warning', 'danger');
  finishSearchButton.disabled = false;
  timeRemaining.textContent = formatTime(searchScene.durationSeconds);
  teammateStatus.textContent = `${searchScene.teammateCombat.operative} · arena engagement active`;
  renderStatus();
  state.timerId = window.setInterval(updateTimer, 100);
}

confirmTakeButton.addEventListener('click', () => {
  const object = objectById.get(state.pendingMoralObjectId);
  if (!object) return closeMoralityPrompt();
  state.acknowledgedMorality.add(object.id);
  closeMoralityPrompt();
  addObject(object);
});
cancelTakeButton.addEventListener('click', closeMoralityPrompt);
useHintButton.addEventListener('click', useHint);
finishSearchButton.addEventListener('click', () => finishSearch('manual-finish'));
restartSearchButton.addEventListener('click', resetSearch);

sceneTitle.textContent = searchScene.title;
sceneImage.src = searchScene.image;
sceneImage.addEventListener('error', () => {
  showSceneMessage('Search image failed to load. Hitbox data remains available.', 4000);
});
resetSearch();
