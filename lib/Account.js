////////////////////////////////////////////////////////////////////////////////
//
// Account
//
// (Singleton; please use Account.getSharedInstance() (async) to access.)
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

const fs            = require('fs-extra')
const log           = require('./log')
const Configuration = require('./Configuration')

// Continue to end of file to see the rest of the dependencies. The ones at the
// end are there as they require a reference to this class.
// (This is a limitation of Node requires. See https://stackoverflow.com/a/21334734)

class Account {
  //
  // Singleton access (async).
  //
  static instance = null
  static isBeingInstantiatedViaSingletonFactoryMethod = false

  static async getSharedInstance () {
    if (Account.instance === null) {
      Account.isBeingInstantiatedViaSingletonFactoryMethod = true
      Account.instance = new Account()
      await Account.instance.init()
    }
    return Account.instance
  }

  static destroySharedInstance () {
    Account.instance = null
  }

  //
  // Private.
  //

  constructor () {
    // Ensure singleton access.
    if (Account.isBeingInstantiatedViaSingletonFactoryMethod === false) {
      throw new Error('Account is a singleton. Please instantiate using the Account.getSharedInstance() method.')
    }
    Account.isBeingInstantiatedViaSingletonFactoryMethod = false
  }

  async init () {
    const accountPath = Configuration.accountPath
    if (fs.existsSync(accountPath)) {
      // Account data already exists, load it synchronously from disk.
      this.data = JSON.parse(fs.readFileSync(accountPath, 'utf-8'))
    } else {
      // Account data does not exist, get it (either an existing one
      // or a new one, as necessary) and persist it.
      this.data = await (new NewAccountRequest()).execute()
      fs.writeFileSync(accountPath, JSON.stringify(this.data), 'utf-8')
    }
    log('Account', this.data)
  }

  get kid ()      { return this.data.kid                              }
  set kid (value) { throw new Error('The .kid property is read only') }
}

module.exports = Account

// Classes with circular dependencies should be required here at the end, _after_ the module.exports
// line so that they do not crash due to accessing an empty placeholder object.
// (This is a limitation of Node requires. See https://stackoverflow.com/a/21334734)

const NewAccountRequest = require('./acme-requests/NewAccountRequest')
