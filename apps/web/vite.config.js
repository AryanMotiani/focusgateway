import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// base './' makes the build work on any static host path (GitHub Pages project
// sites, Netlify, Vercel, Cloudflare Pages) and inside the extension.
export default defineConfig({
  base: './',
  plugins: [vue(), tailwindcss()],
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
  server: { port: 5173 },
})
