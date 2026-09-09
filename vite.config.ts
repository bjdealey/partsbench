import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// vite.config runs in Node; declare the one global we read rather than pulling in
// @types/node (keeps the runtime and dev dependencies minimal).
declare const process: { env: Record<string, string | undefined> }

// `base` is set for the production build only, so assets resolve under the
// GitHub Pages project path (bjdealey.github.io/partsbench/). Dev stays at `/`.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/partsbench/' : '/',
  plugins: [react()],
  server: {
    // Respect a PORT from the environment so the dev server can move off a busy
    // 5173 (falls back to 5173 when unset).
    port: Number(process.env.PORT) || 5173,
    open: false,
  },
}))
