export type FailsafeStateName = 'IDLE' | 'INTENT_CONFIRMED' | 'WAITING' | 'FINAL_CONFIRM';

export interface FailsafeStatus {
  state: FailsafeStateName;
  rule_id: number | null;
  wait_until: string | null;
  seconds_remaining: number;
}

export class FailsafeStateMachine {
  public state: FailsafeStateName = 'IDLE';
  public ruleId: number | null = null;
  public waitUntil: Date | null = null;
  public waitDurationMs: number = 30000;
  public timerId: NodeJS.Timeout | null = null;
  public unlockedRuleId: number | null = null;

  constructor() {
    this.reset();
  }

  public reset(): void {
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
    this.state = 'IDLE';
    this.ruleId = null;
    this.waitUntil = null;
    this.waitDurationMs = 30000;
    this.timerId = null;
    this.unlockedRuleId = null;
  }

  public getState(): FailsafeStatus {
    return {
      state: this.state,
      rule_id: this.ruleId,
      wait_until: this.waitUntil ? this.waitUntil.toISOString() : null,
      seconds_remaining: this.getSecondsRemaining(),
    };
  }

  public getSecondsRemaining(): number {
    if (this.state !== 'WAITING' || !this.waitUntil) return 0;
    const diff = Math.ceil((this.waitUntil.getTime() - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  }

  public start(ruleId: number, waitDurationMs: number = 30000): FailsafeStatus {
    this.reset();
    this.state = 'INTENT_CONFIRMED';
    this.ruleId = ruleId;
    this.waitDurationMs = waitDurationMs;
    return this.getState();
  }

  public submitPinSuccess(): FailsafeStatus {
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

  public confirmFinal(): { state: FailsafeStateName; unlocked: boolean; rule_id: number | null } {
    if (this.state !== 'FINAL_CONFIRM') {
      throw new Error(`Cannot confirm unlock in state: ${this.state}`);
    }
    const unlockedId = this.ruleId;
    this.reset();
    this.unlockedRuleId = unlockedId;
    return { state: 'IDLE', unlocked: true, rule_id: unlockedId };
  }

  public cancel(): { state: FailsafeStateName } {
    this.reset();
    return { state: 'IDLE' };
  }
}

export const failsafeState = new FailsafeStateMachine();
