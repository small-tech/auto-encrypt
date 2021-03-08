import os from 'os'
import fs from 'fs'
import path from 'path'
import test from 'tape'
import Order from '../../lib/Order.js'
import Configuration from '../../lib/Configuration.js'
import Directory from '../../lib/Directory.js'
import Account from '../../lib/Account.js'
import AccountIdentity from '../../lib/identities/AccountIdentity.js'
import AcmeRequest from '../../lib/AcmeRequest.js'
import LetsEncryptServer from '../../lib/LetsEncryptServer.js'
import { symbolOfErrorThrownBy, MockServer } from '../../lib/test-helpers/index.js'
import Pebble from '@small-tech/node-pebble'
import HttpServer from '../../lib/HttpServer.js'

async function setup() {
  // Run the tests using either a local Pebble server (default) or the Let’s Encrypt Staging server
  // (which is subject to rate limits) if the STAGING environment variable is set.
  // Use npm test task for the former and npm run test-staging task for the latter.
  const letsEncryptServerType = process.env.STAGING ? LetsEncryptServer.type.STAGING : LetsEncryptServer.type.PEBBLE

  let domains =  [os.hostname(), `www.${os.hostname()}`]

  // If we’re running on pebble, test with localhost.
  if (letsEncryptServerType === LetsEncryptServer.type.PEBBLE) {
    await Pebble.ready()
    domains = ['localhost']
  }

  test.onFinish(async () => {
    if (letsEncryptServerType === LetsEncryptServer.type.PEBBLE) {
      await Pebble.shutdown()
    }

    // As some of the unit tests result in the HTTP Server being created, ensure that it is
    // shut down at the end so we can exit.
    await HttpServer.destroySharedInstance()
  })

  const customSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.rmSync(customSettingsPath, { recursive: true, force: true })

  const configuration = new Configuration({
    domains,
    server: new LetsEncryptServer(letsEncryptServerType),
    settingsPath: customSettingsPath
  })

  const directory = await Directory.getInstanceAsync(configuration)
  const accountIdentity = new AccountIdentity(configuration)
  AcmeRequest.initialise(directory, accountIdentity)
  const account = await Account.getInstanceAsync(configuration)
  AcmeRequest.account = account

  return { configuration, accountIdentity }
}

test('Order', async t => {
  const { configuration, accountIdentity } = await setup()

  const order = await Order.getInstanceAsync(configuration, accountIdentity)

  //
  // Test read-only setters.
  //

  const readOnlySetters = ['certificate', 'certificateIdentity', 'authorisations', 'finaliseUrl', 'identifiers', 'authorisations', 'status', 'expires', 'certificateUrl', 'headers']

  readOnlySetters.forEach(readOnlySetter => {
    t.strictEquals(
      symbolOfErrorThrownBy(() => { order[readOnlySetter] = 'dummy value' }),
      Symbol.for('ReadOnlyAccessorError'),
      `trying to set read-only property ${readOnlySetter} throws`
    )
  })
  t.end()
})
