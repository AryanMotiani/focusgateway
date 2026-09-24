import { createRouter, createWebHashHistory } from 'vue-router'
import { store } from './lib/store.js'

// Hash history: works on every static host and inside the extension, no rewrites needed.
const routes = [
  { path: '/home', component: () => import('./views/Landing.vue'), meta: { bare: true, public: true, title: 'FocusGateway' } },
  { path: '/welcome', component: () => import('./views/Onboarding.vue'), meta: { bare: true, public: true, title: 'Set up' } },
  { path: '/install', component: () => import('./views/Install.vue'), meta: { public: true, title: 'Install' } },
  { path: '/room', component: () => import('./views/Room.vue'), meta: { bare: true, public: true, title: 'Study room' } },
  { path: '/recover', component: () => import('./views/Recover.vue'), meta: { bare: true, public: true, title: 'Forgot PIN' } },
  { path: '/', component: () => import('./views/Dashboard.vue'), meta: { title: 'Today' } },
  { path: '/tasks', component: () => import('./views/Tasks.vue'), meta: { title: 'Tasks' } },
  { path: '/schedule', component: () => import('./views/Schedule.vue'), meta: { title: 'Schedule' } },
  { path: '/blocking', component: () => import('./views/Blocking.vue'), meta: { title: 'Blocking' } },
  { path: '/habits', component: () => import('./views/Habits.vue'), meta: { title: 'Habits' } },
  { path: '/stats', component: () => import('./views/Stats.vue'), meta: { title: 'Accountability' } },
  { path: '/settings', component: () => import('./views/Settings.vue'), meta: { title: 'Settings' } },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  if (!store.state) return '/home'
  if (!store.state.onboarding.completed) {
    // First visit to the hosted site without the extension: show the landing page.
    if (store.mode === 'local' && !store.state.security.hasPin) return '/home'
    return '/welcome'
  }
  return true
})

router.afterEach((to) => {
  document.title =
    to.meta.title && to.meta.title !== 'FocusGateway' ? `${to.meta.title} · FocusGateway` : 'FocusGateway: study without the scroll'
})
