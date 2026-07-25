; FocusGateway Inno Setup Windows Installer Script (.iss)
; Compiles the FocusGateway application into a single downloadable FocusGateway-Setup.exe

#define MyAppName "FocusGateway"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "FocusGateway Open Source"
#define MyAppURL "https://github.com/AryanMotiani/focusgateway"
#define MyAppExeName "focusgateway.exe"

[Setup]
AppId={{D37B40A5-5D9E-4C2E-A12A-92F67150A2F1}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=..\installer_output
OutputBaseFilename=FocusGateway-Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "autostart"; Description: "Automatically start FocusGateway site-blocker on Windows logon"; GroupDescription: "System Startup:"; Flags: unchecked

[Files]
; Copy compiled backend service files
Source: "..\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
; Copy dashboard static build
Source: "..\dashboard\dist\*"; DestDir: "{app}\dashboard\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
; Copy package configuration
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
; Copy node_modules production dependencies
Source: "..\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Start Menu Dashboard Shortcut
Name: "{group}\{#MyAppName} Dashboard"; Filename: "http://localhost:7000"
; Start Menu Emergency Help Shortcut (NOT on desktop to prevent 1-click cheat bypass)
Name: "{group}\Emergency Help"; Filename: "node.exe"; Parameters: """{app}\dist\src\recovery\recover.js"""; WorkingDir: "{app}"
; Uninstall Shortcut
Name: "{group}\Uninstall FocusGateway"; Filename: "{uninstallexe}"

[Run]
; Auto-start Task Scheduler registration if selected
Filename: "schtasks.exe"; Parameters: "/Create /TN ""FocusGateway\Service"" /TR ""node '{app}\dist\src\service\watchdog\wrapper.js'"" /SC ONLOGON /RL HIGHEST /F"; Flags: runhidden; Tasks: autostart
; Launch service immediately after install
Filename: "node.exe"; Parameters: """{app}\dist\src\service\index.js"""; Flags: nowait postinstall skipifsilent; Description: "Launch FocusGateway Service now"

[UninstallRun]
; Deregister Task Scheduler task on uninstall
Filename: "schtasks.exe"; Parameters: "/Delete /TN ""FocusGateway\Service"" /F"; Flags: runhidden

[UninstallDelete]
; Delete temporary files, but PRESERVE user DB at %APPDATA%\FocusGateway unless wiped manually
Type: files; Name: "{app}\*.tmp"
