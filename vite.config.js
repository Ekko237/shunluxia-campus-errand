import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 第三方库的报错文案里带 em/en dash（页面上不显示），构建时统一换成连字符，保证产物零 dash
const noDash = () => ({
  name: 'no-dash',
  renderChunk: (code) => (/[–—]/.test(code) ? { code: code.replace(/[–—]/g, '-'), map: null } : null),
})

export default defineConfig({
  base: '/campus-errand/',
  plugins: [react(), tailwindcss(), noDash()],
})
