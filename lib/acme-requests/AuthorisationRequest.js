////////////////////////////////////////////////////////////////////////////////
//
// AuthorisationRequest
//
// Representations an authorisation that needs to be fulfilled.
//
// See RFC 8555 § 7.5 (Identifier Authorisation)
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const AcmeRequest = require('../AcmeRequest')
const Throws = require('../util/Throws')

const throws = new Throws()

class AuthorisationRequest extends AcmeRequest {
  async execute (authorisationUrl = throws.ifMissing()) {
    // This is a POST-as-GET request so it doesn’t have a payload.
    // See RFC 8555 § 6.3 (GET and POST-as-GET requests).
    const noPayload = ""

    // Note: a 201 (Created) is returned if the account is new, a 200 (Success) is returned
    // ===== if an existing account is found. (RFC 8555 § 7.3 & 7.3.1).
    const response = await super.execute(
      /* command =      */ '', // see URL, below.
      /* payload =      */ noPayload,
      /* useKid =       */ true,
      /* successCodes = */ [200],
      /* url =          */ authorisationUrl
    )
    return response
  }
}

module.exports = AuthorisationRequest
