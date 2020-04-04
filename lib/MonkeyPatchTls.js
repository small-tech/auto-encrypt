const fs   = require('fs')
const tls  = require('tls')
const bent = require('bent')

class MonkeyPatchTLS {
  static #originalCreateSecureContext = null

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
    const originalCreateSecureContext = tls.createSecureContext
    this.#originalCreateSecureContext = originalCreateSecureContext

    tls.createSecureContext = options => {
      const context = originalCreateSecureContext(options)

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

  static async toAcceptPebbleCARootAndIntermediary() {
    if (this.#originalCreateSecureContext === null) {
      this.#originalCreateSecureContext = tls.createSecureContext
    }
    const originalCreateSecureContext = this.#originalCreateSecureContext

    // Get the root certificate for the pebble server.
    let pem = fs
    .readFileSync(MonkeyPatchTLS.PEBBLE_ROOT_CERTIFICATE, { encoding: 'ascii' })
    .replace(/\r\n/g, "\n")

    // Now, get the Pebble CA root and intermediary certificates also
    // (which are regenerated every time because fuck you and that’s why we
    // need this whole freaking circus.)
    // See https://github.com/letsencrypt/pebble#ca-root-and-intermediate-certificates
    const httpsGetString = bent('GET', 'string')

    const rootCaUrl = 'https://localhost:15000/roots/0'
    const intermediaryCaUrl = 'https://localhost:15000/intermediates/0'

    const rootCa = await httpsGetString(rootCaUrl)
    const intermediaryCa = await httpsGetString(intermediaryCaUrl)

    pem = `${pem}\n${rootCa}\n${intermediaryCa}`

    const certificates = pem.match(/-----BEGIN CERTIFICATE-----\n[\s\S]+?\n-----END CERTIFICATE-----/g)

    if (!certificates) {
      // TODO: Throw SymbolicError
      throw new Error(`Could not parse certificate at ${certificatePath}`)
    }

    tls.createSecureContext = options => {
      const context = originalCreateSecureContext(options)

      certificates.forEach(certificate => {
        context.context.addCACert(certificate.trim())
      })

      return context
    }
  }
}

module.exports = MonkeyPatchTLS
