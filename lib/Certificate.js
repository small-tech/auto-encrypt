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

  /**
   * Factory method.
   * @param {String[]} domains List of domains that this certificate is for.
   * @return {Certificate}
   */
  static getSharedInstance (domains = Configuration.domains) {
    if (Certificate.#instance === null) {
      Certificate.#isBeingInstantiatedViaSingletonFactoryMethod = true
      Certificate.#instance = new Certificate(domains)
    }
    return Certificate.#instance
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
      if (this.#busyCreatingSecureContextForTheFirstTime) {
        return null
      }
      await this.createSecureContext()
    }
    return this.#secureContext
  }

  //
  // Private.
  //

  // Singleton access
  static #instance = null
  static #isBeingInstantiatedViaSingletonFactoryMethod = false

  #secureContext = null
  #domains = null
  #renewalDate = null
  #checkForRenewalIntervalId = null
  #busyCreatingSecureContextForTheFirstTime = false

  #_pem = null
  #_identity = null
  #_key = null
  #_details = null
  #_issueDate = null
  #_expiryDate = null

  set pem (certificatePem) {
    this.#_pem = certificatePem

    // Also extract certificate details for the first certificate (in case there are intermediaries).
    const firstCertificatePem = certificatePem.slice(0, certificatePem.indexOf('-----END CERTIFICATE-----'))
    const certificateDetails = certInfo(firstCertificatePem)
    this.#_issueDate = moment(certificateDetails.issuedAt)
    this.#_expiryDate = moment(certificateDetails.expiresAt)

    console.log(` 📆 Certificate set. Issued ${this.issueDate.calendar().toLowerCase()} (${this.issueDate.fromNow()}) and expires ${this.expiryDate.calendar().toLowerCase()} (${this.expiryDate.fromNow()}).`)
  }

  set identity (certificateIdentity) {
    this.#_identity = certificateIdentity
    this.#_key = certificateIdentity.privatePEM
  }

  get pem        () { return this.#_pem        }
  get identity   () { return this.#_identity   }
  get key        () { return this.#_key        }
  get issueDate  () { return this.#_issueDate  }
  get expiryDate () { return this.#_expiryDate }

  set key (value) {
    throw new Error('key is read-only. Please use the identity property to set a certificate identity and the key will be automatically set from it.')
  }
  set issueDate (value) {
    throw new Error('issueDate is read-only. Set the details property to have issueDate automatically set from it.')
  }
  set expiryDate (value) {
    throw new Error('expiryDate is read-only. Set the details property to have issueDate automatically set from it.')
  }

  /**
   * Creates an instance of Certificate.
   * @param {*} domains The domains this certificate covers.
   * @memberof Certificate
   * @access private
   */
  constructor (domains) {
    // Ensure singleton access.
    if (Certificate.isBeingInstantiatedViaSingletonFactoryMethod === false) {
      throw new Error('Certificate is a singleton. This is a private constructor. Please instantiate using the Certificate.getSharedInstance() method.')
    }
    Certificate.isBeingInstantiatedViaSingletonFactoryMethod = false

    //
    // Check if certificate-identity.pem.old or certificate.pem.old files exist.
    // If they do, it means that something went wrong while  certificate was trying to be
    // renewed. So restore them and use them and hopefully the next renewal attempt will
    // succeed or at least buy the administrator of the server some time to fix the issue.
    //

    const oldCertificateIdentityPath = `${Configuration.certificateIdentityPath}.old`
    const oldCertificatePath = `${Configuration.certificateIdentityPath}.old`
    const certificateIdentityPath = Configuration.certificateIdentityPath
    const certificatePath = Configuration.certificatePath

    if (fs.existsSync(oldCertificateIdentityPath) && fs.existsSync(oldCertificatePath)) {
      console.log(' 🚑 [Auto Correct] Warning: Failed renewal attempt detected. Old certificate files found. Attempting to recover…')
      // Edge case: check if the process succeeded (perhaps the power went out right after the certificate was
      // written but before we had a chance to clean up the old files.)
      if (fs.existsSync(certificateIdentityPath) && fs.existsSync(certificatePath)) {
        console.log(' 🚑 [Auto Correct] A new certificate was also found. Going to delete the old one and use that.')
        fs.removeSync(oldCertificateIdentityPath)
        fs.removeSync(oldCertificatePath)
      } else {
        // The renewal process must have failed. Delete any previous state and restore the old certificate.
        console.log(' 🚑 [Auto Correct] Cleaning up previous state and restoring old certificate…')
        if (fs.existsSync(certificateIdentityPath)) {
          fs.removeSync(certificateIdentityPath)
        }
        if (fs.existsSync(certificatePath)) {
          fs.removeSync(certificatePath)
        }
        fs.renameSync(oldCertificateIdentityPath, certificateIdentityPath)
        fs.renameSync(oldCertificatePath, certificatePath)
      }
      console.log(' 🚑 [Auto Correct] Recovery attempt complete.')
    }

    this.#domains = domains

    // If the certificate already exists, load and cache it.
    if (fs.existsSync(Configuration.certificatePath)) {
      this.pem = fs.readFileSync(Configuration.certificatePath, 'utf-8')
      this.identity = CertificateIdentity.getInstance()

      // console.log('Certificate PEM', this.pem)
      // console.log('Certificate private key PEM', this.identity.privatePEM)

      console.log(' 📃 Certificate exists, loaded it (and the corresponding private key) from disk.')
      this.startCheckingForRenewal(/* alsoCheckNow = */ true)
    } else {
      console.log(' 📃 Certificate does not exist; will be provisioned on first hit of the server.')
    }
  }

  /**
   * Creates and caches a secure context, provisioning a TLS certificate in the process, if necessary.
   *
   * @async
   * @memberof Certificate
   */
  async createSecureContext (renewCertificate = false) {
    // If we’re provisioning a certificate for the first time,
    // block all other calls. If we’re renewing, we don’t
    // want to do that as we already have a valid certificate
    // to serve.
    if (!renewCertificate) {
      this.#busyCreatingSecureContextForTheFirstTime = true
    }

    // If the certificate does not already exist, provision one.
    if (!this.pem || renewCertificate) {
      await this.provisionCertificate()
    }

    // Create and cache the secure context.
    this.#secureContext = tls.createSecureContext({
      key: this.key,
      cert: this.pem
    })

    // No need to do an additional check for renewal here
    // as setting this to false when it is already false
    // will not have an undesirable effect.
    this.#busyCreatingSecureContextForTheFirstTime = false
  }


  /**
   * Provisions a new Let’s Encrypt TLS certificate, persists it, and checks for
   * renewals on it every day, starting with the next day.
   *
   * @memberof Certificate
   */
  async provisionCertificate () {
    console.log(` 🤖 [Auto Encrypt] Provisioning Let’s Encrypt certificates for ${this.#domains}.`)

    // Ensure we have an account.
    await Account.getSharedInstance()

    // Create a new order.
    const order = await Order.getInstanceAsync(this.#domains)

    // console.log('Final order', order)

    // Get the certificate details from the order.
    this.pem = order.certificate
    this.identity = order.certificateIdentity

    // Start checking for renewal updates, every day, starting tomorrow.
    this.startCheckingForRenewal(/* alsoCheckNow = */ false)

    console.log(` 🤖🎉 Auto Encrypt: successfully provisioned Let’s Encrypt certificate for ${this.#domains}.`)
  }


  async renewCertificate () {
    //
    // Backup the existing certificate and certificate identity (*.pem → *.pem.old). Then create a new
    // Order and, if it’s successful, update the certificate and certificate identity and recreate and
    // cache the secureContext so that the server will start using the new certificate right away.
    // If it’s not successful, restore the old files.
    //
    console.log(` 🤖 [Auto Encrypt] Renewing Let’s Encrypt certificate for ${this.#domains}.`)

    this.stopCheckingForRenewal()

    //
    // In case old files were left behind, remove them first and then rename the current files.
    // (If the directory doesn’t exist, fs.removeSync() will silently do nothing.)
    //
    const certificateIdentityPath = Configuration.certificateIdentityPath
    const oldCertificateIdentityPath = `${certificateIdentityPath}.old`
    const certificatePath = Configuration.certificatePath
    const oldCertificatePath = `${certificatePath}.old`

    fs.removeSync(oldCertificateIdentityPath)
    fs.removeSync(oldCertificatePath)
    fs.renameSync(certificateIdentityPath, oldCertificateIdentityPath)
    fs.renameSync(certificatePath, oldCertificatePath)

    // Create a fresh secure context, renewing the certificate in the process.
    await this.createSecureContext(/* renewCertificate = */ true)
  }


  /**
   * Checks if the certificate needs to be renewed (if it is within 30 days of its expiry date) and, if so, renews it.
   *
   * @memberof Certificate
   */
  async checkForRenewal () {
    console.log( ' 🧐 [Auto Encrypt] Checking if we need to renew the certificate… ')
    const currentDate = moment()
    // ***************************************************
    // ***************************************************
    // TODO: HARDCODED FOR TESTING RENEWALS. REMOVE!
    // ***************************************************
    // ***************************************************
    const waitFor = (ms) => new Promise(r => setTimeout(r, ms))
    if (/*currentDate.isSameOrAfter(this.#renewalDate)*/ true) {
      //
      // Certificate needs renewal.
      //
      console.log(` 🌱 [Auto Encrypt] Certificate expires in 30 days or less. Renewing certificate…`)
      console.log('DEBUG WAITING 15 seconds')
      await waitFor(10000)
      // Note: this is not a blocking process. We transparently start using the new certificate
      // when it is ready.
      await this.renewCertificate()
      console.log(` 🌱 [Auto Encrypt] Successfully renewed Let’s Encrypt certificate.`)
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
    this.#renewalDate = this.expiryDate.clone().subtract(30, 'days')

    // Also check for renewal immediately if asked to.
    if (alsoCheckNow) {
      this.checkForRenewal()
    }

    // And also once a day from thereon for as long as the server is running.
    const onceADay = 24 /* hours */ * 60 /* minutes */ * 60 /* seconds */ * 1000 /* ms */
    this.#checkForRenewalIntervalId = setInterval(this.checkForRenewal, onceADay)

    console.log(' ⏲ [Auto Encrypt] Set up timer to check for certificate renewal once a day.')
  }


  /**
   * Stops the timer that checks for renewal daily. Use this during housekeeping before destroying this object.
   *
   * @memberof Certificate
   */
  stopCheckingForRenewal () {
    clearInterval(this.#checkForRenewalIntervalId)
  }
}

module.exports = Certificate
