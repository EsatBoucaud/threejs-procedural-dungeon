import { RunController } from './run-controller.js';

const previousUpdate = RunController.prototype.update;
const releasedCodes = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'];

function explanationOverlayOpen() {
  return document.body.classList.contains('shared-interaction-open')
    || document.body.classList.contains('comic-reader-open');
}

function releaseMovementKeys() {
  for (const code of releasedCodes) {
    window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  }
}

RunController.prototype.update = function demoFocusUpdate(delta, movement, aimPosition) {
  if (this.isDemoRun && explanationOverlayOpen()) {
    this.player.velocity.set(0, 0, 0);
    this.renderer.update(delta, this.player.position, aimPosition);
    return;
  }
  return previousUpdate.call(this, delta, movement, aimPosition);
};

const classObserver = new MutationObserver(() => {
  if (explanationOverlayOpen()) releaseMovementKeys();
});
classObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

window.addEventListener('blur', releaseMovementKeys);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) releaseMovementKeys();
});
