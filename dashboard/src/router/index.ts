import { createRouter, createWebHashHistory } from 'vue-router';
import DashboardHome from '../views/DashboardHome.vue';
import SBWView from '../views/SBWView.vue';
import HardBlockView from '../views/HardBlockView.vue';
import TasksView from '../views/TasksView.vue';
import FocusModeView from '../views/FocusModeView.vue';
import AccountabilityHistoryView from '../views/AccountabilityHistoryView.vue';
import SettingsView from '../views/SettingsView.vue';

const routes = [
  { path: '/', name: 'Dashboard', component: DashboardHome },
  { path: '/sbw', name: 'SBWRules', component: SBWView },
  { path: '/hardblock', name: 'HardBlockRules', component: HardBlockView },
  { path: '/tasks', name: 'Tasks', component: TasksView },
  { path: '/focus', name: 'FocusMode', component: FocusModeView },
  { path: '/history', name: 'AccountabilityHistory', component: AccountabilityHistoryView },
  { path: '/settings', name: 'Settings', component: SettingsView },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
