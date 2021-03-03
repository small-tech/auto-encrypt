import os from 'os'
import fs from 'fs-extra'
import path from 'path'
import util from 'util'
import test from 'tape'
import LetsEncryptServer from '../../lib/LetsEncryptServer.js'
import Configuration from '../../lib/Configuration.js'
import { throwsErrorOfType, dehydrate } from '../../lib/test-helpers/index.js'

test('Configuration', async t => {
  t.plan(35)

  const letsEncryptStagingServer = new LetsEncryptServer(LetsEncryptServer.type.STAGING)

  t.ok(throwsErrorOfType(
    () => { new Configuration() },
    Symbol.for('UndefinedOrNullError')
  ), 'missing parameter object throws')

  t.ok(throwsErrorOfType(
    () => { new Configuration({server: letsEncryptStagingServer, settingsPath: null}) },
    Symbol.for('Configuration.domainsArrayIsNotAnArrayOfStringsError')
  ), 'missing settings.domains throws')


  t.ok(throwsErrorOfType(
    () => { new Configuration({domains: ['dev.ar.al'], settingsPath: null}) },
    Symbol.for('UndefinedOrNullError')
  ), 'missing settings.staging throws')

  t.ok(throwsErrorOfType(
    () => { new Configuration({domains: ['dev.ar.al'], server: letsEncryptStagingServer}) },
    Symbol.for('UndefinedError')
  ), 'undefined settings.settingsPath throws')

  t.ok(throwsErrorOfType(
    () => { new Configuration({domains: ['dev.ar.al'], server: LetsEncryptServer.type.STAGING, settingsPath: null}) },
    Symbol.for('ArgumentError')
  ), 'throws if server.settings is not an instance of LetsEncryptServer')

  t.doesNotThrow(
    () => { new Configuration({domains: ['dev.ar.al'], server: letsEncryptStagingServer, settingsPath: null}) },
    'settings.settingsPath = null does not throw'
  )

  t.ok(throwsErrorOfType(
    () => { new Configuration({domains: ['dev.ar.al', 1, 2, 3], server: letsEncryptStagingServer, settingsPath: null}) },
    Symbol.for('Configuration.domainsArrayIsNotAnArrayOfStringsError')
  ), 'domains must be an array of string or else it throws')

  //
  // Test staging configuration with custom settings path.
  //

  let configuration

  const customSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.removeSync(customSettingsPath)

  configuration = new Configuration({ domains: ['dev.ar.al'], server: letsEncryptStagingServer, settingsPath: customSettingsPath })

  //
  // Settings path.
  //

  const expectedCustomStagingSettingsPath = path.join(customSettingsPath, 'staging')

  t.strictEquals(configuration.settingsPath, expectedCustomStagingSettingsPath, 'settings path set as expected')

  t.true(fs.existsSync(expectedCustomStagingSettingsPath), 'settings path is created as expected')

  //
  // Certificate directory path.
  //

  const expectedCertificateDirectoryPath = path.join(expectedCustomStagingSettingsPath, 'dev.ar.al')

  t.strictEquals(configuration.certificateDirectoryPath, expectedCertificateDirectoryPath, 'certificate directory path set as expected')

  t.true(fs.existsSync(expectedCertificateDirectoryPath), 'certificate directory path created as expected')

  //
  // Inspection string.
  //

  const dehydratedExpectedInspectionString = dehydrate(`
  # Configuration (class)

  A single location for shared configuration.

  Using staging server paths.

  Property                   Description                             Value
  -------------------------- --------------------------------------- ---------------------------------------
  .server                  : Lets Encrypt Server details             {name: 'staging', endpoint: 'https://acme-staging-v02.api.letsencrypt.org/directory}'
  .domains                 : Domains in certificate                  dev.ar.al
  .settingsPath            : Top-level settings path                 /home/aral/.small-tech.org/auto-encrypt/test/staging
  .accountPath             : Path to LE account details JSON file    /home/aral/.small-tech.org/auto-encrypt/test/staging/account.json
  .accountIdentityPath     : Path to private key for LE account      /home/aral/.small-tech.org/auto-encrypt/test/staging/account-identity.pem
  .certificateDirectoryPath: Path to certificate directory           /home/aral/.small-tech.org/auto-encrypt/test/staging/dev.ar.al
  .certificatePath         : Path to certificate file                /home/aral/.small-tech.org/auto-encrypt/test/staging/dev.ar.al/certificate.pem
  .certificateIdentityPath : Path to private key for certificate     /home/aral/.small-tech.org/auto-encrypt/test/staging/dev.ar.al/certificate-identity.pem`)

  t.strictEquals(dehydrate(util.inspect(configuration)), dehydratedExpectedInspectionString, 'the inspection string is as expected')

  //
  // Also test certificate directory path is created properly when configuration
  // has 2-4 domains and more than 4 domains.
  //

  configuration = new Configuration({ domains: ['ar.al', 'small-tech.org'], server: letsEncryptStagingServer, settingsPath: customSettingsPath })

  const expectedCertificateDirectoryPathForTwoDomains = path.join(expectedCustomStagingSettingsPath, 'ar.al--and--small-tech.org')

  t.strictEquals(configuration.certificateDirectoryPath, expectedCertificateDirectoryPathForTwoDomains, 'certificate directory path set as expected for two domains')

  t.true(fs.existsSync(expectedCertificateDirectoryPathForTwoDomains), 'certificate directory path created as expected for two domains')

  //
  // Test configuration with three domains.
  //

  configuration = new Configuration({ domains: ['ar.al', 'small-tech.org', 'sitejs.org'], server: letsEncryptStagingServer, settingsPath: customSettingsPath })

  const expectedCertificateDirectoryPathForThreeDomains = path.join(expectedCustomStagingSettingsPath, 'ar.al--small-tech.org--and--sitejs.org')

  t.strictEquals(configuration.certificateDirectoryPath, expectedCertificateDirectoryPathForThreeDomains, 'certificate directory path set as expected for two domains')

  t.true(fs.existsSync(expectedCertificateDirectoryPathForThreeDomains), 'certificate directory path created as expected for three domains')

  //
  // Test configuration with four domains.
  //

  configuration = new Configuration({ domains: ['ar.al', 'small-tech.org', 'sitejs.org', 'better.fyi'], server: letsEncryptStagingServer, settingsPath: customSettingsPath })

  const expectedCertificateDirectoryPathForFourDomains = path.join(expectedCustomStagingSettingsPath, 'ar.al--small-tech.org--sitejs.org--and--better.fyi')

  t.strictEquals(configuration.certificateDirectoryPath, expectedCertificateDirectoryPathForFourDomains, 'certificate directory path set as expected for four domains')

  t.true(fs.existsSync(expectedCertificateDirectoryPathForFourDomains), 'certificate directory path created as expected for two domains')

  //
  // Test configuration with more than four domains.
  //

  configuration = new Configuration({ domains: ['ar.al', 'small-tech.org', 'sitejs.org', 'better.fyi', 'laurakalbag.com'], server: letsEncryptStagingServer, settingsPath: customSettingsPath })
  const expectedStartOfCertificateDirectoryPath = path.join(expectedCustomStagingSettingsPath, 'ar.al--small-tech.org--and--3--others')

  const lastSeparatorIndex = configuration.certificateDirectoryPath.lastIndexOf('--')
  const startOfCertificateDirectoryPath = configuration.certificateDirectoryPath.slice(0, lastSeparatorIndex)
  const endOfCertificateDirectoryPath = configuration.certificateDirectoryPath.slice(lastSeparatorIndex+2)

  t.strictEquals(startOfCertificateDirectoryPath, expectedStartOfCertificateDirectoryPath, 'start of certificate directory path is as expected for more than four domains')

  t.strictEquals(endOfCertificateDirectoryPath.length, 64, 'certificate directory path ends with 64 character hash')

  t.ok(endOfCertificateDirectoryPath.match(/^[a-f\d]*?$/), 'certificate directory path ends with hexadecimal hash')

  t.true(fs.existsSync(configuration.certificateDirectoryPath), 'certificate directory path created as expected for two domains')

  //
  // Check the production path with custom settings path.
  //

  configuration = new Configuration({ domains: ['dev.ar.al'], server: new LetsEncryptServer(LetsEncryptServer.type.PRODUCTION), settingsPath: customSettingsPath })

  const expectedCustomProductionSettingsPath = path.join(customSettingsPath, 'production')
  t.strictEquals(configuration.settingsPath, expectedCustomProductionSettingsPath)

  //
  // Staging.
  //

  const defaultSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt')
  const defaultStagingSettingsPath = path.join(defaultSettingsPath, 'staging')

  configuration = new Configuration({domains: ['dev.ar.al'], server: letsEncryptStagingServer, settingsPath: null})

  t.strictEquals(configuration.settingsPath, defaultStagingSettingsPath, 'default staging settings path is set as expected')

  t.true(fs.existsSync(defaultStagingSettingsPath), 'the default staging settings path is created')

  //
  // Production.
  //

  const defaultProductionSettingsPath = path.join(defaultSettingsPath, 'production')

  configuration = new Configuration({domains: ['dev.ar.al'], server: new LetsEncryptServer(LetsEncryptServer.type.PRODUCTION), settingsPath: null})

  t.strictEquals(configuration.settingsPath, defaultProductionSettingsPath, 'default production settings path is set as expected')

  t.true(fs.existsSync(defaultProductionSettingsPath), 'the default production settings path is created')

  //
  // Attempting to directly set a configuration property should throw.
  //

  ;['server', 'domains', 'settingsPath', 'accountPath', 'accountIdentityPath', 'certificatePath', 'certificateDirectoryPath', 'certificateIdentityPath'].forEach(setter => {
    t.ok(throwsErrorOfType(
      () => { configuration[setter] = true },
      Symbol.for('ReadOnlyAccessorError')
    ), `attempt to set read-only property ${setter} throws`)
  })

  t.end()
})
