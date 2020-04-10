const os                        = require('os')
const path                      = require('path')
const fs                        = require('fs-extra')
const test                      = require('tape')
const Identity                  = require('../../lib/Identity')
const Configuration             = require('../../lib/Configuration')
const LetsEncryptServer         = require('../../lib/LetsEncryptServer')
const { symbolOfErrorThrownBy } = require('../../lib/test-helpers')

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

test('Identity', t => {

  const configuration = setup()

  //
  // Initialisation (error conditions)
  //

  // Both arguments missing should throw.
  t.strictEquals(
    symbolOfErrorThrownBy(() => new Identity()),
    Symbol.for('UndefinedOrNullError'),
    'throws when both arguments are missing'
  )

  // Missing second argument should throw.
  t.strictEquals(
    symbolOfErrorThrownBy(() => new Identity(configuration)),
    Symbol.for('UndefinedOrNullError'),
    'throws when second argument is missing'
  )

  // Incorrect second argument should throw
  t.strictEquals(
    symbolOfErrorThrownBy(() => new Identity(configuration, 'unknownPathKey')),
    Symbol.for('UnsupportedIdentityType'),
    'throws when identity file path is unknown (unsupported identity type)'
  )

  t.end()

})
