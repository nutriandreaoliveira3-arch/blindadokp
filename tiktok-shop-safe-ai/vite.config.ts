import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Build em arquivo único: dist/index.html abre com duplo clique, sem servidor.
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: { outDir: 'dist', chunkSizeWarningLimit: 4000 },
  test: { environment: 'node' },
});
