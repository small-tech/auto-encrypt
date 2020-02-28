// Implements the subset of RFC 8555 – Automatic Certificate Management Environment (ACME) – necessary for a client to
// support TLS certificate provisioning from Let’s Encrypt using HTTP-01 challenges.

// Note that where Boulder (Let’s Encrypt’s ACME implementation; the only one that really matters)
// differs from the ACME spec, we will go with Let’s Encrypt’s implementation.
// https://github.com/letsencrypt/boulder/blob/master/docs/acme-divergences.md

const util = require('util')
const prepareRequest = require('bent')

const jose = require('jose')

const Identity = require('./lib/Identity')
const Directory = require('./lib/Directory')

async function main () {

  // Generate/save or load the identity.
  const identity = Identity.getSharedInstance()

  console.log(identity)

  process.exit(0)

  // Get the directory.
  const directory = new Directory()
  await directory.getUrls()

  console.log(directory)

  // Get a new nonce (RFC §7.2)
  const newNonceRequest = prepareRequest('HEAD', directory.newNonceUrl)
  const newNonceResponse = await newNonceRequest()
  const newNonce = newNonceResponse.headers['replay-nonce']

  console.log('New nonce', newNonce)

  const payload = { termsOfServiceAgreed: true }
  const protectedHeader = {
    alg: 'RS256',
    jwk: identity.publicJWK,
    nonce: newNonce,
    url: directory.newAccountUrl
  }
  const signedRequest = jose.JWS.sign.flattened(payload, identity.key, protectedHeader)

  console.log('Signed request', signedRequest)

  // The required headers as per RFC 8555 § 6.1 (HTTPS Requests) and § 6.2 (Request Authentication)
  const headers = {
    'Content-Type': 'application/jose+json',
    'User-Agent': 'small-tech.org-acme/1.0.0 node/12.16.0',
    'Accept-Language': 'en-US'
  }

  // Prepare a new account request (RFC 8555 § 7.3 Account Management)
  const newAccountRequest = prepareRequest('POST', directory.newAccountUrl, 'json', /* acceptable responses are */ 200, 201)

  console.log('newAccountRequest', newAccountRequest)

  let responseBody
  let newAccountResponse
  try {
    newAccountResponse = await newAccountRequest('', signedRequest, headers)
  } catch (error) {
    console.log('error', error)
    responseBody = error.responseBody
  }
  if (responseBody) {
    const responseBuffer = await responseBody
    console.log(responseBuffer.toString('utf-8'))
  }

  console.log('New account response', newAccountResponse)

  // TODO: Next we need to save the response.
  // TODO: Move this into its own class.
}

main()
