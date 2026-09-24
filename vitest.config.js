import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: { include: ['packages/*/test/**/*.test.js', 'agent/test/**/*.test.js'], environment: 'node' }
})
