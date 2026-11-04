import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), VitePWA({
    strategies: 'injectManifest',
    srcDir: 'src',
    filename: 'sw.ts',
    registerType: 'prompt',
    injectRegister: null,
    includeAssets: ['icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'],
    manifest: {
      id: './', name: 'Paper Days — 차곡차곡, 나의 날들', short_name: 'Paper Days',
      description: '종이 위에 차곡차곡, 나만의 하루를 담는 다이어리',
      lang: 'ko', start_url: './', scope: './', display: 'standalone',
      background_color: '#FFF8E9', theme_color: '#66735A',
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    injectManifest: { globPatterns: ['**/*.{js,css,html,woff,woff2,png,svg,webmanifest}'] },
    devOptions: { enabled: false },
  })],
  base: './',
});
