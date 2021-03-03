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

import Identity from '../Identity.js'
import Throws from '../util/Throws.js'
const throws = new Throws()

export default class AccountIdentity extends Identity {
  constructor (configuration = throws.ifMissing()) {
    super(configuration, 'accountIdentityPath')
  }
}
