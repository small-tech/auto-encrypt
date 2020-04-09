const os                         = require('os')
const fs                         = require('fs-extra')
const path                       = require('path')
const util                       = require('util')
const tls                        = require('tls')
const test                       = require('tape')
const Certificate                = require('../../lib/Certificate')
const Configuration              = require('../../lib/Configuration')
const LetsEncryptServer          = require('../../lib/LetsEncryptServer')
const { dehydrate, timeItAsync } = require('../../lib/test-helpers')

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
  fs.removeSync(customSettingsPath)
  return new Configuration({
    domains: domains[letsEncryptServerType],
    server: new LetsEncryptServer(letsEncryptServerType),
    settingsPath: customSettingsPath
  })
}

test('Certificate', async t => {
  const configuration = setup()
  //
  // Test initial certificate creation.
  //

  const certificate = new Certificate(configuration)
  t.pass('initial certificate instantiation succeeds')

  const actualInitialCertificateState = dehydrate(util.inspect(certificate))
  const expectedInitialCertificateState = dehydrate(`#Certificate Certificate not provisioned.`)
  t.strictEquals(actualInitialCertificateState, expectedInitialCertificateState, 'initial certificate state is as expected')

  //
  // Test initial call to getSecureContext(). This should provision the certificate and return the secure context.
  //

  const { returnValue: secureContext, duration: duration1 } = await timeItAsync(() => certificate.getSecureContext())

  t.ok(secureContext instanceof tls.SecureContext, 'secure context is returned as expected')

  const { duration: duration2 } = await timeItAsync(() => certificate.getSecureContext())

  // The second call should return immediately (~0ms) but, to be safe, we are allowing it to take up to 10s of ms.
  t.ok(duration2 < 100, `second call returns in < 100ms (actual = ${duration2}ms)`)
  t.ok(duration1 > (duration2 * 100), 'second call returns orders of magnitude faster than the first as expected')

  const actualCertificateState = dehydrate(util.inspect(certificate))
  t.notStrictEquals(actualCertificateState, expectedInitialCertificateState, 'certificate state changes after secure context is created as expected')

  certificate.stopCheckingForRenewal()

  const certificate2 = new Certificate(configuration)
  const actualCertificate2State = dehydrate(util.inspect(certificate2))

  t.pass('subsequent certificate instantiation succeeds')
  t.notStrictEquals(actualCertificate2State, expectedInitialCertificateState, 'certificate loaded from cache as expected on subsequent access')
  t.strictEquals(certificate.serialNumber, certificate2.serialNumber, 'same certificate is returned during initial and subsequent access')

  certificate2.stopCheckingForRenewal()

  t.end()
})
