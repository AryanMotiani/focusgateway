import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { vUppercaseOnDrag, vFormatDate } from './directives/customDirectives';
import './style.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.directive('uppercase-on-drag', vUppercaseOnDrag);
app.directive('format-date', vFormatDate);

app.mount('#app');
