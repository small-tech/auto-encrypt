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

async function main () {

  // Generate/save or load the identity.
  const identity = Identity.getSharedInstance()

  // Get the directory.
  const directory = await Directory.getInstance()

  const payload = { termsOfServiceAgreed: true }
  const protectedHeader = {
    alg: 'RS256',
    jwk: identity.publicJWK,
    nonce: await Nonce.new(),
    url: directory.newAccountUrl
  }
  const signedRequest = jose.JWS.sign.flattened(payload, identity.key, protectedHeader)

  log('Protected header', protectedHeader)

  // The required headers as per RFC 8555 § 6.1 (HTTPS Requests) and § 6.2 (Request Authentication)
  const headers = {
    'Content-Type': 'application/jose+json',
    'User-Agent': 'small-tech.org-acme/1.0.0 node/12.16.0',
    'Accept-Language': 'en-US'
  }

  // Prepare a new account request (RFC 8555 § 7.3 Account Management)
  const newAccountRequest = prepareRequest('POST', directory.newAccountUrl, /* acceptable responses are */ 200, 201)

  log('newAccountRequest', newAccountRequest)

  let responseBody
  let newAccountResponse
  try {
    newAccountResponse = await newAccountRequest('', signedRequest, headers)
  } catch (error) {
    log('error', error)
    responseBody = error.responseBody
  }
  if (responseBody) {
    const responseBuffer = await responseBody
    log(responseBuffer.toString('utf-8'))
  }

  log('New account response', newAccountResponse)
  log('Headers', newAccountResponse.headers)

  // TODO: Next we need to save the response.
  // TODO: Move this into its own class.
}

main()
