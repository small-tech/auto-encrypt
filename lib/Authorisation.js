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
const log = require('./util/log')
const AuthorisationRequest = require('./acme-requests/AuthorisationRequest')
const ReadyForChallengeValidationRequest = require('./acme-requests/ReadyForChallengeValidationRequest')
const ChallengeServer = require('./ChallengeServer')
const waitFor = require('./util/waitFor')

class Authorisation extends EventEmitter {

  // Async factory method. Use this to instantiate.
  // TODO: add check to ensure factory method is used.
  static async getInstanceAsync (authorisationUrl, accountIdentity) {
    const authorisation = new Authorisation(authorisationUrl, accountIdentity)
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

  constructor (authorisationUrl, accountIdentity) {
    super()
    this.authorisationUrl = authorisationUrl
    this.accountIdentity = accountIdentity
  }

  async init () {
    try {
      this.data = await (new AuthorisationRequest()).execute(this.authorisationUrl)
      this.authorisation = this.data.body
    } catch (error) {
      // TODO: Handle the error.
      throw new Error(error)
    }

    // Save the identifier (this is the domain that we will be responding for).
    this._domain = this.authorisation.identifier.value

    // Check if the authorisation is already valid.
    //
    // Let’s Encrypt stores authorisations until a set expiry period. If this domain was already authorised
    // recently, it’s possible that the status will be valid (e.g., you provisioned a certificate for ar.al but
    // then decided to provision a certificate for ar.al and www.ar.al. The authorisation for ar.al will still be
    // valid until the expiry period.
    if (this.authorisation.status === 'valid') {
      log(`   💗    ❨auto-encrypt❩ Authorisation was previously validated and is still valid.`)
      return true
    }

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

    challengeServer.addResponder((request, response) => {
      if (request.url === `/.well-known/acme-challenge/${this.challenge.token}`) {
        // OK, this is the authorisation we’re being pinged for by the Let’s Encrypt servers.
        // Respond with the response it expects according to RFC 8555 § 8.1 (Key Authorizations)
        log(`   👍    ❨auto-encrypt❩ Responding to ACME authorisation request for ${this.domain}`)

        // TODO: We should validate (as much as possible) that this is actually coming from Let’s
        // ===== Encrypt’s servers.

        const keyAuthorisation = `${this.challenge.token}.${this.accountIdentity.thumbprint}`
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

    // Wait for the authorisation to be validated before returning.
    await new Promise((resolve, reject) => {
      this.once(Authorisation.VALIDATED, () => {
        resolve()
      })
      // TODO: Also listen for errors and reject the promise accordingly.
    })
  }

  startPollingForValidationState () {
    // Only start polling for validation state once.
    if (this.alreadyPollingForValidationState) {
      return
    }

    this.alreadyPollingForValidationState = true

    log(`   🧐    ❨auto-encrypt❩ Starting to poll for authorisation state for domain ${this.domain}…`)

    // Note: while this is an async function, we are not awaiting the result
    // ===== here. Our goal is to simply trigger the start of polling. We do
    //       not care about the result.
    this.pollForValidationState()
  }

  async pollForValidationState () {

    log(`   👋    ❨auto-encrypt❩ Polling for authorisation state for domain ${this.domain}…`)

    const result = await (new AuthorisationRequest()).execute(this.authorisationUrl)

    if (result.body.status === 'valid') {
      log(`   🎉    ❨auto-encrypt❩ Authorisation validated for domain ${this.domain}`)
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

      log(`   ⌚    ❨auto-encrypt❩ Authorisation not valid yet for domain ${this.domain}. Waiting to check again in ${pollingDuration/1000} second${pollingDuration === 1000 ? '' : 's'}…`)

      await waitFor(pollingDuration)
      await this.pollForValidationState()
    }
  }
}

module.exports = Authorisation
