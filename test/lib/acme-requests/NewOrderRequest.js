const os                             = require('os')
const fs                             = require('fs-extra')
const path                           = require('path')
const test                           = require('tape')
const NewOrderRequest                = require('../../../lib/acme-requests/NewOrderRequest')
const Directory                      = require('../../../lib/Directory')
const Account                        = require('../../../lib/Account')
const AccountIdentity                = require('../../../lib/identities/AccountIdentity')
const AcmeRequest                    = require('../../../lib/AcmeRequest')
const Configuration                  = require('../../../lib/Configuration')
const LetsEncryptServer              = require('../../../lib/LetsEncryptServer')
const { symbolOfErrorThrownByAsync } = require('../../../lib/test-helpers')

async function setup() {
  // Run the tests using either a local Pebble server (default) or the Let’s Encrypt Staging server
  // (which is subject to rate limits) if the STAGING environment variable is set.
  // Use npm test task for the former and npm run test-staging task for the latter.
  const letsEncryptServerType = process.env.STAGING ? LetsEncryptServer.type.STAGING : LetsEncryptServer.type.PEBBLE

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
