import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      // This is crucial: The @google/genai SDK expects process.env.API_KEY
      // Vite normally hides process.env, so we explicitly define it here.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});