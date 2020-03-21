const os = require('os')
const fs = require('fs-extra')
const path = require('path')
const test = require('tape')
const Configuration = require('../../lib/Configuration')

function throwsErrorOfType (func, errorSymbol) {
  try {
    func()
  } catch (error) {
    // Is the error of the type requested?
    return error.symbol === errorSymbol
  }
  // Did not throw when it was supposed to.
  return false
}

test('Configuration', t => {
  // t.plan(4)

  t.ok(throwsErrorOfType(
    () => { Configuration.initialise() },
    Symbol.for('UndefinedOrNullError')
  ), 'missing parameter object throws')

  Configuration.reset()
  t.ok(throwsErrorOfType(
    () => { Configuration.initialise({staging: true, settingsPath: null}) },
    Symbol.for('UndefinedOrNullError')
  ), 'missing settings.domains throws')

  Configuration.reset()
  t.ok(throwsErrorOfType(
    () => { Configuration.initialise({domains: ['dev.ar.al'], settingsPath: null}) },
    Symbol.for('UndefinedOrNullError')
  ), 'missing settings.staging throws')

  Configuration.reset()
  t.ok(throwsErrorOfType(
    () => { Configuration.initialise({domains: ['dev.ar.al'], staging: true}) },
    Symbol.for('UndefinedError')
  ), 'missing settings.settingsPath throws')

  Configuration.reset()
  t.doesNotThrow(
    () => { Configuration.initialise({domains: ['dev.ar.al'], staging: true, settingsPath: null}) },
    'settings.settingsPath = null does not throw'
  )

  Configuration.reset()
  t.ok(throwsErrorOfType(
    () => { Configuration.initialise({domains: ['dev.ar.al', 1, 2, 3], staging: true, settingsPath: null}) },
    Symbol.for('Configuration.domainsArrayIsNotAnArrayOfStringsError')
  ), 'domains must be an array of string or else it throws')

  Configuration.reset()
  const testSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.removeSync(testSettingsPath)
  Configuration.initialise({ domains: ['dev.ar.al'], staging: true, settingsPath: testSettingsPath })

  const expectedSettingsPath = path.join(testSettingsPath, 'staging')
  t.strictEquals(Configuration.settingsPath, expectedSettingsPath, 'settings path set as expected')
  t.true(fs.existsSync(expectedSettingsPath), 'settings path created as expected')

  const expectedCertificateDirectoryPath = path.join(expectedSettingsPath, 'dev.ar.al')
  t.strictEquals(Configuration.certificateDirectoryPath, expectedCertificateDirectoryPath, 'certificate directory path set as expected')
  t.true(fs.existsSync(expectedCertificateDirectoryPath), 'certificate directory path created as expected')


  // // Check that the default (non-testing) settings path works.
  // const defaultSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt')
  // Configuration.settingsPath = null

  // t.strictEquals(Configuration.settingsPath, defaultSettingsPath, 'the default settings path is set as expected')
  // t.true(fs.existsSync(defaultSettingsPath), 'the default settings path should be created')

  // t.throws(()=>{ new Configuration() }, /Configuration is a static class/, 'configuration is a static class')

  t.end()
})
