////////////////////////////////////////////////////////////////////////////////
//
// Certificate
//
// (Singleton; please use Certificate.getSharedInstance() (async) to access.)
//
// Represents a Let’s Encrypt TLS certificate.
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const path = require('path')
const fs = require('fs-extra')

const tls = require('tls')
const Account = require('./lib/Account')
const Order = require('./lib/Order')
const CertificateIdentity = require('./CertificateIdentity')
const Configuration = require('./Configuration')

/**
 * Represents a Let’s Encrypt TLS certificate.
 *
 * @class Certificate
 * @hideconstructor
 */
class Certificate {
  //
  // Singleton access (async).
  //
  static instance = null
  static isBeingInstantiatedViaSingletonFactoryMethod = false

  /**
   * Factory method.
   * @return {Certificate}
   */
  static getSharedInstance () {
    if (Certificate.instance === null) {
      Certificate.isBeingInstantiatedViaSingletonFactoryMethod = true
      Certificate.instance = new Certificate()
    }
    return Certificate.instance
  }

  //
  // Private.
  //


  /**
   * @access private
   */
  constructor () {
    // Ensure singleton access.
    if (Certificate.isBeingInstantiatedViaSingletonFactoryMethod === false) {
      throw new Error('Certificate is a singleton. Please instantiate using the Certificate.getSharedInstance() method.')
    }
    Certificate.isBeingInstantiatedViaSingletonFactoryMethod = false

    this.privateKeyPEM = CertificateIdentity.getSharedInstance().privateKeyPEM

    // If the certificate already exists, load and cache it.
    this.certificate = null
    const certificatePath = path.join(Configuration.settingsPath, 'certificate.pem')
    if (fs.existsSync(certificatePath)) {
      this.certificate = fs.readFileSync(certificatePath, 'utf-8')
    }

    // TODO: load and cache certificate metadata so the get() method can
    // ===== check for renewal.
  }


  /**
   * Get a SecureContext that can be used in an SNICallback.
   * @async
   * @memberof Certificate
   * @returns {tls.SecureContext}
   */
  async getSecureContext () {

    // TODO: check if the certificate needs to be renewed. []

    if (!this.certificate) {
      // We don’t have a certificate yet. Provision it.
      this.account = await Account.getSharedInstance()
      this.order = await Order.getSharedInstance(this.domains)
      this.certificate = order.certificate
    }

    return
  }
}

module.exports = Certificate
