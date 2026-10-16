import { defineConfig } from 'vite';

// relative paths so the built app (dist/) can be copied to any computer or kiosk;
// content hashes prevent stale assets after publishing to the same public URL
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: { entryFileNames: 'assets/app-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' },
    },
  },
});
