const os = require('os')
const fs = require('fs-extra')
const path = require('path')
const test = require('tape')
const Configuration = require('../lib/Configuration')

test('Configuration', t => {
  t.plan(3)
  //
  // Setup: create testing paths and ensure that an identity does not already exist at those paths.
  //
  const testSettingsPath = path.join(os.homedir(), '.small-tech.org', 'acme-http-01', 'test')
  fs.removeSync(testSettingsPath)

  Configuration.settingsPath = testSettingsPath

  t.true(fs.existsSync(testSettingsPath), 'the test settings path should be created')

  // Check that the default (non-testing) settings path works.
  const defaultSettingsPath = path.join(os.homedir(), '.small-tech.org', 'acme-http-01')
  Configuration.settingsPath = null

  t.strictEquals(Configuration.settingsPath, defaultSettingsPath, 'the default settings path is set as expected')
  t.true(fs.existsSync(defaultSettingsPath), 'the default settings path should be created')

  t.end()
})
