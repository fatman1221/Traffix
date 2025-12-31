import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // 使用 127.0.0.1 而不是 localhost 避免 IPv6 问题
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path, // 保持路径不变
      }
    }
  }
})

