'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  extractUserLines,
  buildBlock,
  atomicWrite,
  MARKER_BEGIN,
  MARKER_END,
} = require('../src/service/hosts/hostsFile');

const { hashPin, verifyPin } = require('../src/service/auth/pinAuth');
const { issueToken, verifyToken } = require('../src/service/auth/jwtAuth');
const { FailsafeStateMachine } = require('../src/service/failsafe/failsafeState');
const { CrashLoopDetector } = require('../src/service/watchdog/crashLoop');

describe('Ticket 2 — Backend Service Architecture Unit Tests', () => {
  describe('Hosts File Module', () => {
    test('extractUserLines strips FocusGateway markers cleanly', () => {
      const input = [
        '127.0.0.1 localhost',
        MARKER_BEGIN,
        '127.0.0.1 youtube.com',
        MARKER_END,
        '::1 localhost',
      ].join('\n');

      const result = extractUserLines(input);
      expect(result).toEqual(['127.0.0.1 localhost', '::1 localhost']);
    });

    test('buildBlock formats domain list with markers', () => {
      const block = buildBlock(['youtube.com', 'm.youtube.com']);
      expect(block).toContain(MARKER_BEGIN);
      expect(block).toContain('127.0.0.1 youtube.com');
      expect(block).toContain('127.0.0.1 m.youtube.com');
      expect(block).toContain(MARKER_END);
    });

    test('atomicWrite creates file atomically', async () => {
      const tmpFile = path.join(os.tmpdir(), `fg-test-hosts-${Date.now()}.txt`);
      await atomicWrite('127.0.0.1 test.local', tmpFile);

      const content = fs.readFileSync(tmpFile, 'utf8');
      expect(content).toBe('127.0.0.1 test.local');

      fs.unlinkSync(tmpFile);
    });
  });

  describe('Auth Modules (PIN & JWT)', () => {
    test('hashPin and verifyPin work correctly with bcrypt', async () => {
      const pin = '1234';
      const hash = await hashPin(pin);

      expect(hash).not.toBe(pin);
      expect(await verifyPin('1234', hash)).toBe(true);
      expect(await verifyPin('9999', hash)).toBe(false);
    });

    test('issueToken and verifyToken manage roles', () => {
      const token = issueToken('admin');
      const payload = verifyToken(token);

      expect(payload).not.toBeNull();
      expect(payload.role).toBe('admin');
    });
  });

  describe('Failsafe State Machine', () => {
    test('Failsafe state transitions correctly', () => {
      const fsMachine = new FailsafeStateMachine();

      let state = fsMachine.start(10, 100);
      expect(state.state).toBe('INTENT_CONFIRMED');

      state = fsMachine.submitPinSuccess();
      expect(state.state).toBe('WAITING');

      state = fsMachine.cancel();
      expect(state.state).toBe('IDLE');
    });
  });

  describe('Crash Loop Detector', () => {
    test('Detects 3 crashes in 60s window', () => {
      const detector = new CrashLoopDetector(3, 60000);
      const now = Date.now();

      expect(detector.recordCrash(now)).toBe(false);
      expect(detector.recordCrash(now + 1000)).toBe(false);
      expect(detector.recordCrash(now + 2000)).toBe(true);
    });
  });
});
