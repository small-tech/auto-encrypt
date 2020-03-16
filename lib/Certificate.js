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
      this.startCheckingForRenewal(/* alsoCheckNow = */ true)
    } else {
      console.log(' 📃 Certificate does not exist; will be provisioned on first hit of the server.')
    }
  }


  /**
   * Get a SecureContext that can be used in an SNICallback.
   *
   * @async
   * @memberof Certificate
   * @returns {tls.SecureContext}
   */
  async getSecureContext () {
    if (!this.secureContext) {
      // We don’t have the secure context yet, create it.
      if (this.busyCreatingSecureContext) {
        return null
      }
      await this.createSecureContext()
    }
    return this.secureContext
  }


  /**
   * Creates and caches a secure context, provisioning a TLS certificate in the process, if necessary.
   *
   * @async
   * @memberof Certificate
   */
  async createSecureContext () {
    this.busyCreatingSecureContext = true

    // If a certificate does not already exist, provision one.
    if (!this.certificate) {
      await this.provisionCertificate()
    }

    // Create and cache the secure context.
    this.secureContext = tls.createSecureContext({
      key: this.key,
      cert: this.certificate
    })

    this.busyCreatingSecureContext = false
  }


  /**
   * Provisions a new Let’s Encrypt TLS certificate, persists it, and checks for
   * renewals on it every day, starting with the next day.
   *
   * @memberof Certificate
   */
  async provisionCertificate () {
    console.log(` 🤖 [Auto Encrypt] Provisioning Let’s Encrypt certificates for ${this.domains}.`)
    this.account = await Account.getSharedInstance()
    this.order = await Order.getInstanceAsync(this.domains)
    console.log('Final order', this.order)
    this.certificate = this.order.certificate

    // Is this necessary? 👇
    // TODO: [ ] check metadata to ensure the domains match the certificate we have.
    //       [ ] save that metadata so we can check for it.

    // Save the certificate.
    try {
      await fs.writeFile(this.certificatePath, this.certificate, 'utf-8')
    } catch (error) {
      throw new Error(error)
    }

    // Start checking for renewal updates, every day, starting tomorrow.
    this.startCheckingForRenewal(/* alsoCheckNow = */ false)

    console.log(` 🤖🎉 Auto Encrypt: successfully provisioned Let’s Encrypt certificates for ${this.domains}.`)
  }


  /**
   * Checks if the certificate needs to be renewed (if it is within 30 days of its expiry date) and, if so, renews it.
   *
   * @memberof Certificate
   */
  checkForRenewal () {
    console.log( ' 🧐 [Auto Encrypt] Checking if we need to renew the certificate… ')
    const currentDate = moment()
    if (currentDate.isSameOrAfter(this.renewalDate)) {
      // Certificate needs renewal.
      console.log(` 🌱 [Auto Encrypt] Certificate expires in 30 days or less. Renewing certificate…`)
      // Note: this is not a blocking process. We will transparently start using the new certificate when it is
      // ===== ready.
      console.log('TODO')
    } else {
      console.log(' 👍 [Auto Encrypt] Certificate has more than 30 days before it expires. Will check again tomorrow.')
    }
  }


  /**
   * Starts checking for certificate renewals every 24 hours.
   *
   * @param {boolean} [alsoCheckNow=false] If true, will also immediately check
   * for renewal when the function is called (use this when loading a previously-provisioned and persisted certificate
   * from disk).
   * @memberof Certificate
   */
  startCheckingForRenewal (alsoCheckNow = false) {
    //
    // Check for certificate renewal now and then once every day from there on.
    //
    this.certificateDetails = certInfo(this.certificate)
    this.issueDate = moment(this.certificateDetails.issuedAt)
    this.expiryDate = moment(this.certificateDetails.expiresAt)

    console.log(` 📆 Certificate was issued ${this.issueDate.calendar().toLowerCase()} (${this.issueDate.fromNow()}) and expires ${this.expiryDate.calendar().toLowerCase()} (${this.expiryDate.fromNow()}).`)

    this.renewalDate = this.expiryDate.clone().subtract(30, 'days')

    // Also check for renewal immediately if asked to.
    if (alsoCheckNow) {
      this.checkForRenewal()
    }

    // And also once a day from thereon for as long as the server is running.
    const onceADay = 24 /* hours */ * 60 /* minutes */ * 60 /* seconds */ * 1000 /* ms */
    this.checkForRenewalIntervalId = setInterval(this.checkForRenewal, onceADay)

    console.log(' ⏲ [Auto Encrypt] Set up timer to check for certificate renewal once a day.')
  }


  /**
   * Stops the timer that checks for renewal daily. Use this during housekeeping before destroying this object.
   *
   * @memberof Certificate
   */
  stopCheckingForRenewal () {
    clearInterval(this.checkForRenewalIntervalId)
  }
}

module.exports = Certificate
