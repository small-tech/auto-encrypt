/**
 * Abstract base request class for carrying out signed ACME requests over HTTPS.
 *
 * @module
 * @copyright Copyright © 2020 Aral Balkan, Small Technology Foundation.
 * @license AGPLv3 or later.
 */

const jose            = require('jose')
const prepareRequest  = require('bent')
const types           = require('../typedefs/lib/AcmeRequest')
const Nonce           = require('./Nonce')
const Throws          = require('./util/Throws')

const throws = new Throws({
  [Symbol.for('AcmeRequest.classNotInitialisedError')]:
    'You cannot create instances of the AcmeRequest class before initialising it via AcmeRequest.initialise()',

  [Symbol.for('AcmeRequest.accountNotSetError')]:
  'You cannot issue calls that require an account KeyId without first injecting a reference to the account',

  [Symbol.for('AcmeRequest.requestError')]: errorBody => errorBody
})

/**
 * Abstract base request class for carrying out signed ACME requests over HTTPS.
 *
 * @alias module:lib/AcmeRequest
 */
class AcmeRequest {

  static initialise (directory = throws.ifMissing(), accountIdentity = throws.ifMissing()) {
    this.directory = directory
    this.accountIdentity = accountIdentity
    console.log(directory)
    this.nonce = new Nonce(directory)
    this.initialised = true
  }

  static #account = null
  static set account (_account = throws.ifMissing()) { this.#account = _account }
  static get account () { return this.#account }

  constructor () {
    if (!AcmeRequest.initialised) {
      throws.error(Symbol.for('AcmeRequest.classNotInitialisedError'))
    }
  }

  /**
   * Executes a remote Let’s Encrypt command and either returns the result or throws.
   *
   * @param {String}        command                        Name of {@link Directory} command to invoke e.g. 'newAccount'
   * @param {Object|String} payload                        Object to use as payload. For no payload, pass empty string.
   * @param {Boolean}       useKid                         Use Key ID (true) or public JWK (false) (see RFC 8555 § 6.2).
   * @param {Number[]}      [successCodes=[200]]           Return codes accepted as success. Any other code throws.
   * @param {String}        [url=null]                     If specified, use this URL, ignoring the command parameter.
   * @param {Boolean}       [parseResponseBodyAsJSON=true] Parse response body as JSON (true) or as string (false).
   * @returns {types.ResponseObject}
   */
  async execute (
    command                 = throws.ifMissing(),
    payload                 = throws.ifMissing(),
    useKid                  = true,
    successCodes            = [200],
    url                     = null,
    parseResponseBodyAsJSON = true
  ) {
    if (useKid && AcmeRequest.account === null) { throws.error(Symbol.for('AcmeRequest.accountNotSetError')) }

    const preparedRequest = await this.prepare(command, payload, useKid, successCodes, url)
    const responseObject = await this._execute(preparedRequest, parseResponseBodyAsJSON)
    return responseObject
  }

  /**
   * Executes a prepared request.
   *
   * @param {types.PreparedRequest} preparedRequest         The prepared request, ready to be executed.
   * @param {Boolean}               parseResponseBodyAsJSON Should the request body be parsed as JSON (true) or should
   *                                                        the native response object be returned (false).
   * @returns {types.ResponseObject}
   */
  async _execute (preparedRequest = throws.ifMissing(), parseResponseBodyAsJSON = throws.ifMissing()) {
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
      throws.error(Symbol.for('AcmeRequest.requestError', errorMessage))
    }

    // Always save the fresh nonce returned from API calls.
    const freshNonce = response.headers['replay-nonce']
    AcmeRequest.nonce.set(freshNonce)

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

    if (useKid && AcmeRequest.account === null) { throws.error(Symbol.for('AcmeRequest.accountNotSetError')) }

    url = url || AcmeRequest.directory[`${command}Url`]

    const protectedHeader = {
      alg: 'RS256',
      nonce: await AcmeRequest.nonce.get(),
      url
    }

    if (useKid) {
      // The kid is the account location URL as previously returned by the ACME server.
      protectedHeader.kid = AcmeRequest.account.kid
    } else {
      // If we’re not using the kid, we must use the public JWK (see RFC 8555 § 6.2 Request Authentication)
      protectedHeader.jwk = AcmeRequest.accountIdentity.publicJWK
    }

    const signedRequest = jose.JWS.sign.flattened(payload, AcmeRequest.accountIdentity.key, protectedHeader)

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

