////////////////////////////////////////////////////////////////////////////////
//
// Account
//
// (Async; please use Account.getInstanceAsync() factory method.)
//
// Represents a Let’s Encrypt account. Currently this is limited to the account
// URL used as the "kid" value in the JWS authenticating subsequent requests
// by this account after it is created using the JWT public key.
// See RFC 8555 § 6.2, 7.3.
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

import fs from 'fs'
import Throws from './util/Throws.js'
import NewAccountRequest from './acme-requests/NewAccountRequest.js'

const throws = new Throws({
  // No custom errors are thrown by this class.
})

export default class Account {
  //
  // Async factory method.
  //

  static async getInstanceAsync (configuration) {
      Account.isBeingInstantiatedViaSingletonFactoryMethod = true
      const account = new Account(configuration)
      await account.init()
      return account
  }

  //
  // Private.
  //
  static isBeingInstantiatedViaSingletonFactoryMethod = false

  constructor (configuration) {
    // Ensure factory method-based initialisation.
    if (Account.isBeingInstantiatedViaSingletonFactoryMethod === false) {
      throws.error(Symbol.for('MustBeInstantiatedViaAsyncFactoryMethodError'), 'Account')
    }
    this.configuration = configuration
    Account.isBeingInstantiatedViaSingletonFactoryMethod = false
  }

  async init () {
    const accountPath = this.configuration.accountPath
    if (fs.existsSync(accountPath)) {
      // Account data already exists, load it synchronously from disk.
      this.data = JSON.parse(fs.readFileSync(accountPath, 'utf-8'))
    } else {
      // Account data does not exist, get it (either an existing one
      // or a new one, as necessary) and persist it.
      this.data = await (new NewAccountRequest()).execute()
      fs.writeFileSync(accountPath, JSON.stringify(this.data), 'utf-8')
    }
  }

  // TODO: throw error if Account has not been initialised instead of crashing in getter below.
  get kid ()      { return this.data.kid                                     }
  set kid (value) { throws.error(Symbol.for('ReadOnlyAccessorError'), 'kid') }
}
