import { CHARACTERS } from '../content/characters.js';

function characterName(characterId) {
  return CHARACTERS.find((character) => character.id === characterId)?.name ?? characterId;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function playerLabel(players, playerId) {
  return players.find((player) => player.id === playerId)?.label ?? playerId;
}

export class SharedInteractionPanel {
  constructor(root, callbacks = {}) {
    this.root = root;
    this.callbacks = callbacks;
    this.snapshot = { activeSession: null, players: [] };
    this.perspectivePlayerId = null;
    this.root.addEventListener('click', (event) => this.handleClick(event));
  }

  setPerspective(playerId) {
    this.perspectivePlayerId = playerId;
    this.render();
  }

  update(snapshot) {
    this.snapshot = snapshot ?? { activeSession: null, players: [] };
    if (!this.perspectivePlayerId || !this.snapshot.players.some((player) => player.id === this.perspectivePlayerId)) {
      this.perspectivePlayerId = this.snapshot.players[0]?.id ?? null;
    }
    this.render();
  }

  isOpen() {
    return Boolean(this.snapshot.activeSession);
  }

  emit(type, detail = {}) {
    this.callbacks.onAction?.({
      type,
      sessionId: this.snapshot.activeSession?.sessionId,
      playerId: this.perspectivePlayerId,
      ...detail,
    });
  }

  handleClick(event) {
    const button = event.target.closest('[data-shared-action]');
    if (!button) return;
    const action = button.dataset.sharedAction;
    if (action === 'perspective') {
      this.perspectivePlayerId = button.dataset.playerId;
      this.render();
      return;
    }
    if (action === 'close' || action === 'acknowledge') this.emit('close');
    if (action === 'join') this.emit('join');
    if (action === 'handoff-request') this.emit('handoff-request', { toPlayerId: button.dataset.playerId });
    if (action === 'handoff-accept') this.emit('handoff-accept');
    if (action === 'dialogue-choice') this.emit('dialogue-choice', { choiceId: button.dataset.choiceId });
    if (action === 'object-choice') this.emit('object-choice', { optionId: button.dataset.optionId });
    if (action === 'vote') this.emit('vote', { response: button.dataset.response });
    if (action === 'play-card') this.emit('play-card', { cardId: button.dataset.cardId });
  }

  renderPlayerStrip(session) {
    const responses = session.proposal?.responses ?? {};
    return `
      <div class="shared-player-strip">
        ${this.snapshot.players.map((player) => {
          const participant = session.participants.some((entry) => entry.playerId === player.id);
          const response = responses[player.id];
          const controller = session.controllerPlayerId === player.id;
          const classes = [
            player.id === this.perspectivePlayerId ? 'viewing' : '',
            participant ? 'participating' : '',
            controller ? 'controller' : '',
            response ? `response-${response}` : '',
          ].filter(Boolean).join(' ');
          return `
            <button type="button" class="shared-player ${classes}" data-shared-action="perspective" data-player-id="${player.id}">
              <span>${escapeHtml(player.label)}</span>
              <strong>${controller ? 'CONTROL' : participant ? 'JOINED' : 'AVAILABLE'}</strong>
              <small>${response ? response.toUpperCase() : 'VIEW'}</small>
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  renderHandoff(session) {
    if (session.type === 'card-battle' || session.status !== 'active') return '';
    const pending = session.pendingHandoff;
    if (pending?.toPlayerId === this.perspectivePlayerId) {
      return `
        <div class="handoff-callout">
          <span>${escapeHtml(playerLabel(this.snapshot.players, pending.fromPlayerId))} offered interaction control.</span>
          <button type="button" data-shared-action="handoff-accept">ACCEPT CONTROL</button>
        </div>
      `;
    }
    if (session.controllerPlayerId !== this.perspectivePlayerId) {
      return `<p class="interaction-observer">${escapeHtml(playerLabel(this.snapshot.players, session.controllerPlayerId))} currently controls the interaction. Anyone may still join or vote.</p>`;
    }
    return `
      <div class="handoff-row">
        <span>HAND OFF CONTROL</span>
        ${this.snapshot.players
          .filter((player) => player.id !== this.perspectivePlayerId)
          .map((player) => `<button type="button" data-shared-action="handoff-request" data-player-id="${player.id}">${escapeHtml(player.label)}</button>`)
          .join('')}
      </div>
    `;
  }

  renderProposal(session) {
    const proposal = session.proposal;
    if (!proposal) return '';
    const response = proposal.responses[this.perspectivePlayerId];
    const resolution = proposal.resolution;
    if (resolution) {
      const rollCopy = resolution.rolls
        ? `<div class="roll-result">
            <span>AGREE: d20 ${resolution.rolls.agree.die} + ${resolution.rolls.agree.modifier} = <b>${resolution.rolls.agree.total}</b></span>
            <span>OPPOSE: d20 ${resolution.rolls.oppose.die} + ${resolution.rolls.oppose.modifier} = <b>${resolution.rolls.oppose.total}</b></span>
          </div>`
        : '';
      return `
        <section class="proposal-card resolved ${resolution.passed ? 'passed' : 'rejected'}">
          <span class="eyebrow">TEAM DECISION RESOLVED</span>
          <h3>${escapeHtml(proposal.option.label)}</h3>
          <strong>${resolution.passed ? 'APPROVED' : 'REJECTED'}</strong>
          ${rollCopy}
        </section>
      `;
    }
    return `
      <section class="proposal-card">
        <span class="eyebrow">CONSEQUENTIAL PROPOSAL</span>
        <h3>${escapeHtml(proposal.option.label)}</h3>
        <p>${escapeHtml(proposal.option.description)}</p>
        <div class="proposal-actions">
          <button type="button" data-shared-action="vote" data-response="agree" class="agree" ${response ? 'disabled' : ''}>AGREE</button>
          <button type="button" data-shared-action="vote" data-response="oppose" class="oppose" ${response ? 'disabled' : ''}>OPPOSE</button>
          <button type="button" data-shared-action="vote" data-response="abstain" ${response ? 'disabled' : ''}>ABSTAIN</button>
        </div>
        <small>${response ? `Your response: ${response.toUpperCase()}` : 'Every connected player receives a response.'}</small>
      </section>
    `;
  }

  renderTranscript(session) {
    if (!session.transcript?.length) return '';
    return `
      <div class="interaction-transcript">
        ${session.transcript.map((line) => `
          <article>
            <span>${escapeHtml(line.speaker)}${line.characterId ? ` // ${escapeHtml(characterName(line.characterId))}` : ''}</span>
            <p>${escapeHtml(line.text)}</p>
          </article>
        `).join('')}
      </div>
    `;
  }

  renderDialogue(session) {
    const canChoose = session.controllerPlayerId === this.perspectivePlayerId && !session.proposal && session.status === 'active';
    return `
      <div class="interaction-title-block">
        <span>${escapeHtml(session.payload.speaker)}</span>
        <h2>${escapeHtml(session.payload.title)}</h2>
      </div>
      ${this.renderTranscript(session)}
      ${this.renderProposal(session)}
      ${canChoose ? `
        <div class="interaction-options">
          ${session.payload.choices.map((choice) => `
            <button type="button" data-shared-action="dialogue-choice" data-choice-id="${choice.id}">
              <strong>${escapeHtml(choice.label)}</strong>
              <span>${choice.consequential ? 'TEAM DECISION' : 'CONTROLLER DECISION'}</span>
            </button>
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  renderObject(session) {
    const decision = session.payload.decision;
    return `
      <div class="interaction-title-block object-title">
        <span>${escapeHtml(decision.subtitle)}</span>
        <h2>${escapeHtml(decision.title)}</h2>
      </div>
      <div class="object-readings">
        ${decision.readings.map((reading) => `
          <article><span>${escapeHtml(reading.label)}</span><p>${escapeHtml(reading.value)}</p></article>
        `).join('')}
      </div>
      ${this.renderProposal(session)}
      ${!session.proposal && session.status === 'active' ? `
        <div class="interaction-options object-options">
          ${decision.options.map((option) => `
            <button type="button" data-shared-action="object-choice" data-option-id="${option.id}">
              <strong>${escapeHtml(option.label)}</strong>
              <p>${escapeHtml(option.description)}</p>
              <span>${option.consequential ? 'OPENS TEAM DECISION' : 'ANY PLAYER MAY EXECUTE'}</span>
            </button>
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  renderCardBattle(session) {
    const state = session.payload;
    const joined = session.participants.some((entry) => entry.playerId === this.perspectivePlayerId);
    const myTurn = state.turnPlayerId === this.perspectivePlayerId && session.status === 'active';
    return `
      <div class="interaction-title-block card-title">
        <span>${escapeHtml(state.node.opponent)}</span>
        <h2>${escapeHtml(state.node.title)}</h2>
      </div>
      <div class="card-scoreboard">
        <div><span>TEAM ARGUMENT</span><strong>${state.teamScore} / ${state.teamTarget}</strong><i><em style="width:${Math.min(100, state.teamScore / state.teamTarget * 100)}%"></em></i></div>
        <div><span>OPPOSING FILING</span><strong>${state.opponentScore} / ${state.opponentTarget}</strong><i><em style="width:${Math.min(100, state.opponentScore / state.opponentTarget * 100)}%"></em></i></div>
      </div>
      ${this.renderTranscript(session)}
      ${session.status === 'active' && !joined ? `<button class="join-interaction" type="button" data-shared-action="join">JOIN CARD BATTLE AS ${escapeHtml(playerLabel(this.snapshot.players, this.perspectivePlayerId))}</button>` : ''}
      ${myTurn ? `
        <div class="card-hand">
          ${state.deck.map((card) => `
            <button type="button" data-shared-action="play-card" data-card-id="${card.id}">
              <span>${escapeHtml(card.name)}</span>
              <strong>+${card.value}${card.guard ? ` / GUARD ${card.guard}` : ''}</strong>
              <p>${escapeHtml(card.description)}</p>
            </button>
          `).join('')}
        </div>
      ` : session.status === 'active' ? `<p class="turn-notice">Waiting for ${escapeHtml(playerLabel(this.snapshot.players, state.turnPlayerId))}. Any player may participate; the turn is not tied to character class or combat kit.</p>` : ''}
    `;
  }

  renderExtraction(session) {
    return `
      <div class="interaction-title-block extraction-title">
        <span>PASSAGE CONTROL</span>
        <h2>${escapeHtml(session.payload.title)}</h2>
        <p>${escapeHtml(session.payload.description)}</p>
      </div>
      ${this.renderProposal(session)}
    `;
  }

  render() {
    const session = this.snapshot.activeSession;
    if (!session) {
      this.root.classList.remove('visible');
      this.root.replaceChildren();
      return;
    }
    this.root.classList.add('visible');
    const typeLabel = session.type.replaceAll('-', ' ').toUpperCase();
    const body = session.type === 'dialogue'
      ? this.renderDialogue(session)
      : session.type === 'object'
        ? this.renderObject(session)
        : session.type === 'card-battle'
          ? this.renderCardBattle(session)
          : this.renderExtraction(session);
    const completed = session.status !== 'active';

    this.root.innerHTML = `
      <section class="shared-interaction-shell ${session.type} ${completed ? 'completed' : ''}" aria-live="assertive">
        <header>
          <div><span class="eyebrow">SHARED FIELD INTERACTION</span><strong>${typeLabel}</strong></div>
          <button type="button" data-shared-action="${completed ? 'acknowledge' : 'close'}">${completed ? 'ACKNOWLEDGE' : 'CLOSE'}</button>
        </header>
        ${this.renderPlayerStrip(session)}
        ${this.renderHandoff(session)}
        <main>${body}</main>
      </section>
    `;
  }
}
