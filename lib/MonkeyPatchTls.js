const fs  = require('fs')
const tls = require('tls')

class MonkeyPatchTLS {
  static PEBBLE_ROOT_CERTIFICATE = './test/pebble/test/certs/pebble.minica.pem'
  static STAGING_ROOT_CERTIFICATE = './test/fixtures/fakelerootx1.pem'

  /**
   * Monkey patches the TLS module to accept the certificate at the passed path.
   *
   * @static
   * @param {String} certificatePath Either MonkeyPatchTLS.PEBBLE_ROOT_CERTIFICATE
   *                                 or MonkeyPatchTLS.STAGING_ROOT_CERTIFICATE
   */
  static toAccept(certificatePath) {
    // Courtesy https://medium.com/trabe/monkey-patching-tls-in-node-js-to-support-self-signed-certificates-with-custom-root-cas-25c7396dfd2a
    const origCreateSecureContext = tls.createSecureContext

    tls.createSecureContext = options => {
      const context = origCreateSecureContext(options)

      const pem = fs
      .readFileSync(certificatePath, { encoding: 'ascii' })
      .replace(/\r\n/g, "\n")

      const certificates = pem.match(/-----BEGIN CERTIFICATE-----\n[\s\S]+?\n-----END CERTIFICATE-----/g)

      if (!certificates) {
        // TODO: Throw SymbolicError
        throw new Error(`Could not parse certificate at ${certificatePath}`)
      }

      certificates.forEach(certificate => {
        context.context.addCACert(certificate.trim())
      })

      return context
    }
  }
}

module.exports = MonkeyPatchTLS
