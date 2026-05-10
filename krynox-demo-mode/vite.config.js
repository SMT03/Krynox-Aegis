import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Using a relative base path ("") ensures it works regardless of repo name or case sensitivity
export default defineConfig({
  plugins: [react()],
  base: "./", 
})
