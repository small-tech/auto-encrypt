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

import AcmeRequest from '../AcmeRequest.js'

export default class NewAccountRequest extends AcmeRequest {
  async execute () {
    // Set the only required element.
    const payload = { termsOfServiceAgreed: true }

    // Note: a 201 (Created) is returned if the account is new, a 200 (Success) is returned
    // ===== if an existing account is found. (RFC 8555 § 7.3 & 7.3.1).
    const response = await super.execute('newAccount', payload, /* useKid = */ false, /* successCodes = */[200, 201])

    // This is what we will be using in the kid field in the future
    // **in place of** the JWK.
    const kid = response.headers['location']
    const account = { kid }
    return account
  }
}
