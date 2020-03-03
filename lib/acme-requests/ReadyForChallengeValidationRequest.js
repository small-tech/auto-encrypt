////////////////////////////////////////////////////////////////////////////////
//
// ReadyForChallengeValidationRequest
//
// The client indicates to the server that it is ready for the challenge
// validation by sending an empty JSON body ("{}") carried in a POST
// request to the challenge URL (not the authorization URL).
//
//                           – RFC 8555 § 7.5.1 (Responding to Challenges)
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const AcmeRequest = require('../AcmeRequest')

class ReadyForChallengeValidationRequest extends AcmeRequest {
  async execute (challengeUrl) {
    const emptyPayload = {}

    const response = await super.execute(
      /* command =      */ '', // see URL, below.
      /* payload =      */ emptyPayload,
      /* useKid =       */ true,
      /* successCodes = */ [200],
      /* url =          */ challengeUrl
    )

    return response
  }
}

module.exports = ReadyForChallengeValidationRequest
