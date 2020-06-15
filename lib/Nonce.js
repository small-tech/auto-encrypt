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
// nonce is no longer valid. – RFC 8555 § 7.2
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const prepareRequest = require('bent')
const log            = require('./util/log')
const Throws         = require('./util/Throws')

const throws = new Throws()

class Nonce {
  constructor (directory = throws.ifMissing()) {
    this.#directory = directory
  }

  set (freshNonce) {
    if (freshNonce === undefined || freshNonce === null) {
      log('   ⚠    ❨auto-encrypt❩ nonce.set called with undefined/null. Not saving nonce. No effect on functionality. ')
      return
    }

    if (freshNonce.match(/^[A-Za-z0-9_-]+$/) === null) {
      log ('   ⚠    ❨auto-encrypt❩ nonce.set with non-Base64-encoded nonce. Not saving nonce. No effect on functionality.')
      return
    }

    this.#freshNonce = freshNonce
  }

  async get () {
    let freshNonce
    if (this.#freshNonce !== null) {
      // If there is a manually-set unused Nonce available (retrieved from
      // a previous API call) then unset and return that.
      freshNonce = this.#freshNonce
      this.#freshNonce = null
    } else {
      // To get a fresh nonce, the client sends a HEAD request to the newNonce
      // resource on the server.  The server's response MUST include a Replay-
      // Nonce header field containing a fresh nonce and SHOULD have status
      // code 200 (OK).  The server MUST also respond to GET requests for this
      // resource, returning an empty body (while still providing a Replay-
      // Nonce header) with a status code of 204 (No Content). – RFC 8555 § 7.2
      const newNonceRequest = prepareRequest('HEAD', this.#directory.newNonceUrl)
      const newNonceResponse = await newNonceRequest()
      freshNonce = newNonceResponse.headers['replay-nonce']

      // Note: we do not persist the freshNonce in this.#freshNonce as we
      // ===== are returning it and thus we consider it used.
    }
    return freshNonce
  }

  // Private
  #directory = null
  #freshNonce = null
}

module.exports = Nonce
