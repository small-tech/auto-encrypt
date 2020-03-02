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

// Continue to end of file to see the rest of the dependencies. The ones at the
// end are there as they require a reference to this class.
// (This is a limitation of Node requires. See https://stackoverflow.com/a/21334734)

class AcmeRequest {

  async execute (command, payload, useKid=true) {
    return await this._execute (await this.prepare(command, payload, useKid))
  }

  async _execute (preparedRequest) {
    const { signedRequest, httpsRequest, httpsHeaders } = preparedRequest

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

    // The response returned is the raw response object. Let’s consume
    // it and return a more relevant response.
    const responseBodyBuffer = await this.getBuffer(response)
    const responseBodyObject = JSON.parse(responseBodyBuffer.toString('utf-8'))

    const responseObject = {
      headers: response.headers,
      body: responseBodyObject
    }

    return responseObject
  }

  // From bent.
  async getBuffer (stream) { 
    return new Promise((resolve, reject) => {
      const parts = []
      stream.on('error', reject)
      stream.on('end', () => resolve(Buffer.concat(parts)))
      stream.on('data', d => parts.push(d))
    })
  }

  // Separate the preparation of the request from the execution of
  // it so we can easily test that different request configurations conform
  // to our expectations.
  async prepare (command, payload, useKid, url = null) {

    const identity = Identity.getSharedInstance()
    const directory = await Directory.getSharedInstance()
    const account = await Account.getSharedInstance()

    url = url || directory[`${command}Url`]

    const protectedHeader = {
      alg: 'RS256',
      nonce: await Nonce.get(),
      url
    }

    if (useKid) {
      // The kid is the account location URL as previously returned by the ACME server.
      protectedHeader.kid = account.kid
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

    return {
      protectedHeader,
      signedRequest,
      httpsRequest,
      httpsHeaders
    }
  }
}

module.exports = AcmeRequest

// Classes with circular dependencies should be required here at the end, _after_ the module.exports
// line so that they do not crash due to accessing an empty placeholder object.
// (This is a limitation of Node requires. See https://stackoverflow.com/a/21334734)

const Account = require('./Account')
