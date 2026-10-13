import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

process.umask(0o022)

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const deployRoot = path.join(frontendRoot, '.deploy')
const lockPath = path.join(deployRoot, 'lock')
const buildId = process.env.VITE_BUILD_ID || new Date().toISOString().replaceAll(/[:.]/g, '-')
const liveDist = path.join(frontendRoot, 'dist')

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

let transactionRoot
let preserveTransaction = false
try {
  transactionRoot = fs.mkdtempSync(path.join(deployRoot, 'transaction-'))
  const stagedDist = path.join(transactionRoot, 'staged')
  const rollbackDist = path.join(transactionRoot, 'live')

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

  let liveMoved = false
  if (fs.existsSync(liveDist)) {
    fs.renameSync(liveDist, rollbackDist)
    liveMoved = true
  }

  try {
    fs.renameSync(stagedDist, liveDist)
  } catch (error) {
    if (liveMoved) {
      try {
        fs.renameSync(rollbackDist, liveDist)
        liveMoved = false
      } catch (restoreError) {
        preserveTransaction = true
        console.error(`[deploy-production] recovery files retained at: ${transactionRoot}`)
        throw new AggregateError(
          [error, restoreError],
          'deployment failed and the previous dist could not be restored',
        )
      }
    }
    throw error
  }

  console.log(`[deploy-production] active build: ${buildId}`)
} finally {
  try {
    if (transactionRoot && !preserveTransaction) {
      fs.rmSync(transactionRoot, { recursive: true, force: true })
    }
  } finally {
    fs.rmSync(lockPath, { recursive: true, force: true })
  }
}
