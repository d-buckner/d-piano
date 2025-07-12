import { defineConfig } from 'vite';


export default defineConfig({
  root: '.', // Use current directory as root
  server: {
    port: 3000,
    open: '/demo.html',
  },
  build: {
    outDir: 'demo-dist',
    rollupOptions: {
      input: 'demo.html',
    },
  },
});
