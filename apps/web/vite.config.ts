import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
        'icon-maskable-192.png',
        'icon-maskable-512.png'
      ],
      manifest: {
        id: '/',
        name: 'Ledgr — Work Ledger',
        short_name: 'Ledgr',
        description: 'Past-Only Work Log & Reporting Tool for technicians and craftspeople',
        theme_color: '#1C1B18',
        background_color: '#1C1B18',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        categories: ['productivity', 'business', 'utilities'],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          }
        ],
        shortcuts: [
          {
            name: 'New Work Log',
            short_name: 'Log Work',
            description: 'Log completed past work immediately',
            url: '/?action=new_log',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'Tasks View',
            short_name: 'Tasks',
            description: 'View all task groups',
            url: '/?tab=tasks',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          },
          {
            name: 'All Work Logs',
            short_name: 'Ledger',
            description: 'View complete activity log',
            url: '/?tab=ledger',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
