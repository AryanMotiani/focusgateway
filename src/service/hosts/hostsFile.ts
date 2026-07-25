import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

export const MARKER_BEGIN = '# FocusGateway BEGIN — do not edit this block manually';
export const MARKER_END   = '# FocusGateway END';

export function getHostsPath(): string {
  if (process.platform === 'win32') {
    const windir = process.env.WINDIR || 'C:\\Windows';
    return path.join(windir, 'System32', 'drivers', 'etc', 'hosts');
  }
  return '/etc/hosts';
}

export async function readHostsFile(customPath?: string): Promise<string> {
  const filePath = customPath || getHostsPath();
  return fs.readFile(filePath, 'utf8');
}

export function extractUserLines(content: string): string[] {
  const lines = content.split(/\r?\n/);
  let inside = false;
  const result: string[] = [];

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
      result.push(line);
    }
  }

  return result;
}

export function buildBlock(domains: string[] = []): string {
  if (!domains.length) return '';

  const lines = [MARKER_BEGIN];
  const uniqueDomains = Array.from(new Set(domains.map(d => d.toLowerCase().trim())));

  for (const domain of uniqueDomains) {
    lines.push(`127.0.0.1 ${domain}`);
  }

  lines.push(MARKER_END);
  return lines.join('\n');
}

export async function atomicWrite(newContent: string, customPath?: string): Promise<void> {
  const targetPath = customPath || getHostsPath();
  const tmpPath = targetPath + '.fg-tmp';

  await fs.writeFile(tmpPath, newContent, 'utf8');

  try {
    const fh = await fs.open(tmpPath, 'r+');
    await fh.sync();
    await fh.close();
  } catch (err) {
    // Ignore sync error in virtual file systems/tests
  }

  await fs.rename(tmpPath, targetPath);
}

export async function clearBlock(customPath?: string): Promise<void> {
  const filePath = customPath || getHostsPath();
  const raw = await readHostsFile(filePath);
  const userLines = extractUserLines(raw);
  const cleanContent = userLines.join('\n');
  await atomicWrite(cleanContent, filePath);
}

export async function backupHostsFile(backupDir: string, customHostsPath?: string): Promise<string> {
  const hostsPath = customHostsPath || getHostsPath();
  const raw = await readHostsFile(hostsPath);
  if (!fsSync.existsSync(backupDir)) {
    fsSync.mkdirSync(backupDir, { recursive: true });
  }
  const target = path.join(backupDir, 'hosts.backup');
  await fs.writeFile(target, raw, 'utf8');
  return target;
}
