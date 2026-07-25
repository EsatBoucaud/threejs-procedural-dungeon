function statusTone(snapshot) {
  if (snapshot?.finished) return 'danger';
  if (snapshot?.interlaced) return 'interlaced';
  return 'ready';
}

export class DemoConsole {
  constructor(root, callbacks = {}) {
    if (!root) throw new Error('DemoConsole requires a root element.');
    this.root = root;
    this.callbacks = callbacks;
    this.enabled = false;
    this.collapsed = false;
    this.snapshot = null;
    root.addEventListener('click', (event) => this.handleClick(event));
    this.render();
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
    this.root.classList.toggle('visible', this.enabled);
    this.root.setAttribute('aria-hidden', String(!this.enabled));
    this.render();
  }

  toggle() {
    if (!this.enabled) return;
    this.collapsed = !this.collapsed;
    this.render();
  }

  update(snapshot) {
    this.snapshot = snapshot ? structuredClone(snapshot) : null;
    if (this.enabled) this.render();
  }

  handleClick(event) {
    const button = event.target.closest('[data-demo-action]');
    if (!button) return;
    const action = button.dataset.demoAction;
    if (action === 'toggle') {
      this.toggle();
      return;
    }
    this.callbacks.onAction?.(action);
  }

  render() {
    if (!this.enabled) {
      this.root.replaceChildren();
      return;
    }
    const snapshot = this.snapshot ?? {};
    const tone = statusTone(snapshot);
    this.root.innerHTML = `
      <section class="demo-console-shell ${this.collapsed ? 'collapsed' : ''}" aria-label="Codex live demo controls">
        <header>
          <div>
            <span>CODEX LIVE // GUARDED ASSIST</span>
            <strong>ABRIR DEMO RUN</strong>
          </div>
          <div class="demo-console-state ${tone}">${snapshot.interlaced ? 'INTERLACED' : snapshot.finished ? 'RUN CLOSED' : 'LOCAL STATE'}</div>
          <button type="button" data-demo-action="toggle" aria-label="Toggle demo console">${this.collapsed ? 'OPEN' : 'HIDE'}</button>
        </header>
        <div class="demo-console-body">
          <ol class="demo-run-order">
            <li><b>1</b><span>Move, aim, attack, dodge</span></li>
            <li><b>2</b><span><kbd>Q</kbd> swap owned character</span></li>
            <li><b>3</b><span>Open shared dialogue or object decision</span></li>
            <li><b>4</b><span>Trigger the second server</span></li>
            <li><b>5</b><span><kbd>C</kbd> show comic spread</span></li>
          </ol>
          <div class="demo-action-grid">
            <button data-demo-action="combat-room"><span>01</span> COMBAT ROOM</button>
            <button data-demo-action="dialogue"><span>02</span> DIALOGUE</button>
            <button data-demo-action="stage-object"><span>03</span> OBJECT DECISION</button>
            <button data-demo-action="activate-interlace"><span>04</span> INTERLACE NOW</button>
            <button data-demo-action="overlap"><span>05</span> GO TO OVERLAP</button>
            <button data-demo-action="comic"><span>06</span> COMIC SPREAD</button>
          </div>
          <div class="demo-safety-row">
            <button data-demo-action="restore-squad">RESTORE SQUAD</button>
            <button data-demo-action="extraction">RETURN PASSAGE</button>
            <button data-demo-action="restart-demo">RESTART FIXED RUN</button>
          </div>
          <dl class="demo-console-readout">
            <div><dt>CHARACTER</dt><dd>${snapshot.activeCharacter ?? '—'}</dd></div>
            <div><dt>ROOM</dt><dd>${snapshot.roomId ?? '—'}</dd></div>
            <div><dt>OBJECTS</dt><dd>${snapshot.recoveredObjects ?? 0} recovered / ${snapshot.availableObjects ?? 0} open</dd></div>
            <div><dt>INTERACTIONS</dt><dd>${snapshot.activeInteractions ?? 0} active</dd></div>
          </dl>
          <p><kbd>F1</kbd> toggles this console. Assists only run inside <code>?demo=1</code>.</p>
        </div>
      </section>
    `;
  }
}
