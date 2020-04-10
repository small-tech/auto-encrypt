const Identity = require('../Identity')
const Throws = require('../util/Throws')
const throws = new Throws()

/**
 * Generates, stores, loads, and saves the certificate identity. The default
 * certificate identity file path is:
 *
 * ~/.small-tech.org/auto-encrypt/certificate-identity.pem
 *
 * @class CertificateIdentity
 * @extends {Identity}
 * @copyright Aral Balkan, Small Technology Foundation
 * @license AGPLv3 or later
 */
class CertificateIdentity extends Identity {
  /**
   * Creates an instance of CertificateIdentity.
   *
   * @param {Configuration} configuration (Required) Configuration instance.
   * @memberof CertificateIdentity
   */
  constructor (configuration = throws.ifMissing()) {
    super(configuration, 'certificateIdentityPath')
  }
}

module.exports = CertificateIdentity
