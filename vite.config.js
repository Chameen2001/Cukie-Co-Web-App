import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Project site: https://chameen2001.github.io/Cukie-Co-Web-App/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/Cukie-Co-Web-App/' : '/',
})
