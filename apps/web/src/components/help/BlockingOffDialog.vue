<script setup>
// Big, clear "Blocking is off in this browser" dialog. Opened by ensureBlocking() (guard.js)
// before a focus session or a rule starts, and by the red "Blocking is off" chips.
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { guard, closeGuard } from './guard.js'
import { store, requestHostAccess } from '../../lib/store.js'
import { detectBrowser } from '../../lib/api.js'
import { ASSETS, CHROME_STORE_URL, EDGE_STORE_URL, FIREFOX_ADDONS_URL, download } from '../../config.js'
import Modal from '../Modal.vue'
import Icon from '../Icon.vue'

const router = useRouter()
const browser = detectBrowser()
const NAME = { chrome: 'Chrome', edge: 'Edge', brave: 'Brave', opera: 'Opera', firefox: 'Firefox', safari: 'Safari', other: 'this browser' }
const name = NAME[browser] || 'this browser'

const title = computed(() => {
  if (guard.issue === 'not-approved') return 'Connect this site to the extension'
  if (guard.issue === 'no-access') return 'The extension can not block yet'
  return 'Blocking is off in this browser'
})

const goOn = computed(
  () => ({ focus: 'Start the timer without blocking', rule: 'Save it anyway', test: null, info: null })[guard.context] ?? null,
)

/** One-click install target for this browser: a store page when live, else the zip. */
const install = computed(() => {
  if (browser === 'firefox')
    return FIREFOX_ADDONS_URL
      ? { label: 'Add to Firefox', url: FIREFOX_ADDONS_URL }
      : { label: 'Download for Firefox', url: download(ASSETS.firefoxZip) }
  if (browser === 'edge' && EDGE_STORE_URL) return { label: 'Get it for Edge', url: EDGE_STORE_URL }
  if (CHROME_STORE_URL && ['chrome', 'brave', 'opera', 'other'].includes(browser)) return { label: `Add to ${name}`, url: CHROME_STORE_URL }
  if (browser === 'safari' || browser === 'phone') return null
  return { label: `Download for ${name}`, url: download(ASSETS.chromiumZip) }
})
const manual = computed(() => install.value && !/Add to|Get it/.test(install.value.label))
const extPage = { edge: 'edge://extensions', brave: 'brave://extensions', opera: 'opera://extensions' }[browser] || 'chrome://extensions'

function openInstall() {
  closeGuard(false)
  router.push('/install')
}
function reconnect() {
  // reloading asks the extension again, which shows the approval screen with the steps
  location.reload()
}
async function grant() {
  if (await requestHostAccess()) closeGuard(guard.context !== 'info' && guard.context !== 'test')
}
</script>

<template>
  <Modal v-if="guard.open" :title="title" wide @close="closeGuard(false)">
    <div data-blocking-off class="space-y-4 text-sm">
      <div class="flex items-start gap-3 rounded-xl border-2 border-bad bg-bad-soft p-4 text-ink">
        <Icon name="alert" :size="22" class="mt-0.5 shrink-0 text-bad" />
        <p v-if="guard.issue === 'no-extension'">
          <b class="text-bad">Nothing will be blocked.</b> FocusGateway blocks sites with its free browser extension, and it is not
          installed in {{ name }}. YouTube, Reddit and every other site still open. The timer, tasks and the study room work without it.
        </p>
        <p v-else-if="guard.issue === 'not-approved'">
          <b class="text-bad">Nothing will be blocked yet.</b> The FocusGateway extension is installed, but this website is not connected to
          it, so it is running on its own and blocks nothing.
        </p>
        <p v-else>
          <b class="text-bad">Nothing will be blocked yet.</b> {{ name }} has not given FocusGateway access to websites, so it can not stop
          them from loading.
        </p>
      </div>

      <!-- how to fix it -->
      <template v-if="guard.issue === 'no-extension'">
        <p v-if="browser === 'safari'">
          Safari can not run the extension. Open FocusGateway in Chrome, Edge, Brave or Firefox, or install the lock agent from the Install
          page, which blocks in every browser on your computer.
        </p>
        <p v-else-if="browser === 'phone'">
          Blocking works on computers (Chrome, Edge, Brave, Firefox). Phones can use the timer, tasks and the study room.
        </p>
        <ol v-else-if="manual" class="list-decimal space-y-1 pl-5 text-muted">
          <template v-if="browser === 'firefox'">
            <li>Download the extension and unzip it.</li>
            <li>Open <code>about:debugging</code>, This Firefox, <b>Load Temporary Add-on</b>, and pick <code>manifest.json</code>.</li>
            <li>When Firefox asks, allow access to all websites.</li>
          </template>
          <template v-else>
            <li>Download the extension and unzip it into a folder you keep.</li>
            <li>
              Open <code>{{ extPage }}</code
              >, turn on <b>Developer mode</b>, click <b>Load unpacked</b> and pick the folder.
            </li>
            <li>Come back to this tab, click the FocusGateway icon (under the puzzle piece) and press <b>Allow</b>.</li>
          </template>
        </ol>
        <p v-else class="text-muted">It takes one click. Then come back to this tab and press Allow in the FocusGateway icon.</p>
      </template>
      <ol v-else-if="guard.issue === 'not-approved'" class="list-decimal space-y-1 pl-5 text-muted">
        <li>Press <b>Connect now</b> below. The page reloads and waits for you.</li>
        <li>Click the <b>puzzle piece</b> in the toolbar, then <b>FocusGateway</b>. Tip: pin it, so its icon is always visible.</li>
        <li>Press <b>Allow</b> next to this site. Blocking turns on right away.</li>
      </ol>
      <p v-else-if="store.mode === 'extension'" class="text-muted">Press the button and choose Allow. Blocking starts right away.</p>
      <ol v-else class="list-decimal space-y-1 pl-5 text-muted">
        <li>Click the FocusGateway icon in the toolbar (in Firefox it may be under the puzzle piece).</li>
        <li>Press <b>Grant access</b> and choose Allow.</li>
      </ol>

      <div class="flex flex-wrap items-center gap-2 pt-1">
        <template v-if="guard.issue === 'no-extension'">
          <a v-if="install" :href="install.url" class="btn btn-primary" target="_blank" rel="noopener"
            ><Icon name="puzzle" :size="16" /> {{ install.label }}</a
          >
          <button class="btn" :class="!install && 'btn-primary'" @click="openInstall">Install guide</button>
        </template>
        <button v-else-if="guard.issue === 'not-approved'" class="btn btn-primary" @click="reconnect">
          <Icon name="puzzle" :size="16" /> Connect now
        </button>
        <button v-else-if="store.mode === 'extension'" class="btn btn-primary" @click="grant">
          <Icon name="shield" :size="16" /> Allow access to websites
        </button>
        <span class="flex-1" />
        <button v-if="goOn" class="btn btn-ghost" data-go-on @click="closeGuard(true)">{{ goOn }}</button>
        <button v-else class="btn btn-ghost" @click="closeGuard(false)">Close</button>
      </div>
    </div>
  </Modal>
</template>
