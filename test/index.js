const os                         = require('os')
const https                      = require('https')
const AutoEncrypt                = require('..')
const bent                       = require('bent')
const test                       = require('tape')
const MonkeyPatchTls             = require('../lib/MonkeyPatchTls')
const { createTestSettingsPath } = require('../lib/test-helpers')

const httpsGetString = bent('GET', 'string')

test('Auto Encrypt', async t => {

  // Run the tests using either a local Pebble server (default) or the Let’s Encrypt Staging server
  // (which is subject to rate limits) if the STAGING environment variable is set.
  // Use npm test task for the former and npm run test-staging task for the latter.
  const letsEncryptServerType = process.env.STAGING ? AutoEncrypt.serverType.STAGING : AutoEncrypt.serverType.PEBBLE

  const testSettingsPath = createTestSettingsPath()

  const hostname = os.hostname()
  let options = {
    domains: [hostname],
    serverType: letsEncryptServerType,
    settingsPath: testSettingsPath
  }
  const server = AutoEncrypt.https.createServer(options, (request, response) => {
    response.end('ok')
  })

  t.ok(server instanceof https.Server, 'https.Server instance returned as expected')

  // Although Auto Encrypt monkey patches Node.js TLS to load the Pebble servers root certificate,
  // in order to actually test our server, we also need to add the dynamically-generated Pebble CA’s
  // root and intermediary certificates. That’s what this does.
  const pebbleCaRootAndIntermediaryCertificates = await MonkeyPatchTls.downloadPebbleCaRootAndIntermediaryCertificates()
  MonkeyPatchTls.toAccept(MonkeyPatchTls.PEBBLE_ROOT_CERTIFICATE, pebbleCaRootAndIntermediaryCertificates)

  await new Promise ((resolve, reject) => {
    server.listen(443, () => {
      resolve()
    })
  })

  const urlToHit = `https://${ process.env.STAGING ? hostname : 'localhost' }`

  const response = await httpsGetString(urlToHit)

  t.strictEquals(response, 'ok', 'response is as expected')

  server.close()
  AutoEncrypt.shutdown()

  // Create a second server. This time, it should get the certificate from disk.
  // Note: recreating options object as original one was passed by reference and
  // ===== no longer contains the initial settings.
  options = {
    domains: [hostname],
    serverType: letsEncryptServerType,
    settingsPath: testSettingsPath
  }
  const server2 = AutoEncrypt.https.createServer(options, (request, response) => {
    response.end('ok')
  })

  t.ok(server2 instanceof https.Server, 'second https.Server instance returned as expected')

  // Although Auto Encrypt monkey patches Node.js TLS to load the Pebble servers root certificate,
  // in order to actually test our server, we also need to add the dynamically-generated Pebble CA’s
  // root and intermediary certificates. That’s what this does.
  MonkeyPatchTls.toAccept(MonkeyPatchTls.PEBBLE_ROOT_CERTIFICATE, pebbleCaRootAndIntermediaryCertificates)

  await new Promise ((resolve, reject) => {
    server2.listen(443, () => {
      resolve()
    })
  })

  const response2 = await httpsGetString(urlToHit)
  t.strictEquals(response, 'ok', 'second response is as expected')

  server2.close()
  AutoEncrypt.shutdown()

  t.end()
})
