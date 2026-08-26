import { buildServerFromEnv } from './server.ts'
import { serializeStartupFailure } from './startup-failure.ts'
import { parseEnv } from '@cvg/shared'

async function start() {
  parseEnv(process.env)
  const app = await buildServerFromEnv()
  const port = Number(process.env.PORT ?? 3000)
  await app.listen({ port, host: '0.0.0.0' })
}

start().catch((error) => {
  console.error(serializeStartupFailure(error))
  process.exit(1)
})
