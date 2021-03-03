import Identity from '../Identity.js'
import Throws from '../util/Throws.js'
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
export default class CertificateIdentity extends Identity {
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
