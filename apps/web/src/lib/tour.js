// First-run coach marks and the help drawer.
//
// A tour is a list of steps, each pointing at an element by CSS selector (mostly
// [data-tour="..."] attributes in the views). components/help/TourHost.vue draws the dim
// overlay, the spotlight, the arrow and the card. Each page's tour shows by itself once, the
// first time the page is opened after setup, and never while a dialog is open. The "?" button
// on every page opens the help drawer (components/help/HelpDrawer.vue), which can replay it.
import { reactive } from 'vue'

const SEEN_KEY = 'focusgateway:tours-seen'

/** Route path to page id, shared by tours and help. */
export function pageFor(path) {
  return (
    {
      '/': 'room',
      '/room': 'room',
      '/today': 'today',
      '/tasks': 'tasks',
      '/schedule': 'schedule',
      '/blocking': 'blocking',
      '/habits': 'habits',
      '/stats': 'stats',
      '/settings': 'settings',
      '/install': 'install',
    }[path] || null
  )
}

// ---------------------------------------------------------------- the tours
const helpStep = {
  target: '[data-help-button]',
  title: 'Help is always here',
  text: 'Press ? any time to see what everything on this page does, or to replay this tour.',
}

export const TOURS = {
  room: [
    {
      target: '[data-window="focus"]',
      title: 'Focus timer',
      text: 'Start a focus session here. Pick a length, choose the sites to block, press Start focus. Sites stay blocked for the whole session, breaks included.',
    },
    {
      target: '[data-window="player"]',
      title: 'Music',
      text: 'Lofi radio made right in your browser. Play, skip, and mix in rain or cafe sounds. Space plays and pauses.',
    },
    {
      target: '[data-window="drawer"]',
      title: 'Planner',
      text: 'Your tasks, habits, blocks and progress without leaving the room. Keys T, H, B and S switch tabs.',
    },
    {
      target: '[data-window="status"]',
      title: 'Status',
      text: 'Your level and XP, your streak, what is blocked right now and the timer, always in view.',
    },
    {
      target: '[data-window="focus"] .rw-title',
      title: 'Windows move',
      text: 'Drag any window by its title bar, resize it from an edge or corner, and use its buttons to minimize or maximize it.',
      desktop: true,
    },
    {
      target: 'nav[aria-label="Room windows"]',
      title: 'The dock',
      text: 'Minimized windows wait here. Click one to bring it back. The reset button puts every window back in its place.',
    },
    {
      target: '[data-tour="room-decorate"], button[title^="Decorate"]',
      title: 'Decorate',
      text: 'Place furniture and badges in your room and dress up your avatar. New items unlock as you level up.',
    },
    {
      target: '[data-tour="room-scene"], button[title^="Scene and music"]',
      title: 'Scenes',
      text: 'Change the view outside the window and the style of music. Leveling up unlocks more.',
    },
    {
      target: 'nav[aria-label="Pages"]',
      title: 'Every page',
      text: 'Today, Tasks, Schedule, Blocking, Habits, Accountability and Settings are one click away.',
    },
    helpStep,
  ],
  today: [
    {
      target: '[data-tour="status"]',
      title: 'Your status',
      text: 'Level, XP and streak on the left. What is blocked right now, the focus timer and the music on the right. It sits on top of every page.',
    },
    {
      target: '[data-tour="today-blocks"]',
      title: 'What is blocked now',
      text: 'Every rule or focus session that is blocking right now, and what unlocks it. When nothing is blocked, it shows what comes next.',
    },
    {
      target: '[data-tour="today-tasks"]',
      title: "Today's tasks",
      text: 'Everything due today. Tick a task to finish it. Tasks attached to a blocking window unlock its sites when they are done.',
    },
    {
      target: '[data-tour="today-add"]',
      title: 'Add a task',
      text: 'Give it a deadline and, if you like, attach it to a task-gated window so the sites stay blocked until it is done.',
    },
    {
      target: '[data-tour="today-focus"]',
      title: 'Focus session',
      text: 'Block sites right now, no schedule needed. Pick a preset, choose the sites, press Start focus.',
    },
    {
      target: '[data-tour="today-habits"]',
      title: 'Habits',
      text: 'Tap a habit to mark it done for today. Streaks grow every day you keep it.',
    },
    {
      target: 'aside nav[aria-label="Main"], nav[aria-label="Quick"]',
      title: 'Pages',
      text: 'Move between the study room and every page from here.',
    },
    helpStep,
  ],
  tasks: [
    {
      target: '[data-tour="tasks-new"]',
      title: 'New task',
      text: 'Add a task with a deadline, priority, tag, subtasks, and optionally a blocking window.',
    },
    {
      target: '[data-tour="tasks-view"]',
      title: 'List or board',
      text: 'List groups tasks by when they are due. Board shows them as columns you can scan at a glance.',
    },
    {
      target: '[data-tour="tasks-filters"]',
      title: 'Filters',
      text: 'Search, and narrow by status, tag, priority or the window a task belongs to.',
    },
    {
      target: '[data-tour="tasks-list"]',
      title: 'Your tasks',
      text: 'Tick to finish, click to edit. Finishing every task of a task-gated window opens its sites.',
    },
    helpStep,
  ],
  schedule: [
    { target: '[data-tour="schedule-nav"]', title: 'Pick a week', text: 'Step back and forward a week, or jump back to this week.' },
    {
      target: '[data-tour="schedule-week"]',
      title: 'The week',
      text: 'Blocking windows and task deadlines, day by day. Drag a task to another day to move its deadline. Click a window to edit it.',
    },
    { target: '[data-tour="schedule-legend"]', title: 'Colours', text: 'Purple is a task-gated window, red is a hard block.' },
    helpStep,
  ],
  blocking: [
    {
      target: '[data-tour="blocking-new"]',
      title: 'New rule',
      text: 'Create a task-gated window or a hard block: pick the sites, the days and the times.',
    },
    {
      target: '[data-tour="blocking-gated"]',
      title: 'Task-gated windows',
      text: 'Blocked during the window until the tasks attached to it are done. Unfinished work keeps the sites blocked after it ends.',
    },
    {
      target: '[data-tour="blocking-hard"]',
      title: 'Hard blocks',
      text: 'Blocked for the whole window, no matter what. Good for sleep and exams. You can even switch off the Failsafe.',
    },
    {
      target: '[data-rule-why]',
      title: 'Blocking now or not?',
      text: 'Every rule says whether it is blocking right now, and if not, why: outside its hours, tasks done, or unlocked with Failsafe.',
    },
    { target: '[data-tour="blocking-focus"]', title: 'Focus mode', text: 'Block sites right now for a set time, no rule needed.' },
    helpStep,
  ],
  habits: [
    { target: '[data-tour="habits-new"]', title: 'New habit', text: 'Pick a name, an emoji, a colour and the days it is due.' },
    {
      target: '[data-tour="habits-list"]',
      title: 'Your habits',
      text: 'Tap the circle to mark today done. The row of days shows your recent streak.',
    },
    helpStep,
  ],
  stats: [
    {
      target: '[data-tour="stats-overview"]',
      title: 'Overview',
      text: 'Your level, streak, focus time this week and how many promises you kept. Click the level to see your badges.',
    },
    {
      target: '[data-tour="stats-tabs"]',
      title: 'Four views',
      text: 'Calendar shows every day, cleared or not. Badges, Numbers and History show the rest. Arrow keys switch tabs.',
    },
    helpStep,
  ],
  settings: [
    { target: '#look', title: 'Look', text: 'Game or Calm style, the theme, and a separate night theme for dark mode.' },
    {
      target: '[data-tour="settings-test"]',
      title: 'Test blocking',
      text: 'One click opens a test site with a one minute block and tells you if this browser really blocks.',
    },
    {
      target: '[data-tour="settings-pin"]',
      title: 'Your PIN',
      text: 'Protects your rules. You need it to edit a live rule, delete a rule or use Failsafe.',
    },
    {
      target: '[data-tour="settings-agent"]',
      title: 'Lock agent',
      text: 'An optional small program that applies your blocks to every browser and app on this computer.',
    },
    helpStep,
  ],
  decorate: [
    {
      target: '[data-room-tray] [role="tablist"]',
      title: 'Decorate',
      text: 'Items and badges go into the room. Avatar and Room change how you and the room look.',
    },
    {
      target: '[data-room-tray]',
      title: 'Place things',
      text: 'Drag an item into the room, or tap to place it. Drag it back here, or tap again, to put it away. Locked items open as you level up.',
    },
    {
      target: '[data-room-tray] button.ml-auto',
      title: 'Done',
      text: 'Saves your room and brings the windows back. D toggles decorate mode too.',
    },
  ],
}

// ---------------------------------------------------------------- seen list
function readSeen() {
  try {
    const v = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')
    return new Set(Array.isArray(v) ? v : [])
  } catch {
    return new Set()
  }
}
export function tourSeen(id) {
  const seen = readSeen()
  return seen.has(id) || seen.has('*')
}
export function markTourSeen(id) {
  const seen = readSeen()
  seen.add(id)
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
  } catch {}
}

// ---------------------------------------------------------------- running a tour
export const tour = reactive({ id: null, steps: [], index: 0 })
export const help = reactive({ open: false, page: null })

/** A step's element, if it is on screen now (hidden elements do not count). */
export function stepTarget(step) {
  for (const sel of step.target.split(/,\s*(?![^[]*\])/)) {
    let els
    try {
      els = [...document.querySelectorAll(sel)]
    } catch {
      continue
    }
    const el = els.find((e) => {
      const r = e.getBoundingClientRect()
      return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'
    })
    if (el) return el
  }
  return null
}

const phone = () => window.innerWidth < 640
function available(steps) {
  return steps.filter((s) => !(s.desktop && phone()) && stepTarget(s))
}

/** Something else is on top: a dialog, the help drawer, the blocking-off prompt. */
export function modalOpen() {
  return help.open || !!document.querySelector('[aria-modal="true"]:not([data-tour-card])')
}

export function startTour(id, { force = false } = {}) {
  const all = TOURS[id]
  if (!all) return false
  if (!force && tourSeen(id)) return false
  const steps = available(all)
  if (!steps.length) return false
  help.open = false
  Object.assign(tour, { id, steps, index: 0 })
  return true
}

/**
 * Shows a page's tour the first time, once the page has drawn and nothing else is open.
 * Waits (up to ~20 s) for a dialog to close instead of showing on top of it.
 */
export async function autoTour(id, { delay = 700 } = {}) {
  if (!TOURS[id] || tourSeen(id) || tour.id) return
  await new Promise((r) => setTimeout(r, delay))
  for (let i = 0; i < 40 && modalOpen(); i++) await new Promise((r) => setTimeout(r, 500))
  if (modalOpen() || tour.id || tourSeen(id)) return
  startTour(id)
}

export function nextStep() {
  if (!tour.id) return
  // a target may have gone away since the tour started (window closed, tab switched)
  let i = tour.index + 1
  while (i < tour.steps.length && !stepTarget(tour.steps[i])) i++
  if (i >= tour.steps.length) return endTour()
  tour.index = i
}
export function prevStep() {
  if (!tour.id) return
  let i = tour.index - 1
  while (i >= 0 && !stepTarget(tour.steps[i])) i--
  if (i >= 0) tour.index = i
}
/** Finish or skip: either way it will not show by itself again. */
export function endTour() {
  if (tour.id) markTourSeen(tour.id)
  Object.assign(tour, { id: null, steps: [], index: 0 })
}

export function openHelp(page) {
  if (tour.id) endTour()
  Object.assign(help, { open: true, page })
}
export function closeHelp() {
  help.open = false
}
