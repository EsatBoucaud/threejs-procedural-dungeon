import { createInterlaceForecast } from '../content/interlace-forecast.js';
import { RunController } from './run-controller.js';
import { SafeWindowSystem } from './safe-window-system.js';

const originalUpdate = RunController.prototype.update;
const originalTriggerInterlace = RunController.prototype.triggerInterlace;
const originalAttemptExtraction = RunController.prototype.attemptExtraction;

function dispatch(name, detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(name, { detail: structuredClone(detail) }));
}

function entrancePulse(controller, phase) {
  const entrance = controller.mission.rooms.get(controller.mapState.entranceRoomId);
  if (!entrance) return;
  const point = controller.player.position.clone().set(entrance.x, 0, entrance.z);
  controller.renderer.createPulse(point, phase === 'final' ? 0xe06e58 : 0xd5b76d, phase === 'final' ? 5 : 3.6);
}

function handlePhase(controller, transition, snapshot) {
  if (transition.phase === 'warning') {
    entrancePulse(controller, 'warning');
    controller.events.onFeed?.(
      `AFONSO: ${Math.ceil(snapshot.remainingSeconds)} seconds remain. The entrance still accepts a successful return. Staying opens ${snapshot.forecast.opportunity.label}.`,
      'good',
    );
  }
  if (transition.phase === 'final') {
    entrancePulse(controller, 'final');
    controller.events.onFeed?.(
      `FINAL RETURN WINDOW. Stay past zero and ${snapshot.forecast.danger.label} enters with the remote state.`,
      'danger',
    );
  }
  if (transition.phase === 'returned') {
    controller.events.onFeed?.('The team returned before the server collision. The filing remains successful.', 'good');
  }
}

function enrichFinishedRun(controller, result) {
  if (!result.success) controller.safeWindow.markFailed(result.elapsedSeconds);
  result.safeWindow = controller.safeWindow.snapshot();
  result.safeWindowDecision = result.safeWindow.decision;
  dispatch('abrir:run-finished', result);
  return result;
}

function ensureSafeWindow(controller) {
  if (controller.safeWindow) return controller.safeWindow;
  const dangerPoint = controller.director.majorSpawnPoint();
  const forecast = createInterlaceForecast(controller.mapState, controller.majorProcess, dangerPoint);
  controller.interlaceForecast = forecast;
  controller.mapState.safeWindowForecast = structuredClone(forecast);
  controller.safeWindow = new SafeWindowSystem(controller.mapState.interlaceAtSeconds, forecast, {
    onUpdate: (snapshot) => dispatch('abrir:safe-window', snapshot),
    onPhase: (transition, snapshot) => handlePhase(controller, transition, snapshot),
  });

  const existingFinish = controller.events.onFinish;
  controller.events.onFinish = (result) => existingFinish?.(enrichFinishedRun(controller, result));
  dispatch('abrir:safe-window', controller.safeWindow.snapshot());
  return controller.safeWindow;
}

function spawnInterlaceVanguard(controller) {
  const forecast = controller.interlaceForecast;
  const point = forecast.danger.position;
  const count = 2 + Math.min(2, Math.floor(forecast.danger.severity / 2));
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + controller.mapState.seed * 0.013;
    controller.combat.spawnEnemy({
      x: point.x + Math.cos(angle) * (2.2 + (index % 2) * 0.8),
      z: point.z + Math.sin(angle) * (2.2 + (index % 2) * 0.8),
      roomId: point.roomId ?? `interlace-vanguard:${forecast.danger.processId}`,
      elite: index === 0 && forecast.danger.severity >= 4,
      interlaced: true,
      difficulty: Math.min(1, 0.52 + forecast.danger.severity * 0.08),
      archetype: index % 3 === 2 ? 'gunner' : 'pursuer',
    });
  }

  const dangerPulse = controller.player.position.clone().set(point.x, 0, point.z);
  controller.renderer.createPulse(dangerPulse, controller.majorProcess.color, 5.4);
  const opportunity = forecast.opportunity;
  if (opportunity.position) {
    const opportunityPulse = controller.player.position.clone().set(opportunity.position.x, 0, opportunity.position.z);
    controller.renderer.createPulse(opportunityPulse, 0xe2c77e, 4.4);
  }
  controller.events.onFeed?.(
    `${forecast.opportunity.label} is marked as the opportunity. ${controller.majorProcess.name} routed an immediate vanguard through the danger coordinate.`,
    'danger',
  );
}

RunController.prototype.update = function patchedSafeWindowUpdate(delta, movement, aimPosition) {
  const safeWindow = ensureSafeWindow(this);
  if (!this.finished) safeWindow.update(this.elapsed + delta);
  return originalUpdate.call(this, delta, movement, aimPosition);
};

RunController.prototype.triggerInterlace = function patchedSafeWindowInterlace() {
  if (this.interlaceTriggered) return;
  const safeWindow = ensureSafeWindow(this);
  safeWindow.markStayed(this.elapsed);
  originalTriggerInterlace.call(this);
  spawnInterlaceVanguard(this);
};

RunController.prototype.attemptExtraction = function patchedSafeWindowExtraction() {
  const safeWindow = ensureSafeWindow(this);
  if (!this.interlaceTriggered) safeWindow.markReturned(this.elapsed);
  return originalAttemptExtraction.call(this);
};

export { ensureSafeWindow };
