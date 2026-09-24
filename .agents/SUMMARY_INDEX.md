# Summary Index: FocusGateway

Fast context for agents. Update when files or decisions change.

## Status (2026-09-24)
v1 implemented. 64 tests pass (`npm test`). Web app, extension (Chromium + Firefox builds) and lock agent verified end to end in Chromium (blocking, task unlock, open-tab redirect, failsafe cooldown, bridge approval, agent pairing + hosts sync + lock merge + recover).

## Map
| Path | What |
|---|---|
| packages/core/src/engine.js | computeBlocks, gatedStatus, focus phases (pure) |
| packages/core/src/schedule.js | weekly windows, midnight crossing, overlap |
| packages/core/src/backend.js | command dispatcher, all rule enforcement |
| packages/core/src/stats.js | streaks, accountability sections, 14-day series |
| extension/src/background.js | DNR rules, tab redirect, notifications, agent pairing/sync, bridge approval |
| extension/build.mjs | builds dist/chromium + dist/firefox + zips |
| agent/bin/focusgateway-agent.js | CLI: install, status, pair, recover, policies, uninstall, run |
| agent/src/{hosts,lock,daemon,policies,service}.js | hosts file, locked-rule merge, HTTP API, browser policies, OS services |
| apps/web/src/views | Landing, Onboarding, Dashboard, Tasks, Schedule, Blocking, Habits, Room, Stats, Settings, Install, Recover |
| apps/web/src/lib/lofi.js | generative Web Audio lofi + ambience |

## Open items
- Fill apps/web/src/config.js with the real repo and store URLs after publishing.
- Firefox build lints clean (web-ext, 0 errors) but has not been run in a real Firefox yet.
- Agent install paths for Windows and macOS are written but only exercised on Linux.
