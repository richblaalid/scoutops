import { defineConfig } from 'vite'
import { resolve } from 'path'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

// Plugin to copy static files after build
function copyStaticFiles() {
  return {
    name: 'copy-static-files',
    closeBundle() {
      const distDir = resolve(__dirname, 'dist')
      const iconsDir = resolve(distDir, 'icons')

      // Ensure icons directory exists
      if (!existsSync(iconsDir)) {
        mkdirSync(iconsDir, { recursive: true })
      }

      // Copy manifest.json
      copyFileSync(
        resolve(__dirname, 'manifest.json'),
        resolve(distDir, 'manifest.json')
      )

      // Copy popup.html
      copyFileSync(
        resolve(__dirname, 'src/popup/popup.html'),
        resolve(distDir, 'popup.html')
      )

      // Copy icons if they exist
      const iconSizes = ['16', '32', '48', '128']
      iconSizes.forEach((size) => {
        const iconPath = resolve(__dirname, `public/icons/icon${size}.png`)
        if (existsSync(iconPath)) {
          copyFileSync(iconPath, resolve(iconsDir, `icon${size}.png`))
        }
      })

      console.log('Static files copied to dist/')
    },
  }
}

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/content-script.ts'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        popup: resolve(__dirname, 'src/popup/popup.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
    sourcemap: process.env.NODE_ENV === 'development',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  plugins: [copyStaticFiles()],
})
