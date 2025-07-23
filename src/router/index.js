import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/views/HomePage.vue'
import Map from '@/views/Map.vue'
import Tracker from '@/views/Tracker.vue'
import Platformsensor from '@/views/Platformsensor.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'homePage',
      component: HomePage,
    },
    {
      path: '/map',
      name: 'mapPage',
      component: Map,
    },
    {
      path: '/tracker',
      name: 'trackerPage',
      component: Tracker,
    },
    {
      path: '/platformsensor',
      name: 'platformsensorPage',
      component: Platformsensor,
    }
  ],
  // Add scroll behavior to always scroll to top on navigation
  scrollBehavior(to, from, savedPosition) {
    // Always scroll to top
    return { top: 0 }
    
    // Alternatively, you could use smooth scrolling:
    // return { 
    //   top: 0,
    //   behavior: 'smooth' 
    // }
  }
})

// Your existing authentication guard
router.beforeEach((to, from, next) => {
  const isAuthed = localStorage.getItem('authenticated');
  if (!isAuthed || isAuthed !== 'true') {
    const password = prompt('Please enter your access code：');
    if (password === '123456789') {
      localStorage.setItem('authenticated', 'true');
      next(); 
    } else {
      alert('Wrong password!');
      next(false); 
    }
  } else {
    next(); 
  }
})

export default router