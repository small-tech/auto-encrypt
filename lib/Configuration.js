/**
 * Global configuration class. Use initialise() method to populate.
 *
 * @module lib/Configuration
 * @exports Configuration
 * @copyright © 2020 Aral Balkan, Small Technology Foundation.
 * @license AGPLv3 or later.
 */

const os                                = require('os')
const fs                                = require('fs-extra')
const path                              = require('path')
const util                              = require('util')
const crypto                            = require('crypto')
const log                               = require('./util/log')
const Throws                            = require('./util/Throws')

// Custom errors thrown by this class.
const throws = new Throws({
  [Symbol.for('Configuration.domainsArrayIsNotAnArrayOfStringsError')]:
    () => 'Domains array must be an array of strings'
})

function isAnArrayOfStrings (object) {
  const containsOnlyStrings = arrayOfStrings => arrayOfStrings.length !== 0 && arrayOfStrings.filter(s => typeof s === 'string').length === arrayOfStrings.length
  return Array.isArray(object) && containsOnlyStrings(object)
}

/**
 * @alias module:lib/Configuration
 * @hideconstructor
 */
class Configuration {
  #server = null
  #domains = null
  #settingsPath = null
  #accountPath = null
  #accountIdentityPath = null
  #certificatePath = null
  #certificateDirectoryPath = null
  #certificateIdentityPath = null

  /**
   * Initialise the configuration. Must be called before accessing settings. May be called more than once.
   *
   * @param {Object}            settings                   Settings to initialise configuration with.
   * @param {String[]}          settings.domains           List of domains Auto Encrypt will manage TLS certs for.
   * @param {LetsEncryptServer} settings.server            Let’s Encrypt Server to use.
   * @param {String}            settings.settingsPath      Root settings path to use. Will use default path if null.
   */
  constructor (settings = throws.ifMissing()) {

    // Additional argument validation.
    throws.ifUndefinedOrNull(settings.server, 'settings.server')
    throws.ifUndefined(settings.settingsPath, 'settings.settingsPath')
    throws.if(!isAnArrayOfStrings(settings.domains), Symbol.for('Configuration.domainsArrayIsNotAnArrayOfStringsError'))

    if (!util.inspect(settings.server).includes('Let’s Encrypt Server (instance)')) {
      throws.error(Symbol.for('ArgumentError'), 'settings.server', 'must be an instance of LetsEncryptServer but isn’t')
    }

    this.#server = settings.server
    this.#domains = settings.domains

    const defaultPathFor = serverName => path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', serverName)

    if (settings.settingsPath === null) {
      // Use the correct default path based on staging state.
      this.#settingsPath = defaultPathFor(this.#server.name)
    } else {
      // Create the path to use based on the custom root path we’ve been passed.
      this.#settingsPath = path.join(settings.settingsPath, this.#server.name)
    }

    // And ensure that the settings path exists in the file system.
    fs.ensureDirSync(this.#settingsPath)

    //
    // Create account paths.
    //

    this.#accountPath = path.join(this.#settingsPath, 'account.json')
    this.#accountIdentityPath = path.join(this.#settingsPath, 'account-identity.pem')

    //
    // Create certificate paths.
    //

    // The naming of the certificate directory aims to strike a balance between readability and uniqueness.
    // For details, see https://source.small-tech.org/site.js/lib/auto-encrypt/issues/3
    const certificateDirectoryName = (domains => {
      if (domains.length === 1) {
        return domains[0] // e.g., ar.al
      } else if (domains.length >= 2 && domains.length <= 4) {
        // e.g., ar.al--www.ar.al--2018.ar.al--and--aralbalkan.com
        return domains.slice(0,domains.length-1).join('--').concat(`--and--${domains[domains.length-1]}`)
      } else {
        // For more than 5 domains, show the first two, followed by the number of domains, and a
        // hash to ensure that the directory name is unique.
        // e.g., ar.al--www.ar.al--and--4--others--9364bd18ea526b3462e4cebc2a6d97c2ffd3b5312ef7b8bb6165c66a37975e46
        const hashOf = arrayOfStrings => crypto.createHash('blake2s256').update(arrayOfStrings.join('--')).digest('hex')
        return domains.slice(0, 2).join('--').concat(`--and--${domains.length-2}--others--${hashOf(domains)}`)
      }
    })(this.#domains)

    this.#certificateDirectoryPath = path.join(this.#settingsPath, certificateDirectoryName)

    // And ensure that the certificate directory path exists in the file system.
    fs.ensureDirSync(this.#certificateDirectoryPath)

    this.#certificatePath = path.join(this.#certificateDirectoryPath, 'certificate.pem')
    this.#certificateIdentityPath = path.join(this.#certificateDirectoryPath, 'certificate-identity.pem')

    log(' ⚙️ [Auto Encrypt] Configuration initialised.')
  }

  //
  // Accessors.
  //

  /**
   * The Let’s Encrypt Server instance.
   *
   * @type {LetsEncryptServer}
   * @readonly
   */
  get server () {
    return this.#server
  }

  /**
   * List of domains that Auto Encrypt will manage TLS certificates for.
   *
   * @type {String[]}
   * @readonly
   */
  get domains () {
    return this.#domains
  }

  /**
   * The root settings path. There is a different root settings path for pebble, staging and production modes.
   *
   * @type {String}
   * @readonly
   */
  get settingsPath () {
    return this.#settingsPath
  }

  /**
   * Path to the account.json file that contains the Key Id that uniquely identifies and authorises your account
   * in the absence of a JWT (see RFC 8555 § 6.2. Request Authentication).
   *
   * @type {String}
   * @readonly
   */
  get accountPath () {
    return this.#accountPath
  }

  /**
   * The path to the account-identity.pem file that contains the private key for the account.
   *
   * @type {String}
   * @readonly
   */
  get accountIdentityPath () { return this.#accountIdentityPath }

  /**
   * The path to the certificate.pem file that contains the certificate chain provisioned from Let’s Encrypt.
   *
   * @type {String}
   * @readonly
   */
  get certificatePath () { return this.#certificatePath }

  /**
   * The directory the certificate and certificate identity (private key) PEM files are stored in.
   *
   * @type {String}
   * @readonly
   */
  get certificateDirectoryPath () { return this.#certificateDirectoryPath }

  /**
   * The path to the certificate-identity.pem file that holds the private key for the TLS certificate.
   *
   * @type {String}
   * @readonly
   */
  get certificateIdentityPath () { return this.#certificateIdentityPath }

  //
  // Enforce read-only access.
  //

  set server                   (state) { this.throwReadOnlyAccessorError('server')                   }
  set domains                  (state) { this.throwReadOnlyAccessorError('domains')                  }
  set settingsPath             (state) { this.throwReadOnlyAccessorError('settingsPath')             }
  set accountPath              (state) { this.throwReadOnlyAccessorError('accountPath')              }
  set accountIdentityPath      (state) { this.throwReadOnlyAccessorError('accountIdentityPath')      }
  set certificatePath          (state) { this.throwReadOnlyAccessorError('certificatePath')          }
  set certificateDirectoryPath (state) { this.throwReadOnlyAccessorError('certificateDirectoryPath') }
  set certificateIdentityPath  (state) { this.throwReadOnlyAccessorError('certificateIdentityPath')  }

  throwReadOnlyAccessorError (setterName) {
    throws.error(Symbol.for('ReadOnlyAccessorError'), setterName, 'All configuration accessors are read-only.')
  }

  // Custom object description for console output (for debugging).
  [util.inspect.custom] () {
    return `
      # Configuration (class)

      A single location for shared configuration.

      Using ${this.server.name} server paths.

      Property                   Description                             Value
      -------------------------- --------------------------------------- ---------------------------------------
      .server                  : Lets Encrypt Server details             {name: '${this.server.name}', endpoint: '${this.server.endpoint}}'
      .domains                 : Domains in certificate                  ${this.domains.join(', ')}
      .settingsPath            : Top-level settings path                 ${this.settingsPath}
      .accountPath             : Path to LE account details JSON file    ${this.accountPath}
      .accountIdentityPath     : Path to private key for LE account      ${this.accountIdentityPath}
      .certificateDirectoryPath: Path to certificate directory           ${this.certificateDirectoryPath}
      .certificatePath         : Path to certificate file                ${this.certificatePath}
      .certificateIdentityPath : Path to private key for certificate     ${this.certificateIdentityPath}
    `
  }
}
module.exports = Configuration
