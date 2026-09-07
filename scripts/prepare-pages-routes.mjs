import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const distDir = join(process.cwd(), 'dist')
const indexFile = join(distDir, 'index.html')
const spaRoutes = ['login', 'register', 'forgot-password']

if (!existsSync(indexFile)) {
  throw new Error('dist/index.html was not found. Run this script after vite build.')
}

for (const route of spaRoutes) {
  const routeDir = join(distDir, route)
  mkdirSync(routeDir, { recursive: true })
  copyFileSync(indexFile, join(routeDir, 'index.html'))
}
