////////////////////////////////////////////////////////////////////////////////
//
// @small-tech/acme-http-01
//
// Implements the subset of RFC 8555 – Automatic Certificate Management
// Environment (ACME) – necessary for a client to support TLS certificate
// provisioning from Let’s Encrypt using HTTP-01 challenges.
//
// Note that where Boulder (Let’s Encrypt’s ACME implementation; the only one
// that really matters) differs from the ACME spec, we will go with Let’s
// Encrypt’s implementation.
// https://github.com/letsencrypt/boulder/blob/master/docs/acme-divergences.md
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const os = require('os')
const path = require('path')
const fs = require('fs-extra')

// Continue to end of file to see the rest of the dependencies. The ones at the
// end are there as they require a reference to this class.
// (This is a limitation of Node requires. See https://stackoverflow.com/a/21334734)

class AcmeHttp01 {
  //
  // Singleton access (async).
  //
  static instance = null
  static isBeingInstantiatedViaSingletonFactoryMethod = false

  static async getSharedInstance (settingsPath = null) {
    if (AcmeHttp01.instance === null) {
      AcmeHttp01.isBeingInstantiatedViaSingletonFactoryMethod = true
      AcmeHttp01.instance = new AcmeHttp01(settingsPath)
      await AcmeHttp01.instance.init()
    }
    return AcmeHttp01.instance
  }

  constructor (settingsPath = null) {
    // Ensure singleton access.
    if (AcmeHttp01.isBeingInstantiatedViaSingletonFactoryMethod === false) {
      throw new Error('AcmeHttp01 is a singleton. Please instantiate using the AcmeHttp01.getSharedInstance([settingsPath<str>]) method.')
    }
    AcmeHttp01.isBeingInstantiatedViaSingletonFactoryMethod = false

    if (settingsPath === null) {
      settingsPath = path.join(os.homedir(), '.small-tech.org', 'acme-http-01')
    }
    fs.mkdirpSync(settingsPath)
    this._settingsPath = settingsPath
  }

  async init () {
    this.account = await Account.getSharedInstance(this.settingsPath)

    console.log(`Account received. kid = ${this.account.kid}`)

    // TODO

    console.log('Graceful exit. (This module is still under initial development.)')
  }

  get settingsPath ()      { return this._settingsPath                                   }
  set settingsPath (value) { throw new Error('The .settingsPath property is read-only.') }
}

module.exports = AcmeHttp01

// Dependencies that need to have a reference to this class (e.g., to get the settingsPath),
// should be required here at the end, _after_ the module.exports line so that they do not
// crash due to accessing an empty placeholder object.
// (This is a limitation of Node requires. See https://stackoverflow.com/a/21334734)

const Account = require('./lib/Account')
