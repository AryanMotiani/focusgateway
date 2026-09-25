<script setup>
// The Blocking status checklist in a dialog, opened from the red "Blocking is off" chips.
import { guard, closeBlockingStatus } from './guard.js'
import Modal from '../Modal.vue'
import BlockingStatus from './BlockingStatus.vue'
</script>

<template>
  <Modal v-if="guard.status && !guard.open" title="Blocking status" wide @close="closeBlockingStatus">
    <BlockingStatus bare @navigate="closeBlockingStatus" />
  </Modal>
</template>
