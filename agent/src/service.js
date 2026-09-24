// Registers the agent with the OS service manager so it starts at boot and is
// restarted if it crashes (systemd Restart=always, launchd KeepAlive, Task
// Scheduler restart-on-failure). This replaces a separate watchdog process.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, execSync } from 'node:child_process'
import { programDir, dataDir, SERVICE_NAME } from './paths.js'

const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'ignore', ...opts })
const entry = () => path.join(programDir(), 'agent', 'bin', 'focusgateway-agent.js')
const LAUNCHD = '/Library/LaunchDaemons/app.focusgateway.agent.plist'
const SYSTEMD = '/etc/systemd/system/focusgateway-agent.service'

/** Copies agent + core into the program directory so deleting the download folder is harmless. */
export function copyProgram(repoRoot) {
  const dest = programDir()
  fs.rmSync(dest, { recursive: true, force: true })
  for (const part of ['agent/bin', 'agent/src', 'agent/package.json', 'packages/core/src', 'packages/core/package.json', 'TROUBLESHOOTING.md', 'LICENSE']) {
    const from = path.join(repoRoot, part)
    if (fs.existsSync(from)) fs.cpSync(from, path.join(dest, part), { recursive: true })
  }
  fs.writeFileSync(path.join(dest, 'package.json'), JSON.stringify({ type: 'module', private: true }))
  return dest
}

function xmlEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function installService(nodePath = process.execPath) {
  const js = entry()
  if (process.platform === 'win32') {
    const xml = `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>FocusGateway lock agent</Description></RegistrationInfo>
  <Triggers><BootTrigger><Enabled>true</Enabled></BootTrigger><LogonTrigger><Enabled>true</Enabled></LogonTrigger></Triggers>
  <Principals><Principal id="Author"><UserId>S-1-5-18</UserId><RunLevel>HighestAvailable</RunLevel></Principal></Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <RestartOnFailure><Interval>PT1M</Interval><Count>999</Count></RestartOnFailure>
    <Enabled>true</Enabled>
  </Settings>
  <Actions Context="Author"><Exec><Command>${xmlEscape(nodePath)}</Command><Arguments>"${xmlEscape(js)}" run</Arguments></Exec></Actions>
</Task>`
    const tmp = path.join(os.tmpdir(), 'focusgateway-task.xml')
    fs.writeFileSync(tmp, '\ufeff' + xml, 'utf16le')
    run('schtasks', ['/Create', '/TN', SERVICE_NAME, '/XML', tmp, '/F'])
    fs.rmSync(tmp, { force: true })
    try { run('schtasks', ['/Run', '/TN', SERVICE_NAME]) } catch {}
    createWindowsShortcut(nodePath, js)
  } else if (process.platform === 'darwin') {
    fs.writeFileSync(LAUNCHD, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>app.focusgateway.agent</string>
  <key>ProgramArguments</key><array><string>${xmlEscape(nodePath)}</string><string>${xmlEscape(js)}</string><string>run</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>${xmlEscape(path.join(dataDir(), 'stdout.log'))}</string>
  <key>StandardErrorPath</key><string>${xmlEscape(path.join(dataDir(), 'stderr.log'))}</string>
</dict></plist>
`)
    try { run('launchctl', ['bootout', 'system', LAUNCHD]) } catch {}
    // bootout is asynchronous: retry bootstrap for a few seconds
    for (let i = 0; ; i++) {
      try {
        run('launchctl', ['bootstrap', 'system', LAUNCHD])
        break
      } catch (e) {
        if (i >= 10) throw e
        execSync('sleep 0.5')
      }
    }
    const cmd = '/Applications/FocusGateway Emergency Recovery.command'
    fs.writeFileSync(cmd, `#!/bin/sh\necho "FocusGateway emergency recovery (asks for your password)"\nsudo "${nodePath}" "${js}" recover\nread -p "Press Enter to close" _\n`, { mode: 0o755 })
  } else {
    fs.writeFileSync(SYSTEMD, `[Unit]
Description=FocusGateway lock agent
After=network.target

[Service]
ExecStart="${nodePath}" "${js}" run
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
`)
    run('systemctl', ['daemon-reload'])
    run('systemctl', ['enable', '--now', 'focusgateway-agent.service'])
    fs.writeFileSync('/usr/local/bin/focusgateway-agent', `#!/bin/sh\nexec "${nodePath}" "${js}" "$@"\n`, { mode: 0o755 })
    try {
      fs.mkdirSync('/usr/share/applications', { recursive: true })
      fs.writeFileSync('/usr/share/applications/focusgateway-recovery.desktop', `[Desktop Entry]\nType=Application\nName=FocusGateway Emergency Recovery\nExec=pkexec /usr/local/bin/focusgateway-agent recover\nTerminal=true\nCategories=Utility;\n`)
    } catch {}
  }
}

function createWindowsShortcut(nodePath, js) {
  const dir = path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'FocusGateway')
  fs.mkdirSync(dir, { recursive: true })
  const cmd = path.join(programDir(), 'recover.cmd')
  fs.writeFileSync(cmd, `@echo off\r\nnet session >nul 2>&1 || (powershell -NoProfile -Command "Start-Process -Verb RunAs -FilePath '%~f0'" & exit /b)\r\n"${nodePath}" "${js}" recover\r\npause\r\n`)
  const lnk = path.join(dir, 'FocusGateway Emergency Recovery.lnk')
  const ps = `$s=(New-Object -ComObject WScript.Shell).CreateShortcut('${lnk.replace(/'/g, "''")}');$s.TargetPath='${cmd.replace(/'/g, "''")}';$s.Save()`
  try { run('powershell', ['-NoProfile', '-Command', ps]) } catch {}
}

export function uninstallService() {
  if (process.platform === 'win32') {
    try { run('schtasks', ['/End', '/TN', SERVICE_NAME]) } catch {}
    try { run('schtasks', ['/Delete', '/TN', SERVICE_NAME, '/F']) } catch {}
    try { fs.rmSync(path.join(process.env.ProgramData || 'C:\\ProgramData', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'FocusGateway'), { recursive: true, force: true }) } catch {}
    // stop any leftover process listening on our port
    try { execSync('powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 47621 -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }"', { stdio: 'ignore' }) } catch {}
  } else if (process.platform === 'darwin') {
    try { run('launchctl', ['bootout', 'system', LAUNCHD]) } catch {}
    fs.rmSync(LAUNCHD, { force: true })
    fs.rmSync('/Applications/FocusGateway Emergency Recovery.command', { force: true })
  } else {
    try { run('systemctl', ['disable', '--now', 'focusgateway-agent.service']) } catch {}
    fs.rmSync(SYSTEMD, { force: true })
    try { run('systemctl', ['daemon-reload']) } catch {}
    fs.rmSync('/usr/local/bin/focusgateway-agent', { force: true })
    fs.rmSync('/usr/share/applications/focusgateway-recovery.desktop', { force: true })
  }
}

export function isAdmin() {
  if (process.platform === 'win32') {
    try {
      execSync('net session', { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }
  return process.getuid?.() === 0
}
