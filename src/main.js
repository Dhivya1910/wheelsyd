import './assets/main.css'

import { createApp, onMounted } from 'vue';
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';

import 'maplibre-gl/dist/maplibre-gl.css';
import 'primeicons/primeicons.css';
import 'animate.css';
// import 'wowjs/dist/wow.js';  


// if (window.WOW) {
//     const wow = new window.WOW();
//     wow.init();  
// }
// import Swiper JS
import Swiper from 'swiper';
// import Swiper styles
import 'swiper/swiper-bundle.css';
// core version + navigation, pagination modules:
import SwiperCore, { Navigation, Pagination } from 'swiper/core';

// configure Swiper to use modules
SwiperCore.use([Navigation, Pagination]);





const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
        darkModeSelector: false // ban darkmode
    }

    }
});
app.mount('#app')


