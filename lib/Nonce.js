////////////////////////////////////////////////////////////////////////////////
//
// Nonce
//
// In order to protect ACME resources from any possible replay attacks,
// ACME POST requests have a mandatory anti-replay mechanism.  This
// mechanism is based on the server maintaining a list of nonces that it
// has issued, and requiring any signed request from the client to carry
// such a nonce. – RFC 8555 § 6.5
//
// Before sending a POST request to the server, an ACME client needs to
// have a fresh anti-replay nonce to put in the "nonce" header of the
// JWS.  In most cases, the client will have gotten a nonce from a
// previous request.  However, the client might sometimes need to get a
// new nonce, e.g., on its first request to the server or if an existing
// nonce is no longer valid.
//
// To get a fresh nonce, the client sends a HEAD request to the newNonce
// resource on the server.  The server's response MUST include a Replay-
// Nonce header field containing a fresh nonce and SHOULD have status
// code 200 (OK).  The server MUST also respond to GET requests for this
// resource, returning an empty body (while still providing a Replay-
// Nonce header) with a status code of 204 (No Content). – RFC 8555 § 7.2
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const prepareRequest = require('bent')
const Directory = require('./Directory')

class Nonce {
  static async new () {
    const directory = await Directory.getInstance()
    const newNonceRequest = prepareRequest('HEAD', directory.newNonceUrl)
    const newNonceResponse = await newNonceRequest()
    const newNonce = newNonceResponse.headers['replay-nonce']
    return newNonce
  }
}

module.exports = Nonce
