// Opened on install when the browser (usually Firefox) did not grant host access.
// permissions.request must run from a click, which is why this is a page and not automatic.
const ext = globalThis.browser ?? globalThis.chrome
const ALL = { origins: ['<all_urls>'] }

async function show() {
  const has = await ext.permissions.contains(ALL).catch(() => false)
  document.getElementById('done').hidden = !has
  document.getElementById('grant').hidden = has
  if (has) document.getElementById('title').textContent = 'Blocking is on'
}

document.getElementById('grant').addEventListener('click', () => {
  ext.permissions
    .request(ALL)
    .catch(() => false)
    .then(show)
})
show()
