import '../game/safe-window-runtime.js';
import './safe-window.css';

const root = document.querySelector('#safe-window-panel');
const debrief = document.querySelector('#debrief-window');
let lastSnapshot = null;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatSeconds(value) {
  return String(Math.max(0, Math.ceil(value))).padStart(2, '0');
}

function render(snapshot) {
  if (!root) return;
  lastSnapshot = snapshot;
  const visible = ['warning', 'final', 'interlaced'].includes(snapshot.phase);
  root.className = visible ? `visible phase-${snapshot.phase}` : '';
  if (!visible) {
    root.replaceChildren();
    return;
  }

  const interlaced = snapshot.phase === 'interlaced';
  const heading = interlaced ? 'INTERLACE OPEN' : snapshot.phase === 'final' ? 'FINAL RETURN WINDOW' : 'SAFE WINDOW CLOSING';
  const clock = interlaced ? '∞' : formatSeconds(snapshot.remainingSeconds);
  const instruction = interlaced
    ? 'The decision is now recorded as STAYED. The return passage remains usable unless a field process locks it.'
    : 'Return to the entrance and press E to propose a successful extraction. Remaining in the field past zero chooses the interlace.';

  root.innerHTML = `
    <header>
      <span>AFONSO // ROUTE FORECAST</span>
      <strong>${heading}</strong>
      <b>${clock}</b>
    </header>
    <div class="safe-window-options">
      <article class="safe-return">
        <span>RETURN</span>
        <strong>${escapeHtml(snapshot.forecast.returnOption.label)}</strong>
        <p>${escapeHtml(snapshot.forecast.returnOption.description)}</p>
      </article>
      <article class="safe-stay">
        <span>STAY</span>
        <strong>${escapeHtml(snapshot.forecast.opportunity.label)}</strong>
        <p>${escapeHtml(snapshot.forecast.opportunity.description)}</p>
      </article>
      <article class="safe-danger">
        <span>DANGER ${snapshot.forecast.danger.severity}/5</span>
        <strong>${escapeHtml(snapshot.forecast.danger.label)}</strong>
        <p>${escapeHtml(snapshot.forecast.danger.description)}</p>
      </article>
    </div>
    <footer>${escapeHtml(instruction)}</footer>
  `;
}

window.addEventListener('abrir:safe-window', (event) => render(event.detail));
window.addEventListener('abrir:run-finished', (event) => {
  const result = event.detail;
  const snapshot = result.safeWindow ?? lastSnapshot;
  if (!debrief || !snapshot) return;
  const label = result.success
    ? snapshot.decision === 'returned'
      ? 'RETURNED DURING SAFE WINDOW'
      : snapshot.decision === 'stayed'
        ? 'STAYED FOR INTERLACE'
        : 'NO WINDOW DECISION'
    : snapshot.decision === 'stayed'
      ? 'STAYED / FIELD TEAM LOST'
      : 'RUN LOST BEFORE INTERLACE';
  debrief.textContent = label;
  debrief.className = `window-result decision-${snapshot.decision}`;
});
