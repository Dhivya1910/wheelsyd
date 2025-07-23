<script setup>
import { onMounted, onBeforeUnmount,ref } from 'vue';
import Menu from 'primevue/menu';
import OverlayPanel from 'primevue/overlaypanel';
import Button from 'primevue/button';
import { useRouter } from 'vue-router';
// const theme = ref('light');
// const toggleTheme = () => {
//   theme.value = theme.value === 'light' ? 'dark' : 'light';
//   applyTheme();
//   localStorage.setItem('theme', theme.value);
// };

// const applyTheme = () => {
//   document.documentElement.setAttribute('data-theme', theme.value);
// };

// onMounted(() => {
//   const savedTheme = localStorage.getItem('theme');
//   theme.value = savedTheme || 'light'; 
//   applyTheme();
// });

const router = useRouter();
const op = ref(null);
const menuItems = ref([
  {
    label: 'Home',
    command: () => router.push('/')
  },
  {
    label: 'Navigation',
    command: () => router.push('/map')
  }
  // {
  //   label: 'Platform Sensors',
  //   command: () => router.push('/platformsensor')
  // }
]);
const menu = ref();
const toggleMenu = (event) => {
  menu.value.toggle(event);
};

onMounted(() => {
  const handleScroll = () => {
    const container = document.getElementById('headerContainer');
    if (window.scrollY === 0) {
      container.classList.add('scrolled-to-top');
    } else {
      container.classList.remove('scrolled-to-top');
    }
  };

  window.addEventListener('scroll', handleScroll);
  handleScroll(); 

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', handleScroll);
  });
});



</script>


<template>
  <header id="headerContainer" class="main-header">
    <div class="nav-container">
      <nav  class="main-nav">
        <div class="logo">
          <RouterLink to="/" class="nav-link">
            <img src="./views/image/logo3.png" alt="Logo" />
          </RouterLink>
        </div>
        <div class="routes">
             <Button icon="pi pi-bars" @click="toggleMenu($event)" class="menuButton" />
            <Menu 
              :model="menuItems" 
              :popup="true" 
              ref="menu"
              :style="{ 
                position: 'fixed', 
                top: '60px', 
                right: '20px'
              }"
            />
            <!-- <Button icon="pi pi-bars" @click="toggleMenu($event)" class="menuButton" />
            <OverlayPanel ref="op" :dismissable="true"  appendTo="body">
              <div class="flex flex-col gap-2 w-48 p-2">
                <RouterLink to="/" exact-active-class="activeMap" class="nav-link" @click="toggleMenu">Home</RouterLink>
                <RouterLink to="/map" exact-active-class="activeMap" class="nav-link" @click="toggleMenu">Navigation</RouterLink>
                <RouterLink to="/platformsensor" exact-active-class="activeMap" class="nav-link" @click="toggleMenu">Platform Sensors</RouterLink>
              </div>
            </OverlayPanel> -->
          
          <RouterLink to="/" exact-active-class="activeMap" class="nav-link">Home</RouterLink>
          <RouterLink to="/map" exact-active-class="activeMap" class="nav-link">Navigation</RouterLink>
          <!-- <RouterLink to="/platformsensor" exact-active-class="activeMap" class="nav-link">Platform Sensors</RouterLink> -->
        </div>
      </nav>
    </div>
  </header>

  <main class="router-view-container">
    <RouterView />
  </main>

  <footer class="main-footer">
    Wheelmelb makes every journey more convenient- designed with ❤
    </footer>
</template>

<style scoped>
a {
  color: #000000;
}
.main-header.scrolled-to-top {
  background-color: transparent;
  color: rgb(255, 255, 255); 
  box-shadow: none;
}

.main-header.scrolled-to-top a{
  color: rgb(255, 255, 255); 
}

.main-header.scrolled-to-top .routes .nav-link:hover {
  background: rgba(0, 0, 0, 0.258) !important;
  color: #ffffff !important;
}

.main-header.scrolled-to-top .routes .nav-link::after {
  background-color: #ffffff;
}

.main-header.scrolled-to-top .logo .nav-link img {
  content: url('./views/image/logo3-white.png');
}


.main-footer {
  text-align: center;
  padding: 1rem;
  /* background-color: #f4f4f400; */
  color: #333333;
  font-size: 0.9rem;
  /* margin-top: 2rem; */
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --header-height: 60px;
  --max-content-width: 1280px;
}

html, body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.main-header {
  position: fixed;
  color: #000000 !important;
  top: 0;
  left: 0;
  width: 100%;
  height: 5rem;
  background: #ffffff;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
  z-index: 1000;
}

.nav-container {
  width: 100%;
  height: 100%;
  padding: 0 1rem;
}

.main-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  /* background-color: rgba(255, 255, 255, 0); */
  /* backdrop-filter: blur(10px); */
}

.nav-link {
  /* color: purple; */
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 0.8rem 1.5rem;
  font-size: 1.1rem;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.main-nav a {
  font-size: 20px;
  font-weight: bold;
  text-decoration: none;
}

.router-view-container {
  margin-top: var(--header-height);
  min-height: calc(100vh - var(--header-height));
  width: 100%;
  overflow-x: hidden;
}

.logo {
  height: 100%;
  display: flex;
  align-items: center;
}

.logo .nav-link {
  font-size: 50px;
  padding: 0.5rem;
  height: 100%;
}

.logo .nav-link img {
  display: block;
  height: 100%;
  width: auto;
  max-height: 3.5rem;
  object-fit: contain;
  filter: none !important;
}

.routes {
  height: 100%;
  display: flex;
  gap :1rem;
  align-items: center;
  position: relative;
}

.routes .overlayPanel {
  top:0;
  position: absolute;
}

.routes .nav-link {
  height: auto;
  /* background: white; */
  /* color: rgb(0, 0, 0); */
  font-style: normal;
  font-weight: 600;
  border-radius: 12px;
  padding: 8px 16px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.flex .nav-link {
  height: auto;
  /* background: white; */
  color: rgb(0, 0, 0) !important;
  font-weight: bold;
  border-radius: 12px;
  padding: 8px 16px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.routes .nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #000000;
  transform: scaleX(0); 
  transform-origin: left;
  transition: transform 0.6s ease;
}

.flex .nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 1px;
  background-color: #000000;
  transform: scaleX(0); 
  transform-origin: left;
  transition: transform 0.6s ease;
}


.routes .nav-link.activeMap::after {
  transform: scaleX(1);
}

.flex .nav-link.activeMap::after {
  transform: scaleX(1);
}


.routes .nav-link:hover {
  background: rgba(74, 74, 74, 0.137) !important;
  color: #000000 !important;
  box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.078) !important;
  transition: color 0.6s ease, box-shadow 0.6s ease;
}

.flex .nav-link:hover {
  background: rgba(74, 74, 74, 0.137) !important;
  color: #000000 !important;
  box-shadow: inset 0 0 12px rgba(0, 0, 0, 0.078) !important;
  transition: color 0.6s ease, box-shadow 0.6s ease;
}

.scrolled-to-top .menuButton {
  color: rgb(255, 255, 255) !important; 
}

.menuButton {
  background-color: #007bff00 !important; 
  color: rgb(0, 0, 0) !important; 
  font-weight: bold !important;
  padding: 10px 20px !important;
  border: none !important; 
  border-radius: 50% !important; 
  transition: all 0.3s ease !important;
  display: none !important;
}

.menuButton .scrolled-to-top{
  color: rgb(0, 0, 0) !important; 
}

.menuButton:hover {
  background-color: #8a8a8a93 !important; 
}

/* .routes .nav-link:hover {
  transform: scale(1.02);
  filter: brightness(1.05);
  color: #000000;
  border-bottom: 1px solid #000000;
} */

/* Responsive Styles */
@media (min-width: 961px) {
  .logo {
    margin-left: 2rem;
  }
  
  .routes {
    margin-right: 2rem;
  }
}

@media (max-width: 960px) {
  .main-nav a {
    font-size: 20px;
  }
  
  .logo .nav-link {
    font-size: 36px;
    padding: 0.25rem;
  }
  
  .logo {
    margin-left: 0.5rem;
  }
  
  .routes {
    margin-right: 0.5rem;
  }
  
  .routes .nav-link {
    padding: 6px 12px;
  }
}

@media (max-width: 650px) {
  .main-header {
    height: 4rem;
  }
  
  .logo .nav-link img {
    max-height: 3rem;
  }

  .routes .nav-link {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
  }
}

@media (max-width: 650px) {
  .routes {
    gap:0;
  }
  .routes .nav-link {
    font-size: 0.7rem;
  }
}

@media (max-width: 450px) {
  .main-header {
    height: 3.5rem;
  }
  
  .main-nav a {
    font-size: 16px;
  }
  
  .logo .nav-link {
    font-size: 24px;
    padding: 0.2rem;
  }
  
  .logo .nav-link img {
    max-height: 2.5rem;
  }
  .routes .nav-link {
    padding: 2px 3px !important;
    font-size: 0.6rem;
  }
  
}

@media (max-width: 350px) {
  .main-header {
    height: 3rem;
  }
  
  .main-nav a {
    font-size: 14px;
  }
  
  .logo .nav-link img {
    max-height: 2rem;
  }
  
  
}

@media (max-width: 430px) {
  .routes .nav-link {
    display: none;
  }
  .menuButton {
    display: flex !important;
  }
}

</style>