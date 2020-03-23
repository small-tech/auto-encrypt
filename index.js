////////////////////////////////////////////////////////////////////////////////
//
// @small-tech/auto-encrypt
//
// Automatically provisions and renews Let’s Encrypt™ TLS certificates for
// Node.js® https servers (including Express.js, etc.)
//
// Implements the subset of RFC 8555 – Automatic Certificate Management
// Environment (ACME) – necessary for a Node.js https server to provision TLS
// certificates from Let’s Encrypt using the HTTP-01 challenge on first
// hit of an HTTPS route via use of the Server Name Indication (SNI) callback.
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const Configuration                     = require('./lib/Configuration')
const Certificate                       = require('./lib/Certificate')
const mixSaferAndDRYerErrorHandlingInto = require('./lib/saferAndDRYerErrorHandlingMixin')
const Pluralise                         = require('./lib/Pluralise')
const log                               = require('./lib/log')

/**
 * Automatically manages Let’s Encrypt certificate provisioning and renewal for Node.js
 * https servers using the HTTP-01 challenge on first hit of an HTTPS route via use of
 * the Server Name Indication (SNI) callback
 * @function autoEncrypt
 *
 * @param {Object}   parameterObject
 * @param {String[]} parameterObject.domains         Domain names to provision TLS certificates for.
 * @param {Object}   [parameterObject.options={}]    Standard https server options.
 * @param {Boolean}  [parameterObject.staging=false] If true, the Let’s Encrypt staging servers will be used.
 * @param {String}   [parameterObject.settingsPath=~/.small-tech.org/auto-encrypt/] Custom path to save certificates and keys to.
 * @returns {Object} An options object to be passed to the https.createServer() method.
 */
function autoEncrypt(parameterObject) {

  if (parameterObject == undefined) { parameterObject = {} }

  const domains      = parameterObject.domains
  const staging      = parameterObject.staging      || false
  const options      = parameterObject.options      || {}
  const settingsPath = parameterObject.settingsPath || null

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
        this.sniError('BusyProvisioningCertificateError', callback, '⏳')
        return
      }
      callback(null, secureContext)
    } else {
      this.sniError('SNIIgnoreUnsupportedDomainError', callback, '🤨', serverName, domains)
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

// Since autoEncrypt is a function and not a class/instance, we mix in the error
// handling into a separate context object that we bind the autoEncrypt function to.
const context = {}
context.ERRORS = {
  [Symbol.for('BusyProvisioningCertificateError')]:
    () => 'We’re busy provisioning TLS certificates and rejecting all other calls at the moment.',

  [Symbol.for('SNIIgnoreUnsupportedDomainError')]:
    (serverName, domains) => {
      return `SNI: Not responding to request for unsupported domain ${serverName} (valid ${Pluralise.word('domain', domains)} ${Pluralise.isAre(domains)} ${domains}).`
    },
}
context.sniError = function (symbolName, callback, emoji, ...args) {
  const error = Symbol.for(symbolName)
  log(` ${emoji} [@small-tech/auto-connect] ${this.ERRORS[error](...args)}`)
  callback(this.newError(error, ...args))
}

mixSaferAndDRYerErrorHandlingInto(context)

const boundAutoEncrypt = autoEncrypt.bind(context)
const boundPrepareForAppExit = prepareForAppExit.bind(context)

// Add prepare for app exit as a function to the autoEncrypt function
// and we’re going to write it into the same context object. The reason
// I’m not exporting multiple functions or wrapping this up in a class
// is to keep the end use API as simple as possible.
boundAutoEncrypt.prepareForAppExit = boundPrepareForAppExit

module.exports = boundAutoEncrypt
