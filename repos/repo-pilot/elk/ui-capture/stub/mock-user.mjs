// Prints the MOCK_USER JSON baked into the build (Elk's own `dev:mocked` mechanism, see .env.mock).
// Account/instance are refreshed from the stub at runtime; server + token are what matter.
import { ME, SERVER, TOKEN, instanceV2 } from './core.mjs'
process.stdout.write(JSON.stringify({
  user: { server: SERVER, token: TOKEN, account: ME },
  server: { [SERVER]: instanceV2() },
}))
