import { defineConfig } from 'vitest/config';
import solid from 'vite-plugin-solid';

/**
 * The app is served from a path that is not known yet (a file:// bundle, a
 * subdirectory on a static host), so every asset is referenced relatively.
 */
export default defineConfig({
  base: './',
  plugins: [solid()],
  worker: { format: 'es' },
  server: { port: Number(process.env.PORT) || undefined },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
