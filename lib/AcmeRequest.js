////////////////////////////////////////////////////////////////////////////////
//
// AcmeRequest
//
// Abstract base request class for carrying out signed ACME requests over HTTPS.
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const jose = require('jose')
const prepareRequest = require('bent')

const Directory = require('./Directory')
const Identity = require('./Identity')
const Nonce = require('./Nonce')

class AcmeRequest {
  async execute (command, payload, useKid=true) {

    const directory = await Directory.getSharedInstance()

    const identity = Identity.getSharedInstance()

    const url = directory[`${command}Url`]

    const protectedHeader = {
      alg: 'RS256',
      nonce: await Nonce.get(),
      url
    }

    if (useKid) {
      // The kid is the account location URL as previously returned by the ACME server.
      protectedHeader.kid = identity.kid
    } else {
      // If we’re not using the kid, we must use the public JWK (see RFC 8555 § 6.2 Request Authentication)
      protectedHeader.jwk = identity.publicJWK
    }

    const signedRequest = jose.JWS.sign.flattened(payload, identity.key, protectedHeader)

    const httpsHeaders = {
      'Content-Type': 'application/jose+json',
      'User-Agent': 'small-tech.org-acme/1.0.0 node/12.16.0',
      'Accept-Language': 'en-US'
    }

    // Prepare a new account request (RFC 8555 § 7.3 Account Management)
    const httpsRequest = prepareRequest('POST', url, /* acceptable responses are */ 200, 201)

    let responseBody
    let response
    try {
      response = await httpsRequest('', signedRequest, httpsHeaders)
    } catch (error) {
      responseBody = error.responseBody
    }
    if (responseBody) {
      const responseBuffer = await responseBody
      const errorBody = (responseBuffer.toString('utf-8'))
      throw new Error(errorBody)
    }

    // Always save the fresh nonce returned from API calls.
    const freshNonce = response.headers['replay-nonce']
    Nonce.set(freshNonce)

    return response
  }
}

module.exports = AcmeRequest
