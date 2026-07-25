import fs from 'fs';
import http from 'http';

export const HEALTH_URL = 'http://localhost:7000/api/health';
export const HOSTS_PATHS: Record<string, string> = {
  win32: 'C:\\Windows\\System32\\drivers\\etc\\hosts',
  darwin: '/etc/hosts',
  linux: '/etc/hosts',
};

export const MARKER_BEGIN = '# FocusGateway BEGIN — do not edit this block manually';
export const MARKER_END   = '# FocusGateway END';

export function getHostsPath(): string {
  return HOSTS_PATHS[process.platform] || '/etc/hosts';
}

export function isServiceRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

export function cleanHostsContent(content: string): string {
  const lines = content.split(/\r?\n/);
  let inside = false;
  const cleaned: string[] = [];

  for (const line of lines) {
    if (line.includes(MARKER_BEGIN)) {
      inside = true;
      continue;
    }
    if (line.includes(MARKER_END)) {
      inside = false;
      continue;
    }
    if (!inside) {
      cleaned.push(line);
    }
  }

  return cleaned.join('\n');
}

export interface RecoveryResult {
  success: boolean;
  refused: boolean;
  message?: string;
  error?: string;
}

export async function runRecovery(customPath?: string): Promise<RecoveryResult> {
  const hostsPath = customPath || getHostsPath();
  const running = await isServiceRunning();

  if (running) {
    return {
      success: false,
      refused: true,
      message: 'Service is running normally. Emergency recovery refused.',
    };
  }

  try {
    const raw = fs.readFileSync(hostsPath, 'utf8');
    const cleaned = cleanHostsContent(raw);

    const tmpPath = hostsPath + '.fg-recovery-tmp';
    fs.writeFileSync(tmpPath, cleaned, 'utf8');
    fs.renameSync(tmpPath, hostsPath);

    return {
      success: true,
      refused: false,
      message: 'Successfully removed FocusGateway entries from hosts file.',
    };
  } catch (err: any) {
    return {
      success: false,
      refused: false,
      error: err.message,
    };
  }
}

if (require.main === module) {
  console.log('FocusGateway Emergency Recovery Script');
  runRecovery()
    .then(result => {
      console.log(result.message || result.error);
      process.exit(result.success ? 0 : 1);
    });
}
