import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Change base to '/astrofinance-oracle/' if deploying to GitHub Pages
// under a repo name. Use '/' if deploying to a custom domain or Vercel/Netlify.
export default defineConfig({
  plugins: [react()],
  base: '/astrofinance-oracle/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
        },
      },
    },
  },
})
