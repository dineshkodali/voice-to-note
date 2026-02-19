import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VERCEL ? '/' : (process.env.NODE_ENV === 'production' ? '/voice-to-note/' : '/'),
  plugins: [
    react(),
    tailwindcss(),
  ],
})
