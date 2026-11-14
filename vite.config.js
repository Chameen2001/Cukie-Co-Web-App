import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Project site: https://chameen2001.github.io/Cukie-Co-Web-App/
export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/Cukie-Co-Web-App/' : '/',
})

if (process.env.GITHUB_ACTIONS && !process.env.VITE_FIREBASE_API_KEY) {
  throw new Error('Set the VITE_FIREBASE_API_KEY repository secret before deploying.')
}
