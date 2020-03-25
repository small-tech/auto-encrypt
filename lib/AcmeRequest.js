/**
 * Abstract base request class for carrying out signed ACME requests over HTTPS.
 *
 * @module
 * @copyright Copyright © 2020 Aral Balkan, Small Technology Foundation.
 * @license AGPLv3 or later.
 */

const types = require('../typedefs/lib/AcmeRequest')

const jose = require('jose')
const prepareRequest = require('bent')

const Directory = require('./Directory')
const AccountIdentity = require('./AccountIdentity')
const Nonce = require('./Nonce')

// Continue to end of file to see the rest of the dependencies. The ones at the
// end are there as they require a reference to this class.
// (This is a limitation of Node requires. See https://stackoverflow.com/a/21334734)

/**
 * Abstract base request class for carrying out signed ACME requests over HTTPS.
 *
 * @alias module:lib/AcmeRequest
 */
class AcmeRequest {
  /**
   * Executes a remote Let’s Encrypt command and either returns the result or throws.
   *
   * @param {String}        command                 Name of Let’s Encrypt command to invoke as used by {@link Directory}
   *                                                (sans 'Url' suffix). e.g. 'newAccount', 'newOrder', etc.
   * @param {Object|String} payload                 Either an object to use as the payload or, if there is no payload,
   *                                                an empty string.
   * @param {Boolean}       useKid                  Should the request use a Key ID (true) or, a public JWK (false).
   *                                                (See RFC 8555 § 6.2 Request Authentication)
   * @param {Number[]}      [successCodes=[200]]    Optional array of codes that signals success. Any other code throws.
   * @param {String}        [url=null]              If specified, will use this URL directly, ignoring the value in
   *                                                the command parameter.
   * @param {Boolean}       [parseResponseBodyAsJSON=true] Should the request body be parsed as JSON (true) or should
   *                                                       the native response object be returned (false).
   * @returns {types.ResponseObject}
   */
  async execute (command, payload, useKid=true, successCodes=[200], url = null, parseResponseBodyAsJSON = true) {
    return await this._execute (await this.prepare(command, payload, useKid, successCodes, url), parseResponseBodyAsJSON)
  }

  /**
   * Executes a prepared request.
   *
   * @param {types.PreparedRequest} preparedRequest         The prepared request, ready to be executed.
   * @param {Boolean}               parseResponseBodyAsJSON Should the request body be parsed as JSON (true) or should
   *                                                        the native response object be returned (false).
   * @returns {types.ResponseObject}
   */
  async _execute (preparedRequest, parseResponseBodyAsJSON) {
    const { signedRequest, httpsRequest, httpsHeaders } = preparedRequest

    let response, errorBody
    try {
      response = await httpsRequest('', signedRequest, httpsHeaders)
    } catch (error) {
      errorBody = error.responseBody
    }

    // The error body is a promise. Wait for it to resolve.
    if (errorBody) {
      const errorBodyBuffer = await errorBody
      const errorMessage = errorBodyBuffer.toString('utf-8')
      throw new Error(errorMessage)
    }

    // Always save the fresh nonce returned from API calls.
    const freshNonce = response.headers['replay-nonce']
    Nonce.set(freshNonce)

    // The response returned is the raw response object. Let’s consume
    // it and return a more relevant response.
    const headers = response.headers
    const responseBodyBuffer = await this.getBuffer(response)
    let body = responseBodyBuffer.toString('utf-8')
    if (parseResponseBodyAsJSON) {
      body = JSON.parse(body)
    }

    return {
      headers,
      body
    }
  }

  /**
   * Concatenates the output of a stream and returns a buffer. Taken from the bent module.
   *
   * @param {stream} stream A Node stream.
   * @returns {Buffer}      The concatenated output of the Node stream.
   */
  async getBuffer (stream) {
    return new Promise((resolve, reject) => {
      const parts = []
      stream.on('error', reject)
      stream.on('end', () => resolve(Buffer.concat(parts)))
      stream.on('data', d => parts.push(d))
    })
  }

  /**
   * Separate the preparation of a request from the execution of it so we can easily test
   * that different request configurations conform to our expectations.
   *
   * @param {String}        command              Name of Let’s Encrypt command to invoke as used by {@link Directory}
   *                                             (sans 'Url' suffix). e.g. 'newAccount', 'newOrder', etc.
   * @param {Object|String} payload              Either an object to use as the payload or, if there is no payload,
   *                                             an empty string.
   * @param {Boolean}       useKid               Should the request use a Key ID (true) or, a public JWK (false).
   *                                             (See RFC 8555 § 6.2 Request Authentication)
   * @param {Number[]}      [successCodes=[200]] Optional array of codes that signals success. Any other code throws.
   * @param {String}        [url=null]           If specified, will use this URL directly, ignoring the value in
   *                                             the command parameter.
   *
   * @returns {types.PreparedRequest}
   */
  async prepare (command, payload, useKid, successCodes = [200], url = null) {

    const accountIdentity = AccountIdentity.getSharedInstance()
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
      protectedHeader.jwk = accountIdentity.publicJWK
    }

    const signedRequest = jose.JWS.sign.flattened(payload, accountIdentity.key, protectedHeader)

    const httpsHeaders = {
      'Content-Type': 'application/jose+json',
      'User-Agent': 'small-tech.org-acme/1.0.0 node/12.16.0',
      'Accept-Language': 'en-US'
    }

    // Prepare a new account request (RFC 8555 § 7.3 Account Management)
    const httpsRequest = prepareRequest('POST', url, /* acceptable responses are */ ...successCodes)

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
