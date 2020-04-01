const fs                         = require('fs')
const tls                        = require("tls")
const os                         = require('os')
const https                      = require('https')
const AutoEncrypt                = require('..')
const bent                       = require('bent')
const test                       = require('tape')
const { createTestSettingsPath } = require('../lib/test-helpers')

const httpsGetString = bent('GET', 'string')

// Since we’re using the staging server, we monkey patch the TLS module to add
// the Let’s Encrypt staging certificate to it.
monkeyPatchTlsToAcceptLetsEncryptStagingCertificate()

test('Auto Encrypt', async t => {

  const testSettingsPath = createTestSettingsPath()

  const hostname = os.hostname()
  const options = {
    domains: [hostname],
    staging: true,
    settingsPath: testSettingsPath
  }
  const server = AutoEncrypt.https.createServer(options, (request, response) => {
    response.end('ok')
  })

  t.ok(server instanceof https.Server, 'https.Server instance returned as expected')

  await new Promise ((resolve, reject) => {
    server.listen(443, () => {
      resolve()
    })
  })

  const response = await httpsGetString(`https://${hostname}/`)

  t.strictEquals(response, 'ok', 'response is as expected')

  server.close()
  AutoEncrypt.shutdown()

  // Create a second server. This time, it should get the certificate from disk.
  const server2 = AutoEncrypt.https.createServer(options, (request, response) => {
    response.end('ok')
  })

  t.ok(server2 instanceof https.Server, 'second https.Server instance returned as expected')

  await new Promise ((resolve, reject) => {
    server2.listen(443, () => {
      resolve()
    })
  })

  const response2 = await httpsGetString(`https://${hostname}/`)
  t.strictEquals(response, 'ok', 'second response is as expected')

  server2.close()
  AutoEncrypt.shutdown()

  t.end()
})

function monkeyPatchTlsToAcceptLetsEncryptStagingCertificate () {
  // From https://medium.com/trabe/monkey-patching-tls-in-node-js-to-support-self-signed-certificates-with-custom-root-cas-25c7396dfd2a
  const origCreateSecureContext = tls.createSecureContext

  tls.createSecureContext = options => {
    const context = origCreateSecureContext(options)

    const pem = fs
    .readFileSync("./test/fixtures/fakelerootx1.pem", { encoding: "ascii" })
    .replace(/\r\n/g, "\n")

    const certs = pem.match(/-----BEGIN CERTIFICATE-----\n[\s\S]+?\n-----END CERTIFICATE-----/g)

    if (!certs) {
      throw new Error(`Could not parse certificate ./rootCA.crt`)
    }

    certs.forEach(cert => {
      context.context.addCACert(cert.trim())
    })

    return context
  }
}
