import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-'))
              return 'chunk-charts'
            if (id.includes('jspdf'))
              return 'chunk-pdf'
            if (id.includes('@supabase'))
              return 'chunk-supabase'
            if (id.includes('react-dom') || id.includes('react-router') || id.includes('react-hook-form') || id.includes('@tanstack'))
              return 'chunk-vendor'
          }
        },
      },
    },
  },
})
