import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import 'element-plus/dist/index.css'
import './style.css'

const app = createApp(App)
app.use(router)
app.use(ElementPlus, { locale: zhCn, size: 'default', zIndex: 3000 })
app.mount('#app')
