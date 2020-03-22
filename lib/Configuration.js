////////////////////////////////////////////////////////////////////////////////
//
// Configuration
//
// (Static class. Use initialise() method to populate.)
//
// Shared configuration file. Single source of truth for settings paths.
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

/**
 * Auto Encrypt global configuration. Specific per server. Persisted in memory only.
 * @file
 */

const os                                = require('os')
const fs                                = require('fs-extra')
const path                              = require('path')
const util                              = require('util')
const crypto                            = require('crypto')
const mixSaferAndDRYerErrorHandlingInto = require('./saferAndDRYerErrorHandlingMixin')
const log                               = require('./log')

/**
 * @class Configuration
 * @hideconstructor
 */
class Configuration {

  static _initialised = false
  static _staging = null
  static _domains = null
  static _settingsPath = null
  static _accountPath = null
  static _accountIdentityPath = null
  static _certificatePath = null
  static _certificateDirectoryPath = null
  static _certificateIdentityPath = null

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
   * @static
   * @param {Object}   settings              Parameter object of settings to initialise the configuration with.
   * @param {String[]} settings.domains      List of domains that Auto Encrypt will manage TLS certificates for.
   * @param {Boolean}  settings.staging      Should we use Let’s Encrypt’s staging (true) or production servers (false).
   * @param {String}   settings.settingsPath The root settings paths to use. Uses default path if value is null.
   * @memberof Configuration
   */
  static initialise (settings) {

    mixSaferAndDRYerErrorHandlingInto(Configuration)

    if (this._initialised) {
      this.throwError(Symbol.for('Configuration.alreadyInitialisedError'))
    }

    if (settings == undefined) {
      this.throwError(Symbol.for('UndefinedOrNullError'), 'settings')
    }

    if (settings.domains == undefined) {
      this.throwError(Symbol.for('UndefinedOrNullError'), 'settings.domains')
    }

    if (settings.staging == undefined) {
      this.throwError(Symbol.for('UndefinedOrNullError'), 'settings.staging')
    }

    if (settings.settingsPath === undefined) {
      this.throwError(Symbol.for('UndefinedError'), 'settings.settingsPath')
    }

    const containsOnlyStrings = arrayOfStrings => arrayOfStrings.length !== 0 && arrayOfStrings.filter(s => typeof s === 'string').length === arrayOfStrings.length
    if (!Array.isArray(settings.domains) || !containsOnlyStrings(settings.domains)) {
      this.throwError(Symbol.for('Configuration.domainsArrayIsNotAnArrayOfStringsError'))
    }

    this._staging = settings.staging
    this._domains = settings.domains

    if (settings.settingsPath === null) {
      // Use the correct default path based on staging state.
      this._settingsPath = Configuration._staging ? Configuration.DEFAULT_STAGING_PATH : Configuration.DEFAULT_PRODUCTION_PATH
    } else {
      // Create the path to use based on the custom root path we’ve been passed.
      this._settingsPath = path.join(settings.settingsPath, Configuration._staging ? 'staging' : 'production')
    }

    // And ensure that the settings path exists in the file system.
    fs.ensureDirSync(Configuration._settingsPath)

    //
    // Create account paths.
    //

    this._accountPath = path.join(Configuration._settingsPath, 'account.json')
    this._accountIdentityPath = path.join(Configuration._settingsPath, 'account-identity.pem')

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
    })(Configuration._domains)

    this._certificateDirectoryPath = path.join(Configuration._settingsPath, certificateDirectoryName)

    // And ensure that the certificate directory path exists in the file system.
    fs.ensureDirSync(Configuration._certificateDirectoryPath)

    this._certificatePath = path.join(Configuration._certificateDirectoryPath, 'certificate.pem')
    this._certificateIdentityPath = path.join(Configuration._certificateDirectoryPath, 'certificate-identity.pem')

    Configuration._initialised = true

    log(' ⚙️ [Auto Encrypt] Configuration initialised.')
  }

  static reset () {
    this._initialised = false
    this._staging = null
    this._domains = null
    this._settingsPath = null
    this._accountPath = null
    this._accountIdentityPath = null
    this._certificatePath = null
    this._certificateDirectoryPath = null
    this._certificateIdentityPath = null
  }

  //
  // Static accessors.
  //

  static get staging             () { return this.valueIfInitialised(this._staging, 'staging')                         }

  /**
   * The list of domains supported by the current certificate.
   * @static
   * @type {String[]}
   * @readonly
   * @memberof Configuration
   */
  static get domains             () { return this.valueIfInitialised(this._domains, 'domains')                         }

  /**
   * The root settings path. There is a different root settings path for staging and production modes.
   *
   * @static
   * @type {String}
   * @readonly
   * @memberof Configuration
   */
  static get settingsPath        () { return this.valueIfInitialised(this._settingsPath, 'settingsPath')               }

  /**
   * Path to the account.json file that contains the Key Id that uniquely identifies and authorises your account
   * in the absence of a JWT (see RFC 8555 § 6.2. Request Authentication).
   *
   * @static
   * @type {String}
   * @readonly
   * @memberof Configuration
   */
  static get accountPath () { return this.valueIfInitialised(this._accountPath, 'accountPath') }


  /**
   * The path to the account-identity.pem file that contains the private key for the account.
   *
   * @static
   * @type {String}
   * @readonly
   * @memberof Configuration
   */
  static get accountIdentityPath () { return this.valueIfInitialised(this._accountIdentityPath, 'accountIdentityPath') }


  /**
   * The path to the certificate.pem file that contains the certificate chain provisioned from Let’s Encrypt.
   *
   * @static
   * @type {String}
   * @readonly
   * @memberof Configuration
   */
  static get certificatePath () { return this.valueIfInitialised(this._certificatePath, 'certificatePath') }


  /**
   * The directory the certificate and certificate identity (private key) PEM files are stored in.
   *
   * @static
   * @type {String}
   * @readonly
   * @memberof Configuration
   */
  static get certificateDirectoryPath () {
    return this.valueIfInitialised(this._certificateDirectoryPath, 'certificateDirectoryPath')
  }

  /**
   * The path to the certificate-identity.pem file that holds the private key for the TLS certificate.
   *
   * @static
   * @type {String}
   * @readonly
   * @memberof Configuration
   */
  static get certificateIdentityPath () {
    return this.valueIfInitialised(this._certificateIdentityPath, 'certificateIdentityPath')
  }

  static valueIfInitialised (value, name) {
    if (!this._initialised) {
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

      ${this._initialised ? `## Properties

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
   * @memberof Configuration
   */
  constructor () {
    Configuration.throwError(Symbol.for('StaticClassCannotBeInstantiatedError'), 'Configuration is a static class. Call Configuration.initialise() to set it up.')
  }
}

module.exports = Configuration
