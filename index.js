/**
 * Automatically provisions and renews Let’s Encrypt™ TLS certificates for
 * Node.js® https servers (including Express.js, etc.)
 *
 * Implements the subset of RFC 8555 – Automatic Certificate Management
 * Environment (ACME) – necessary for a Node.js https server to provision TLS
 * certificates from Let’s Encrypt using the HTTP-01 challenge on first
 * hit of an HTTPS route via use of the Server Name Indication (SNI) callback.
 *
 * @module @small-tech/auto-encrypt
 * @copyright © 2020 Aral Balkan, Small Technology Foundation.
 * @license AGPLv3 or later.
 */

const os                                = require('os')
const Configuration                     = require('./lib/Configuration')
const Certificate                       = require('./lib/Certificate')
const Pluralise                         = require('./lib/Pluralise')
const Throws                            = require('./lib/Throws')
const log                               = require('./lib/log')

// Custom errors thrown by the autoEncrypt function.
const throws = new Throws({
  [Symbol.for('BusyProvisioningCertificateError')]:
    () => 'We’re busy provisioning TLS certificates and rejecting all other calls at the moment.',

  [Symbol.for('SNIIgnoreUnsupportedDomainError')]:
    (serverName, domains) => {
      return `SNI: Not responding to request for unsupported domain ${serverName} (valid ${Pluralise.word('domain', domains)} ${Pluralise.isAre(domains)} ${domains}).`
    }
})

/**
 * Automatically manages Let’s Encrypt certificate provisioning and renewal for Node.js
 * https servers using the HTTP-01 challenge on first hit of an HTTPS route via use of
 * the Server Name Indication (SNI) callback.
 *
 * @function autoEncrypt
 * @alias module:@small-tech/auto-encrypt
 *
 * @param {Object}   [options]               Optional HTTPS options object with optional additional
 *                                           Auto Encrypt-specific configuration settings.
 * @param {String[]} [options.domains]       Domain names to provision TLS certificates for. If missing, defaults to
 *                                           the hostname of the current computer and its www prefixed subdomain.
 * @param {Boolean}  [options.staging=false] If true, the Let’s Encrypt staging servers will be used.
 * @param {String}   [options.settingsPath=~/.small-tech.org/auto-encrypt/] Path to save certificates/keys to.
 *
 * @returns {Object} An options object to be passed to the https.createServer() method.
 */

function autoEncrypt(_options) {

  const options      = _options             || {}
  const domains      = options.domains      || [os.hostname(), `www.${os.hostname()}`]
  const staging      = options.staging      || false
  const settingsPath = options.settingsPath || null

  // Delete the Auto Encrypt-specific properties from the options object to not pollute the namespace.
  delete options.domains
  delete options.staging
  delete options.settingsPath

  // Initialise the configuration. This carries out robust validation of settings so
  // we do not duplicate that effort here.
  Configuration.initialise({
    settingsPath,
    staging,
    domains
  })

  const certificate = new Certificate(domains)

  // Also save a reference in the context so it can be used by the prepareForAppExit() method.
  this.certificate = certificate

  options.SNICallback = async (serverName, callback) => {
    if (domains.includes(serverName)) {
      const secureContext = await certificate.getSecureContext()
      if (secureContext === null) {
        sniError('BusyProvisioningCertificateError', callback, '⏳')
        return
      }
      callback(null, secureContext)
    } else {
      sniError('SNIIgnoreUnsupportedDomainError', callback, '🤨', serverName, domains)
    }
  }

  // TODO: also add OCSP stapling
  // https://source.small-tech.org/site.js/lib/auto-encrypt/issues/1

  return options
}

/**
 * Prepare autoEncrypt for app exit. Perform necessary clean-up and remove any
 * references that might cause the app to not exit.
 *
 * @function autoEncrypt.prepareForAppExit
 */
function prepareForAppExit () {
  this.certificate.stopCheckingForRenewal()
}

function sniError (symbolName, callback, emoji, ...args) {
  const error = Symbol.for(symbolName)
  log(` ${emoji} [@small-tech/auto-connect] ${throws.errors[error](...args)}`)
  callback(throws.createError(error, ...args))
}

// Add prepare for app exit as a function to the autoEncrypt function
// and we’re going to write it into the same context object. The reason
// I’m not exporting multiple functions or wrapping this up in a class
// is to keep the end use API as simple as possible.
const context = {}
const boundAutoEncrypt = autoEncrypt.bind(context)
const boundPrepareForAppExit = prepareForAppExit.bind(context)
boundAutoEncrypt.prepareForAppExit = boundPrepareForAppExit

module.exports = boundAutoEncrypt
