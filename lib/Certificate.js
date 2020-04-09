/**
 * Represents a Let’s Encrypt TLS certificate.
 *
 * @module
 * @copyright Copyright © 2020 Aral Balkan, Small Technology Foundation.
 * @license AGPLv3 or later.
 */

const fs                              = require('fs-extra')
const tls                             = require('tls')
const util                            = require('util')
const log                             = require('./util/log')
const moment                          = require('moment')
const x509                            = require('./x.509/rfc5280')
const Account                         = require('./Account')
const AccountIdentity                 = require('./AccountIdentity')
const Directory                       = require('./Directory')
const Order                           = require('./Order')
const CertificateIdentity             = require('./CertificateIdentity')
const AcmeRequest                     = require('./AcmeRequest')
const Throws                          = require('./util/Throws')

const throws = new Throws({
  // No custom errors are thrown by this class.
})

/**
 * Represents a Let’s Encrypt TLS certificate.
 *
 * @alias module:lib/Certificate
 * @param {String[]} domains List of domains this certificate covers.
 */
class Certificate {
  /**
   * Get a SecureContext that can be used in an SNICallback.
   *
   * @category async
   * @returns {Promise<tls.SecureContext>} A promise for a SecureContext that can be used in creating https servers.
   */
  async getSecureContext () {
    if (!this.#secureContext) {
      // We don’t have the secure context yet, create it.
      if (this.#busyCreatingSecureContextForTheFirstTime) {
        return null
      }
      await this.createSecureContext()
    }
    return this.#secureContext
  }

  /**
   * Creates an instance of Certificate.
   *
   * @param {Configuration} configuration Configuration instance.
   */
  constructor (configuration = throws.ifMissing()) {
    this.#configuration = configuration
    this.attemptToRecoverFromFailedRenewalAttemptIfNecessary()
    this.#domains = configuration.domains

    // If the certificate already exists, load and cache it.
    if (fs.existsSync(this.#configuration.certificatePath)) {
      this.pem = fs.readFileSync(this.#configuration.certificatePath, 'utf-8')
      this.identity = new CertificateIdentity(this.#configuration)

      log(' 📃 Certificate exists, loaded it (and the corresponding private key) from disk.')
      this.startCheckingForRenewal(/* alsoCheckNow = */ true)
    } else {
      log(' 📃 Certificate does not exist; will be provisioned on first hit of the server.')
    }
  }

  //
  // Private.
  //

  #configuration = null
  #account = null
  #accountIdentity = null
  #directory = null
  #secureContext = null
  #domains = null
  #renewalDate = null
  #checkForRenewalIntervalId = null
  #busyCreatingSecureContextForTheFirstTime = false

  #_pem = null
  #_identity = null
  #_key = null
  #_issuer = null
  #_subject = null
  #_alternativeNames = null
  #_serialNumber = null
  #_issueDate = null
  #_expiryDate = null

  get isProvisioned    () { return this.#_pem !== null     }
  get pem              () { return this.#_pem              }
  get identity         () { return this.#_identity         }
  get key              () { return this.#_key              }
  get serialNumber     () { return this.#_serialNumber     }
  get issuer           () { return this.#_issuer           }
  get subject          () { return this.#_subject          }
  get alternativeNames () { return this.#_alternativeNames }
  get issueDate        () { return this.#_issueDate        }
  get expiryDate       () { return this.#_expiryDate       }

  set pem (certificatePem) {
    this.#_pem = certificatePem

    const details = this.parseDetails(certificatePem)
    this.#_serialNumber     = details.serialNumber
    this.#_issuer           = details.issuer
    this.#_subject          = details.subject
    this.#_alternativeNames = details.alternativeNames
    this.#_issueDate        = moment(details.issuedAt)
    this.#_expiryDate       = moment(details.expiresAt)

    log(` 📆 Certificate set. Serial #: ${details.serialNumber} Issuer: ${details.issuer} Subject: ${details.subject}. Alternative names: ${details.alternativeNames}. Issued ${this.issueDate.calendar().toLowerCase()} (${this.issueDate.fromNow()}) and expires ${this.expiryDate.calendar().toLowerCase()} (${this.expiryDate.fromNow()}).`)
  }

  set identity (certificateIdentity) {
    this.#_identity = certificateIdentity
    this.#_key = certificateIdentity.privatePEM
  }

  set key              (value) { throws.error(Symbol.for('ReadOnlyAccessorError'), 'key', 'set via identity')         }
  set serialNumber     (value) { throws.error(Symbol.for('ReadOnlyAccessorError'), 'serialNumber', 'set via pem')     }
  set issuer           (value) { throws.error(Symbol.for('ReadOnlyAccessorError'), 'issuer', 'set via pem')           }
  set subject          (value) { throws.error(Symbol.for('ReadOnlyAccessorError'), 'subject', 'set via pem')          }
  set alternativeNames (value) { throws.error(Symbol.for('ReadOnlyAccessorError'), 'alternativeNames', 'set via pem') }
  set issueDate        (value) { throws.error(Symbol.for('ReadOnlyAccessorError'), 'issueDate', 'set via pem')        }
  set expiryDate       (value) { throws.error(Symbol.for('ReadOnlyAccessorError'), 'expiryDate', 'set via pem')       }

  /**
   * Check if certificate-identity.pem.old or certificate.pem.old files exist.
   * If they do, it means that something went wrong while  certificate was trying to be
   * renewed. So restore them and use them and hopefully the next renewal attempt will
   * succeed or at least buy the administrator of the server some time to fix the issue.
   */
  attemptToRecoverFromFailedRenewalAttemptIfNecessary () {
    const oldCertificateIdentityPath = `${this.#configuration.certificateIdentityPath}.old`
    const oldCertificatePath = `${this.#configuration.certificatePath}.old`
    const certificateIdentityPath = this.#configuration.certificateIdentityPath
    const certificatePath = this.#configuration.certificatePath

    if (fs.existsSync(oldCertificateIdentityPath) && fs.existsSync(oldCertificatePath)) {
      log(' 🚑 [Auto Correct] Warning: Failed renewal attempt detected. Old certificate files found. Attempting to recover…')
      // Edge case: check if the process succeeded (perhaps the power went out right after the certificate was
      // written but before we had a chance to clean up the old files.)
      if (fs.existsSync(certificateIdentityPath) && fs.existsSync(certificatePath)) {
        log(' 🚑 [Auto Correct] A new certificate was also found. Going to delete the old one and use that.')
        fs.removeSync(oldCertificateIdentityPath)
        fs.removeSync(oldCertificatePath)
      } else {
        // The renewal process must have failed. Delete any previous state and restore the old certificate.
        log(' 🚑 [Auto Correct] Cleaning up previous state and restoring old certificate…')
        fs.removeSync(certificateIdentityPath)
        fs.removeSync(certificatePath)
        fs.renameSync(oldCertificateIdentityPath, certificateIdentityPath)
        fs.renameSync(oldCertificatePath, certificatePath)
      }
      log(' 🚑 [Auto Correct] Recovery attempt complete.')
    }
  }

  /**
   * Creates and caches a secure context, provisioning a TLS certificate in the process, if necessary.
   *
   * @category async
   * @access private
   * @param {Boolean} renewCertificate If true, will start the process of renewing the certificate
   *                                   (but will continue to return the existing certificate until it is ready).
   * @returns {Promise}                Fulfils immediately if certificate exists and does not need to be
   *                                   renewed. Otherwise, fulfils when certificate has been provisioned.
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

      // Initialise all necessary state.
      this.#directory = await Directory.getInstanceAsync(this.#configuration)
      this.#accountIdentity = new AccountIdentity(this.#configuration)
      AcmeRequest.initialise(this.#directory, this.#accountIdentity)
      this.#account = await Account.getInstanceAsync(this.#configuration)
      AcmeRequest.account = this.#account

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
   * Provisions a new Let’s Encrypt TLS certificate, persists it, and starts checking for
   * renewals on it every day, starting with the next day.
   *
   * @access private
   * @category async
   * @returns {Promise} Fulfils once a certificate has been provisioned.
   */
  async provisionCertificate () {
    log(` 🤖 [Auto Encrypt] Provisioning Let’s Encrypt certificates for ${this.#domains}.`)

    // Create a new order.
    const order = await Order.getInstanceAsync(this.#configuration, this.#accountIdentity)

    // Get the certificate details from the order.
    this.pem = order.certificate
    this.identity = order.certificateIdentity

    // Start checking for renewal updates, every day, starting tomorrow.
    this.startCheckingForRenewal(/* alsoCheckNow = */ false)

    log(` 🤖🎉 Auto Encrypt: successfully provisioned Let’s Encrypt certificate for ${this.#domains}.`)
  }

  /**
   * Starts the certificate renewal process by requesting the creation of a fresh secure context.
   *
   * @access private
   * @returns {Promise} Resolves once certificate is renewed and new secure context is
   *                               created and cached.
   * @category async
   */
  async renewCertificate () {
    //
    // Backup the existing certificate and certificate identity (*.pem → *.pem.old). Then create a new
    // Order and, if it’s successful, update the certificate and certificate identity and recreate and
    // cache the secureContext so that the server will start using the new certificate right away.
    // If it’s not successful, restore the old files.
    //
    log(` 🤖 [Auto Encrypt] Renewing Let’s Encrypt certificate for ${this.#domains}.`)

    this.stopCheckingForRenewal()

    //
    // In case old files were left behind, remove them first and then rename the current files.
    // (If the directory doesn’t exist, fs.removeSync() will silently do nothing.)
    //
    const certificateIdentityPath = this.#configuration.certificateIdentityPath
    const oldCertificateIdentityPath = `${certificateIdentityPath}.old`
    const certificatePath = this.#configuration.certificatePath
    const oldCertificatePath = `${certificatePath}.old`

    fs.removeSync(oldCertificateIdentityPath)
    fs.removeSync(oldCertificatePath)
    fs.renameSync(certificateIdentityPath, oldCertificateIdentityPath)
    fs.renameSync(certificatePath, oldCertificatePath)

    // Create a fresh secure context, renewing the certificate in the process.
    // Once the secure context has been created, it will automatically be used
    // for any new connection attempts in the future.
    await this.createSecureContext(/* renewCertificate = */ true)

    // Delete the backup of the old certificate.
    fs.removeSync(oldCertificateIdentityPath)
    fs.removeSync(oldCertificatePath)
  }


  /**
   * Checks if the certificate needs to be renewed (if it is within 30 days of its expiry date) and, if so,
   * renews it. While the method is async, the result is not awaited on usage. Instead, it is a fire-and-forget
   * method that’s called via a daily interval.
   *
   * @access private
   * @category async
   * @returns {Promise} Fulfils immediately if certificate doesn’t need renewal. Otherwise, fulfils once certificate
   *                    has been renewed.
   */
  async checkForRenewal () {
    log( ' 🧐 [Auto Encrypt] Checking if we need to renew the certificate… ')
    const currentDate = moment()
    if (currentDate.isSameOrAfter(this.#renewalDate)) {
      //
      // Certificate needs renewal.
      //
      log(` 🌱 [Auto Encrypt] Certificate expires in 30 days or less. Renewing certificate…`)
      // Note: this is not a blocking process. We transparently start using the new certificate
      // when it is ready.
      await this.renewCertificate()
      log(` 🌱 [Auto Encrypt] Successfully renewed Let’s Encrypt certificate.`)
    } else {
      log(' 👍 [Auto Encrypt] Certificate has more than 30 days before it expires. Will check again tomorrow.')
    }
  }


  /**
   * Starts checking for certificate renewals every 24 hours.
   *
   * @param {boolean} [alsoCheckNow=false] If true, will also immediately check for renewal when the function is
   *                                       called (use this when loading a previously-provisioned and persisted
   *                                       certificate from disk).
   * @category sync
   * @access private
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

    log(' ⏰ [Auto Encrypt] Set up timer to check for certificate renewal once a day.')
  }

  /**
   * Stops the timer that checks for renewal daily. Use this during housekeeping before destroying this object.
   *
   * @category sync
   * @access private
   */
  stopCheckingForRenewal () {
    clearInterval(this.#checkForRenewalIntervalId)
  }

  parseDetails (certificatePem) {
    const certificate = (x509.Certificate.decode(certificatePem, 'pem', {label: 'CERTIFICATE'})).tbsCertificate

    const serialNumber = certificate.serialNumber
    const issuer = certificate.issuer.value[0][0].value.toString('utf-8').trim()
    const issuedAt = new Date(certificate.validity.notBefore.value)
    const expiresAt = new Date(certificate.validity.notAfter.value)
    const subject = certificate.subject.value[0][0].value.toString('utf-8').slice(2).trim()

    const alternativeNames = ((certificate.extensions.filter(extension => {
      return extension.extnID === 'subjectAlternativeName'
    }))[0].extnValue).map(name => name.value)

    return {
      serialNumber,
      issuer,
      subject,
      alternativeNames,
      issuedAt,
      expiresAt
    }
  }

  /**
   * Custom inspection string.
   */
  [util.inspect.custom] () {
    return `# Certificate
    ${!this.isProvisioned ? 'Certificate not provisioned.' : `
                         Key              Value
                         ──────────────── ─────────────────────────
      Serial number     .serialNumber     ${this.serialNumber}
      Issuer            .issuer           ${this.issuer}
      Subject           .subject          ${this.subject}
      Alternative names .alterNativeNames ${this.alternativeNames}
      Issue date        .issueDate        ${this.issueDate}
      Expiry date       .expiryDate       ${this.expiryDate}
    `}
    `
  }
}


module.exports = Certificate
