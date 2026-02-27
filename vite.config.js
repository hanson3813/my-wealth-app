import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 1. 自動更新模式：當你推送到 GitHub 後，使用者的 iPhone 會自動更新 App 內容
      registerType: 'autoUpdate',
      
      // 2. 包含哪些資源在離線時也能使用
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-512x512.png'],
      
      // 3. PWA 的詳細清單，這會與你的 manifest.json 內容同步
      manifest: {
        name: 'My Wealth Master',
        short_name: 'Wealth',
        description: '極簡資產管理 PWA',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      
      // 4. 開發環境也啟用 PWA，方便你在電腦上測試
      devOptions: {
        enabled: true
      }
    })
  ]
})