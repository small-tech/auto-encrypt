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
const Account = require('./Account')
const Order = require('./Order')
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

    this.key = (CertificateIdentity.getSharedInstance()).privatePEM

    // If the certificate already exists, load and cache it.
    this.certificate = null
    this.certificatePath = path.join(Configuration.settingsPath, 'certificate.pem')
    if (fs.existsSync(this.certificatePath)) {
      this.certificate = fs.readFileSync(this.certificatePath, 'utf-8')

      console.log(' 📃 Certificate exists, loaded it from disk.')
    } else {
      console.log(' 📃 Certificate does not exist; will be provisioned on first hit of the server.')
    }

    // TODO: load and cache certificate metadata so the getSecureContext() method can
    // ===== check for renewal.
  }


  /**
   * Get a SecureContext that can be used in an SNICallback.
   * @async
   * @memberof Certificate
   * @returns {tls.SecureContext}
   */
  async getSecureContext (domains) {

    // TODO: [ ] check metadata to ensure the domains match the certificate we have.
    //       [ ] save that metadata so we can check for it.

    // TODO: check if the certificate needs to be renewed. []

    if (!this.certificate) {
      // We don’t have a certificate yet. Provision it.
      if (this.busyProvisioningCertificates) {
        return null
      }
      this.busyProvisioningCertificates = true
      console.log(` 🤖 Auto Encrypt: provisioning Let’s Encrypt certificates for ${domains}.`)
      this.account = await Account.getSharedInstance()
      this.order = await Order.getSharedInstance(domains)
      this.certificate = this.order.certificate

      await new Promise((resolve, reject) => {
        fs.writeFile(this.certificatePath, this.certificate, 'utf-8', error => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })

      console.log(`  🤖🎉 Auto Encrypt: successfully provisioned Let’s Encrypt certificates for ${domains}.`)

      this.busyProvisioningCertificates = false
    }

    const secureContext = tls.createSecureContext({
      key: this.key,
      cert: this.certificate
    })

    return secureContext
  }
}

module.exports = Certificate
