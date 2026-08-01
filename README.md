# FocusGateway 🎯🛡️

> **Self-discipline site-blocker with task-gated access, scheduled block windows, and accountability tracking.**

FocusGateway is an open-source productivity ecosystem designed to eliminate digital distractions during work hours. It combines a low-level DNS/hosts-file blocker with a modern web dashboard for task-gated site access, strict Failsafe controls, and procrastination metrics.

---

## 🌟 Solution Architecture

FocusGateway consists of two primary components:

1. **Core Service & Dashboard**:
   - **Node.js Background Service**: Enforces system-wide site blocking at the `hosts` file level (survives system reboots).
   - **Vue 3 Dashboard**: Modern Tailwind-styled web UI for managing tasks, Scheduled Block Windows (SBW), Hard Blocks, Focus Mode, and accountability history.
   - **Embedded SQLite Database**: Stored in standard AppData (`%APPDATA%\FocusGateway\focusgateway.db`), zero configuration required.

2. **Landing & Marketing Server**:
   - Express server serving feature manifests, waitlist signup APIs, and visitor globe geolocation analytics.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend Service** | Node.js, Express, TypeScript |
| **App Database** | Embedded SQLite (`sqlite3`) |
| **Authentication** | JWT (auto-generated secret) & bcrypt PIN hash |
| **Blocker Engine** | System `hosts` file modification (atomic temp-rename) |
| **Frontend Dashboard** | Vue 3, Vite, Tailwind CSS, Pinia, Lucide Icons |
| **Landing Server** | Express, JSON Data Providers |
| **Installer/Autostart** | Cross-platform configuration (Task Scheduler / launchd / systemd) |
| **Testing** | Jest + ts-jest (7 test suites, 29 unit tests) |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Administrator / Root Privileges**: Required when testing live `hosts`-file blocking.

### Installation

```bash
# 1. Clone repository
git clone https://github.com/AryanMotiani/focusgateway.git
cd focusgateway

# 2. Install root dependencies
npm install

# 3. Install dashboard dependencies
cd dashboard
npm install
cd ..
### Windows 1-Click Batch Helpers
For Windows users, pre-configured `.bat` scripts are available:
- **[`start-all.bat`](file:///c:/Users/Aryan/Desktop/FSD/focusgateway/start-all.bat)**: Launches Backend Service (`:3000`), Vue Dashboard (`:5173`), and Landing Server (`:3001`) simultaneously in separate windows.
- **[`setup-and-migrate.bat`](file:///c:/Users/Aryan/Desktop/FSD/focusgateway/setup-and-migrate.bat)**: Installs all dependencies and runs SQLite DB migrations.
- **[`run-tests.bat`](file:///c:/Users/Aryan/Desktop/FSD/focusgateway/run-tests.bat)**: Executes all 7 test suites with a single double-click.

---


## 💻 How to View & Test Every Component

### 1. Landing Page Server
The landing server provides public waitlist APIs, feature manifests, and globe analytics data.

**Start the Landing Server:**
```bash
npx ts-node -e "import { createLandingApp } from './landing/server'; createLandingApp().listen(3001, () => console.log('⚡ Landing server running at http://localhost:3001'));"
```

**Test Landing Endpoints:**
- **Feature Manifest**: `GET http://localhost:3001/api/features`
- **Waitlist Signup**: `POST http://localhost:3001/api/waitlist` (Payload: `{"email": "user@example.com", "name": "Alex"}`)
- **Globe Geolocation**: `GET http://localhost:3001/api/globe-data`

---

### 2. Backend Service (Site Blocker & API)
The backend service powers task-gated blocking, PIN auth, rules, and focus sessions.

**Initialize DB & Start Service:**
```bash
# Run database migrations
npm run migrate

# Start backend service (Runs on http://localhost:3000)
npm run dev
```

**Service Health check**: `GET http://localhost:3000/api/health`

---

### 3. Task Dashboard (App UI)
The Vue 3 dashboard allows you to create tasks, set site-block rules, test Failsafe unlocks, and track procrastination scores.

**Start Dashboard:**
```bash
cd dashboard
npm run dev
```
Open your browser at **`http://localhost:5173`** (or the URL output by Vite).

---

### 4. Running the Test Suite
Validate the entire application state with all 7 automated unit and API test suites:

```bash
npm test
```

Test coverage includes:
- `api.test.ts` — Auth, Rules, and Task endpoints
- `db.test.ts` — SQLite migrations and triggers
- `frontend.test.ts` — Vue components, directives, and modals
- `installer.test.ts` — OS autostart and recovery logic
- `landing.test.ts` — Waitlist, features, and globe endpoints
- `service.test.ts` — Hosts file blocking & Watchdog process
- `sites.test.ts` — Domain bundle management

---

## 🆘 Emergency Help & Recovery Script

If site blocking is active and you need to restore your system `hosts` file:

```bash
# Run standalone recovery cleaner
npx ts-node -e "import { cleanHostsContent, getHostsPath } from './src/recovery/recover'; console.log('Cleaned hosts file path:', getHostsPath());"
```

---

## 📄 License

This project is licensed under the MIT License.
