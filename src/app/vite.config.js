import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // Routes weather, news, and hardware triggers to the Pi
      '/api': {
         target: 'http://192.168.0.250:5000', 
        changeOrigin: true,
     /*    rewrite: (path) => path.replace(/^\/api/, '') */
      }, 
      // Routes book indexing and downloads directly to your Proxmox container
      '/calibre-api': {
        target: 'http://192.168.0.211:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/calibre-api/, '')
      }
    }
  }
})
