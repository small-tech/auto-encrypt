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
const MonkeyPatchTls                    = require('./lib/MonkeyPatchTls')
const LetsEncryptServer                 = require('./lib/LetsEncryptServer')
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
   * Enumeration.
   *
   * @property PRODUCTION Use the production server.
   * @property STAGING Use the staging server.
   * @property PEBBLE Use a local pebble testing server.
   * @readonly
   * @static
   */
  static server = {
    PRODUCTION: 0,
    STAGING: 1,
    PEBBLE: 2,
  }

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
   * @param {Enum}     [options.server=AutoEncrypt.server.PRODUCTION] Let’s Encrypt server to use.
   *                                                                  AutoEncrypt.server.PRODUCTION, ….STAGING,
   *                                                                  or ….PEBBLE.
   * @param {String}   [options.settingsPath=~/.small-tech.org/auto-encrypt/] Path to save certificates/keys to.
   *
   * @returns {https.Server} The server instance returned by Node’s https.createServer() method.
   */
  static createServer(_options, _listener) {
    // The first parameter is optional. If omitted, the first argument, if any, is treated as the request listener.
    if (typeof _options === 'function') {
      _listener = _options
      _options = {}
    }

    const defaultStagingAndProductionDomains = [os.hostname(), `www.${os.hostname()}`]
    const defaultPebbleDomains               = ['localhost', 'pebble']

    const options           = _options || {}
    const letsEncryptServer = new LetsEncryptServer(options.server || AutoEncrypt.server.PRODUCTION)
    const isPebble          = letsEncryptServer.type === AutoEncrypt.server.PEBBLE
    const isStaging         = letsEncryptServer.type === AutoEncrypt.server.STAGING

    // Ignore any passed domains (if any) if we’re using pebble as we can only issue for localhost and pebble.
    if (isPebble) { _options.domains = null }
    const defaultDomains = isPebble ? defaultPebbleDomains : defaultStagingAndProductionDomains

    const listener          = _listener            || null
    const domains           = options.domains      || defaultDomains
    const settingsPath      = options.settingsPath || null

    // Delete the Auto Encrypt-specific properties from the options object to not pollute the namespace.
    delete options.domains
    delete options.server
    delete options.settingsPath

    // If this is running with the staging or pebble server, have Node accept the corresponding root certificate
    // so that attempts to reach the server (in case of pebble) and use the certificate (in case of both) will succeed.
    // Note that this does not modify the system trust stores in any way and is only active for the current run of
    // the Node process.
    if (isPebble)  { MonkeyPatchTls.toAccept(MonkeyPatchTls.PEBBLE_ROOT_CERTIFICATE)  }
    if (isStaging) { MonkeyPatchTls.toAccept(MonkeyPatchTls.STAGING_ROOT_CERTIFICATE) }

    const configuration = new Configuration({ settingsPath, domains, letsEncryptServer})
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
