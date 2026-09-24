import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router.js'
import { init } from './lib/store.js'
import './style.css'

init().finally(() => {
  createApp(App).use(router).mount('#app')
})
