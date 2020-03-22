const os            = require('os')
const fs            = require('fs-extra')
const path          = require('path')
const util          = require('util')
const test          = require('tape')
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
  t.plan(24)

  Configuration.reset()
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
  t.true(fs.existsSync(expectedSettingsPath), 'settings path is created as expected')

  const expectedCertificateDirectoryPath = path.join(expectedSettingsPath, 'dev.ar.al')
  t.strictEquals(Configuration.certificateDirectoryPath, expectedCertificateDirectoryPath, 'certificate directory path set as expected')
  t.true(fs.existsSync(expectedCertificateDirectoryPath), 'certificate directory path created as expected')

  // Check the inspection string.
  const dehydrate = h => h.replace(/\s/g, '')
  const dehydratedExpectedInspectionString = dehydrate(`
  # Configuration (static class)

  A single location for shared configuration (e.g., settings paths)

  ## Properties

  Property                   Description                             Value
  -------------------------- --------------------------------------- ---------------------------------------
  .staging                 : Use Let’s Encrypt (LE) staging servers? true
  .domains                 : Domains in certificate                  dev.ar.al
  .settingsPath            : Top-level settings path                 /home/aral/.small-tech.org/auto-encrypt/test/staging
  .accountPath             : Path to LE account details JSON file    /home/aral/.small-tech.org/auto-encrypt/test/staging/account.json
  .accountIdentityPath     : Path to private key for LE account      /home/aral/.small-tech.org/auto-encrypt/test/staging/account-identity.pem
  .certificateDirectoryPath: Path to certificate directory           /home/aral/.small-tech.org/auto-encrypt/test/staging/dev.ar.al
  .certificatePath         : Path to certificate file                /home/aral/.small-tech.org/auto-encrypt/test/staging/dev.ar.al/certificate.pem
  .certificateIdentityPath : Path to private key for certificate     /home/aral/.small-tech.org/auto-encrypt/test/staging/dev.ar.al/certificate-identity.pem`)

  t.strictEquals(dehydrate(util.inspect(Configuration)), dehydratedExpectedInspectionString, 'the inspection string is as expected')

  //
  // Check that default (non-testing) settings paths work.
  //
  const defaultSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt')

  Configuration.reset()
  const defaultStagingSettingsPath = path.join(defaultSettingsPath, 'staging')
  Configuration.initialise({domains: ['dev.ar.al'], staging: true, settingsPath: null})
  t.strictEquals(Configuration.settingsPath, defaultStagingSettingsPath, 'default staging settings path is set as expected')
  t.true(fs.existsSync(defaultStagingSettingsPath), 'the default staging settings path is created')

  Configuration.reset()
  const defaultProductionSettingsPath = path.join(defaultSettingsPath, 'production')
  Configuration.initialise({domains: ['dev.ar.al'], staging: false, settingsPath: null})
  t.strictEquals(Configuration.settingsPath, defaultProductionSettingsPath, 'default production settings path is set as expected')
  t.true(fs.existsSync(defaultProductionSettingsPath), 'the default production settings path is created')

  // Attempting to directly set a configuration property should throw.
  ;['staging', 'domains', 'settingsPath', 'accountPath', 'accountIdentityPath', 'certificatePath', 'certificateDirectoryPath', 'certificateIdentityPath'].forEach(setter => {
    t.ok(throwsErrorOfType(
      () => { Configuration[setter] = true },
      Symbol.for('ReadOnlyAccessorError')
    ), `attempt to set read-only property ${setter} throws`)
  })

  // Configuration is a static class. Trying to instantiate it should throw.
  t.ok(throwsErrorOfType(
    () => { new Configuration() },
    Symbol.for('StaticClassCannotBeInstantiatedError')
  ), 'attempt to initialise the Configuration static class throws')

  t.end()
})
