import { getHostsPath, cleanHostsContent } from '../src/recovery/recover';
import { getAutoStartConfig } from '../src/installer/autostart';

describe('Ticket 6 — Installer/Packaging & Cross-Platform Unit Tests (TypeScript)', () => {
  test('getHostsPath returns valid OS path', () => {
    const hostsPath = getHostsPath();
    expect(hostsPath).toBeDefined();
    expect(typeof hostsPath).toBe('string');
  });

  test('cleanHostsContent strips FocusGateway markers cleanly', () => {
    const raw = [
      '127.0.0.1 localhost',
      '# FocusGateway BEGIN — do not edit this block manually',
      '127.0.0.1 youtube.com',
      '# FocusGateway END',
      '::1 localhost',
    ].join('\n');

    const cleaned = cleanHostsContent(raw);
    expect(cleaned).toBe('127.0.0.1 localhost\n::1 localhost');
  });

  test('getAutoStartConfig returns correct OS configurations', () => {
    const win = getAutoStartConfig('win32', 'C:\\app\\wrapper.js');
    expect(win.type).toBe('task_scheduler');
    expect(win.command).toContain('schtasks');

    const mac = getAutoStartConfig('darwin', '/app/wrapper.js');
    expect(mac.type).toBe('launchd');
    expect(mac.fileContent).toContain('com.focusgateway.service');

    const nix = getAutoStartConfig('linux', '/app/wrapper.js');
    expect(nix.type).toBe('systemd');
    expect(nix.fileContent).toContain('FocusGateway Site-Blocker Service');
  });
});
