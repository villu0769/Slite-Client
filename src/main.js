import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { VueQueryPlugin, QueryClient } from 'vue-query';
import './assets/theme.css';
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';

const vuetify = createVuetify({
  components,
  directives,
});

// Create a QueryClient
const queryClient = new QueryClient();

const app = createApp(App)

app.use(router);
app.use(VueQueryPlugin, { queryClient });
app.use(vuetify);
app.mount('#app')