# Security policy

FocusGateway runs with broad browser permissions, and the optional lock agent runs as administrator. We take reports seriously.

## What counts as a security issue here

Besides the usual (code execution, data leaks, privilege escalation through the agent), we treat **ways to get around a block through FocusGateway itself** as security issues. Examples:

- unlocking a Task-Gated window without finishing its tasks or using Failsafe
- skipping the Failsafe PIN, wait or typed reason
- editing or deleting a running no-failsafe rule
- a website (other than one you approved) reading or changing your FocusGateway data
- talking to the lock agent without the pairing secret

Things that need administrator rights on your own computer (editing the hosts file by hand, uninstalling the agent after a block ends, changing the system clock) are known limits, listed in the README. Reports that make these easier than they should be are still welcome.

## How to report

Please **do not open a public issue**. Use GitHub's private reporting: go to the repository's **Security** tab and click **Report a vulnerability** (https://github.com/AryanMotiani/focusgateway/security/advisories/new).

Include the version, browser or OS, and steps to reproduce. We aim to reply within 7 days and to ship a fix for confirmed issues as fast as we can. We are happy to credit you in the release notes.

## Supported versions

Only the latest release gets security fixes.
