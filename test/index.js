const os                                            = require('os')
const fs                                            = require('fs-extra')
const path                                          = require('path')
const util                                          = require('util')
const test                                          = require('tape')
const autoEncrypt                                   = require('../index')
const Configuration                                 = require('../lib/Configuration')
const {
  destroySingletons,
  createTestSettingsPath,
  throwsErrorOfType
}                                                   = require('../lib/test-helpers')

function setup() {
  // Destroy all singleton instances, test paths, and app state so we start with a clean slate.
  destroySingletons()
  createTestSettingsPath()
}

test('autoEncrypt', async t => {
  t.plan(12)

  setup()

  const hostname = os.hostname()
  const expectedDefaultDomains = [hostname, `www.${hostname}`]
  const expectedDefaultStaging = false
  const expectedDefaultSettingsPath =

  autoEncrypt()

  t.deepEquals(Configuration.domains, expectedDefaultDomains, 'default domains array set as expected')
  t.strictEquals(Configuration.staging, expectedDefaultStaging, 'default staging value set as expected')
  t.strictEquals(Configuration.settingsPath, Configuration.defaultPathFor('production'), 'default settings path value set as expected')

  // Tell autoEncrypt that the app is about to exit to give it time to perform housekeeping.
  // (Since we have a daily renewal check interval active on the certificate, it must remove this or else
  // it will stop the app from exiting.)
  autoEncrypt.prepareForAppExit()

  setup()

  const options = autoEncrypt({domains: [hostname], staging: true, settingsPath: testSettingsPath})

  t.strictEquals('{ SNICallback: [AsyncFunction] }', util.inspect(options), 'options object has the shape we expect')

  const expectedTestSettingsPath = path.join(testSettingsPath, 'staging')
  const expectedCertificatePath = path.join(expectedTestSettingsPath, hostname)

  t.strictEquals(true, Configuration.staging, 'staging is true')    // TODO: test default state of  false later
  t.ok(fs.existsSync(expectedCertificatePath), 'certificate path should exist')

  //
  // Call the SNICallback and test the results. Each call to SNICallback simulates a hit on the server.
  //

  await new Promise((resolve, reject) => {
    try {
      options.SNICallback('invalid-server.name', (error, secureContext) => {
        t.strictEquals(error.symbol, Symbol.for('SNIIgnoreUnsupportedDomainError'), 'unknown domains are ignored by SNI')
        t.notOk(secureContext, 'secure context is not truthy when SNI ignores unknown domain')
        resolve()
      })
    } catch (error) {
      reject(error)
    }
  })

  const secureContext = await new Promise((resolve, reject) => {
    // This (first valid) call to SNICallback should succeed in provisioning a Let’s Encrypt certificate
    // and getting a secure context back. This first call will take a while as it provisions certificates
    // using the Let’s Encrypt staging servers.
    try {
      options.SNICallback(hostname, (error, secureContext) => {
        t.strictEquals(error, null, 'error should be null')
        // As this is the call that should end later, we resolve the promise here.
        resolve(secureContext)
      })
    } catch (error) {
      reject(error)
    }

    // This (second valid) call to SNICallback will happen right after the first when the first call should be
    // busy provisioning the Let’s Encrypt certificate. It should return an error, accordingly.
    // This call should return immediately.
    try {
      options.SNICallback(hostname, (error, secureContext) => {
        t.strictEquals(error.symbol, Symbol.for('BusyProvisioningCertificateError'), 'requests are rejected while TLS certificates are being provisioned')
        t.notOk(secureContext, 'secure context is not truthy when SNI rejects a request')
      })
    } catch (error) {
      reject(error)
    }
  })

  t.strictEquals(util.inspect(secureContext), 'SecureContext { context: SecureContext {} }', 'the shape of returned secure context object is as we expect')

  autoEncrypt.prepareForAppExit()

  t.end()
})
