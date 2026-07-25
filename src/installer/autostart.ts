export interface AutoStartConfig {
  type: 'task_scheduler' | 'launchd' | 'systemd';
  command: string;
  fileContent?: string;
}

export function getAutoStartConfig(
  platform: NodeJS.Platform = process.platform,
  execPath: string = '/opt/focusgateway/wrapper.js'
): AutoStartConfig {
  if (platform === 'win32') {
    return {
      type: 'task_scheduler',
      command: `schtasks /Create /TN "FocusGateway\\Service" /TR "node ${execPath}" /SC ONLOGON /RL HIGHEST /F`,
    };
  }

  if (platform === 'darwin') {
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.focusgateway.service</string>
  <key>ProgramArguments</key>
  <array><string>node</string><string>${execPath}</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict>
</plist>`;
    return {
      type: 'launchd',
      command: 'launchctl load ~/Library/LaunchAgents/com.focusgateway.service.plist',
      fileContent: plist,
    };
  }

  const unit = `[Unit]
Description=FocusGateway Site-Blocker Service
After=network.target

[Service]
ExecStart=/usr/bin/node ${execPath}
Restart=on-failure

[Install]
WantedBy=default.target`;

  return {
    type: 'systemd',
    command: 'systemctl --user enable focusgateway',
    fileContent: unit,
  };
}
