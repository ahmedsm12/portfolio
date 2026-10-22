import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // ★ الحل الجذري — إجبار Vite على حل هذه الحزم من node_modules
        //   يعمل مع dynamic imports (ui-animation.js, engine/*.js)
        'gsap/MotionPathPlugin': path.resolve(__dirname, 'node_modules/gsap/MotionPathPlugin.js'),
        'gsap': path.resolve(__dirname, 'node_modules/gsap/index.js'),
        'flubber': path.resolve(__dirname, 'node_modules/flubber/build/flubber.js'),
      },
    },
    optimizeDeps: {
      include: ['gsap', 'gsap/MotionPathPlugin', 'flubber', '@google/genai'],
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});