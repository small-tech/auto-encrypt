// Implements the subset of RFC 8555 – Automatic Certificate Management Environment (ACME) – necessary for a client to
// support TLS certificate provisioning from Let’s Encrypt using HTTP-01 challenges.

const util = require('util')
const prepareRequest = require('bent')

const Directory = require('./lib/Directory')

async function main () {
  const directory = new Directory()
  await directory.getUrls()

  console.log(directory)

  // Get a new nonce (RFC §7.2)
  const newNonceRequest = prepareRequest('HEAD', directory.newNonceUrl)
  const newNonceResponse = await newNonceRequest()
  const newNonce = newNonceResponse.headers['replay-nonce']

  console.log('New nonce', newNonce)
}

main()
