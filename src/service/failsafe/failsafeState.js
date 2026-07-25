'use strict';

/**
 * Failsafe Flow State Machine:
 * IDLE -> INTENT_CONFIRMED -> WAITING -> FINAL_CONFIRM -> UNLOCKED (back to IDLE)
 */
class FailsafeStateMachine {
  constructor() {
    this.reset();
  }

  reset() {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
    this.state = 'IDLE';
    this.ruleId = null;
    this.waitUntil = null;
    this.waitDurationMs = 30000; // default 30s
    this.timerId = null;
    this.unlockedRuleId = null;
  }

  getState() {
    return {
      state: this.state,
      rule_id: this.ruleId,
      wait_until: this.waitUntil ? this.waitUntil.toISOString() : null,
      seconds_remaining: this.getSecondsRemaining(),
    };
  }

  getSecondsRemaining() {
    if (this.state !== 'WAITING' || !this.waitUntil) return 0;
    const diff = Math.ceil((this.waitUntil.getTime() - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  }

  start(ruleId, waitDurationMs = 30000) {
    this.reset();
    this.state = 'INTENT_CONFIRMED';
    this.ruleId = ruleId;
    this.waitDurationMs = waitDurationMs;
    return this.getState();
  }

  submitPinSuccess() {
    if (this.state !== 'INTENT_CONFIRMED') {
      throw new Error(`Cannot submit PIN in state: ${this.state}`);
    }
    this.state = 'WAITING';
    this.waitUntil = new Date(Date.now() + this.waitDurationMs);

    this.timerId = setTimeout(() => {
      this.state = 'FINAL_CONFIRM';
    }, this.waitDurationMs);

    return this.getState();
  }

  confirmFinal() {
    if (this.state !== 'FINAL_CONFIRM') {
      throw new Error(`Cannot confirm unlock in state: ${this.state}`);
    }
    const unlockedId = this.ruleId;
    this.reset();
    this.unlockedRuleId = unlockedId;
    return { state: 'IDLE', unlocked: true, rule_id: unlockedId };
  }

  cancel() {
    this.reset();
    return { state: 'IDLE' };
  }
}

// Export singleton instance
const failsafeState = new FailsafeStateMachine();

module.exports = { FailsafeStateMachine, failsafeState };
