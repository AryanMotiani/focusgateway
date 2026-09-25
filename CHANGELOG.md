# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.1.0] - 2026-09-25

First public release: the study room home, Game and Calm styles, visual accountability, and the single-file lock agent with installers.

### Changed

- The lock agent is now one small Go program (about 7 MB) instead of a Node.js script. Nothing else to install. Same commands, same protocol, and an existing pairing and data folder carry over.
- The Install page shows one button per step: the right store for your browser (Firefox and Edge, Chrome later) and the right lock agent download for your computer, with the manual steps only where no store listing exists yet.

### Added

- One-click pairing: after installing, the lock agent opens FocusGateway in your browser with a one-time link (expires after 30 minutes or first use, never sent to a server) and the page connects the agent by itself. Typing the code still works.
- Double-clicking the agent does the natural thing: installs it (asking for admin rights), or opens a fresh pairing link, or shows its status.
- Installers for the lock agent: Windows setup (`FocusGateway-Setup.exe`, with an Apps & Features entry), macOS package (`FocusGateway.pkg`, Apple silicon and Intel), Linux `.deb` and `.rpm`, and a one-line `install.sh`. Templates for winget, Homebrew and AUR.
- Privacy policy page (`privacy.html`), store listing texts, checklists and screenshots for Firefox Add-ons, Edge Add-ons and the Chrome Web Store.
- Release pipeline publishes to Edge Add-ons when its API secrets are set, and attaches the source code for Firefox Add-ons review.
- Guide for the "unknown publisher" warnings of the unsigned installers (`docs/INSTALL-AGENT.md`).

### Security

- The lock agent now also refuses requests whose Host header is not loopback, so a web page can't reach it through DNS rebinding.

### Fixed

- Setting up on the website and then installing the extension no longer runs the tutorial a second time. The extension takes over the website's setup (PIN, recovery code, rules, tasks, habits) once you approve the site.
- The lock agent's crash-loop protection no longer crashes itself when it triggers, and it only counts real crashes (not normal restarts).

### Added

- Open source setup: contributing guide, code of conduct, security policy, issue and pull request templates, CI on Windows, macOS and Linux, end-to-end tests, CodeQL, Dependabot and a tag-based release pipeline with optional store publishing.

## [1.0.0] - 2026-09-24

First release: web app, browser extension (Chromium and Firefox) and lock agent.
