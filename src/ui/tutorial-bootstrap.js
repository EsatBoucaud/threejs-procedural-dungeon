import { CHARACTERS } from '../content/characters.js';
import { attemptTutorialInteraction } from '../game/tutorial-runtime.js';
import './tutorial-guide.css';

const root = document.querySelector('#tutorial-guide');
let hideTimer = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function character(characterId) {
  return CHARACTERS.find((entry) => entry.id === characterId) ?? { name: characterId, mark: '?', color: 0x888888 };
}

function phaseCopy(snapshot) {
  const copy = {
    threshold: {
      eyebrow: '01 // PASSAGE',
      title: 'CROSS THE THRESHOLD',
      body: 'Move into the room marked T. The marker is part of the generated route, not a detached tutorial arena.',
    },
    inspect: {
      eyebrow: '02 // ORIENTATION',
      title: 'READ THE FIRST ROOM',
      body: 'Approach the gold field record and press E. Inspection confirms exits, map state, and who owns each character.',
    },
    ownership: {
      eyebrow: '03 // OWNERSHIP',
      title: 'SWAP WITHIN YOUR PAIR',
      body: 'Press Q. Two-player control moves only between the two characters assigned to the current player.',
    },
    'combat-route': {
      eyebrow: '04 // ROUTE',
      title: 'FOLLOW T TO LIVE PRESSURE',
      body: snapshot.deploymentMode === 'four-player'
        ? 'Your character is fixed. The other three roster slots belong to teammates and are not swap targets.'
        : 'Your owned pair is confirmed. Follow the new map marker to the first combat room.',
    },
    combat: {
      eyebrow: '05 // LIVE COMBAT',
      title: 'PROVE THE KIT IN THE ROOM',
      body: 'Attack, dodge, use the active kit ability, and break a gunner’s line of fire with generated architecture.',
    },
    complete: {
      eyebrow: 'FIELD ORIENTATION COMPLETE',
      title: 'THE ROOM NOW EXPECTS YOU TO IMPROVISE',
      body: snapshot.tasks.cover
        ? 'You crossed, inspected, read ownership, used the kit, and confirmed that cover blocks real hostile fire.'
        : 'Core actions are confirmed. Generated props still block hostile projectiles in every later room.',
    },
  };
  return copy[snapshot.phase] ?? copy.threshold;
}

function task(label, complete, optional = false) {
  return `<span class="tutorial-task ${complete ? 'complete' : ''} ${optional ? 'optional' : ''}">${complete ? '◆' : '◇'} ${label}${optional ? ' +' : ''}</span>`;
}

function renderRoster(deployment, activeActor) {
  if (!deployment) return '';
  const localPlayerId = deployment.localPlayerId;
  return `
    <div class="tutorial-roster" aria-label="Field ownership roster">
      ${(deployment.assignments ?? []).map((assignment) => {
        const person = character(assignment.characterId);
        const owned = assignment.playerId === localPlayerId;
        const active = assignment.characterId === activeActor?.characterId;
        const color = `#${person.color.toString(16).padStart(6, '0')}`;
        return `
          <article class="${owned ? 'owned' : 'teammate'} ${active ? 'active' : ''}" style="--tutorial-character:${color}">
            <b>${escapeHtml(person.mark)}</b>
            <span><strong>${escapeHtml(person.name)}</strong><small>${active ? 'ACTIVE' : owned ? 'YOUR ASSIGNMENT' : 'TEAMMATE'}</small></span>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function render(detail) {
  if (!root || !detail?.snapshot) return;
  const { snapshot, deployment, activeActor } = detail;
  const copy = phaseCopy(snapshot);
  root.className = `visible phase-${snapshot.phase}`;
  root.innerHTML = `
    <section class="tutorial-guide-shell">
      <header>
        <span>AFONSO // FIELD ORIENTATION</span>
        <b>${escapeHtml(copy.eyebrow)}</b>
      </header>
      <main>
        <h2>${escapeHtml(copy.title)}</h2>
        <p>${escapeHtml(copy.body)}</p>
        ${snapshot.phase === 'inspect' ? '<div class="tutorial-key"><kbd>E</kbd><span>INSPECT FIELD RECORD</span></div>' : ''}
        ${snapshot.phase === 'ownership' ? '<div class="tutorial-key"><kbd>Q</kbd><span>SWAP OWNED CHARACTER</span></div>' : ''}
        ${['ownership', 'combat-route', 'combat'].includes(snapshot.phase) ? renderRoster(deployment, activeActor) : ''}
        ${snapshot.phase === 'combat' || snapshot.phase === 'complete' ? `
          <div class="tutorial-task-grid">
            ${task('ATTACK', snapshot.tasks.attack)}
            ${task('DODGE', snapshot.tasks.dodge)}
            ${task('ABILITY', snapshot.tasks.ability)}
            ${task('ROOM CLEAR', snapshot.tasks.roomClear)}
            ${task('LIVE COVER', snapshot.tasks.cover, true)}
          </div>
        ` : ''}
      </main>
    </section>
  `;

  if (snapshot.completed) {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      root.classList.remove('visible');
      root.replaceChildren();
    }, 5200);
  }
}

window.addEventListener('abrir:tutorial', (event) => render(event.detail));
window.addEventListener('keydown', (event) => {
  if (event.code !== 'KeyE' || event.repeat) return;
  if (!attemptTutorialInteraction()) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}, true);
