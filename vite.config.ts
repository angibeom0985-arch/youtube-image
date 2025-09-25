/// <reference types="node" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // 개발 서버에서 404 처리를 위한 히스토리 API 폴백
        historyApiFallback: {
          rewrites: [
            { from: /^\/admin$/, to: '/admin.html' },
            { from: /^\/admin-panel$/, to: '/admin-panel.html' }
          ]
        }
      },
      plugins: [react()],
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false,
        minify: 'terser',
        rollupOptions: {
          external: [], // 모든 의존성을 번들에 포함
          output: {
            manualChunks: {
              vendor: ['react', 'react-dom'],
              gemini: ['@google/genai'],
              utils: ['jszip']
            }
          }
        }
      }
    };
});
