////////////////////////////////////////////////////////////////////////////////
//
// NewAccountRequest
//
// Requests a new account (or existing account if one already exists) and saves
// the returned kid for future use.
//
// See RFC 8555 § 7.3 (Account Management).
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const AcmeRequest = require('../AcmeRequest')

class NewAccountRequest extends AcmeRequest {
  async execute () {
    // Set the only required element.
    const payload = { termsOfServiceAgreed: true }

    const response = await super.execute('newAccount', payload, /* useKid = */ false)

    // This is what we will be using in the kid field in the future
    // **in place of** the JWK.
    const kid = response.headers['location']
    const account = { kid }
    return account
  }
}

module.exports = NewAccountRequest
