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

const Configuration = require('./lib/Configuration')
const Account = require('./lib/Account')
const Order = require('./lib/Order')

class AcmeHttp01 {
  //
  // Singleton access (async).
  //
  static instance = null
  static isBeingInstantiatedViaSingletonFactoryMethod = false

  static async getSharedInstance (domains, settingsPath = null) {
    if (AcmeHttp01.instance === null) {
      AcmeHttp01.isBeingInstantiatedViaSingletonFactoryMethod = true
      AcmeHttp01.instance = new AcmeHttp01(domains, settingsPath)
      await AcmeHttp01.instance.init()
    }
    return AcmeHttp01.instance
  }

  constructor (domains, settingsPath = null) {
    // Ensure singleton access.
    if (AcmeHttp01.isBeingInstantiatedViaSingletonFactoryMethod === false) {
      throw new Error('AcmeHttp01 is a singleton. Please instantiate using the AcmeHttp01.getSharedInstance([settingsPath<str>]) method.')
    }
    AcmeHttp01.isBeingInstantiatedViaSingletonFactoryMethod = false

    // Save the settings path in the Configuration static class. Any other classes that need access
    // to the settings path can acquire an instance of it instead of having to maintain either circular
    // references to this main class or to keep injecting references to it between each other.
    Configuration.settingsPath = settingsPath

    this.domains = domains
  }

  async init () {
    this.account = await Account.getSharedInstance()
    this.order = await Order.getSharedInstance(this.domains)
  }
}

module.exports = AcmeHttp01
