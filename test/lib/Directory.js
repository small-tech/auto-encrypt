const os                             = require('os')
const fs                             = require('fs-extra')
const path                           = require('path')
const util                           = require('util')
const test                           = require('tape')
const Directory                      = require('../../lib/Directory')
const Configuration                  = require('../../lib/Configuration')
const LetsEncryptServer              = require('../../lib/LetsEncryptServer')
const { symbolOfErrorThrownBy,
        symbolOfErrorThrownByAsync,
        dehydrate }                  = require('../../lib/test-helpers')

function setup() {
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
  return new Configuration({
    domains: domains[letsEncryptServerType],
    server: new LetsEncryptServer(letsEncryptServerType),
    settingsPath: customSettingsPath
  })
}

test('Directory', async t => {
  const configuration = setup()

  // Test argument validation.
  t.strictEquals(
    await symbolOfErrorThrownByAsync(async () => {
      await Directory.getInstanceAsync()
      t.fail('not passing the configuration argument should throw but doesn’t')
    }),
    Symbol.for('UndefinedOrNullError'),
    'missing configuration argument throws'
  )

  // Test factory method instantiation validation.
  t.strictEquals(
    symbolOfErrorThrownBy(() => {
      new Directory()
      t.fail('not using the async factory method should throw but doesn’t')
    }),
    Symbol.for('MustBeInstantiatedViaAsyncFactoryMethodError'),
    'not using the async factory method to instantiate throws'
  )

  const directory = await Directory.getInstanceAsync(configuration)

  const expectedShapeOfPebbleDirectory = dehydrate(`
  # Directory

  Endpoint: https://localhost:14000/dir

  ## URLs:
    - keyChangeUrl     : https://localhost:14000/rollover-account-key
    - newAccountUrl    : https://localhost:14000/sign-me-up
    - newNonceUrl      : https://localhost:14000/nonce-plz
    - newOrderUrl      : https://localhost:14000/order-plz
    - revokeCertUrl    : https://localhost:14000/revoke-cert
    - termsOfServiceUrl: data:text/plain,Do%20what%20thou%20wilt
    - websiteUrl       : undefined
  `)

  const expectedShapeOfStagingDirectory = dehydrate(`
  # Directory

  Endpoint: https://acme-staging-v02.api.letsencrypt.org/directory

  ## URLs:
    - keyChangeUrl     : https://acme-staging-v02.api.letsencrypt.org/acme/key-change
    - newAccountUrl    : https://acme-staging-v02.api.letsencrypt.org/acme/new-acct
    - newNonceUrl      : https://acme-staging-v02.api.letsencrypt.org/acme/new-nonce
    - newOrderUrl      : https://acme-staging-v02.api.letsencrypt.org/acme/new-order
    - revokeCertUrl    : https://acme-staging-v02.api.letsencrypt.org/acme/revoke-cert
    - termsOfServiceUrl: https://letsencrypt.org/documents/LE-SA-v1.2-November-15-2017.pdf
    - websiteUrl       : https://letsencrypt.org/docs/staging-environment/
  `)

  const expectedShapeOfDirectory = process.env.STAGING ? expectedShapeOfStagingDirectory : expectedShapeOfPebbleDirectory

  const actualShapeOfDirectory = dehydrate(util.inspect(directory))

  t.strictEquals(actualShapeOfDirectory, expectedShapeOfDirectory, 'the inspection string is as expected')

  t.end()
})
