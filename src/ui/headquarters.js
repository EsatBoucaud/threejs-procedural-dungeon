import { processById } from '../content/chave-processes.js';
import { FIELD_ROUTES } from '../content/routes.js';
import { INSTITUTE_UPGRADES } from '../content/upgrades.js';
import {
  archiveSummary,
  buyBackObject,
  loadArchive,
  sellArchivedObject,
} from '../game/archive-system.js';
import {
  loadProfile,
  purchaseUpgrade,
  rankTitle,
} from '../game/progression-system.js';

function currency(value) {
  return `₢ ${Math.round(value).toLocaleString()}`;
}

function riskMarks(risk) {
  return '◆'.repeat(risk) + '◇'.repeat(Math.max(0, 5 - risk));
}

export class Headquarters {
  constructor(dialog, callbacks = {}) {
    this.dialog = dialog;
    this.callbacks = callbacks;
    this.profileNode = dialog.querySelector('#hq-profile');
    this.routesNode = dialog.querySelector('#hq-routes');
    this.archiveNode = dialog.querySelector('#hq-archive');
    this.upgradesNode = dialog.querySelector('#hq-upgrades');
    this.statusNode = dialog.querySelector('#hq-status');
    this.lastResult = null;
    dialog.addEventListener('click', (event) => this.handleClick(event));
  }

  open(lastResult = null) {
    this.lastResult = lastResult;
    this.render();
    if (!this.dialog.open) this.dialog.showModal();
  }

  close() {
    if (this.dialog.open) this.dialog.close();
  }

  setStatus(message, tone = '') {
    this.statusNode.textContent = message;
    this.statusNode.className = `hq-status ${tone}`.trim();
  }

  render() {
    const profile = loadProfile();
    const archive = loadArchive();
    const summary = archiveSummary(archive);
    this.renderProfile(profile, summary);
    this.renderRoutes(profile);
    this.renderArchive(archive, profile);
    this.renderUpgrades(profile);
    if (this.lastResult) {
      const remote = this.lastResult.remoteObjects ?? 0;
      const held = this.lastResult.archiveRecord?.held?.length ?? 0;
      const processResult = this.lastResult.majorProcessName
        ? ` · ${this.lastResult.majorProcessName} ${this.lastResult.majorProcessDefeated ? 'terminated' : 'unresolved'}`
        : '';
      this.setStatus(
        `Last filing: ${this.lastResult.contractComplete ? 'contract satisfied' : 'contract incomplete'} · ${remote} remote object${remote === 1 ? '' : 's'} · ${held} retained by the Institute${processResult}.`,
        this.lastResult.success ? 'good' : 'danger',
      );
    } else {
      this.setStatus('The Institute is open. This is not the same as being welcoming.');
    }
  }

  refresh(message, tone = '') {
    this.render();
    this.setStatus(message, tone);
  }

  renderProfile(profile, summary) {
    this.profileNode.innerHTML = `
      <div class="hq-rank-seal"><span>RANK</span><strong>${profile.rank}</strong></div>
      <div>
        <span class="eyebrow">${rankTitle(profile.rank)}</span>
        <h2>${currency(profile.scrip)} FIELD SCRIP</h2>
        <p>${profile.successfulRuns} successful / ${profile.failedRuns} failed traversals · ${profile.remoteObjects} remote objects · ${profile.statistics.majorProcessesDefeated} major processes removed</p>
      </div>
      <div class="hq-profile-grid">
        <span><b>${summary.stored}</b> stored</span>
        <span><b>${summary.held}</b> retained</span>
        <span><b>${summary.remote}</b> remote</span>
        <span><b>${currency(summary.totalAppraisal)}</b> appraised</span>
      </div>
    `;
  }

  renderRoutes(profile) {
    this.routesNode.replaceChildren();
    for (const route of FIELD_ROUTES) {
      const process = processById(route.chaveProcess);
      const card = document.createElement('article');
      card.className = 'route-card';
      card.innerHTML = `
        <span class="eyebrow">${route.region}</span>
        <h3>${route.name}</h3>
        <p>${route.description}</p>
        <div class="route-process">
          <span>A CHAVE GERAL RESPONSE</span>
          <strong>${process.name}</strong>
          <small>${process.role}</small>
        </div>
        <div class="route-stats">
          <span>RISK <b>${riskMarks(route.risk)}</b></span>
          <span>${route.roomCount} LOCAL ROOMS</span>
          <span>${route.interlaceAtSeconds}s SAFE WINDOW</span>
          <span>${route.rewardMultiplier.toFixed(2)}× ROUTE PAY</span>
        </div>
        <button data-hq-action="deploy" data-route-id="${route.id}">AUTHORIZE PASSAGE</button>
      `;
      if (profile.rank + 2 < route.risk) {
        card.classList.add('route-warning');
        card.querySelector('button').textContent = 'AUTHORIZE AT OWN RISK';
      }
      this.routesNode.append(card);
    }
  }

  renderArchive(archive, profile) {
    const active = archive.objects.filter((entry) => entry.status !== 'sold').slice(0, 36);
    this.archiveNode.replaceChildren();
    if (active.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'hq-empty';
      empty.textContent = 'No objects are currently stored. The archive furniture is attempting to look useful.';
      this.archiveNode.append(empty);
      return;
    }
    for (const entry of active) {
      const card = document.createElement('article');
      card.className = `archive-object ${entry.origin === 'interlace' ? 'remote' : ''} ${entry.status}`;
      const action = entry.status === 'institute-held'
        ? `<button data-hq-action="buyback" data-archive-id="${entry.archiveId}">BUY BACK ${currency(Math.round(entry.appraisal * 1.08))}</button>`
        : `<button data-hq-action="sell" data-archive-id="${entry.archiveId}">SELL ${currency(Math.round(entry.appraisal * 0.72))}</button>`;
      card.innerHTML = `
        <div>
          <span class="object-origin">${entry.origin === 'interlace' ? 'REMOTE SERVER' : 'MAPPED STATE'} · ${entry.rarity.toUpperCase()}</span>
          <h3>${entry.name}</h3>
          <p>${entry.condition.toUpperCase()} · ${entry.provenance}</p>
        </div>
        <div class="object-accounting">
          <strong>${currency(entry.appraisal)}</strong>
          <span>${entry.status === 'institute-held' ? 'INSTITUTE RETENTION' : 'FIELD STORAGE'}</span>
          ${action}
        </div>
      `;
      if (entry.status === 'institute-held' && profile.scrip < Math.round(entry.appraisal * 1.08)) {
        card.querySelector('button').classList.add('insufficient');
      }
      this.archiveNode.append(card);
    }
  }

  renderUpgrades(profile) {
    this.upgradesNode.replaceChildren();
    for (const upgrade of INSTITUTE_UPGRADES) {
      const owned = profile.upgrades.includes(upgrade.id);
      const locked = profile.rank < upgrade.rankRequired;
      const card = document.createElement('article');
      card.className = `upgrade-card${owned ? ' owned' : ''}${locked ? ' locked' : ''}`;
      card.innerHTML = `
        <span class="eyebrow">${upgrade.department}</span>
        <h3>${upgrade.name}</h3>
        <p>${upgrade.description}</p>
        <div><span>RANK ${upgrade.rankRequired}</span><strong>${currency(upgrade.cost)}</strong></div>
        <button data-hq-action="upgrade" data-upgrade-id="${upgrade.id}" ${owned ? 'disabled' : ''}>
          ${owned ? 'PERMISSION ACTIVE' : locked ? 'RANK INSUFFICIENT' : 'PURCHASE PERMISSION'}
        </button>
      `;
      this.upgradesNode.append(card);
    }
  }

  handleClick(event) {
    const button = event.target.closest('[data-hq-action]');
    if (!button) return;
    const action = button.dataset.hqAction;
    if (action === 'deploy') {
      const route = FIELD_ROUTES.find((entry) => entry.id === button.dataset.routeId);
      if (!route) return;
      this.close();
      this.callbacks.onDeploy?.(route);
      return;
    }
    if (action === 'sell') {
      const result = sellArchivedObject(button.dataset.archiveId);
      const message = result.success
        ? `Object transferred for ${currency(result.payout)}.`
        : 'That object is no longer available for field sale.';
      this.refresh(message, result.success ? 'good' : 'danger');
      this.callbacks.onProfileChange?.(result.profile ?? loadProfile());
      return;
    }
    if (action === 'buyback') {
      const result = buyBackObject(button.dataset.archiveId);
      const message = result.success
        ? `Institute retention reversed for ${currency(result.cost)}.`
        : result.reason === 'scrip'
          ? `Buyback denied. Required: ${currency(result.cost)}.`
          : 'The object is not currently eligible for buyback.';
      this.refresh(message, result.success ? 'good' : 'danger');
      this.callbacks.onProfileChange?.(result.profile ?? loadProfile());
      return;
    }
    if (action === 'upgrade') {
      const upgrade = INSTITUTE_UPGRADES.find((entry) => entry.id === button.dataset.upgradeId);
      if (!upgrade) return;
      const result = purchaseUpgrade(upgrade);
      const message = result.success
        ? `${upgrade.name} has been attached to the field file.`
        : result.reason === 'rank'
          ? `Rank ${upgrade.rankRequired} is required.`
          : result.reason === 'scrip'
            ? `${currency(upgrade.cost)} is required.`
            : 'That permission is already active.';
      this.refresh(message, result.success ? 'good' : 'danger');
      this.callbacks.onProfileChange?.(result.profile ?? loadProfile());
    }
  }
}
