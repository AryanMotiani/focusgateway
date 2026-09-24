<script setup>
import { ref } from 'vue'
import { store } from '../lib/store.js'
import { RELEASES_URL, REPO_URL, CHROME_STORE_URL, EDGE_STORE_URL, FIREFOX_ADDONS_URL } from '../config.js'
import Icon from '../components/Icon.vue'

const os = ref(/Win/.test(navigator.platform) ? 'win' : /Mac/.test(navigator.platform) ? 'mac' : 'linux')
const isFirefox = /Firefox\//.test(navigator.userAgent)
const CMD = {
  win: { shell: 'PowerShell (Run as administrator)', lines: ['cd $HOME\\Downloads\\focusgateway', 'node agent\\bin\\focusgateway-agent.js install'] },
  mac: { shell: 'Terminal', lines: ['cd ~/Downloads/focusgateway', 'sudo node agent/bin/focusgateway-agent.js install'] },
  linux: { shell: 'Terminal', lines: ['cd ~/Downloads/focusgateway', 'sudo node agent/bin/focusgateway-agent.js install'] },
}
const copied = ref('')
function copy(t) {
  navigator.clipboard?.writeText(t)
  copied.value = t
  setTimeout(() => (copied.value = ''), 1500)
}
</script>

<template>
  <div class="max-w-3xl space-y-8">
    <header>
      <h1 class="h-display text-4xl">Install</h1>
      <p class="mt-1 text-muted">Two free pieces. The extension is all most people need. The lock agent makes blocks apply everywhere and much harder to dodge.</p>
    </header>

    <section class="card p-6">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="chip !bg-accent-soft !text-accent">Step 1 · required for blocking</p>
          <h2 class="mt-2 text-xl font-semibold">Browser extension</h2>
        </div>
        <span v-if="store.mode !== 'local'" class="chip !bg-good-soft !text-good"><Icon name="check" :size="12" /> Installed</span>
      </div>
      <p class="mt-2 text-sm text-muted">Blocks sites in your browser, runs your rules on schedule and stores your data locally. Works in Chrome, Edge, Brave, Opera, Vivaldi, Arc and Firefox.</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <a v-if="CHROME_STORE_URL" :href="CHROME_STORE_URL" class="btn btn-primary" target="_blank" rel="noopener">Chrome Web Store</a>
        <a v-if="EDGE_STORE_URL" :href="EDGE_STORE_URL" class="btn" target="_blank" rel="noopener">Edge Add-ons</a>
        <a v-if="FIREFOX_ADDONS_URL" :href="FIREFOX_ADDONS_URL" class="btn" target="_blank" rel="noopener">Firefox Add-ons</a>
        <a :href="RELEASES_URL" class="btn" :class="!CHROME_STORE_URL && 'btn-primary'" target="_blank" rel="noopener"><Icon name="download" :size="16" /> Download latest release</a>
      </div>
      <details class="mt-5 rounded-xl border border-line p-4" :open="!CHROME_STORE_URL">
        <summary class="cursor-pointer text-sm font-semibold">Install from the download (2 minutes)</summary>
        <div class="mt-3 space-y-4 text-sm">
          <div>
            <p class="font-semibold">{{ isFirefox ? 'Chrome, Edge, Brave, Opera (for reference)' : 'Chrome, Edge, Brave, Opera, Vivaldi, Arc' }}</p>
            <ol class="mt-1 list-decimal space-y-1 pl-5 text-muted">
              <li>Unzip <code>focusgateway-chromium-*.zip</code> into a folder you won't delete (e.g. Documents/FocusGateway).</li>
              <li>Open <code>chrome://extensions</code> (Edge: <code>edge://extensions</code>).</li>
              <li>Turn on <b>Developer mode</b>, click <b>Load unpacked</b>, pick the unzipped folder.</li>
              <li>Pin FocusGateway to your toolbar. Its setup page opens by itself.</li>
            </ol>
          </div>
          <div>
            <p class="font-semibold">Firefox</p>
            <p class="mt-1 text-muted">Firefox only keeps signed extensions installed. Use the Firefox Add-ons listing when it's available, or open the signed <code>focusgateway-firefox-*.xpi</code> from the release page. (Developers: <code>about:debugging</code> → Load Temporary Add-on works until restart.)</p>
          </div>
          <div>
            <p class="font-semibold">Safari and everything else</p>
            <p class="mt-1 text-muted">Install the lock agent below. It blocks at the system level, which covers Safari, other browsers and desktop apps.</p>
          </div>
        </div>
      </details>
    </section>

    <section class="card p-6">
      <p class="chip">Step 2 · optional, recommended</p>
      <h2 class="mt-2 text-xl font-semibold">Lock agent</h2>
      <p class="mt-2 text-sm text-muted">A tiny background program (no dependencies, about 1 MB of memory). It mirrors your rules from the extension and enforces them with your computer's hosts file, so they apply to every browser and app. It also sets official browser policies that turn off Secure DNS and private windows, and can lock the extensions page.</p>
      <ol class="mt-4 space-y-4 text-sm">
        <li>
          <p><b>1.</b> Install <a href="https://nodejs.org" target="_blank" rel="noopener" class="text-accent underline">Node.js</a> (version 18 or newer) if you don't have it.</p>
        </li>
        <li>
          <p><b>2.</b> Download and unzip the <a :href="RELEASES_URL" target="_blank" rel="noopener" class="text-accent underline">latest release</a> (the <code>focusgateway-*.zip</code> source bundle).</p>
        </li>
        <li>
          <p><b>3.</b> Open {{ CMD[os].shell }} and run:</p>
          <div class="mt-2 flex rounded-xl border border-line p-0.5 text-xs">
            <button v-for="[k, l] in [['win', 'Windows'], ['mac', 'macOS'], ['linux', 'Linux']]" :key="k" class="flex-1 rounded-lg px-3 py-1.5 font-medium" :class="os === k ? 'bg-accent-soft text-accent' : 'text-muted'" @click="os = k">{{ l }}</button>
          </div>
          <div class="mt-2 space-y-1.5">
            <div v-for="l in CMD[os].lines" :key="l" class="flex items-center gap-2 rounded-xl bg-[#151129] px-3 py-2 font-mono text-[13px] text-[#e9e4ff]">
              <span class="flex-1 overflow-x-auto whitespace-nowrap">{{ l }}</span>
              <button class="shrink-0 rounded-md px-2 py-0.5 text-xs text-white/60 hover:bg-white/10" @click="copy(l)">{{ copied === l ? 'Copied' : 'Copy' }}</button>
            </div>
          </div>
          <p class="mt-2 text-xs text-muted">Add <code>--strict</code> to also lock the extensions page and developer tools while you use FocusGateway. Run <code>... uninstall</code> to remove it (refused while a no-failsafe block is running).</p>
        </li>
        <li>
          <p><b>4.</b> The installer prints a <b>pairing code</b>. Paste it in <RouterLink to="/settings" class="text-accent underline">Settings → Lock agent</RouterLink>.</p>
        </li>
      </ol>
    </section>

    <p class="text-sm text-muted">Everything is open source: <a :href="REPO_URL" target="_blank" rel="noopener" class="text-accent underline">read the code</a> before you give it admin rights. You should, with any program.</p>
  </div>
</template>
