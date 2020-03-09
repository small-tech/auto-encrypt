////////////////////////////////////////////////////////////////////////////////
//
// Configuration
//
// (Singleton; please use Configuration.getSharedInstance() to access.)
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

  static get production () {
    // We default to production being true.
    if (Configuration._production == undefined) {
      return true
    }
    return Configuration._production
  }

  static set production (state) {
    Configuration._production = state
    Configuration._staging = !state
  }

  static get staging () {
    // We default to staging being false.
    if (Configuration._staging == undefined) {
      return false
    }
    return Configuration._staging
  }

  static set staging (state) {
    Configuration._staging = state
    Configuration._production = !state
  }

  static get settingsPath () {
    return Configuration._settingsPath
  }

  static set settingsPath (settingsPath) {
    // Set a default settings path, if none is specified.
    if (settingsPath === null) {
      settingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt')
    }

    // Persist the settings path in memory.
    Configuration._settingsPath = settingsPath

    // And ensure that the settings path exists in the file system.
    fs.mkdirpSync(settingsPath)
  }

  //
  // Private.
  //

  constructor () {
    throw new Error('Configuration is a static class. Please do not try to instantiate it.')
  }
}

module.exports = Configuration
