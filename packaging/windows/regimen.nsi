; Regimen lock agent: Windows setup (NSIS 3).
; Built by .github/workflows/release.yml on Ubuntu:
;   makensis -DVERSION=1.2.0 -DAMD64=path\to\amd64.exe -DARM64=path\to\arm64.exe \
;            -DLICENSE_FILE=LICENSE -DOUTFILE=Regimen-Setup.exe packaging/windows/regimen.nsi
;
; The setup carries both builds, puts the right one into Program Files and runs
; `regimen-agent install` from there (that sets browser policies, registers
; the Task Scheduler service and opens the pairing link), and adds an Apps &
; Features entry.
;
; Every agent call passes --no-pause: nsExec gives the agent a hidden console
; with no one to press Enter, so it must never wait for input.

Unicode true
SetCompressor /SOLID lzma
ManifestDPIAware true

!ifndef VERSION
  !define VERSION "0.0.0"
!endif
!ifndef OUTFILE
  !define OUTFILE "Regimen-Setup.exe"
!endif
!ifndef LICENSE_FILE
  !define LICENSE_FILE "..\..\LICENSE"
!endif

!define APP "Regimen lock agent"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\Regimen"
!define UNINSTALLER "Uninstall Regimen.exe"

!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"

Name "${APP}"
OutFile "${OUTFILE}"
InstallDir "$PROGRAMFILES64\Regimen"
RequestExecutionLevel admin
ShowInstDetails show
ShowUninstDetails show
BrandingText "Regimen ${VERSION} (free and open source)"

VIProductVersion "${VERSION}.0"
VIAddVersionKey "ProductName" "${APP}"
VIAddVersionKey "FileDescription" "${APP} setup"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "MIT License"

!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Install the Regimen lock agent"
!define MUI_WELCOMEPAGE_TEXT "The lock agent makes your Regimen blocks work in every browser and app on this computer.$\r$\n$\r$\nIt runs quietly in the background, turns off Secure DNS and private windows in your browsers, and keeps blocking even if the extension is removed.$\r$\n$\r$\nAfter setup, your browser opens Regimen and connects the agent by itself."
!define MUI_FINISHPAGE_TITLE "The lock agent is installed"
!define MUI_FINISHPAGE_TEXT "Your browser opens Regimen to connect the agent. If it did not, open the Regimen website, Install, and use the code shown in the details of this setup.$\r$\n$\r$\nRestart your browsers once so the new settings apply."
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
    MessageBox MB_ICONSTOP "The Regimen lock agent needs 64-bit Windows 10 or 11." /SD IDOK
    Abort
  ${EndIf}
  SetRegView 64
FunctionEnd

Function un.onInit
  SetRegView 64
FunctionEnd

Section "Lock agent" SecAgent
  SectionIn RO
  ; Unpack next to the installed program, in the admin-only Program Files
  ; folder (never the user-writable temp folder: this runs elevated), under a
  ; setup name so a running older agent.exe is not in the way. The agent stops
  ; the older copy first and then puts itself in place as regimen-agent.exe.
  SetOutPath "$INSTDIR"
  ${If} ${IsNativeARM64}
    File "/oname=regimen-agent-setup.exe" "${ARM64}"
  ${Else}
    File "/oname=regimen-agent-setup.exe" "${AMD64}"
  ${EndIf}

  DetailPrint "Installing the lock agent service..."
  nsExec::ExecToLog '"$INSTDIR\regimen-agent-setup.exe" install --keep-settings --no-pause'
  Pop $0
  Delete "$INSTDIR\regimen-agent-setup.exe"
  ${If} $0 != 0
    MessageBox MB_ICONSTOP "The lock agent could not be installed (code $0). See the details above, or TROUBLESHOOTING.md on the Regimen website." /SD IDOK
    Abort
  ${EndIf}

  WriteUninstaller "$INSTDIR\${UNINSTALLER}"
  WriteRegStr HKLM "${UNINST_KEY}" "DisplayName" "${APP}"
  WriteRegStr HKLM "${UNINST_KEY}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKLM "${UNINST_KEY}" "Publisher" "Regimen (open source)"
  WriteRegStr HKLM "${UNINST_KEY}" "URLInfoAbout" "https://github.com/AryanMotiani/regimen"
  WriteRegStr HKLM "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\regimen-agent.exe"
  WriteRegStr HKLM "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
  WriteRegStr HKLM "${UNINST_KEY}" "UninstallString" '"$INSTDIR\${UNINSTALLER}"'
  WriteRegDWORD HKLM "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKLM "${UNINST_KEY}" "NoRepair" 1
  WriteRegDWORD HKLM "${UNINST_KEY}" "EstimatedSize" 7500
SectionEnd

Section "Uninstall"
  ; The agent refuses (exit code 2) while a no-failsafe block is running.
  nsExec::ExecToLog '"$INSTDIR\regimen-agent.exe" uninstall --yes --keep-program --no-pause'
  Pop $0
  ${If} $0 == 2
    MessageBox MB_ICONEXCLAMATION "A no-failsafe block is running right now. You chose no escape hatch for it, so the lock agent stays until the block ends. Try again after that." /SD IDOK
    Abort
  ${ElseIf} $0 != 0
    MessageBox MB_YESNO|MB_ICONQUESTION "The lock agent reported a problem while removing itself (code $0). Remove its files anyway?" /SD IDYES IDYES +2
    Abort
  ${EndIf}
  Delete "$INSTDIR\regimen-agent.exe"
  Delete "$INSTDIR\regimen-agent.exe.old"
  Delete "$INSTDIR\regimen-agent-setup.exe"
  Delete "$INSTDIR\TROUBLESHOOTING.md"
  Delete "$INSTDIR\LICENSE"
  Delete "$INSTDIR\recover.cmd"
  Delete "$INSTDIR\${UNINSTALLER}"
  RMDir "$INSTDIR"
  DeleteRegKey HKLM "${UNINST_KEY}"
SectionEnd
