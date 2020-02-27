// Implements the subset of RFC 8555 – Automatic Certificate Management Environment (ACME) – necessary for a client to
// support TLS certificate provisioning from Let’s Encrypt using HTTP-01 challenges.

const util = require('util')
const prepareRequest = require('bent')

class Directory {

  // In order to help clients configure themselves with the right URLs for
  // each ACME operation, ACME servers provide a directory object.  This
  // should be the only URL needed to configure clients. (RFC §7.1.1)
  static PRODUCTION_ENDPOINT = 'https://acme-v02.api.letsencrypt.org/directory'
  static STAGING_ENDPOINT = 'https://acme-staging-v02.api.letsencrypt.org/directory'

  constructor(staging=true) {
    this._staging = staging
    const acmeEndpoint = staging ? Directory.STAGING_ENDPOINT : Directory.PRODUCTION_ENDPOINT
    this.directoryRequest =  prepareRequest('GET', 'json', acmeEndpoint)
  }

  //
  // Accessors.
  //

  // Directory URLs.
  get keyChangeUrl()      { this.validate(); return this._keyChangeUrl      }
  get newAccountUrl()     { this.validate(); return this._newAccountUrl     }
  get newNonceUrl()       { this.validate(); return this._newNonceUrl       }
  get newOrderUrl()       { this.validate(); return this._newOrderUrl       }
  get revokeCertUrl()     { this.validate(); return this._revokeCertUrl     }
  get termsOfServiceUrl() { this.validate(); return this._termsOfServiceUrl }
  get websiteUrl()        { this.validate(); return this._websiteUrl        }

  // Endpoint type.
  get isStaging()         { return this._staging }
  set isStaging(value)    { throw new Error('isStaging is a read-only property') }
  get isProduction()      { return !this._staging }
  set isProduction(value) { throw new Error('isProduction is a read-only property') }

  // (Async) Fetches the latest Urls from the Let’s Encrypt ACME endpoint being used.
  // This will throw if the request fails. Ensure that you catch the error when
  // using it. Call this before attempting to use the accessors to avoid an error.
  async getUrls() {
    const directory = await this.directoryRequest()

    this._keyChangeUrl = directory.keyChange
    this._newAccountUrl = directory.newAccount
    this._newNonceUrl = directory.newNonce
    this._newOrderUrl = directory.newOrder
    this._revokeCertUrl = directory.revokeCert
    this._termsOfServiceUrl = directory.meta.termsOfService
    this._websiteUrl = directory.meta.website

    this.isReady = true
  }

  // Private.

  validate () {
    if (!this.isReady) {
      throw new Error('Directory has not been requested. Please use the async request() method first.')
    }
  }

  [util.inspect.custom] () {
    return `
      # Directory (URLs for the Let’s Encrypt ${this.isStaging ? 'staging' : 'production'} endpoint)

      State: ${this.isReady ? `ready.

      ## URLs:

      - keyChangeUrl     : ${this._keyChangeUrl}
      - newAccountUrl    : ${this._newAccountUrl}
      - newNonceUrl      : ${this._newNonceUrl}
      - newOrderUrl      : ${this._newOrderUrl}
      - revokeCertUrl    : ${this._revokeCertUrl}
      - termsOfServiceUrl: ${this.termsOfServiceUrl}
      - websiteUrl       : ${this.websiteUrl}`

      : `not ready. Use the getUrls() method to fetch the URLs from the endpoint.`}
    `
  }
}

async function main () {
  const directory = new Directory()
  await directory.getUrls()

  console.log(directory)

  // Get a new nonce (RFC §7.2)
  /// const newNonceRequest = prepareRequest('HEAD', 'string',)
}

main()
