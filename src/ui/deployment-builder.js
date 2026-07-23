import { CHARACTERS } from '../content/characters.js';
import { COMBAT_KITS } from '../content/combat-kits.js';
import {
  changeDeploymentMode,
  compositionSummary,
  createDefaultDeployment,
  normalizeDeployment,
  updateAssignment,
  validateDeployment,
} from '../game/deployment-system.js';

function option(value, label, selected = false, disabled = false) {
  return `<option value="${value}" ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}>${label}</option>`;
}

function playerLabel(playerId) {
  return playerId.replace('player-', 'PLAYER ');
}

export class DeploymentBuilder {
  constructor(root, callbacks = {}) {
    this.root = root;
    this.callbacks = callbacks;
    this.deployment = createDefaultDeployment('two-player');
    this.root.addEventListener('click', (event) => this.handleClick(event));
    this.root.addEventListener('change', (event) => this.handleChange(event));
    this.render();
  }

  setDeployment(input) {
    this.deployment = normalizeDeployment(input);
    this.render();
  }

  getDeployment() {
    return structuredClone(this.deployment);
  }

  getValidation() {
    return validateDeployment(this.deployment);
  }

  emitChange() {
    const validation = this.getValidation();
    this.callbacks.onChange?.(validation.deployment, validation);
  }

  handleClick(event) {
    const modeButton = event.target.closest('[data-deployment-mode]');
    if (modeButton) {
      this.deployment = changeDeploymentMode(this.deployment, modeButton.dataset.deploymentMode);
      this.render();
      this.emitChange();
      return;
    }

    const localButton = event.target.closest('[data-local-player]');
    if (localButton) {
      this.deployment.localPlayerId = localButton.dataset.localPlayer;
      this.render();
      this.emitChange();
    }
  }

  handleChange(event) {
    const assignmentId = event.target.dataset.assignmentId;
    if (!assignmentId) return;
    if (event.target.matches('[data-character-select]')) {
      this.deployment = updateAssignment(this.deployment, assignmentId, { characterId: event.target.value });
    }
    if (event.target.matches('[data-kit-select]')) {
      this.deployment = updateAssignment(this.deployment, assignmentId, { kitId: event.target.value });
    }
    this.render();
    this.emitChange();
  }

  renderAssignment(assignment, selectedCharacterIds) {
    const character = CHARACTERS.find((entry) => entry.id === assignment.characterId) ?? CHARACTERS[0];
    const kit = COMBAT_KITS.find((entry) => entry.id === assignment.kitId) ?? COMBAT_KITS[0];
    const characterOptions = CHARACTERS.map((entry) => option(
      entry.id,
      entry.name,
      entry.id === assignment.characterId,
      selectedCharacterIds.has(entry.id) && entry.id !== assignment.characterId,
    )).join('');
    const kitOptions = COMBAT_KITS.map((entry) => option(
      entry.id,
      `${entry.name} — ${entry.family.toUpperCase()}`,
      entry.id === assignment.kitId,
    )).join('');

    return `
      <article class="deployment-slot" style="--slot-color:#${character.color.toString(16).padStart(6, '0')}">
        <div class="deployment-identity">
          <b>${character.mark}</b>
          <span><strong>${character.name}</strong><small>${playerLabel(assignment.playerId)}</small></span>
        </div>
        <label>
          <span>CHARACTER</span>
          <select data-character-select data-assignment-id="${assignment.assignmentId}">${characterOptions}</select>
        </label>
        <label>
          <span>COMBAT KIT</span>
          <select data-kit-select data-assignment-id="${assignment.assignmentId}">${kitOptions}</select>
        </label>
        <div class="deployment-kit-readout">
          <span>${kit.family.toUpperCase()}</span>
          <strong>${kit.name}</strong>
          <p>${kit.ability.name}: ${kit.ability.description}</p>
        </div>
      </article>
    `;
  }

  render() {
    const validation = this.getValidation();
    const selectedCharacterIds = new Set(this.deployment.assignments.map((assignment) => assignment.characterId));
    const summary = compositionSummary(this.deployment);
    const modeCopy = this.deployment.mode === 'two-player'
      ? 'Each player owns two characters and can swap between only their assigned pair during the run.'
      : 'Each player owns one character. Character swapping is unavailable because every character is already under direct control.';

    const playerGroups = this.deployment.players.map((player) => {
      const assignments = this.deployment.assignments.filter((assignment) => assignment.playerId === player.id);
      return `
        <section class="deployment-player ${player.id === this.deployment.localPlayerId ? 'local' : ''}">
          <header>
            <div><span>${player.label}</span><strong>${assignments.length === 2 ? 'TWO-CHARACTER CONTROL' : 'DIRECT CONTROL'}</strong></div>
            <button type="button" data-local-player="${player.id}">
              ${player.id === this.deployment.localPlayerId ? 'LOCAL TEST VIEW' : 'TEST AS THIS PLAYER'}
            </button>
          </header>
          <div class="deployment-slots">
            ${assignments.map((assignment) => this.renderAssignment(assignment, selectedCharacterIds)).join('')}
          </div>
        </section>
      `;
    }).join('');

    this.root.innerHTML = `
      <div class="deployment-heading">
        <div>
          <span class="eyebrow">FIELD OWNERSHIP</span>
          <h2>WHO CONTROLS WHOM?</h2>
          <p>${modeCopy}</p>
        </div>
        <div class="mode-switch" role="group" aria-label="Multiplayer mode">
          <button type="button" data-deployment-mode="two-player" class="${this.deployment.mode === 'two-player' ? 'active' : ''}">2 PLAYERS</button>
          <button type="button" data-deployment-mode="four-player" class="${this.deployment.mode === 'four-player' ? 'active' : ''}">4 PLAYERS</button>
        </div>
      </div>

      <div class="composition-notice">
        <strong>COMBAT COMPOSITION IS PLAYER-CHOSEN.</strong>
        <span>${summary.melee ?? 0} melee / ${summary.ranged ?? 0} ranged selected. Duplicate kits are allowed; no balance rule is enforced.</span>
      </div>

      <div class="deployment-players">${playerGroups}</div>

      <p class="deployment-validation ${validation.valid ? 'valid' : 'invalid'}">
        ${validation.valid ? 'Deployment valid. All four characters are assigned once.' : validation.errors.join(' ')}
      </p>
    `;
  }
}
