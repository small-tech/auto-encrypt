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

const path = require('path')
const fs = require('fs-extra')

const NewAccountRequest = require('./acme-requests/NewAccountRequest')

class Account {
  //
  // Singleton access (async).
  //
  static instance = null
  static isBeingInstantiatedViaSingletonFactoryMethod = false

  static async getSharedInstance (settingsPath) {
    if (Account.instance === null) {
      Account.isBeingInstantiatedViaSingletonFactoryMethod = true
      Account.instance = new Account(settingsPath)
      await Account.instance.init()
    }
    return Account.instance
  }

  //
  // Private.
  //

  constructor (settingsPath) {
    // Ensure singleton access.
    if (Account.isBeingInstantiatedViaSingletonFactoryMethod === false) {
      throw new Error('Account is a singleton. Please instantiate using the Account.getSharedInstance(settingsPath<str>) method.')
    }
    Account.isBeingInstantiatedViaSingletonFactoryMethod = false

    this.settingsPath = settingsPath
  }

  async init () {
    const accountFilePath = path.join(this.settingsPath, 'account.json')
    if (fs.existsSync(accountFilePath)) {
      // Account data already exists, load it synchronously from disk.
      this.data = JSON.parse(fs.readFileSync(accountFilePath, utf-8))
    } else {
      // Account data does not exist, get it (either an existing one
      // or a new one, as necessary) and persist it.
      this.data = await (new NewAccountRequest()).execute()
      fs.writeFileSync(accountFilePath, JSON.stringify(this.data), 'utf-8')
    }
  }

  get kid ()      { return this.data.kid                              }
  set kid (value) { throw new Error('The .kid property is read only') }
}

module.exports = Account
