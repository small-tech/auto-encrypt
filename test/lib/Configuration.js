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
  t.plan(38)

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
  t.ok(throwsErrorOfType(
    () => { Configuration.staging },
    Symbol.for('Configuration.notInitialisedError')
  ), 'attempt to access property of uninitialised Configuration throws')

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
  const customSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.removeSync(customSettingsPath)
  Configuration.initialise({ domains: ['dev.ar.al'], staging: true, settingsPath: customSettingsPath })

  const expectedCustomStagingSettingsPath = path.join(customSettingsPath, 'staging')
  t.strictEquals(Configuration.settingsPath, expectedCustomStagingSettingsPath, 'settings path set as expected')
  t.true(fs.existsSync(expectedCustomStagingSettingsPath), 'settings path is created as expected')

  const expectedCertificateDirectoryPath = path.join(expectedCustomStagingSettingsPath, 'dev.ar.al')
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

  Configuration.reset()
  const dehydratedExpectedInspectionStringForUninitialisedConfiguration = dehydrate(`# Configuration (static class)
  A single location for shared configuration (e.g., settings paths) Not initialised. Use Configuration.initialise() method to initialise.`)
  t.strictEquals(dehydrate(util.inspect(Configuration)), dehydratedExpectedInspectionStringForUninitialisedConfiguration, 'the inspection string for uninitialised Configuration is as expected')

  //
  // Also test certificate directory path is created properly when configuration
  // has 2-4 domains and more than 4 domains.
  //

  Configuration.reset()
  Configuration.initialise({ domains: ['ar.al', 'small-tech.org'], staging: true, settingsPath: customSettingsPath })
  const expectedCertificateDirectoryPathForTwoDomains = path.join(expectedCustomStagingSettingsPath, 'ar.al--and--small-tech.org')
  t.strictEquals(Configuration.certificateDirectoryPath, expectedCertificateDirectoryPathForTwoDomains, 'certificate directory path set as expected for two domains')
  t.true(fs.existsSync(expectedCertificateDirectoryPathForTwoDomains), 'certificate directory path created as expected for two domains')

  Configuration.reset()
  Configuration.initialise({ domains: ['ar.al', 'small-tech.org', 'sitejs.org'], staging: true, settingsPath: customSettingsPath })
  const expectedCertificateDirectoryPathForThreeDomains = path.join(expectedCustomStagingSettingsPath, 'ar.al--small-tech.org--and--sitejs.org')
  t.strictEquals(Configuration.certificateDirectoryPath, expectedCertificateDirectoryPathForThreeDomains, 'certificate directory path set as expected for two domains')
  t.true(fs.existsSync(expectedCertificateDirectoryPathForThreeDomains), 'certificate directory path created as expected for three domains')

  Configuration.reset()
  Configuration.initialise({ domains: ['ar.al', 'small-tech.org', 'sitejs.org', 'better.fyi'], staging: true, settingsPath: customSettingsPath })
  const expectedCertificateDirectoryPathForFourDomains = path.join(expectedCustomStagingSettingsPath, 'ar.al--small-tech.org--sitejs.org--and--better.fyi')
  t.strictEquals(Configuration.certificateDirectoryPath, expectedCertificateDirectoryPathForFourDomains, 'certificate directory path set as expected for four domains')
  t.true(fs.existsSync(expectedCertificateDirectoryPathForFourDomains), 'certificate directory path created as expected for two domains')

  Configuration.reset()
  Configuration.initialise({ domains: ['ar.al', 'small-tech.org', 'sitejs.org', 'better.fyi', 'laurakalbag.com'], staging: true, settingsPath: customSettingsPath })
  const expectedStartOfCertificateDirectoryPath = path.join(expectedCustomStagingSettingsPath, 'ar.al--small-tech.org--and--3--others')

  const lastSeparatorIndex = Configuration.certificateDirectoryPath.lastIndexOf('--')
  const startOfCertificateDirectoryPath = Configuration.certificateDirectoryPath.slice(0, lastSeparatorIndex)
  const endOfCertificateDirectoryPath = Configuration.certificateDirectoryPath.slice(lastSeparatorIndex+2)

  t.strictEquals(startOfCertificateDirectoryPath, expectedStartOfCertificateDirectoryPath, 'start of certificate directory path is as expected for more than four domains')
  t.strictEquals(endOfCertificateDirectoryPath.length, 64, 'certificate directory path ends with 64 character hash')
  t.ok(endOfCertificateDirectoryPath.match(/^[a-f\d]*?$/), 'certificate directory path ends with hexadecimal hash')
  t.true(fs.existsSync(Configuration.certificateDirectoryPath), 'certificate directory path created as expected for two domains')

  // Check the production path with custom settings path.
  Configuration.reset()
  Configuration.initialise({ domains: ['dev.ar.al'], staging: false, settingsPath: customSettingsPath })
  const expectedCustomProductionSettingsPath = path.join(customSettingsPath, 'production')
  t.strictEquals(Configuration.settingsPath, expectedCustomProductionSettingsPath)

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

  // Trying to re-initialise an already-initialised Configuration should fail.
  t.ok(throwsErrorOfType(
    () => { Configuration.initialise({domains: ['dev.ar.al'], staging: true, settingsPath: null}) },
    Symbol.for('Configuration.alreadyInitialisedError')
  ), 'attempt to reinitialise Configuration throws')

  t.end()
})
