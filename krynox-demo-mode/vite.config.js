import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vercel Deployment Configuration
export default defineConfig({
  plugins: [react()],
  base: "/", // Vercel serves from the root domain
})