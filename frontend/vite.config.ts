import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 2500, // kB
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  },
  server: {
    host: true, // listen on 0.0.0.0 so the port is reachable from Docker
    proxy: {
      // VITE_API_TARGET is set in docker-compose.yml; defaults to local backend
      '/api': process.env.VITE_API_TARGET ?? 'http://localhost:8000'
    }
  }
})
