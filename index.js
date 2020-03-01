////////////////////////////////////////////////////////////////////////////////
//
// @small-tech/acme-http-01
//
// Implements the subset of RFC 8555 – Automatic Certificate Management
// Environment (ACME) – necessary for a client to support TLS certificate
// provisioning from Let’s Encrypt using HTTP-01 challenges.
//
// Note that where Boulder (Let’s Encrypt’s ACME implementation; the only one
// that really matters) differs from the ACME spec, we will go with Let’s
// Encrypt’s implementation.
// https://github.com/letsencrypt/boulder/blob/master/docs/acme-divergences.md
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const util = require('util')
const prepareRequest = require('bent')

const jose = require('jose')

const log = require('./lib/log')
const Identity = require('./lib/Identity')
const Directory = require('./lib/Directory')
const Nonce = require('./lib/Nonce')

// Abstract base request class for carrying out ACME requests.
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
      console.log('Request error', error)
      responseBody = error.responseBody
    }
    if (responseBody) {
      const responseBuffer = await responseBody
      const errorBody = (responseBuffer.toString('utf-8'))
      console.log('error body', errorBody)
      throw new Error(errorBody)
    }

    console.log('ACME Response', response)
    console.log('Headers', response.headers)

    // Always save the fresh nonce returned from API calls.
    const freshNonce = response.headers['replay-nonce']
    Nonce.set(freshNonce)

    return response
  }
}

class NewAccountRequest extends AcmeRequest {
  async execute () {
    const payload = { termsOfServiceAgreed: true }
    const response = await super.execute('newAccount', payload, /* useKid = */ false)

    // This is what we will be using in the kid field in the future
    // **in place of** the JWK.
    const accountLocation = response.headers['location']

    console.log('Account location', accountLocation)
  }
}

// class NewOrderRequest extends AcmeRequest {
//   execute (payload) { super.execute('newOrder', payload) }

//   process (response) {
//     // TODO
//   }
// }

async function main () {

  await (new NewAccountRequest()).execute()

  // // Generate/save or load the identity.
  // const identity = Identity.getSharedInstance()

  // // Get the directory.
  // const directory = await Directory.getSharedInstance()


  // newAccount
  

  // const payload = { termsOfServiceAgreed: true }
  // const protectedHeader = {
  //   alg: 'RS256',
  //   jwk: identity.publicJWK,
  //   nonce: await Nonce.get(),
  //   url: directory.newAccountUrl
  // }
  // const signedRequest = jose.JWS.sign.flattened(payload, identity.key, protectedHeader)

  // log('Protected header', protectedHeader)

  // // The required headers as per RFC 8555 § 6.1 (HTTPS Requests) and § 6.2 (Request Authentication)
  // const headers = {
  //   'Content-Type': 'application/jose+json',
  //   'User-Agent': 'small-tech.org-acme/1.0.0 node/12.16.0',
  //   'Accept-Language': 'en-US'
  // }

  // // Prepare a new account request (RFC 8555 § 7.3 Account Management)
  // const newAccountRequest = prepareRequest('POST', directory.newAccountUrl, /* acceptable responses are */ 200, 201)

  // log('newAccountRequest', newAccountRequest)

  // let responseBody
  // let newAccountResponse
  // try {
  //   newAccountResponse = await newAccountRequest('', signedRequest, headers)
  // } catch (error) {
  //   log('error', error)
  //   responseBody = error.responseBody
  // }
  // if (responseBody) {
  //   const responseBuffer = await responseBody
  //   log(responseBuffer.toString('utf-8'))
  //   process.exit(1)
  // }

  // log('New account response', newAccountResponse)
  // log('Headers', newAccountResponse.headers)

  // // Save the latest nonce.
  // const headers = newAccountResponse.headers
  // const newNonce = headers['replay-nonce']
  // Nonce.set(newNonce)

  // // This is what we will be using in the kid field in the future
  // // **in place of** the JWK.
  // const accountLocation = headers['location']

  //
  // newOrder
  //



}

main()
