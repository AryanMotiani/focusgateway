# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- Setting up on the website and then installing the extension no longer runs the tutorial a second time. The extension takes over the website's setup (PIN, recovery code, rules, tasks, habits) once you approve the site.
- The lock agent's crash-loop protection no longer crashes itself when it triggers, and it only counts real crashes (not normal restarts).

### Added

- Open source setup: contributing guide, code of conduct, security policy, issue and pull request templates, CI on Windows, macOS and Linux, end-to-end tests, CodeQL, Dependabot and a tag-based release pipeline with optional store publishing.

## [1.0.0] - 2026-09-24

First release: web app, browser extension (Chromium and Firefox) and lock agent.
