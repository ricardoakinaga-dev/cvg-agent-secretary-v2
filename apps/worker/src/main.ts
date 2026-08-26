import { getWorkerStartupFailure } from './worker.ts'

const startupFailure = getWorkerStartupFailure()

if (startupFailure) {
  console.error(
    JSON.stringify({
      event: 'worker.startup_failed',
      code: startupFailure.code,
      message: startupFailure.message
    })
  )
  process.exitCode = 1
}
