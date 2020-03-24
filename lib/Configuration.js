/**
 * Global configuration static class. Use initialise() method to populate.
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
const mixSaferAndDRYerErrorHandlingInto = require('./saferAndDRYerErrorHandlingMixin')
const log                               = require('./log')

/**
 * @alias module:lib/Configuration
 * @hideconstructor
 */
class Configuration {

  static #initialised = false
  static #staging = null
  static #domains = null
  static #settingsPath = null
  static #accountPath = null
  static #accountIdentityPath = null
  static #certificatePath = null
  static #certificateDirectoryPath = null
  static #certificateIdentityPath = null

  static defaultPathFor (environmentName) {
    return path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', environmentName)
  }
  static DEFAULT_STAGING_PATH    = Configuration.defaultPathFor('staging')
  static DEFAULT_PRODUCTION_PATH = Configuration.defaultPathFor('production')

  static ERRORS = {
    // Global errors are mixed into this object.

    [Symbol.for('Configuration.notInitialisedError')]:
      (property) => `Configuration not initialised. Use Configuration.initialise() before attempting to access the ${property} property.`,

    [Symbol.for('Configuration.alreadyInitialisedError')]:
      () => 'Configuration is already initialised.',

    [Symbol.for('Configuration.domainsArrayIsNotAnArrayOfStringsError')]:
      () => 'Domains array must be an array of strings',
  }

  /**
   * Initialise the configuration. Must be called before accessing settings. May be called more than once.
   *
   * @category initialiser
   * @param {Object}   settings              Parameter object of settings to initialise the configuration with.
   * @param {String[]} settings.domains      List of domains that Auto Encrypt will manage TLS certificates for.
   * @param {Boolean}  settings.staging      Should we use Let’s Encrypt’s staging (true) or production servers (false).
   * @param {String}   settings.settingsPath The root settings paths to use. Uses default path if value is null.
   */
  static initialise (settings = this.required()) {

    mixSaferAndDRYerErrorHandlingInto(Configuration)

    this.ensureIsInitialised             ()
    this.ensureNotUndefinedOrNull        (settings.staging,      'settings.staging'     )
    this.ensureNotUndefined              (settings.settingsPath, 'settings.settingsPath')
    this.ensureDomainsIsAnArrayOfStrings (settings.domains)

    this.#staging = settings.staging
    this.#domains = settings.domains

    if (settings.settingsPath === null) {
      // Use the correct default path based on staging state.
      this.#settingsPath = Configuration.#staging ? Configuration.DEFAULT_STAGING_PATH : Configuration.DEFAULT_PRODUCTION_PATH
    } else {
      // Create the path to use based on the custom root path we’ve been passed.
      this.#settingsPath = path.join(settings.settingsPath, Configuration.#staging ? 'staging' : 'production')
    }

    // And ensure that the settings path exists in the file system.
    fs.ensureDirSync(Configuration.#settingsPath)

    //
    // Create account paths.
    //

    this.#accountPath = path.join(Configuration.#settingsPath, 'account.json')
    this.#accountIdentityPath = path.join(Configuration.#settingsPath, 'account-identity.pem')

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
    })(Configuration.#domains)

    this.#certificateDirectoryPath = path.join(Configuration.#settingsPath, certificateDirectoryName)

    // And ensure that the certificate directory path exists in the file system.
    fs.ensureDirSync(Configuration.#certificateDirectoryPath)

    this.#certificatePath = path.join(Configuration.#certificateDirectoryPath, 'certificate.pem')
    this.#certificateIdentityPath = path.join(Configuration.#certificateDirectoryPath, 'certificate-identity.pem')

    Configuration.#initialised = true

    log(' ⚙️ [Auto Encrypt] Configuration initialised.')
  }

  static ensureIsInitialised () {
    if (this.#initialised) {
      this.throwError(Symbol.for('Configuration.alreadyInitialisedError'))
    }
  }

  static ensureDomainsIsAnArrayOfStrings (domains) {
    this.ensureNotUndefinedOrNull (domains, 'settings.domains')

    const containsOnlyStrings = arrayOfStrings => arrayOfStrings.length !== 0 && arrayOfStrings.filter(s => typeof s === 'string').length === arrayOfStrings.length

    if (!Array.isArray(domains) || !containsOnlyStrings(domains)) {
      this.throwError(Symbol.for('Configuration.domainsArrayIsNotAnArrayOfStringsError'))
    }
  }

  static reset () {
    this.#initialised = false
    this.#staging = null
    this.#domains = null
    this.#settingsPath = null
    this.#accountPath = null
    this.#accountIdentityPath = null
    this.#certificatePath = null
    this.#certificateDirectoryPath = null
    this.#certificateIdentityPath = null
  }

  //
  // Static accessors.
  //

  static get staging             () { return this.valueIfInitialised(this.#staging, 'staging')                         }

  /**
   * The list of domains supported by the current certificate.
   * @static
   * @type {String[]}
   * @readonly
   */
  static get domains             () { return this.valueIfInitialised(this.#domains, 'domains')                         }

  /**
   * The root settings path. There is a different root settings path for staging and production modes.
   *
   * @static
   * @type {String}
   * @readonly
   */
  static get settingsPath        () { return this.valueIfInitialised(this.#settingsPath, 'settingsPath')               }

  /**
   * Path to the account.json file that contains the Key Id that uniquely identifies and authorises your account
   * in the absence of a JWT (see RFC 8555 § 6.2. Request Authentication).
   *
   * @static
   * @type {String}
   * @readonly
   */
  static get accountPath () { return this.valueIfInitialised(this.#accountPath, 'accountPath') }


  /**
   * The path to the account-identity.pem file that contains the private key for the account.
   *
   * @static
   * @type {String}
   * @readonly
   */
  static get accountIdentityPath () { return this.valueIfInitialised(this.#accountIdentityPath, 'accountIdentityPath') }


  /**
   * The path to the certificate.pem file that contains the certificate chain provisioned from Let’s Encrypt.
   *
   * @static
   * @type {String}
   * @readonly
   */
  static get certificatePath () { return this.valueIfInitialised(this.#certificatePath, 'certificatePath') }


  /**
   * The directory the certificate and certificate identity (private key) PEM files are stored in.
   *
   * @static
   * @type {String}
   * @readonly
   */
  static get certificateDirectoryPath () {
    return this.valueIfInitialised(this.#certificateDirectoryPath, 'certificateDirectoryPath')
  }

  /**
   * The path to the certificate-identity.pem file that holds the private key for the TLS certificate.
   *
   * @static
   * @type {String}
   * @readonly
   */
  static get certificateIdentityPath () {
    return this.valueIfInitialised(this.#certificateIdentityPath, 'certificateIdentityPath')
  }

  static valueIfInitialised (value, name) {
    if (!this.#initialised) {
      this.throwError(Symbol.for('Configuration.notInitialisedError'), name)
    }
    return value
  }

  //
  // Enforce read-only access.
  //

  static set staging                  (state) { this.throwReadOnlyAccessorError('staging')                  }
  static set domains                  (state) { this.throwReadOnlyAccessorError('domains')                  }
  static set settingsPath             (state) { this.throwReadOnlyAccessorError('settingsPath')             }
  static set accountPath              (state) { this.throwReadOnlyAccessorError('accountPath')              }
  static set accountIdentityPath      (state) { this.throwReadOnlyAccessorError('accountIdentityPath')      }
  static set certificatePath          (state) { this.throwReadOnlyAccessorError('certificatePath')          }
  static set certificateDirectoryPath (state) { this.throwReadOnlyAccessorError('certificateDirectoryPath') }
  static set certificateIdentityPath  (state) { this.throwReadOnlyAccessorError('certificateIdentityPath')  }

  static throwReadOnlyAccessorError (setterName) {
    this.throwError(Symbol.for('ReadOnlyAccessorError'), setterName, 'All static Configuration accessors are read-only. Call Configuration.initialise() to mutate the configuration.')
  }

  // Custom object description for console output (for debugging).
  static [util.inspect.custom] () {
    return `
      # Configuration (static class)

      A single location for shared configuration (e.g., settings paths)

      ${this.#initialised ? `## Properties

      Property                   Description                             Value
      -------------------------- --------------------------------------- ---------------------------------------
      .staging                 : Use Let’s Encrypt (LE) staging servers? ${this.staging}
      .domains                 : Domains in certificate                  ${this.domains.join(', ')}
      .settingsPath            : Top-level settings path                 ${this.settingsPath}
      .accountPath             : Path to LE account details JSON file    ${this.accountPath}
      .accountIdentityPath     : Path to private key for LE account      ${this.accountIdentityPath}
      .certificateDirectoryPath: Path to certificate directory           ${this.certificateDirectoryPath}
      .certificatePath         : Path to certificate file                ${this.certificatePath}
      .certificateIdentityPath : Path to private key for certificate     ${this.certificateIdentityPath}` : `Not initialised. Use Configuration.initialise() method to initialise.`}
    `
  }

  //
  // Private.
  //

  /**
   * Do not use. Configuration is a static class.
   *
   * @access private
   */
  constructor () {
    Configuration.throwError(Symbol.for('StaticClassCannotBeInstantiatedError'), 'Configuration is a static class. Call Configuration.initialise() to set it up.')
  }
}

module.exports = Configuration
