import { defineConfig, devices } from '@playwright/test';

/**
 * The end-to-end suite drives the built app, not the dev server: what it checks —
 * the worker starting, IndexedDB surviving a reload — only behaves like the real
 * thing in a real build.
 */
const port = Number(process.env.E2E_PORT ?? 4318);

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  use: { baseURL: `http://localhost:${port}`, ...devices['Desktop Chrome'] },
  webServer: {
    command: `npm run build && npx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000
  }
});
