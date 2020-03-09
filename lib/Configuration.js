////////////////////////////////////////////////////////////////////////////////
//
// Configuration
//
// (Static class. Use update() method to mutate.)
//
// A single location for ACME HTTP-01 configuration. Currently, this is
// used to allow the various classes to access the settingsPath without having
// to either form circular references to the main class or having to
// inject references to it all over the place.
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const os = require('os')
const fs = require('fs-extra')
const path = require('path')

class Configuration {

  static _staging = null
  static _settingsPath = null

  static defaultPathFor (environmentName) {
    return path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', environmentName)
  }
  static DEFAULT_STAGING_PATH = Configuration.defaultPathFor('staging')
  static DEFAULT_PRODUCTION_PATH = Configuration.defaultPathFor('production')

  static initialise (settings) {
    if (settings.staging == undefined /* staging may not be undefined or null; hence the looser == check */) {
      throw new Error('Configuration.update(settingsObj) method needs non-null/non-undefined settingsObj.staging boolean property.')
    }
    if (settings.settingsPath === undefined /* settingsPath may be null */) {
      throw new Error('Configuration.update(settingsObj) method needs non-undefined settingsObj.settingsPath string property (may be null to signal use of default paths).')
    }

    Configuration._staging = settings.staging

    if (settings.settingsPath === null) {
      // Use the correct default path based on staging state.
      Configuration._settingsPath = Configuration.staging ? Configuration.DEFAULT_STAGING_PATH : Configuration.DEFAULT_PRODUCTION_PATH
    } else {
      // Create the path to use based on the custom root path we’ve been passed.
      Configuration._settingsPath = path.join(settings.settingsPath, Configuration.staging ? 'staging' : 'production')
    }

    // And ensure that the settings path exists in the file system.
    fs.mkdirpSync(Configuration.settingsPath)

    console.log(` >> Configuration initialised: staging? ${Configuration.staging} settings path: ${Configuration.settingsPath}`)
  }

  //
  // Static accessors.
  //

  static get staging ()      { return Configuration.returnValueIfNotNull(Configuration._staging)      }
  static get settingsPath () { return Configuration.returnValueIfNotNull(Configuration._settingsPath) }

  static returnValueIfNotNull (value) {
    if (value === null) {
      throw new Error('Error. Configuration not initialised. Use Configuration.initialise() before attempting access.')
    }
    return value
  }

  //
  // Enforce read-only access.
  //

  static set staging (state) {
    throw new Error('Configuration.staging is read-only. Use Configuration.update() to mutate the configuration.')
  }

  static set settingsPath (state) {
    throw new Error('Configuration.settingsPath is read-only. Use Configuration.update() to mutate the configuration.')
  }

  //
  // Private.
  //

  constructor () {
    throw new Error('Configuration is a static class. Call the initialise() method for initial setup.')
  }
}

module.exports = Configuration
