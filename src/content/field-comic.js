function safe(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]);
}

function page(id, pageNumber, className, html, metadata = {}) {
  return { id, pageNumber, type: 'html', className, html, metadata };
}

export function createFieldComic(state = {}, run = null) {
  const routeName = safe(state.route?.name ?? 'UNFILED PASSAGE');
  const seedLabel = safe(state.seedLabel ?? 'ABRIR-UNKNOWN');
  const remoteSeed = safe(state.interlace?.seedLabel ?? 'REMOTE STATE PENDING');
  const contractTitle = safe(run?.contract?.title ?? state.contract?.title ?? 'RECOVERY AUTHORIZATION');
  const processName = safe(run?.majorProcess?.name ?? 'A CHAVE GERAL');

  return [
    page('field-comic-cover', 1, 'comic-page-cover', `
      <div class="comic-kicker">INSTITUTO TRAVESSIA // FIELD COMIC</div>
      <h1>${routeName}</h1>
      <div class="comic-sigil" aria-hidden="true"><i></i><i></i><i></i></div>
      <p>${seedLabel}</p>
    `, { role: 'cover' }),
    page('field-comic-authorization', 2, 'comic-page-authorization', `
      <div class="comic-panel comic-panel-large">
        <span>AUTHORIZATION</span>
        <h2>${contractTitle}</h2>
        <p>Four characters cross. The room insists that only the objects are real.</p>
      </div>
      <div class="comic-panel-row">
        <div class="comic-panel"><b>2P</b><p>Two characters per player. Swap within the pair.</p></div>
        <div class="comic-panel"><b>4P</b><p>One character per player. Everybody remains active.</p></div>
      </div>
    `),
    page('field-comic-local-state', 3, 'comic-page-local', `
      <div class="comic-grid-scene" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <div class="comic-caption">LOCAL STATE // ${seedLabel}</div>
      <h2>A stable room is only a room that has not contradicted itself yet.</h2>
    `),
    page('field-comic-object', 4, 'comic-page-object', `
      <div class="comic-object-orbit" aria-hidden="true"><i></i></div>
      <h2>THE OBJECT HAS THREE RECORDS</h2>
      <ol>
        <li><b>Institute:</b> value, retention, classification.</li>
        <li><b>Network:</b> access, leverage, route consequence.</li>
        <li><b>Local:</b> memory, use, and the cost of removal.</li>
      </ol>
    `),
    page('field-comic-interlace', 5, 'comic-page-interlace', `
      <div class="comic-interlace-lines" aria-hidden="true"></div>
      <div class="comic-caption">REMOTE STATE // ${remoteSeed}</div>
      <h2>THE SECOND SERVER ENTERS SIDEWAYS.</h2>
      <p>Doorways become arguments. Rare rooms become reachable. So does ${processName}.</p>
    `),
    page('field-comic-close', 6, 'comic-page-close', `
      <div class="comic-kicker">FIELD RECORD REMAINS OPEN</div>
      <h2>Players decide who fights, speaks, recovers, bargains, card battles, and closes the passage.</h2>
      <p>This spread is a mechanics test. Authored comic pages can replace these HTML pages without changing the reader.</p>
      <div class="comic-end-mark" aria-hidden="true">ABRIR</div>
    `, { role: 'end' }),
  ];
}
