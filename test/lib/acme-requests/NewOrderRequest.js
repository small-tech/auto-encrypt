import os from 'os'
import fs from 'fs-extra'
import path from 'path'
import test from 'tape'
import NewOrderRequest from '../../../lib/acme-requests/NewOrderRequest.js'
import Directory from '../../../lib/Directory.js'
import Account from '../../../lib/Account.js'
import AccountIdentity from '../../../lib/identities/AccountIdentity.js'
import AcmeRequest from '../../../lib/AcmeRequest.js'
import Configuration from '../../../lib/Configuration.js'
import LetsEncryptServer from '../../../lib/LetsEncryptServer.js'
import { symbolOfErrorThrownByAsync } from '../../../lib/test-helpers/index.js'
import Pebble from '@small-tech/node-pebble'

async function setup() {
  // Run the tests using either a local Pebble server (default) or the Let’s Encrypt Staging server
  // (which is subject to rate limits) if the STAGING environment variable is set.
  // Use npm test task for the former and npm run test-staging task for the latter.
  const letsEncryptServerType = process.env.STAGING ? LetsEncryptServer.type.STAGING : LetsEncryptServer.type.PEBBLE

  if (letsEncryptServerType === LetsEncryptServer.type.PEBBLE) {
    await Pebble.ready()
  }

  const domains = {
    [LetsEncryptServer.type.PEBBLE]: ['localhost', 'pebble'],
    [LetsEncryptServer.type.STAGING]: [os.hostname(), `www.${os.hostname()}`]
  }

  const customSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.removeSync(customSettingsPath)

  const configuration = new Configuration({
    domains: domains[letsEncryptServerType],
    server: new LetsEncryptServer(letsEncryptServerType),
    settingsPath: customSettingsPath
  })
  const directory = await Directory.getInstanceAsync(configuration)

  const accountIdentity = new AccountIdentity(configuration)
  AcmeRequest.initialise(directory, accountIdentity)
  const account = await Account.getInstanceAsync(configuration)
  AcmeRequest.account = account

  test.onFinish(async () => {
    await Pebble.shutdown()
  })

  return configuration
}

test('New Order Request', async t => {
  const configuration = await setup()

  t.strictEquals(
    await symbolOfErrorThrownByAsync(async () => { await (new NewOrderRequest()).execute() }),
    Symbol.for('UndefinedOrNullError'),
    'attempting to execute new order request without configuration argument throws as expected'
  )

  t.end()
})
