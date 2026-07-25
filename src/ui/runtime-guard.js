import './runtime-guard.css';

const root = document.querySelector('#runtime-status');
let bootReady = false;
let bootTimer = null;

function safeMessage(value) {
  const text = value instanceof Error ? value.message : String(value ?? 'Unknown runtime failure.');
  return text.replace(/[\r\n]+/g, ' ').slice(0, 260);
}

function renderLoading() {
  if (!root) return;
  root.className = 'visible loading';
  root.innerHTML = `
    <section class="runtime-status-shell" role="status" aria-live="polite">
      <span>INSTITUTO TRAVESSIA // RUNTIME CHECK</span>
      <strong>OPENING PASSAGE</strong>
      <p>Validating the renderer, deterministic state, and field interface.</p>
    </section>
  `;
}

function renderFailure(reason) {
  if (!root) return;
  root.className = 'visible failure';
  root.innerHTML = `
    <section class="runtime-status-shell" role="alert" aria-live="assertive">
      <span>ABRIR // STARTUP RECOVERY</span>
      <strong>THE PASSAGE DID NOT OPEN</strong>
      <p>${safeMessage(reason)}</p>
      <button type="button" data-runtime-action="reload">RELOAD FIXED STATE</button>
    </section>
  `;
}

function markReady(detail = {}) {
  bootReady = true;
  window.clearTimeout(bootTimer);
  if (!root) return;
  root.className = 'visible ready';
  root.innerHTML = `
    <section class="runtime-status-shell" role="status" aria-live="polite">
      <span>${detail.demo ? 'CODEX LIVE // FIXED STATE' : 'INSTITUTO TRAVESSIA // RUNTIME CHECK'}</span>
      <strong>PASSAGE OPEN</strong>
      <p>${detail.seed ?? 'Deterministic field state ready.'}</p>
    </section>
  `;
  window.setTimeout(() => {
    if (!root || !bootReady) return;
    root.className = '';
    root.replaceChildren();
  }, detail.demo ? 900 : 600);
}

root?.addEventListener('click', (event) => {
  if (!event.target.closest('[data-runtime-action="reload"]')) return;
  window.location.reload();
});

window.addEventListener('abrir:boot-ready', (event) => markReady(event.detail));
window.addEventListener('error', (event) => {
  if (bootReady && !event.error) return;
  renderFailure(event.error ?? event.message);
});
window.addEventListener('unhandledrejection', (event) => renderFailure(event.reason));

renderLoading();
bootTimer = window.setTimeout(() => {
  if (!bootReady) renderFailure('Startup exceeded ten seconds. Reload the fixed state before presenting.');
}, 10000);
