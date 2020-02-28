// Implements the subset of RFC 8555 – Automatic Certificate Management Environment (ACME) – necessary for a client to
// support TLS certificate provisioning from Let’s Encrypt using HTTP-01 challenges.

const util = require('util')
const prepareRequest = require('bent')

const jose = require('jose')
const base64url = require('base64url')

const Identity = require('./lib/Identity')
const Directory = require('./lib/Directory')

async function main () {

  // Generate/save or load the identity.
  const identity = Identity.getSharedInstance()

  console.log(identity)

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
    alg: 'EdDSA',
    crv: 'Ed25519',
    jwk: identity.publicKey,
    nonce: newNonce,
    url: directory.newAccountUrl
  }

  console.log('payload', payload)
  console.log('protectedHeader', protectedHeader)

  const signedRequest = jose.JWS.sign.flattened(payload, identity.OKPKey, protectedHeader)
  signedRequest.protected = base64url(signedRequest.protected)
  signedRequest.payload = base64url(signedRequest.payload)

  console.log('Signed request', signedRequest)

  // Prepare a new account request (RFC § 7.3)
  // const newAccountRequest = prepareRequest('POST', directory.newAccountUrl, 'json', /* acceptable responses are */ 200, 201, {
  //   protected: base64url({
  //     alg: 'EdDSA',
  //     crv: 'Ed25519',
  //     jwk: identity.publicKey,
  //     nonce: newNonce,
  //     url: directory.newAccountUrl
  //   }),
  //   payload: base64url({
  //     termsOfServiceAgreed: true
  //   }),
  //   signature: ''
  // })

  // const newAccountResponse = await newAccountRequest()

  // console.log('New account response', newAccountResponse)
}

main()
