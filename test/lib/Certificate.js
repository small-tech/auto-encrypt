const os                = require('os')
const fs                = require('fs-extra')
const path              = require('path')
const test              = require('tape')
const Configuration     = require('../../lib/Configuration')
const LetsEncryptServer = require('../../lib/LetsEncryptServer')

async function setup() {
  // Run the tests using either a local Pebble server (default) or the Let’s Encrypt Staging server
  // (which is subject to rate limits) if the STAGING environment variable is set.
  // Use npm test task for the former and npm run test-staging task for the latter.
  const letsEncryptServerType = process.env.STAGING ? LetsEncryptServer.type.STAGING : LetsEncryptServer.type.PEBBLE

  const customSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.removeSync(customSettingsPath)
  return new Configuration({
    domains: ['dev.ar.al'],
    server: new LetsEncryptServer(letsEncryptServerType),
    settingsPath: customSettingsPath
  })
}

test.skip('Certificate', async t => {
  setup()

  //
  // Test initial certificate creation.
  //

  t.end()
})
