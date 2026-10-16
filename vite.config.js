import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServiceWorker } from './scripts/offline-worker.mjs';

// relative paths so the built app (dist/) can be copied to any computer or kiosk;
// content hashes prevent stale assets after publishing to the same public URL
export default defineConfig({
  base: './',
  plugins: [{name:'offline-viewer',writeBundle(options,bundle){
    const model=readFileSync('public/models/shahrofar.glb');
    const modelHash=createHash('sha256').update(model).digest('hex').slice(0,16);
    const assets=['./','./admin.html',...Object.keys(bundle).filter(p=>/\.(js|css|webp)$/.test(p)).map(p=>'./'+p),`./models/shahrofar.glb?v=${modelHash}`];
    const template=createServiceWorker(assets,'BUILD');
    const version=createHash('sha256').update(template).digest('hex').slice(0,16);
    writeFileSync(`${options.dir}/sw.js`,createServiceWorker(assets,version));
  }}],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input:{viewer:'index.html',admin:'admin.html'},
      output: { entryFileNames: 'assets/app-[hash].js', assetFileNames: 'assets/[name]-[hash][extname]' },
    },
  },
});
