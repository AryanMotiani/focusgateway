<script setup>
// Buy one thing: a confirm step with the price and what is left after, then a "yours now"
// step with a coin burst and the obvious next move (place it, wear it, use it).
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { shopKind } from '@regimen/core'
import { balance, buy, shopLevel } from '../../lib/shop.js'
import ItemPreview from './ItemPreview.vue'
import CoinIcon from './CoinIcon.vue'
import Icon from '../Icon.vue'

const props = defineProps({ item: { type: Object, required: true } })
const emit = defineEmits(['close', 'use', 'bought'])
const step = ref(props.item.owned ? 'done' : 'confirm')
const busy = ref(false)
const buyBtn = ref(null)
const short = computed(() => props.item.price - balance.value)
const locked = computed(() => props.item.level > shopLevel.value)
const USE = { object: 'Place it now', scene: 'Use this scene', music: 'Play this style' }
const useLabel = computed(() =>
  props.item.kind === 'option' ? (props.item.category === 'avatar' ? 'Wear it now' : 'Use it now') : USE[props.item.kind],
)

async function confirm() {
  busy.value = true
  const ok = await buy(props.item.id, buyBtn.value)
  busy.value = false
  if (ok) {
    step.value = 'done'
    emit('bought', props.item)
  }
}
const onKey = (e) => e.key === 'Escape' && emit('close')
onMounted(() => {
  document.addEventListener('keydown', onKey)
  buyBtn.value?.focus()
})
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[65] grid place-items-center bg-black/45 p-4 backdrop-blur-sm" @mousedown.self="emit('close')">
      <div
        class="pop-in w-full max-w-xs overflow-hidden rounded-3xl bg-hud text-hud-ink shadow-2xl"
        role="dialog"
        aria-modal="true"
        :aria-label="step === 'done' ? `${item.name} is yours` : `Buy ${item.name}`"
        data-buy-dialog
      >
        <div class="relative grid h-40 place-items-center overflow-hidden">
          <div
            class="absolute inset-0"
            :class="step === 'done' ? 'shine' : ''"
            style="background: radial-gradient(circle at 50% 60%, color-mix(in srgb, var(--fg-xp) 45%, transparent), transparent 65%)"
          />
          <span class="relative h-28 w-40" :class="step === 'done' && 'pop-in'"><ItemPreview :item="item" big /></span>
          <span
            v-if="step === 'done'"
            class="pop-in absolute top-3 right-3 flex items-center gap-1 rounded-full bg-good px-2.5 py-1 text-[11px] font-black text-hud"
            ><Icon name="check" :size="12" /> Yours</span
          >
        </div>
        <div class="px-5 pt-1 pb-5 text-center">
          <p class="hud-label text-[11px] text-hud-muted">{{ shopKind(item) }}</p>
          <p class="h-display mt-0.5 text-2xl">{{ item.name }}</p>

          <template v-if="step === 'confirm'">
            <p class="mt-3 flex items-center justify-center gap-1.5 text-3xl">
              <CoinIcon :size="28" /><span class="num">{{ item.price }}</span>
            </p>
            <p v-if="locked" class="mt-2 text-sm text-hud-muted">Unlocks at level {{ item.level }}. You are level {{ shopLevel }}.</p>
            <p v-else-if="short > 0" class="mt-2 text-sm text-hud-muted">
              You have <b class="num text-hud-ink">{{ balance }}</b
              >. <b class="num text-hud-ink">{{ short }}</b> more coins to go, about {{ Math.max(1, Math.ceil(short / 60)) }} hour{{
                Math.ceil(short / 60) === 1 ? '' : 's'
              }}
              of focus.
            </p>
            <p v-else class="mt-2 text-sm text-hud-muted">
              You will have <b class="num text-hud-ink">{{ balance - item.price }}</b> coins left.
            </p>
            <button
              ref="buyBtn"
              class="btn btn-primary mt-4 w-full"
              :disabled="busy || locked || short > 0"
              data-buy-confirm
              @click="confirm"
            >
              <CoinIcon :size="16" /> Buy for {{ item.price }}
            </button>
            <button class="btn btn-ghost mt-1 w-full !text-hud-muted" @click="emit('close')">Not now</button>
          </template>

          <template v-else>
            <p class="mt-2 text-sm text-hud-muted">Bought for keeps. Nice work earning it.</p>
            <button v-if="useLabel" class="btn btn-primary mt-4 w-full" data-buy-use @click="emit('use', item)">
              <Icon name="sparkles" :size="15" /> {{ useLabel }}
            </button>
            <button class="btn btn-ghost mt-1 w-full !text-hud-muted" @click="emit('close')">Keep shopping</button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.shine {
  animation: shine 1.6s ease-out;
}
@keyframes shine {
  0% {
    transform: scale(0.4);
    opacity: 0;
  }
  40% {
    opacity: 1;
  }
  100% {
    transform: scale(1.4);
    opacity: 0.8;
  }
}
</style>
