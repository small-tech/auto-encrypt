////////////////////////////////////////////////////////////////////////////////
//
// Authorisation
//
// (Use the async static get() method to await a fully-resolved instance.)
//
// Holds a single authorisation object. Note that the only authorisation type
// supported by this library is HTTP-01 and this is hardcoded in its
// behaviour. See RFC 8555 § 7.5, 7.5.1.
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const EventEmitter = require('events')
const Identity = require('./Identity')

// Continue to end of file to see the rest of the dependencies. The ones at the
// end are there as they require a reference to this class.
// (This is a limitation of Node requires. See https://stackoverflow.com/a/21334734)

class Authorisation extends EventEmitter {

  // Async factory method. Use this to instantiate.
  static async get (authorisationUrl) {
    const authorisation = new Authorisation(authorisationUrl)
    await authorisation.init()
    return authorisation
  }

  // Events
  static VALIDATED = 'validated'

  //
  // Accessors.
  //

  get domain ()    { return this._domain   }
  get challenge () { return this._challenge }

  set domain (value)    { throw new Error('domain is a read-only property')    }
  set challenge (value) { throw new Error('challenge is a read-only property') }

  //
  // Private.
  //

  constructor (authorisationUrl) {
    super()
    this.authorisationUrl = authorisationUrl
  }

  async init () {
    try {
      this.data = await (new AuthorisationRequest()).execute(this.authorisationUrl)
      console.log('Authorisation', this.data)
      this.authorisation = this.data.body
    } catch (error) {
      // TODO: Handle the error.
      throw new Error(error)
    }

    // Save the identifier (this is the domain that we will be responding for).
    this._domain = this.authorisation.identifier.value

    // We’re only interested in the HTTP-01 challenge url and token so make it easy to get at these.
    // See RFC 8555 § 7.5 (Identifier Authorization).
    this.authorisation.challenges.forEach(challenge => {
      if (challenge.type === 'http-01') {
        // Add the domain to the challenge object.
        this._challenge = challenge
      }
    })

    // Add the responder for the challenge to the challenge server singleton instance.
    const challengeServer = await ChallengeServer.getSharedInstance()

    console.log('challengeServer', challengeServer)

    challengeServer.addResponder((request, response) => {
      if (request.url === `/.well-known/acme-challenge/${this.challenge.token}`) {
        // OK, this is the authorisation we’re being pinged for by the Let’s Encrypt servers.
        // Respond with the response it expects according to RFC 8555 § 8.1 (Key Authorizations)
        console.log(` 👍 Responding to ACME authorisation request for ${this.domain}`)
        console.log('Request headers: ', request.headers)

        // TODO: We should validate (as much as possible) that this is actually coming from Let’s
        // ===== Encrypt’s servers.

        const keyAuthorisation = `${this.challenge.token}.${(Identity.getSharedInstance()).thumbprint}`
        response.statusCode = 200
        response.setHeader('Content-Type', 'application/octet-stream') // as per RFC 8555 § 8.3 (HTTP Challenge)
        response.end(keyAuthorisation)

        // "For challenges where the client can tell when the server
        // has validated the challenge (e.g., by seeing an HTTP or DNS request
        // from the server), the client SHOULD NOT begin polling until it has
        // seen the validation request from the server." – RFC 8555 § 7.5.1
        // (Responding to Challenges)
        this.startPollingForValidationState()

        return true
      } else {
        // This request is not for this challenge; do not respond.
        return false
      }
    })

    // Now that we’re able to respond to the challenge, signal to Let’s Encrypt that it can hit the endpoint.
    // See RFC 8555 § 7.5.1 (Responding to Challenges).
    try {
      await (new ReadyForChallengeValidationRequest()).execute(this.challenge.url)
    } catch (error) {
      // TODO: Handle error.
      throw new Error(error)
    }
  }

  startPollingForValidationState () {
    // Only start polling for validation state once.
    if (this.alreadyPollingForValidationState) {
      return
    }

    this.alreadyPollingForValidationState = true

    console.log(` 🧐 Starting to poll for authorisation state for domain ${this.domain}…`)

    // Note: while this is an async function, we are not awaiting the result
    // ===== here. Our goal is to simply trigger the start of polling. We do
    //       not care about the result.
    this.pollForValidationState()
  }

  async pollForValidationState () {

    function waitFor(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    }

    console.log(` 👋 Polling for authorisation state for domain ${this.domain}…`)

    const result = await (new AuthorisationRequest()).execute(this.authorisationUrl)

    if (result.body.status === 'valid') {
      console.log(` 🎉 Authorisation validated for domain ${this.domain}`)
      this.emit(Authorisation.VALIDATED)
      return
    } else {
      // Check if there is a Retry-After header – there SHOULD be, according to RFC 8555 § 7.5.1
      // (Responding to Challenges) – and use that as the polling interval. If there isn’t, default
      // to polling every second.
      const retryAfterHeader = result.headers['Retry-After']
      let pollingDuration = 1000
      if (retryAfterHeader) {
        retryAfterHeader = parseInt(retryAfterHeader)
      }

      console.log(` ⌚ Authorisation not valid yet for domain ${this.domain}. Waiting to check again in ${pollingDuration/1000} second${pollingDuration === 1000 ? '' : 's'}…`)

      await waitFor(pollingDuration)
      await this.pollForValidationState()
    }
  }
}

module.exports = Authorisation

// Classes with circular dependencies should be required here at the end, _after_ the module.exports
// line, so that they do not crash due to accessing an empty placeholder object.
// (This is a limitation of Node requires. See https://stackoverflow.com/a/21334734)

const AuthorisationRequest = require('./acme-requests/AuthorisationRequest')
const ReadyForChallengeValidationRequest = require('./acme-requests/ReadyForChallengeValidationRequest')
const ChallengeServer = require('./ChallengeServer')