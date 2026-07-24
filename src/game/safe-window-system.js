function clone(value) {
  return structuredClone(value);
}

export class SafeWindowSystem {
  constructor(totalSeconds, forecast, callbacks = {}) {
    this.totalSeconds = Math.max(1, Number(totalSeconds ?? 1));
    this.forecast = clone(forecast);
    this.callbacks = callbacks;
    this.phase = 'stable';
    this.decision = 'undecided';
    this.remainingSeconds = this.totalSeconds;
    this.elapsedSeconds = 0;
    this.lastWholeSecond = Math.ceil(this.totalSeconds);
    this.transitionLog = [];
  }

  phaseFor(remaining) {
    if (this.decision === 'returned') return 'returned';
    if (this.decision === 'stayed') return 'interlaced';
    if (remaining <= this.forecast.finalSeconds) return 'final';
    if (remaining <= this.forecast.warningSeconds) return 'warning';
    return 'stable';
  }

  setPhase(nextPhase, reason) {
    if (nextPhase === this.phase) return false;
    const previous = this.phase;
    this.phase = nextPhase;
    const transition = {
      previous,
      phase: nextPhase,
      reason,
      remainingSeconds: this.remainingSeconds,
      elapsedSeconds: this.elapsedSeconds,
    };
    this.transitionLog.push(transition);
    this.callbacks.onPhase?.(clone(transition), this.snapshot());
    return true;
  }

  update(elapsedSeconds) {
    if (this.decision !== 'undecided') return this.snapshot();
    this.elapsedSeconds = Math.max(0, Number(elapsedSeconds ?? 0));
    this.remainingSeconds = Math.max(0, this.totalSeconds - this.elapsedSeconds);
    const changed = this.setPhase(this.phaseFor(this.remainingSeconds), 'countdown');
    const wholeSecond = Math.ceil(this.remainingSeconds);
    if (changed || wholeSecond !== this.lastWholeSecond) {
      this.lastWholeSecond = wholeSecond;
      if (this.phase !== 'stable') this.callbacks.onUpdate?.(this.snapshot());
    }
    return this.snapshot();
  }

  markReturned(elapsedSeconds) {
    if (this.decision !== 'undecided') return this.snapshot();
    this.elapsedSeconds = Math.max(0, Number(elapsedSeconds ?? 0));
    this.remainingSeconds = Math.max(0, this.totalSeconds - this.elapsedSeconds);
    this.decision = 'returned';
    this.setPhase('returned', 'extraction-before-interlace');
    this.callbacks.onUpdate?.(this.snapshot());
    return this.snapshot();
  }

  markStayed(elapsedSeconds) {
    if (this.decision === 'returned') return this.snapshot();
    this.elapsedSeconds = Math.max(0, Number(elapsedSeconds ?? this.totalSeconds));
    this.remainingSeconds = 0;
    this.decision = 'stayed';
    this.setPhase('interlaced', 'safe-window-expired');
    this.callbacks.onUpdate?.(this.snapshot());
    return this.snapshot();
  }

  markFailed(elapsedSeconds) {
    if (this.decision === 'undecided') {
      this.elapsedSeconds = Math.max(0, Number(elapsedSeconds ?? 0));
      this.remainingSeconds = Math.max(0, this.totalSeconds - this.elapsedSeconds);
      this.decision = 'failed';
      this.setPhase('failed', 'team-incapacitated');
      this.callbacks.onUpdate?.(this.snapshot());
    }
    return this.snapshot();
  }

  snapshot() {
    return {
      totalSeconds: this.totalSeconds,
      elapsedSeconds: this.elapsedSeconds,
      remainingSeconds: this.remainingSeconds,
      phase: this.phase,
      decision: this.decision,
      warningSeconds: this.forecast.warningSeconds,
      finalSeconds: this.forecast.finalSeconds,
      forecast: clone(this.forecast),
      transitionLog: clone(this.transitionLog),
    };
  }
}
