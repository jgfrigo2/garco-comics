import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from .env files if needed
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Important for GitHub Pages: repo subpath
    base: '/garco-comics/',

    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'), // allows imports like "@/components/SpideyChat"
      },
    },

    define: {
      // Make GEMINI_API_KEY available in the frontend
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    build: {
      target: 'es2017', // ensures compatibility with iOS Safari
      outDir: 'dist',   // default output folder
      sourcemap: false, // optional: disable sourcemaps for production
    },

    server: {
      port: 3000,
      host: '0.0.0.0', // allows access from other devices in the network
    },
  };
});
