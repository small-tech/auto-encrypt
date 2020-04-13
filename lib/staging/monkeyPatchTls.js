/**
 * Monkey patches the TLS module to accept run-time root and intermediary Certificate Authority (CA) certificates.
 *
 * Based on the method provided by David Barral at https://link.medium.com/6xHYLeUVq5.
 *
 * @module
 * @copyright Copyright © 2020 Aral Balkan, Small Technology Foundation.
 * @license AGPLv3 or later.
 */
const fs   = require('fs')
const tls  = require('tls')

/**
 * Monkey patches the TLS module to accept the Let’s Encrypt staging certificate.
 *
 * @alias module:lib/MonkeyPatchTls
 */
function monkeyPatchTLS () {
  const originalCreateSecureContext = tls.createSecureContext

  let pem = fs
  .readFileSync('./test/fixtures/fakelerootx1.pem', { encoding: 'ascii' })
  .replace(/\r\n/g, "\n")

  const certificates = pem.match(/-----BEGIN CERTIFICATE-----\n[\s\S]+?\n-----END CERTIFICATE-----/g)

  tls.createSecureContext = options => {
    const context = originalCreateSecureContext(options)

    certificates.forEach(certificate => {
      context.context.addCACert(certificate.trim())
    })

    return context
  }
}

module.exports = monkeyPatchTLS
