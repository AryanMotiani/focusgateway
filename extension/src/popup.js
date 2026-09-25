import { computeBlocks } from '@focusgateway/core'

const ext = globalThis.browser ?? globalThis.chrome
const fmt = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

async function render() {
  const [res, perms] = await Promise.all([
    ext.runtime.sendMessage({ type: 'fg', cmd: 'state.get' }),
    ext.runtime.sendMessage({ type: 'fg-meta', action: 'permissions' }),
  ])
  const warn = document.getElementById('warn')
  if (perms?.ok && !perms.data.hostAccess) {
    warn.hidden = false
    warn.classList.add('bad')
    warn.innerHTML =
      '<b>Blocking is off.</b> Your browser has not given FocusGateway access to websites, so blocked sites still load. <button class="btn primary" id="grant" style="margin-top:6px;padding:6px 10px">Grant access</button>'
    document.getElementById('grant').onclick = () => ext.permissions.request({ origins: ['<all_urls>'] }).then(render)
  } else if (perms?.ok && perms.data.incognito === false) {
    warn.hidden = false
    warn.textContent =
      'Tip: allow FocusGateway in private/incognito windows (extension settings), or install the lock agent which disables them.'
  }
  const pending = await ext.runtime.sendMessage({ type: 'fg-meta', action: 'pending' })
  const box = document.getElementById('pending')
  box.replaceChildren(
    ...(pending?.data || []).map((origin) => {
      const card = document.createElement('div')
      card.className = 'card'
      card.style.cssText = 'padding:12px;margin-bottom:10px;font-size:13px'
      const p = document.createElement('p')
      p.style.margin = '0 0 8px'
      p.append(
        'Connect ',
        Object.assign(document.createElement('b'), { textContent: origin }),
        '? Only allow your own or the official FocusGateway site.',
      )
      const allow = Object.assign(document.createElement('button'), { className: 'btn primary', textContent: 'Allow' })
      const deny = Object.assign(document.createElement('button'), { className: 'btn', textContent: 'Ignore' })
      deny.style.marginLeft = '6px'
      allow.onclick = () => ext.runtime.sendMessage({ type: 'fg-meta', action: 'approve', origin, allow: true }).then(render)
      deny.onclick = () => ext.runtime.sendMessage({ type: 'fg-meta', action: 'approve', origin, allow: false }).then(render)
      card.append(p, allow, deny)
      return card
    }),
  )
  if (!res?.ok) return
  const state = res.state
  if (!state.onboarding.completed) {
    document.getElementById('status').innerHTML = '<a href="app/index.html#/welcome" target="_blank">Finish setting up FocusGateway →</a>'
    return
  }
  const { blocks } = computeBlocks(state, Date.now())
  document.getElementById('status').textContent = blocks.length
    ? `Blocking ${blocks.length === 1 ? '1 rule' : blocks.length + ' rules'} right now`
    : 'Nothing is blocked right now.'
  const list = document.getElementById('list')
  list.replaceChildren(
    ...blocks.map((b) => {
      const row = document.createElement('div')
      row.className = 'card item'
      const left = document.createElement('span')
      left.textContent = b.name
      const right = document.createElement('span')
      right.className = 'muted'
      right.textContent =
        b.kind === 'gated' ? (b.pendingTaskIds.length ? `${b.pendingTaskIds.length} task(s) left` : 'add a task') : `until ${fmt(b.until)}`
      row.append(left, right)
      return row
    }),
  )
  document.getElementById('agent').textContent = state.agent.paired
    ? state.agent.lastError
      ? `Lock agent: ${state.agent.lastError}`
      : 'Lock agent connected. Blocks apply to every browser.'
    : 'Lock agent not installed. Blocks apply to this browser only.'
}
render()
