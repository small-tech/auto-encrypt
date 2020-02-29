////////////////////////////////////////////////////////////////////////////////
//
// Directory (singleton)
//
// In order to help clients configure themselves with the right URLs for
// each ACME operation, ACME servers provide a directory object.  This
// should be the only URL needed to configure clients. (RFC §7.1.1)
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const util = require('util')
const prepareRequest = require('bent')

class Directory {

  static PRODUCTION_ENDPOINT = 'https://acme-v02.api.letsencrypt.org/directory'
  static STAGING_ENDPOINT = 'https://acme-staging-v02.api.letsencrypt.org/directory'

  static instance = null

  // Singleton access (async)
  static async getSharedInstance (staging=true) {
    if (Directory.instance === null) {
      Directory.instance = new Directory(staging)
      await Directory.instance.getUrls()
    }
    return Directory.instance
  }

  //
  // Accessors.
  //

  // Directory URLs.
  get keyChangeUrl()      { this.validate(); return this.directory.keyChange  }
  get newAccountUrl()     { this.validate(); return this.directory.newAccount }
  get newNonceUrl()       { this.validate(); return this.directory.newNonce   }
  get newOrderUrl()       { this.validate(); return this.directory.newOrder   }
  get revokeCertUrl()     { this.validate(); return this.directory.revokeCert }
  get termsOfServiceUrl() { this.validate(); return this.directory.meta.termsOfService }
  get websiteUrl()        { this.validate(); return this.directory.meta.website        }

  // Endpoint type.
  get isStaging()         { return this.staging }
  set isStaging(value)    { throw new Error('isStaging is a read-only property') }
  get isProduction()      { return !this.staging }
  set isProduction(value) { throw new Error('isProduction is a read-only property') }

  //
  // Private.
  //

  constructor(staging=true) {
    this.staging = staging
    this.acmeEndpoint = staging ? Directory.STAGING_ENDPOINT : Directory.PRODUCTION_ENDPOINT
    this.directoryRequest =  prepareRequest('GET', 'json', this.acmeEndpoint)
  }

  // (Async) Fetches the latest Urls from the Let’s Encrypt ACME endpoint being used.
  // This will throw if the request fails. Ensure that you catch the error when
  // using it. Call this before attempting to use the accessors to avoid an error.
  async getUrls() {
    this.directory = await this.directoryRequest()
    this.isReady = true
  }

  validate () {
    if (!this.isReady) {
      throw new Error('Directory singleton instance has not been initialised. Please use the async getSharedInstance() method.')
    }
  }

  // Custom object description for console output (for debugging).
  [util.inspect.custom] () {
    return `
      # Directory (URLs for the Let’s Encrypt ${this.isStaging ? 'staging' : 'PRODUCTION'} endpoint)

      State: ${this.isReady ? `ready.

      ## URLs:

      - keyChangeUrl     : ${this.keyChangeUrl}
      - newAccountUrl    : ${this.newAccountUrl}
      - newNonceUrl      : ${this.newNonceUrl}
      - newOrderUrl      : ${this.newOrderUrl}
      - revokeCertUrl    : ${this.revokeCertUrl}
      - termsOfServiceUrl: ${this.termsOfServiceUrl}
      - websiteUrl       : ${this.websiteUrl}`

      : `not ready. Use the getUrls() method to fetch the URLs from the endpoint.`}
    `
  }
}

module.exports = Directory
