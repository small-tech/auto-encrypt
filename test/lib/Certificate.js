const fs = require('fs')
const test = require('tape')

async function setup() {
  const customSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.removeSync(customSettingsPath)
  return new Configuration({ domains: ['dev.ar.al'], staging: true, settingsPath: customSettingsPath })
}

test('Certificate', async t => {
  setup()

  //
  // Test initial certificate creation.
  //

  
})
