import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      // Regression floor only — set just below current totals (stmts/lines ~37%,
      // branches ~76%, funcs ~70%) so coverage can't silently drop. Raise as the
      // untested surface (app pages, supabase clients, types) gains tests.
      thresholds: {
        statements: 35,
        branches: 70,
        functions: 65,
        lines: 35,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
