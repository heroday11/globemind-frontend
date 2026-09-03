import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

process.umask(0o022)

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const deployRoot = path.join(frontendRoot, '.deploy')
const lockPath = path.join(deployRoot, 'lock')
const buildId = process.env.VITE_BUILD_ID || new Date().toISOString().replaceAll(/[:.]/g, '-')
const stagedDist = path.join(deployRoot, `dist-${buildId}`)
const liveDist = path.join(frontendRoot, 'dist')
const previousDist = path.join(frontendRoot, 'dist.previous')

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: frontendRoot,
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`)
  }
}

fs.mkdirSync(deployRoot, { recursive: true, mode: 0o750 })
try {
  fs.mkdirSync(lockPath)
} catch (error) {
  if (error?.code === 'EEXIST') throw new Error('another frontend deployment is running')
  throw error
}

let liveMoved = false
try {
  fs.rmSync(stagedDist, { recursive: true, force: true })
  run('node', ['scripts/build-release.mjs'], {
    GLOBEMIND_FRONTEND_OUT_DIR: stagedDist,
    VITE_BUILD_ID: buildId,
  })

  for (const required of [
    path.join(stagedDist, 'index.html'),
    path.join(stagedDist, 'fin-terminal', 'index.html'),
  ]) {
    if (!fs.statSync(required).isFile()) throw new Error(`missing deployment artifact: ${required}`)
  }

  fs.rmSync(previousDist, { recursive: true, force: true })
  if (fs.existsSync(liveDist)) {
    fs.renameSync(liveDist, previousDist)
    liveMoved = true
  }
  fs.renameSync(stagedDist, liveDist)
  console.log(`[deploy-production] active build: ${buildId}`)
  console.log(`[deploy-production] rollback directory: ${previousDist}`)
} catch (error) {
  if (liveMoved && !fs.existsSync(liveDist) && fs.existsSync(previousDist)) {
    fs.renameSync(previousDist, liveDist)
  }
  throw error
} finally {
  fs.rmSync(stagedDist, { recursive: true, force: true })
  fs.rmSync(lockPath, { recursive: true, force: true })
}
