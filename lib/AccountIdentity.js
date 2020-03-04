////////////////////////////////////////////////////////////////////////////////
//
// AccountIdentity
//
// (Singleton; please use AccountIdentity.getSharedInstance() to access.)
//
// Generates, stores, loads, and saves the account identity. The default
// account identity file path is:
//
// ~/.small-tech.org/acme-http-01/account.pem
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const Identity = require('./Identity')

class AccountIdentity {
  static instance = null

  // Singleton access (returns a configured Identity instance).
  static getSharedInstance () {
    if (AccountIdentity.instance === null) {
      Identity.isBeingInstantiatedViaSubclassSingletonFactoryMethod = true
      AccountIdentity.instance = new Identity('account')
    }
    return AccountIdentity.instance
  }
}

module.exports = AccountIdentity
