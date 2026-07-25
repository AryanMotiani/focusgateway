# Backend Service Architecture
Label: wayfinder:task
Blocked by: DB Schema & Migrations

## Question
Produce the module breakdown for the single Node background service: hosts-file read/write module (atomic writes), scheduler/window-transition module, watchdog/dual-restart module, crash-loop detector, health-check endpoint, Express app structure (routes/middleware layout), PIN/JWT auth middleware, Failsafe flow state machine, tray icon (node-systray) + notifications (node-notifier) integration points. Function-level signatures where feasible.
