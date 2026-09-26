# Regimen user guide

Regimen blocks distracting websites until your work is done. It has tasks, habits, a weekly schedule and a cozy lofi study room, and it is free and open source. Your data stays on your computer.

Every page has a **?** button in its top right corner. It explains that page and can take you through a short tour of it.

## Contents

1. [Getting started](#getting-started)
2. [How blocking works](#how-blocking-works)
3. [Task-gated windows](#task-gated-windows)
4. [Hard blocks](#hard-blocks)
5. [Focus sessions](#focus-sessions)
6. [Failsafe](#failsafe)
7. [Tasks and the schedule](#tasks-and-the-schedule)
8. [Habits](#habits)
9. [Accountability](#accountability)
10. [XP, levels and badges](#xp-levels-and-badges)
11. [The study room](#the-study-room)
12. [Decorate](#decorate)
13. [Themes and style](#themes-and-style)
14. [Privacy](#privacy)
15. [Troubleshooting](#troubleshooting)
16. [FAQ](#faq)

## Getting started

1. Open the [Install page](https://aryanmotiani.github.io/regimen/#/install) on a computer. It detects your browser.
2. Install the **browser extension**. Until the store listings are live you add it by hand:
   - Chrome, Edge, Brave, Opera: download the zip, unzip it into a folder you keep, open `chrome://extensions` (or `edge://`, `brave://`, `opera://`), turn on **Developer mode**, click **Load unpacked** and pick the folder.
   - Firefox: download the zip, unzip it, open `about:debugging`, This Firefox, **Load Temporary Add-on**, and pick `manifest.json`. Allow access to all websites when asked. A temporary add-on is removed when Firefox restarts.
3. The extension opens Regimen by itself. If you were already using the website, it reloads that tab and carries on from there, no extra step. Pin Regimen (the **puzzle piece** in the toolbar) so its icon stays visible.
4. Follow the setup: pick a style, create a PIN, save your recovery code, and try the Failsafe once. It takes about three minutes.
5. Go to **Settings** and press **Test blocking**. When it says "Blocking works in this browser", you are ready.

Optional: install the **lock agent** from the Install page so your blocks apply to every browser and app on the computer.

The first time you open the app, a short intro shows what is always on screen, and points at the **?** button. After that nothing pops up by itself: explore anything, and press **?** whenever something is unclear. Each page's tour is in its **?** drawer.

## How blocking works

- The **extension** does the blocking. It turns the sites you picked into network rules, so a blocked site opens Regimen's own page instead, showing what unlocks it. Tabs that are already open on a blocked site are switched over too.
- Picking a site includes its subdomains. YouTube covers `www.youtube.com`, `m.youtube.com` and `youtu.be`. Reddit covers `old.reddit.com` and `redd.it`.
- Without the extension, the app still runs in your browser (tasks, habits, the timer and the room), but **nothing is blocked**. A red **Blocking is off** sign shows up in the status strip and the focus card. Click it to see why and how to fix it.
- The **lock agent** is a small program for Windows, macOS and Linux. It writes your blocked sites into the system hosts file, so every browser and app is covered, and it switches off the usual escape routes: Secure DNS, private windows and new browser profiles.
- A site is blocked if any rule or session says so. Blocks stack.

## Task-gated windows

A time window where sites stay blocked **until the tasks attached to it are done**.

- Pick the sites, the days and the hours (for example weekdays 4 to 7 pm).
- Attach tasks when you create it, or later from Tasks. Finish every task and the sites open for the rest of the window.
- A window with no tasks stays blocked the whole time. No empty-window loophole.
- If the window ends while tasks are still open, the block keeps going until you finish them.
- The Blocking page tells you for each window whether it is blocking right now, and if not, why: outside its hours, tasks done, or unlocked with Failsafe.

## Hard blocks

Blocked for the whole window, no matter what. Good for sleep, classes and exams.

- A hard block can not overlap a task-gated window on the same site.
- You can switch off the Failsafe for a hard block. Then it is fully locked while it runs, and the app will refuse to delete or weaken it until it ends.

## Focus sessions

Block sites right now, without a schedule.

- Pick a preset (Pomodoro 25/5, Deep work 50/10, Sprint 15/3) or set your own lengths and rounds.
- Press **Blocking N sites, change** to choose the sites, including any custom website.
- Press **Start focus**. The sites stay blocked through the breaks, until the last round ends.
- Stopping early asks you to type a sentence and a reason, and it is logged.
- Start one from the study room, Today or Blocking. While it runs, leaving the study room asks "Stay focused?" first, and closing the tab asks too. Your sites stay blocked either way.

## Failsafe

The honest emergency exit for a block that is not locked.

1. An "Are you sure?" screen.
2. Your PIN.
3. A wait you chose in Settings (30 seconds to 5 minutes).
4. A typed reason, with pasting turned off.

It unlocks only the current window, and it shows in your history.

## Tasks and the schedule

- Every task has a deadline. Add a priority, a tag, notes, subtasks and a repeat if you like.
- Subtasks can not be due later or be lower priority than their parent.
- List view groups tasks by when they are due. Board view shows columns you can drag between.
- The **Schedule** shows your week: purple task-gated windows, red hard blocks and task cards on their due day. Drag a task to another day to move its deadline.
- Moving a deadline later is limited for tasks in a blocking window: once for high priority, three times for medium, five for low.
- Going easy on yourself (deleting a task, a later deadline, a lower priority) asks for a typed sentence. While a window is live it also needs your PIN.

## Habits

Small things, every day.

- Create a habit with a name, an emoji, a colour and the days it is due.
- Tap its circle to mark today done. Tap again to undo.
- The streak counts due days in a row. Days it is not due do not break it.

## Accountability

An honest mirror of what you promised yourself.

- **Overview**: level, streak, focus time against your weekly goal, promises kept.
- **Calendar**: every day, cleared or not.
- **Badges**: what you earned and what is left.
- **Numbers**: charts of focus minutes, tasks and habits.
- **History**: every event, including Failsafe uses and early stops, with your typed reasons.

## XP, levels and badges

- You earn XP for finishing tasks, habits and focus sessions, and for keeping the blocks you set.
- Each window or session pays once, and there are daily caps, so XP can not be farmed.
- XP fills your level bar. New levels unlock scenes, music styles and decor for the study room.
- Badges are one-time rewards, for example a long streak or many focus hours. You can place them in the room.

## The study room

Home base: an illustrated room that starts clean. Every window waits in the **dock** at the bottom, so you see the whole room. Open only what you need.

Always on screen:

- The **blocking pill** at the top: green **Blocking on** with what is active (for example "extension connected" or "2 rules active"), or red **Blocking off** with what to do ("add the extension", "approve this site"). Click it for the full checklist.
- The **?** help button and the palette button for the theme.
- The **eye**: clears everything so you can just enjoy the room, with a small timer and play button left. Press it again, or Z, to bring things back.
- The **dock** with every window.

In the dock (each shows a short tip the first time you open it):

- **Focus**: the clock and the focus timer.
- **Music**: lofi radio made live in your browser, so it keeps playing when YouTube is blocked. Play, skip, pick a named track, and mix in rain, cafe, fire or noise.
- **Planner**: tasks, habits, blocks and progress in tabs.
- **Status**: level, XP, streak, what is blocked and the timer.
- **Scratchpad**: quick notes that stay on this device.
- **Scene and music**: the view outside and the music style.

Arranging windows:

- Drag a window by its title bar. Resize it from any edge or corner.
- Click a window in the dock to open it. Minimize sends it back.
- **Reset layout** (the last button in the dock) clears the room again: every window goes back to the dock.
- Your layout is saved per screen size.
- Maximize fills the room. Esc restores it.
- On phones the room fills the screen until you open something. Open windows stack under the room.

Keys: Space play or pause, F full screen, C scene, D decorate, N scratchpad, Z hide the panels, T H B S planner tabs, Esc restore.

## Decorate

Press **Decorate** (or D) in the room.

- **Items** and **Badges**: drag one into the room, or tap it to place it. Drag it back, or tap again, to put it away.
- **Avatar**: your character's look.
- **Room**: walls, floor, curtains, wood and lighting.
- Locked items show what they need. Press **Done** to go back to the windows.

## Themes and style

- **Game** style has XP pops, levels and sounds. **Calm** keeps the same features, quiet and minimal.
- Each style has several themes with their own colours and typefaces. Pick one in Settings, and optionally a separate night theme for when your device is in dark mode.

## Privacy

- There is no account and no server. Data lives in the extension's storage, or in your browser when you use the website without the extension.
- Nothing is sent anywhere. The lock agent only talks to the extension on your own computer.
- Export and import a backup file from Settings.

## Troubleshooting

**Sites are not blocked.** Press **Test blocking** in Settings first. Then see [TROUBLESHOOTING-blocking.md](TROUBLESHOOTING-blocking.md). The usual causes:

- The website tab was open before you installed the extension: reload it.
- No extension in this browser: install it from the Install page.
- Firefox without access to websites: click the Regimen icon (red **!**) and press **Grant access**.
- A private or incognito window: allow Regimen there in the browser's extension settings.
- The rule is outside its hours, or its tasks are done: the Blocking page says so under each rule.

**I forgot my PIN.** Settings, Forgot PIN, and use your recovery code.

**The lock agent is stuck.** See [TROUBLESHOOTING.md](../TROUBLESHOOTING.md) and [INSTALL-AGENT.md](INSTALL-AGENT.md).

## FAQ

**Does it work on my phone?** The app, tasks, habits and the room work on phones. Blocking works on computers.

**Does it work in Safari?** The extension does not. The lock agent blocks in Safari and every other app.

**Can I just switch the extension off?** Yes, on your own computer you can. With the lock agent the blocks stay in place at system level. Regimen makes giving in slow, deliberate and visible.

**Why does the extension open the website?** The website always has the newest version of the app. The extension talks only to the official Regimen website, no other site. No internet? It opens the copy inside the extension instead, and you can pick that copy for good with **Use the offline copy** in the toolbar popup. What you have seen (the room intro, tips) is remembered in both.

**Why does a copy on my own computer need Allow?** Only the official website is trusted by itself. A copy you run on `localhost` asks once in the toolbar popup.

**Where is my data?** In the extension, on your computer. Export a backup from Settings any time.

**How do I see a tour?** Press **?** on the page and choose **Take the tour** (or **Replay the room intro** in the study room).
