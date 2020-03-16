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

const fs = require('fs-extra')
const tls = require('tls')
const moment = require('moment')
const Account = require('./Account')
const Order = require('./Order')
const CertificateIdentity = require('./CertificateIdentity')
const Configuration = require('./Configuration')
const certInfo = require('./x.509/cert-info').info

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
   * @param {String[]} domains List of domains that this certificate is for.
   * @return {Certificate}
   */
  static getSharedInstance (domains = Configuration.domains) {
    if (Certificate.instance === null) {
      Certificate.isBeingInstantiatedViaSingletonFactoryMethod = true
      Certificate.instance = new Certificate(domains)
    }

    // FIXME: The following 👇 causes a crash when a certificate couldn’t be
    // ===== read from disk.

    // LEFT OFF HERE

    //
    // Check for certificate renewal now and then once every day from there on.
    //
    const certificateDetails = certInfo(Certificate.instance.certificate)
    const issueDate = moment(certificateDetails.issuedAt)
    const expiryDate = moment(certificateDetails.expiresAt)

    console.log(` 📆 Certificate was issued ${issueDate.calendar().toLowerCase()} (${issueDate.fromNow()}) and expires ${expiryDate.calendar().toLowerCase()} (${expiryDate.fromNow()}).`)

    const renewalDate = expiryDate.clone().subtract(30, 'days')
    const checkForRenewal = () => {
      console.log( ' 🧐 [Auto Encrypt] Checking if we need to renew the certificate… ')
      const currentDate = moment()
      if (currentDate.isSameOrAfter(renewalDate)) {
        // Certificate needs renewal.
        console.log(` 🌱 [Auto Encrypt] Certificate expires in 30 days or less. Renewing certificate…`)
        // Note: this is not a blocking process. We will transparently start using the new certificate when it is
        // ===== ready.
      } else {
        console.log(' 👍 [Auto Encrypt] Certificate has more than 30 days before it expires. Will check again tomorrow.')
      }
    }

    // Check for renewal immediately.
    checkForRenewal()

    // And also once a day from thereon for as long as the server is running.
    const onceADay = 24 /* hours */ * 60 /* minutes */ * 60 /* seconds */ * 1000 /* ms */
    Certificate.checkForRenewalIntervalId = setInterval(checkForRenewal, onceADay)

    return Certificate.instance
  }

  //
  // Private.
  //


  /**
   * @access private
   */
  constructor (domains) {
    // Ensure singleton access.
    if (Certificate.isBeingInstantiatedViaSingletonFactoryMethod === false) {
      throw new Error('Certificate is a singleton. Please instantiate using the Certificate.getSharedInstance() method.')
    }
    Certificate.isBeingInstantiatedViaSingletonFactoryMethod = false

    this.domains = domains
    this.key = (CertificateIdentity.getSharedInstance()).privatePEM

    // If the certificate already exists, load and cache it.
    this.certificate = null
    this.certificatePath = Configuration.certificatePath
    if (fs.existsSync(this.certificatePath)) {
      this.certificate = fs.readFileSync(this.certificatePath, 'utf-8')
      console.log(' 📃 Certificate exists, loaded it from disk.')
    } else {
      console.log(' 📃 Certificate does not exist; will be provisioned on first hit of the server.')
    }
  }


  /**
   * Get a SecureContext that can be used in an SNICallback.
   * @async
   * @memberof Certificate
   * @returns {tls.SecureContext}
   */
  async getSecureContext () {

    // TODO: [ ] check metadata to ensure the domains match the certificate we have.
    //       [ ] save that metadata so we can check for it.

    // TODO: check if the certificate needs to be renewed. []

    if (!this.certificate) {
      // We don’t have a certificate yet. Provision it.
      if (this.busyProvisioningCertificates) {
        return null
      }
      this.busyProvisioningCertificates = true
      console.log(` 🤖 Auto Encrypt: provisioning Let’s Encrypt certificates for ${this.domains}.`)
      this.account = await Account.getSharedInstance()
      this.order = await Order.getInstanceAsync(this.domains)
      console.log('Final order', this.order)
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

      console.log(` 🤖🎉 Auto Encrypt: successfully provisioned Let’s Encrypt certificates for ${this.domains}.`)

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
