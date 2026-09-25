// What the "?" help drawer says on each page. Short and friendly: what the page is for,
// what each part means, how to use it, tips and keys. Keep in step with docs/USER-GUIDE.md.
// Style: no em dashes, few semicolons.

const blockingBasics = {
  h: 'How blocking works',
  items: [
    'Blocking needs the free FocusGateway browser extension. Without it the app still works, but nothing is blocked. A red "Blocking is off" sign tells you when that is the case.',
    "Blocked sites open FocusGateway's own page instead, with what unlocks them.",
    'The optional lock agent applies the same blocks to every browser and app on your computer.',
  ],
}

// Every reason blocking can be off, in the order people run into them
const blockingOff = {
  h: 'Why is nothing blocked?',
  items: [
    'No extension in this browser: the app runs on its own. Tasks, habits, the timer and the room work, but sites still open. Add the extension from the Install page.',
    'Extension installed, site not approved: click the puzzle piece in the toolbar, then FocusGateway, then Allow. Then press Check again.',
    'Firefox without website access: click the FocusGateway icon and press Grant access, or use the Fix it button here.',
    'Older extension: blocking still works, but update it from the Install page to use the latest features.',
    "Private or incognito window: extensions are off there until you allow FocusGateway in your browser's extension settings.",
    'Phones: browser extensions run on computers. Firefox for Android runs some extensions, but FocusGateway does not support it yet.',
    'Click the red "Blocking is off" chip for a checklist with a fix for each step, or open the Blocking page.',
  ],
}

export const HELP = {
  room: {
    title: 'The study room',
    intro: 'Your home base: a cozy room with a focus timer, lofi music and your planner, all in windows you can arrange.',
    sections: [
      {
        h: 'Windows',
        items: [
          'Focus: the clock and the focus timer. Start a session and the sites you picked stay blocked until it ends, breaks included.',
          'Music: lofi radio made in your browser. Play, skip, pick a track, and mix in rain, cafe, fire or noise.',
          'Planner: your tasks, habits, active blocks and progress in tabs.',
          'Status: level, XP, streak, what is blocked and the timer.',
          'Scratchpad: quick notes that stay on this device.',
          'Scene and music: the view outside the window and the music style.',
        ],
      },
      {
        h: 'Arrange them',
        items: [
          'Drag a window by its title bar. Windows snap to edges and to each other.',
          'Resize from any edge or corner.',
          'Minimize sends a window to the dock at the bottom. Click it there to bring it back.',
          'Maximize fills the room. Esc puts it back.',
          'The reset button in the dock restores the default layout. Your layout is saved per screen size.',
          'On phones the windows stack in a column under the room. They can still go to the dock or open full screen.',
        ],
      },
      {
        h: 'Music tracks',
        items: [
          'Each music style has a few named tracks. The radio moves on to the next one by itself.',
          'New styles unlock as you level up. Locked ones show the level they need.',
          'Ambience sliders (rain, cafe, fire, noise) mix in with the music, or play alone with music off.',
        ],
      },
      {
        h: 'Decorate and scenes',
        items: [
          'Decorate lets you place furniture, plants and badges in the room: drag them in, or tap to place. Tap again to put them away.',
          'The Avatar and Room tabs change how you and the room look.',
          'Scenes change the view outside: night, rain, sunset and more. Many unlock with levels.',
        ],
      },
      {
        h: 'XP and levels',
        items: [
          'You earn XP for finishing tasks, habits and focus sessions, and for keeping blocks you set.',
          'XP fills your level bar. Each level unlocks something new for the room: a scene, a music style or decor.',
          'Some rewards are badges you earn once, for example a streak or a number of focus hours. They can go in the room too.',
        ],
      },
      blockingOff,
    ],
    tips: [
      'Trying the room before setup? It is a trial room: the timer and music work, and site blocking is off until you add the extension.',
      'The palette button in the header changes the theme any time.',
      'Hide the panels (Z) to enjoy the room with just a small timer and the play button.',
      'Leaving the room during a session asks first. Your sites stay blocked either way.',
    ],
    keys: [
      ['Space', 'Play or pause the music'],
      ['F', 'Full screen'],
      ['C', 'Scene and music window'],
      ['D', 'Decorate'],
      ['N', 'Scratchpad'],
      ['Z', 'Hide or show the panels'],
      ['T H B S', 'Planner tabs: tasks, habits, blocks, progress'],
      ['Esc', 'Restore a maximized window, close decorate'],
    ],
    tour: 'room',
    tours: [['decorate', 'Replay the decorate tour']],
  },
  today: {
    title: 'Today',
    intro: 'One screen for the day: what is blocked, what is due, your focus timer and your habits.',
    sections: [
      {
        h: 'What you see',
        items: [
          'The status strip on top: level and XP, your day streak, what is blocked right now, the timer and the music.',
          'Blocking now: every rule or session that is blocking, and what unlocks it. When nothing is, it shows what comes next.',
          'Failsafe (next to a block): an honest emergency exit. It asks for your PIN, a short wait and a typed reason, and it is logged.',
          "Today's tasks: everything due today. Tick to finish, click to edit.",
          'Focus session: block sites right now for a set time.',
          'Habits today: tap to mark one done.',
        ],
      },
      blockingBasics,
      blockingOff,
    ],
    tips: ['Your streak grows every day you finish every task that was due.', 'Add the one task that would make today a win.'],
    tour: 'today',
  },
  tasks: {
    title: 'Tasks',
    intro: 'Everything you need to get done, with deadlines, priorities, tags and subtasks.',
    sections: [
      {
        h: 'How to use it',
        items: [
          'New task: give it a title and a deadline. Priority, tag, notes, subtasks and repeat are optional.',
          'Attach a task to a task-gated window and its sites stay blocked until the task is done.',
          'List groups tasks by when they are due. Board shows them in columns.',
          'Search and filters narrow the list by status, tag, priority or window.',
        ],
      },
      {
        h: 'Changing a task',
        items: [
          'Tick the circle to finish.',
          'Moving a deadline later ("forwarding") is limited: once for high priority, three times for medium, five for low. So a window can not be dodged forever.',
          'Making a task easier while its blocking window is live (a later deadline, a lower priority, taking it out of the window) needs your PIN.',
        ],
      },
    ],
    tips: ['Break big tasks into subtasks. Each one ticked is a small win.'],
    tour: 'tasks',
  },
  schedule: {
    title: 'Schedule',
    intro: 'Your week at a glance: blocking windows and task deadlines, day by day.',
    sections: [
      {
        h: 'What you see',
        items: [
          'Purple blocks are task-gated windows. Red blocks are hard blocks.',
          'Cards under them are tasks, placed on the day they are due.',
          'Today is outlined.',
        ],
      },
      {
        h: 'How to use it',
        items: [
          'Drag a task to another day to move its deadline there, same time of day.',
          'Click a window to edit its days, times or sites.',
          'Use the arrows to see other weeks.',
        ],
      },
    ],
    tour: 'schedule',
  },
  blocking: {
    title: 'Blocking',
    intro: 'Every rule that keeps you off distracting sites. A site is blocked if any rule or session says so.',
    sections: [
      {
        h: 'Kinds of blocks',
        items: [
          'Task-gated window: blocked during the window until the tasks attached to it are done. If the window ends with tasks open, it keeps blocking until you finish them.',
          'Hard block: blocked for the whole window, no matter what. Good for sleep, classes and exams.',
          'No-failsafe hard block: fully locked while it runs. Not even Failsafe opens it.',
          'Focus session: block sites right now for a set time, no rule needed.',
        ],
      },
      {
        h: 'Is it blocking right now?',
        items: [
          'Each rule shows a status and a sentence saying why.',
          'Not running: outside its days or hours. It says when the next window starts.',
          'Unlocked, tasks done: you finished everything for this window. Enjoy.',
          'Unlocked with Failsafe: someone used the emergency exit.',
          'Sites picked include their subdomains, so youtube.com also covers m.youtube.com and www.youtube.com.',
        ],
      },
      {
        h: 'Changing rules',
        items: [
          'Editing or deleting a rule while it is live needs your PIN. Deleting always does.',
          'A hard block can not overlap a task-gated window on the same site.',
          'Without the extension you can still save rules. They start blocking once the extension is added.',
        ],
      },
      {
        h: 'Blocking status',
        items: [
          'The checklist on top shows each thing blocking needs: the extension, this site approved, website access, and the optional lock agent.',
          'A green check is done. A red cross has a one-click fix next to it. Grey means optional or waiting on an earlier step.',
          'Blocks running right now lists every active block and why it is on.',
        ],
      },
      blockingOff,
      blockingBasics,
    ],
    tips: ['Not sure blocking works? Test blocking checks it in one click.'],
    tour: 'blocking',
  },
  habits: {
    title: 'Habits',
    intro: 'Small things, every day. Tick them off and watch the streak grow.',
    sections: [
      {
        h: 'How to use it',
        items: [
          'New habit: a name, an emoji, a colour and the days it is due.',
          'Tap the circle to mark today done. Tap again to undo.',
          'The streak counts the due days in a row you kept it. Days it is not due do not break it.',
          'Click a habit to edit or delete it.',
        ],
      },
    ],
    tips: ['Start with one or two. A habit you keep beats five you skip.'],
    tour: 'habits',
  },
  stats: {
    title: 'Accountability',
    intro: 'An honest mirror: what you promised yourself and what happened. No guilt, just the facts.',
    sections: [
      {
        h: 'What you see',
        items: [
          'Overview: level, streak, focus time this week against your weekly goal, and promises kept.',
          'Calendar: every day, cleared or not. A cleared day finished everything that was due.',
          'Badges: rewards you earned, and the ones still waiting.',
          'Numbers: charts of focus minutes, tasks and habits.',
          'History: every event, including Failsafe uses and early stops, with the reason you typed.',
        ],
      },
      {
        h: 'XP and levels',
        items: [
          'Tasks, habits, focus sessions and kept blocks earn XP. Each window or session pays once, so it can not be farmed.',
          'Levels unlock scenes, music and decor in the study room.',
        ],
      },
    ],
    tour: 'stats',
  },
  settings: {
    title: 'Settings',
    intro: 'Make FocusGateway yours and keep it safe.',
    sections: [
      {
        h: 'What is here',
        items: [
          'Style and theme: Game (XP pops and sounds) or Calm, the theme, and a night theme for dark mode. The palette button changes it from any page.',
          'Weekly focus goal, notifications and the Failsafe wait time.',
          'Blocking status: a checklist of what blocking needs here, with a fix for each step, and Test blocking, which opens a test site with a one minute block.',
          'PIN: protects your rules. Forgot it? Use your recovery code.',
          'Lock agent: blocks in every browser and app on this computer.',
          'Connected websites: sites allowed to talk to the extension.',
          'Backup: export and import your data as a file.',
        ],
      },
    ],
    tips: ['Your data stays on this device. Nothing is sent anywhere.'],
    tour: 'settings',
  },
  install: {
    title: 'Install',
    intro: 'Two free pieces. The browser extension is what blocks sites. The lock agent makes the blocks apply everywhere.',
    sections: [
      {
        h: 'Browser extension',
        items: [
          'Until the store listings are live, you load it by hand: download, unzip, open the extensions page, turn on Developer mode and choose Load unpacked.',
          'Using the website? Click the FocusGateway icon (under the puzzle piece) and press Allow for this site. Until you do, nothing is blocked.',
          'Firefox: allow access to all websites when asked, or blocking stays off.',
          "Private windows: allow FocusGateway there in your browser's extension settings.",
          'Phones: extensions run on computers, so blocking does too. Firefox for Android runs some extensions, but FocusGateway does not support it yet.',
        ],
      },
      blockingOff,
      {
        h: 'Check it',
        items: ['Test blocking opens a test site with a one minute block and tells you if it was blocked.'],
      },
    ],
  },
}
