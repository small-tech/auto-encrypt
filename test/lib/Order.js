const os                        = require('os')
const fs                        = require('fs-extra')
const path                      = require('path')
const test                      = require('tape')
const Order                     = require('../../lib/Order')
const Configuration             = require('../../lib/Configuration')
const Directory                 = require('../../lib/Directory')
const Account                   = require('../../lib/Account')
const AccountIdentity           = require('../../lib/identities/AccountIdentity')
const AcmeRequest               = require('../../lib/AcmeRequest')
const LetsEncryptServer         = require('../../lib/LetsEncryptServer')
const { symbolOfErrorThrownBy,
        MockServer }            = require('../../lib/test-helpers')


async function setup() {
  // Run the tests using either a local Pebble server (default) or the Let’s Encrypt Staging server
  // (which is subject to rate limits) if the STAGING environment variable is set.
  // Use npm test task for the former and npm run test-staging task for the latter.
  const letsEncryptServerType = process.env.STAGING ? LetsEncryptServer.type.STAGING : LetsEncryptServer.type.PEBBLE

  const customSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.removeSync(customSettingsPath)

  const configuration = new Configuration({
    domains: [os.hostname(), `www.${os.hostname()}`],
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

async function setupMock() {
  const letsEncryptServer = new LetsEncryptServer(LetsEncryptServer.type.MOCK)

  const customSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.removeSync(customSettingsPath)

  const configuration = new Configuration({
    domains: [os.hostname(), `www.${os.hostname()}`],
    server: letsEncryptServer,
    settingsPath: customSettingsPath
  })

  const mockServerBaseUrl = 'http://localhost:9829'
  const mockDirectoryServer = await MockServer.getInstanceAsync((request, response) => {
    response.end(JSON.stringify({
      keyChange: `${mockServerBaseUrl}/key-change`,
      newAccount: `${mockServerBaseUrl}/new-account`,
      newNonce: `${mockServerBaseUrl}/new-nonce`,
      newOrder: `${mockServerBaseUrl}/new-order`,
      revokeCert: `${mockServerBaseUrl}/revoke-cert`,
      meta: {
        termsOfService: '',
        website: ''
      }
    }))
  })
  const directory = await Directory.getInstanceAsync(configuration)
  await mockDirectoryServer.destroy()

  // TODO: left off here.
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

  await setupMock()

  t.end()
})
