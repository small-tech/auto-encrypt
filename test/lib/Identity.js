import os from 'os'
import path from 'path'
import fs from 'fs'
import test from 'tape'
import Identity from '../../lib/Identity.js'
import Configuration from '../../lib/Configuration.js'
import LetsEncryptServer from '../../lib/LetsEncryptServer.js'
import { symbolOfErrorThrownBy } from '../../lib/test-helpers/index.js'

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
  fs.rmSync(customSettingsPath, { recursive: true, force: true })
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

  // NB. See AccountIdentity tests for tests of initialised properties.

  t.end()
})
