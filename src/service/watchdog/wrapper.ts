import { spawn } from 'child_process';
import path from 'path';
import { CrashLoopDetector } from './crashLoop';
import { clearBlock } from '../hosts/hostsFile';

export const detector = new CrashLoopDetector(3, 60000);

export function startService(): void {
  const servicePath = path.join(__dirname, '../index.ts');
  console.log(`[Watchdog] Spawning service: ${servicePath}`);

  const child = spawn(process.execPath, ['-r', 'ts-node/register', servicePath], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', async (code, signal) => {
    console.warn(`[Watchdog] Service process exited with code ${code}, signal ${signal}`);

    const isLooping = detector.recordCrash();

    if (isLooping) {
      console.error('[Watchdog] CRASH LOOP DETECTED (3 crashes within 60s). Failing OPEN...');
      try {
        await clearBlock();
        console.log('[Watchdog] Hosts-file cleared successfully. Halting restart loop.');
      } catch (err) {
        console.error('[Watchdog] Failed to clear hosts-file during fail-open:', err);
      }
      process.exit(1);
    } else {
      console.log('[Watchdog] Restarting service in 2000ms...');
      setTimeout(startService, 2000);
    }
  });
}

if (require.main === module) {
  startService();
}
