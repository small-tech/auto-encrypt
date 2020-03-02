////////////////////////////////////////////////////////////////////////////////
//
// Authorisation
//
// (Singleton; please use Authorisation.getSharedInstance() (async) to access.)
//
// Holds a single authorisation object. Note that the only authorisation type
// supported by this library is HTTP-01 and this is hardcoded in its
// behaviour. See RFC 8555 § 7.5, 7.5.1.
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

class Authorisation {
  //
  // Singleton access (async).
  //
  static instance = null
  static isBeingInstantiatedViaSingletonFactoryMethod = false

  static async getSharedInstance (authorisationUrl) {
    if (Authorisation.instance === null) {
      Authorisation.isBeingInstantiatedViaSingletonFactoryMethod = true
      Authorisation.instance = new Authorisation(authorisationUrl)
      await Authorisation.instance.init()
    }
    return Authorisation.instance
  }

  get url ()   { return this._url   }
  get token () { return this._token }

  set url (value)   { throw new Error('url is a read-only property')   }
  set token (value) { throw new Error('token is a read-only property') }

  //
  // Private.
  //

  constructor (authorisationUrl) {
    // Ensure singleton access.
    if (Authorisation.isBeingInstantiatedViaSingletonFactoryMethod === false) {
      throw new Error('Authorisation is a singleton. Please instantiate using the Authorisation.getSharedInstance() method.')
    }
    Authorisation.isBeingInstantiatedViaSingletonFactoryMethod = false

    this.authorisationUrl = authorisationUrl
  }

  async init () {
    try {
      this.data = await (new AuthorisationRequest()).execute(this.authorisationUrl)
      console.log(this.data)
    } catch (error) {
      // TODO: Handle the error.
      throw new Error(error)
    }

    // We’re only interested in the HTTP-01 challenge url and token so make it easy to get at these.
    // See RFC 8555 § 7.5 (Identifier Authorization).
    this.data.body.challenges.forEach(challenge => {
      if (challenge.type === 'http-01') {
        this._url = challenge.url
        this._token = challenge.token
      }
    })
  }
}

module.exports = Authorisation

// Classes with circular dependencies should be required here at the end, _after_ the module.exports
// line so that they do not crash due to accessing an empty placeholder object.
// (This is a limitation of Node requires. See https://stackoverflow.com/a/21334734)

const AuthorisationRequest = require('./acme-requests/AuthorisationRequest')
