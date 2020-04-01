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
const Pluralise                         = require('./lib/util/Pluralise')
const Throws                            = require('./lib/util/Throws')
const log                               = require('./lib/util/log')
const ocsp                              = require('ocsp')
const https                             = require('https')

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
 * Auto Encrypt is a static class. Please do not instantiate.
 *
 * Use: AutoEncrypt.https.createServer(…)
 *
 * @alias module:@small-tech/auto-encrypt
 * @hideconstructor
 */
class AutoEncrypt {
  /**
   * By aliasing the https property to the AutoEncrypt static class itself, we enable
   * people to add AutoEncrypt to their existing apps by requiring the module
   * and prefixing their https.createServer(…) line with AutoEncrypt:
   *
   * @example const AutoEncrypt = require('auto-encrypt')
   * const server = AutoEncrypt.https.createServer()
   *
   * @readonly
   * @static
   */
  static get https () { return AutoEncrypt }

  /**
   * Automatically manages Let’s Encrypt certificate provisioning and renewal for Node.js
   * https servers using the HTTP-01 challenge on first hit of an HTTPS route via use of
   * the Server Name Indication (SNI) callback.
   *
   * @static
   * @param {Object}   [options]               Optional HTTPS options object with optional additional
   *                                           Auto Encrypt-specific configuration settings.
   * @param {String[]} [options.domains]       Domain names to provision TLS certificates for. If missing, defaults to
   *                                           the hostname of the current computer and its www prefixed subdomain.
   * @param {Boolean}  [options.staging=false] If true, the Let’s Encrypt staging servers will be used.
   * @param {String}   [options.settingsPath=~/.small-tech.org/auto-encrypt/] Path to save certificates/keys to.
   *
   * @returns {https.Server} The server instance returned by Node’s https.createServer() method.
   */
  static createServer(_options, _listener) {
    const listener       = _listener              || null
    const options        = _options               || {}
    const domains        = options.domains        || [os.hostname(), `www.${os.hostname()}`]
    const staging        = options.staging        || false
    const settingsPath   = options.settingsPath   || null

    // Delete the Auto Encrypt-specific properties from the options object to not pollute the namespace.
    delete options.domains
    delete options.staging
    delete options.settingsPath

    const configuration = new Configuration({ settingsPath, staging, domains })
    const certificate = new Certificate(configuration)

    // Also save a reference in the context so it can be used by the prepareForAppExit() method.
    // (For performance reasons, we have the SNICallback method only do lookups in enclosed scope.)
    this.certificate = certificate

    function sniError (symbolName, callback, emoji, ...args) {
      const error = Symbol.for(symbolName)
      log(` ${emoji} [@small-tech/auto-connect] ${throws.errors[error](...args)}`)
      callback(throws.createError(error, ...args))
    }

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

    const server = this.addOcspStapling(https.createServer(options, listener))
    return server
  }

  /**
   * Shut Auto Encrypt down. Do this before app exit. Performs necessary clean-up and removes
   * any references that might cause the app to not exit.
   */
  static shutdown () {
    this.certificate.stopCheckingForRenewal()
  }

  //
  // Private.
  //

  /**
   * Adds Online Certificate Status Protocol (OCSP) stapling (also known as TLS Certificate Status Request extension)
   * support to the passed server instance.
   *
   * @private
   * @param {https.Server} server HTTPS server instance without OCSP Stapling support.
   * @returns {https.Server} HTTPS server instance with OCSP Stapling support.
   */
  static addOcspStapling(server) {
    // OCSP stapling
    //
    // Many browsers will fetch OCSP from Let’s Encrypt when they load your site. This is a performance and privacy
    // problem. Ideally, connections to your site should not wait for a secondary connection to Let’s Encrypt. Also,
    // OCSP requests tell Let’s Encrypt which sites people are visiting. We have a good privacy policy and do not record
    // individually identifying details from OCSP requests, we’d rather not even receive the data in the first place.
    // Additionally, we anticipate our bandwidth costs for serving OCSP every time a browser visits a Let’s Encrypt site
    // for the first time will be a big part of our infrastructure expense.
    //
    // By turning on OCSP Stapling, you can improve the performance of your website, provide better privacy protections
    // … and help Let’s Encrypt efficiently serve as many people as possible.
    //
    // (Source: https://letsencrypt.org/docs/integration-guide/#implement-ocsp-stapling)

    const cache = new ocsp.Cache()

    server.on('OCSPRequest', (certificate, issuer, callback) => {
      ocsp.getOCSPURI(certificate, function(error, uri) {
        if (error) return callback(error)
        if (uri === null) return callback()

        const request = ocsp.request.generate(certificate, issuer)

        // Todo: CHECK: Does the cache.probe method expire the cache
        // ===== before the OCSP response expires? []

        cache.probe(request.id, (error, cached) => {
          if (error) return callback(error)

          if (cached !== false) {
            return callback(null, cached.response)
          }

          const options = {
            url: uri,
            ocsp: request.data
          }

          cache.request(request.id, options, callback);
        })
      })
    })
    return server
  }

  constructor () {
    throws.error(Symbol.from('StaticClassCannotBeInstantiatedError'))
  }
}

module.exports = AutoEncrypt
