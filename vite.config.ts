import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages deployment path — repo name
const repoBase = '/skraeddar/'

export default defineConfig({
  base: repoBase,
  plugins: [react()],
})
