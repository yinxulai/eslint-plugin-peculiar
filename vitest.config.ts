// filepath: vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // ESLint 的 RuleTester 内部用全局 `it` 注册用例,这里必须开
    globals: true,
    include: ['source/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['source/**/*.ts'],
      exclude: ['source/**/*.test.ts'],
    },
  },
})
