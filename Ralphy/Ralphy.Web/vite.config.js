import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('leaflet') || id.includes('react-leaflet')) {
              return 'leaflet'
            }
            if (id.includes('@tiptap')) {
              return 'tiptap'
            }
            if (id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor'
            }
          }
        }
      }
    }
  }
})