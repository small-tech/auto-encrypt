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

const os = require('os')
const fs = require('fs-extra')
const path = require('path')
const util = require('util')
const crypto = require('crypto')

const log = require('./log')

class Configuration {

  static initialised = false
  static _staging = null
  static _settingsPath = null

  static defaultPathFor (environmentName) {
    return path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', environmentName)
  }
  static DEFAULT_STAGING_PATH = Configuration.defaultPathFor('staging')
  static DEFAULT_PRODUCTION_PATH = Configuration.defaultPathFor('production')

  static initialise (settings) {

    if (Configuration.initialised) {
      throw new Error('Configuration is already initialised.')
    }

    if (settings.staging == undefined /* staging may not be undefined or null; hence the looser == check */) {
      throw new Error('Configuration.initialise(settingsObj) method needs non-null/non-undefined settingsObj.staging boolean property.')
    }
    if (settings.settingsPath === undefined /* settingsPath may be null */) {
      throw new Error('Configuration.initialise(settingsObj) method needs non-undefined settingsObj.settingsPath string property (may be null to signal use of default paths).')
    }
    if (settings.domains == undefined || settings.domains.length === 0) {
      throw new Error('Configuration.initialise(settingsObj) method needs non-null/non-undefined settingsObj.domains property (non-empty array of strings).')
    }

    Configuration._staging = settings.staging
    Configuration._domains = settings.domains

    if (settings.settingsPath === null) {
      // Use the correct default path based on staging state.
      Configuration._settingsPath = Configuration.staging ? Configuration.DEFAULT_STAGING_PATH : Configuration.DEFAULT_PRODUCTION_PATH
    } else {
      // Create the path to use based on the custom root path we’ve been passed.
      Configuration._settingsPath = path.join(settings.settingsPath, Configuration.staging ? 'staging' : 'production')
    }

    // And ensure that the settings path exists in the file system.
    fs.ensureDirSync(Configuration.settingsPath)

    //
    // Create account paths.
    //

    Configuration._accountPath = path.join(Configuration.settingsPath, 'account.json')
    Configuration._accountIdentityPath = path.join(Configuration.settingsPath, 'account-identity.pem')

    //
    // Create certificate paths.
    //

    // The naming of the certificate directory aims to strike a balance between readability and uniqueness.
    // For details, see https://source.small-tech.org/site.js/lib/auto-encrypt/issues/3
    const certificateDirectoryName = (domains => {
      // Sanity check.
      const containsOnlyStrings = arrayOfStrings => arrayOfStrings.length !== 0 && arrayOfStrings.filter(s => typeof s === 'string').length === arrayOfStrings.length
      if (!Array.isArray(domains) || !containsOnlyStrings(domains)) {
        throw new Error('settingsObj.domains must be an array of strings')
      }

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
    })(Configuration.domains)

    Configuration._certificateDirectoryPath = path.join(Configuration.settingsPath, certificateDirectoryName)

    // And ensure that the certificate directory path exists in the file system.
    fs.ensureDirSync(Configuration.certificateDirectoryPath)

    Configuration._certificatePath = path.join(Configuration.certificateDirectoryPath, 'certificate.pem')
    Configuration._certificateIdentityPath = path.join(Configuration.certificateDirectoryPath, 'certificate-identity.pem')

    Configuration.initialised = true

    log(' ⚙️ [Auto Encrypt] Configuration initialised.')
  }


  //
  // Static accessors.
  //

  static get staging ()             { return Configuration.returnValueIfNotNull(Configuration._staging)             }
  static get domains ()             { return Configuration.returnValueIfNotNull(Configuration._domains)             }
  static get settingsPath ()        { return Configuration.returnValueIfNotNull(Configuration._settingsPath)        }
  static get accountPath ()         { return Configuration.returnValueIfNotNull(Configuration._accountPath)         }
  static get accountIdentityPath () { return Configuration.returnValueIfNotNull(Configuration._accountIdentityPath) }
  static get certificatePath ()     { return Configuration.returnValueIfNotNull(Configuration._certificatePath)     }

  static get certificateDirectoryPath () {
    return Configuration.returnValueIfNotNull(Configuration._certificateDirectoryPath)
  }

  static get certificateIdentityPath () {
    return Configuration.returnValueIfNotNull(Configuration._certificateIdentityPath)
  }

  static returnValueIfNotNull (value) {
    if (value === null) {
      throw new Error('Error. Configuration not initialised. Use Configuration.initialise() before attempting access.')
    }
    return value
  }

  //
  // Enforce read-only access.
  //

  static set staging (state)                  { throwReadOnlyError('staging')                  }
  static set domains (state)                  { throwReadOnlyError('domains')                  }
  static set settingsPath (state)             { throwReadOnlyError('settingsPath')             }
  static set accountPath (state)              { throwReadOnlyError('accountPath')              }
  static set accountIdentityPath (state)      { throwReadOnlyError('accountIdentityPath')      }
  static set certificatePath (state)          { throwReadOnlyError('certificatePath')          }
  static set certificateDirectoryPath (state) { throwReadOnlyError('certificateDirectoryPath') }
  static set certificateIdentityPath (state)  { throwReadOnlyError('certificateIdentityPath')  }

  static throwReadOnlyError (setterName) {
    throw new Error(`Configuration.${setterName} is read-only. Use Configuration.initialise() to mutate the configuration.` )
  }

  // Custom object description for console output (for debugging).
  static [util.inspect.custom] () {
    return `
      # Configuration (static class)

      A single location for shared configuration (e.g., settings paths)

      ${Configuration.initialised ? `## Properties

      Property                   Description                             Value
      -------------------------- --------------------------------------- ---------------------------------------
      .staging                 : Use Let’s Encrypt (LE) staging servers? ${Configuration.staging}
      .domains                 : Domains in certificate                  ${Configuration.domains.join(', ')}
      .settingsPath            : Top-level settings path                 ${Configuration.settingsPath}
      .accountPath             : Path to LE account details JSON file    ${Configuration.accountPath}
      .accountIdentityPath     : Path to private key for LE account      ${Configuration.accountIdentityPath}
      .certificateDirectoryPath: Path to certificate directory           ${Configuration.certificateDirectoryPath}
      .certificatePath         : Path to certificate file                ${Configuration.certificatePath}
      .certificateIdentityPath : Path to private key for certificate     ${Configuration.certificateIdentityPath}` : `Not initialised. Use Configuration.initialise() method to initialise.`}
    `
  }

  //
  // Private.
  //

  constructor () {
    throw new Error('Configuration is a static class. Call the initialise() method for initial setup.')
  }
}

module.exports = Configuration
