import { computeBlocks, hostMatches } from '@focusgateway/core'

const ext = globalThis.browser ?? globalThis.chrome
const QUOTES = [
  'Future you is watching. Make them proud.',
  'You can check it later. You can never get this hour back.',
  'Discipline is choosing what you want most over what you want now.',
  'Small steps, every day.',
  'The feed will still be there. Your focus might not.',
  'Done is better than perfect. Go get it done.',
]

const params = new URLSearchParams(location.search)
const domain = params.get('d') || ''
document.getElementById('domain').textContent = domain
document.getElementById('quote').textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)]

const fmt = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const el = (tag, props = {}, ...kids) => {
  const e = Object.assign(document.createElement(tag), props)
  e.append(...kids)
  return e
}

async function render() {
  const res = await ext.runtime.sendMessage({ type: 'fg', cmd: 'state.get' })
  if (!res?.ok) return
  const state = res.state
  const { blocks } = computeBlocks(state, Date.now())
  const mine = blocks.filter((b) => b.domains.some((d) => hostMatches(domain, d) || d === domain))
  const box = document.getElementById('reasons')
  box.replaceChildren()
  if (!mine.length) {
    document.getElementById('title').textContent = 'You are free to go.'
    box.append(el('p', { className: 'muted', textContent: 'This block has ended. Reload the page to continue.' }))
    const reload = el('a', { className: 'btn primary', href: 'https://' + domain, textContent: 'Continue to ' + domain })
    box.append(reload)
    return
  }
  const failsafe = document.getElementById('failsafe')
  for (const b of mine) {
    const card = el('div', { className: 'card' })
    const label = b.kind === 'hard' ? 'Hard block' : b.kind === 'gated' ? 'Task-gated window' : 'Focus session'
    const head = el(
      'div',
      { className: 'row' },
      el('strong', { textContent: b.name }),
      el('span', { className: 'pill' + (b.locked ? ' lock' : ''), textContent: b.locked ? label + ' · no failsafe' : label }),
    )
    card.append(head)
    if (b.kind === 'gated') {
      const pending = state.tasks.filter((t) => b.pendingTaskIds.includes(t.id))
      card.append(
        el('p', {
          className: 'muted',
          textContent: b.extended
            ? 'The window ended but these are still open. Finish them to unlock:'
            : pending.length
              ? 'Finish these to unlock the rest of the window:'
              : 'No tasks are attached to this window, so it stays blocked. Add a task and finish it.',
        }),
      )
      if (pending.length) card.append(el('ul', {}, ...pending.map((t) => el('li', { textContent: t.title }))))
    } else {
      card.append(el('p', { className: 'muted', textContent: `Opens again at ${fmt(b.until)}.` }))
    }
    box.append(card)
    if (!b.locked && b.kind !== 'focus' && b.ruleId) {
      failsafe.hidden = false
      failsafe.href = `app/index.html#/today?failsafe=${encodeURIComponent(b.ruleId)}`
    }
  }
}

render()
setInterval(render, 20_000)
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && render())
