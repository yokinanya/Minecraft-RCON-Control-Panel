import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';

// 仅当自定义背景图实际可加载时才应用，避免缺失时产生 404 或空白背景
const backgroundUrl = `${import.meta.env.BASE_URL}assets/custom/background.png`;
const background = new Image();
background.onload = () => {
  document.documentElement.style.setProperty('--app-bg', `url('${backgroundUrl}')`);
};
background.src = backgroundUrl;

createApp(App).mount('#app');
