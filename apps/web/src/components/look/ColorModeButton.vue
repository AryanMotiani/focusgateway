<script setup>
// The one click sun and moon button next to the palette button: flips the current theme
// between its light and dark variant.
import { isDark, toggleDark } from '../../lib/look.js'
import Icon from '../Icon.vue'

defineProps({ glass: Boolean })
</script>

<template>
  <button
    type="button"
    :class="glass ? 'room-glass room-pill grid place-items-center p-2' : 'btn btn-ghost btn-sm !px-2 text-muted hover:text-ink'"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :title="isDark ? 'Light mode' : 'Dark mode'"
    data-color-mode-button
    @click="toggleDark"
  >
    <Icon :name="isDark ? 'sun' : 'moon'" :size="16" />
  </button>
</template>
