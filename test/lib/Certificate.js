const os                = require('os')
const fs                = require('fs-extra')
const path              = require('path')
const test              = require('tape')
const Configuration     = require('../../lib/Configuration')
const LetsEncryptServer = require('../../lib/LetsEncryptServer')

async function setup() {
  const customSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.removeSync(customSettingsPath)
  return new Configuration({
    domains: ['dev.ar.al'],
    server: new LetsEncryptServer(LetsEncryptServer.type.STAGING),
    settingsPath: customSettingsPath
  })
}

test('Certificate', async t => {
  setup()

  //
  // Test initial certificate creation.
  //

  t.end()
})
