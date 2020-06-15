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

const os                = require('os')
const util              = require('util')
const https             = require('https')
const ocsp              = require('ocsp')
const monkeyPatchTls    = require('./lib/staging/monkeyPatchTls')
const LetsEncryptServer = require('./lib/LetsEncryptServer')
const Configuration     = require('./lib/Configuration')
const Certificate       = require('./lib/Certificate')
const Pluralise         = require('./lib/util/Pluralise')
const Throws            = require('./lib/util/Throws')
const log               = require('./lib/util/log')

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
  static #letsEncryptServer = null
  static #defaultDomains    = null
  static #domains           = null
  static #settingsPath      = null
  static #listener          = null
  static #certificate       = null

  /**
   * Enumeration.
   *
   * @type {LetsEncryptServer.type}
   * @readonly
   * @static
   */
  static serverType = LetsEncryptServer.type

  /**
   * By aliasing the https property to the AutoEncrypt static class itself, we enable
   * people to add AutoEncrypt to their existing apps by requiring the module
   * and prefixing their https.createServer(…) line with AutoEncrypt:
   *
   * @example const AutoEncrypt = require('@small-tech/auto-encrypt')
   * const server = AutoEncrypt.https.createServer()
   *
   * @static
   */
  static get https () { return AutoEncrypt }


  static #ocspCache = null

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
   * @param {Enum}     [options.serverType=AutoEncrypt.serverType.PRODUCTION] Let’s Encrypt server type to use.
   *                                                                  AutoEncrypt.serverType.PRODUCTION, ….STAGING,
   *                                                                  or ….PEBBLE (see LetsEncryptServer.type).
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
    const options                            = _options || {}
    const letsEncryptServer                  = new LetsEncryptServer(options.serverType || LetsEncryptServer.type.PRODUCTION)
    const listener                           = _listener || null
    const settingsPath                       = options.settingsPath || null

    //
    // Ignore passed domains (if any) if we’re using pebble as we can only issue for localhost and pebble.
    //
    let defaultDomains = defaultStagingAndProductionDomains

    switch (letsEncryptServer.type) {
      case LetsEncryptServer.type.PEBBLE:
        options.domains = null
        defaultDomains = defaultPebbleDomains
      break

      // If this is a staging server, we add the intermediary certificate to Node.js’s trust store (only valid during
      // the current Node.js process) so that Node will accept the certificate. Useful when running tests against the
      // staging server.
      //
      // If you’re using Pebble for your tests, please install and use node-pebble manually in your tests.
      // (We cannot automatically provide support for Pebble as it dynamically generates its root and
      // intermediary CA certificates, which is an asynchronous process whereas the createServer method is
      // synchronous.)*
      //
      // * Yes, we could check for and start the Pebble server in the asynchronous SNICallback, below, but given how
      // often that function is called, I will not add anything to it beyond the essentials for performance reasons.
      case LetsEncryptServer.type.STAGING:
        monkeyPatchTls()
      break
    }

    const domains = options.domains || defaultDomains

    // Delete the Auto Encrypt-specific properties from the options object to not pollute the namespace.
    delete options.domains
    delete options.serverType
    delete options.settingsPath

    const configuration = new Configuration({ settingsPath, domains, server: letsEncryptServer})
    const certificate = new Certificate(configuration)

    this.#letsEncryptServer = letsEncryptServer
    this.#defaultDomains    = defaultDomains
    this.#domains           = domains
    this.#settingsPath      = settingsPath
    this.#listener          = listener
    this.#certificate       = certificate

    function sniError (symbolName, callback, emoji, ...args) {
      const error = Symbol.for(symbolName)
      log(`   ${emoji}    ❨auto-encrypt❩ ${throws.errors[error](...args)}`)
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
   * The OCSP module does not have a means of clearing its cache check timers
   * so we do it here. (Otherwise, the test suite would hang.)
   */
  static clearOcspCacheTimers () {
    if (this.ocspCache !== null) {
      const cacheIds = Object.keys(this.ocspCache.cache)
      cacheIds.forEach(cacheId => {
        clearInterval(this.ocspCache.cache[cacheId].timer)
      })
    }
  }

  /**
   * Shut Auto Encrypt down. Do this before app exit. Performs necessary clean-up and removes
   * any references that might cause the app to not exit.
   */
  static shutdown () {
    this.clearOcspCacheTimers()
    this.#certificate.stopCheckingForRenewal()
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

    this.ocspCache = new ocsp.Cache()
    const cache = this.ocspCache

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

  // Custom object description for console output (for debugging).
  static [util.inspect.custom] () {
    return `
      # AutoEncrypt (static class)

        - Using Let’s Encrypt ${this.#letsEncryptServer.name} server.
        - Managing TLS for ${this.#domains.toString().replace(',', ', ')}${this.#domains === this.#defaultDomains ? ' (default domains)' : ''}.
        - Settings stored at ${this.#settingsPath === null ? 'default settings path' : this.#settingsPath}.
        - Listener ${typeof this.#listener === 'function' ? 'is set' : 'not set'}.
    `
  }

  constructor () {
    throws.error(Symbol.for('StaticClassCannotBeInstantiatedError'))
  }
}

module.exports = AutoEncrypt
