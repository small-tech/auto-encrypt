////////////////////////////////////////////////////////////////////////////////
//
// AccountIdentity
//
// Generates, stores, loads, and saves the account identity. The default
// account identity file path is:
//
// ~/.small-tech.org/auto-encrypt/account.pem
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const Identity = require('./Identity')
const Throws = require('./util/Throws')
const throws = new Throws()

class AccountIdentity extends Identity {
  constructor (configuration = throws.ifMissing()) {
    super(configuration, 'accountIdentityPath')
  }
}

module.exports = AccountIdentity
