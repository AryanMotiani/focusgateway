; FocusGateway lock agent: Windows setup (NSIS 3).
; Built by .github/workflows/release.yml on Ubuntu:
;   makensis -DVERSION=1.2.0 -DAMD64=path\to\amd64.exe -DARM64=path\to\arm64.exe \
;            -DLICENSE_FILE=LICENSE -DOUTFILE=FocusGateway-Setup.exe packaging/windows/focusgateway.nsi
;
; The setup carries both builds, runs `focusgateway-agent install` with the right one
; (that copies it to Program Files, sets browser policies, registers the Task
; Scheduler service and opens the pairing link), and adds an Apps & Features entry.

Unicode true
SetCompressor /SOLID lzma
ManifestDPIAware true

!ifndef VERSION
  !define VERSION "0.0.0"
!endif
!ifndef OUTFILE
  !define OUTFILE "FocusGateway-Setup.exe"
!endif
!ifndef LICENSE_FILE
  !define LICENSE_FILE "..\..\LICENSE"
!endif

!define APP "FocusGateway lock agent"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\FocusGateway"
!define UNINSTALLER "Uninstall FocusGateway.exe"

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"

Name "${APP}"
OutFile "${OUTFILE}"
InstallDir "$PROGRAMFILES64\FocusGateway"
RequestExecutionLevel admin
ShowInstDetails show
ShowUninstDetails show
BrandingText "FocusGateway ${VERSION} (free and open source)"

VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${APP}"
VIAddVersionKey "FileDescription" "${APP} setup"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "MIT License"

!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Install the FocusGateway lock agent"
!define MUI_WELCOMEPAGE_TEXT "The lock agent makes your FocusGateway blocks work in every browser and app on this computer.$\r$\n$\r$\nIt runs quietly in the background, turns off Secure DNS and private windows in your browsers, and keeps blocking even if the extension is removed.$\r$\n$\r$\nAfter setup, your browser opens FocusGateway and connects the agent by itself."
!define MUI_FINISHPAGE_TITLE "The lock agent is installed"
!define MUI_FINISHPAGE_TEXT "Your browser opens FocusGateway to connect the agent. If it did not, open the FocusGateway website, Install, and use the code shown in the details of this setup.$\r$\n$\r$\nRestart your browsers once so the new settings apply."
!define MUI_UNCONFIRMPAGE_TEXT_TOP "Removes the lock agent, its browser policies and its hosts file entries. It is refused while a no-failsafe block is running."

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "${LICENSE_FILE}"
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"

Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "The FocusGateway lock agent needs 64-bit Windows 10 or 11." /SD IDOK
    Abort
  ${EndIf}
  SetRegView 64
FunctionEnd

Function un.onInit
  SetRegView 64
FunctionEnd

Section "Lock agent" SecAgent
  SectionIn RO
  ; Unpack to a temp folder and let the agent install itself. It stops a running
  ; older copy first, so upgrading never trips over a file that is in use.
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  ${If} ${IsNativeARM64}
    File "/oname=focusgateway-agent.exe" "${ARM64}"
  ${Else}
    File "/oname=focusgateway-agent.exe" "${AMD64}"
  ${EndIf}

  DetailPrint "Installing the lock agent service..."
  nsExec::ExecToLog '"$PLUGINSDIR\focusgateway-agent.exe" install --keep-settings'
  Pop $0
  ${If} $0 != 0
    MessageBox MB_ICONSTOP "The lock agent could not be installed (code $0). See the details above, or TROUBLESHOOTING.md on the FocusGateway website." /SD IDOK
    Abort
  ${EndIf}

  SetOutPath "$INSTDIR"
  WriteUninstaller "$INSTDIR\${UNINSTALLER}"
  WriteRegStr HKLM "${UNINST_KEY}" "DisplayName" "${APP}"
  WriteRegStr HKLM "${UNINST_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "${UNINST_KEY}" "Publisher" "FocusGateway (open source)"
  WriteRegStr HKLM "${UNINST_KEY}" "URLInfoAbout" "https://github.com/AryanMotiani/focusgateway"
  WriteRegStr HKLM "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\focusgateway-agent.exe"
  WriteRegStr HKLM "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${UNINST_KEY}" "UninstallString" '"$INSTDIR\${UNINSTALLER}"'
  WriteRegDWORD HKLM "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "${UNINST_KEY}" "NoRepair" 1
  WriteRegDWORD HKLM "${UNINST_KEY}" "EstimatedSize" 7500
SectionEnd

Section "Uninstall"
  ; The agent refuses (exit code 2) while a no-failsafe block is running.
  nsExec::ExecToLog '"$INSTDIR\focusgateway-agent.exe" uninstall --yes --keep-program'
  Pop $0
  ${If} $0 == 2
    MessageBox MB_ICONEXCLAMATION "A no-failsafe block is running right now. You chose no escape hatch for it, so the lock agent stays until the block ends. Try again after that." /SD IDOK
    Abort
  ${ElseIf} $0 != 0
    MessageBox MB_YESNO|MB_ICONQUESTION "The lock agent reported a problem while removing itself (code $0). Remove its files anyway?" /SD IDYES IDYES +2
    Abort
  ${EndIf}
  Delete "$INSTDIR\focusgateway-agent.exe"
  Delete "$INSTDIR\focusgateway-agent.exe.old"
  Delete "$INSTDIR\TROUBLESHOOTING.md"
  Delete "$INSTDIR\LICENSE"
  Delete "$INSTDIR\recover.cmd"
  Delete "$INSTDIR\${UNINSTALLER}"
  RMDir "$INSTDIR"
  DeleteRegKey HKLM "${UNINST_KEY}"
SectionEnd
