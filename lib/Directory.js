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

const Configuration = require('./Configuration')

class Directory {

  static PRODUCTION_ENDPOINT = 'https://acme-v02.api.letsencrypt.org/directory'
  static STAGING_ENDPOINT = 'https://acme-staging-v02.api.letsencrypt.org/directory'

  //
  // Singleton access (async).
  //
  static instance = null
  static isBeingInstantiatedViaSingletonFactoryMethod = false

  static async getSharedInstance () {
    if (Directory.instance === null) {
      Directory.isBeingInstantiatedViaSingletonFactoryMethod = true
      Directory.instance = new Directory()
      await Directory.instance.getUrls()
    }
    return Directory.instance
  }

  //
  // Accessors.
  //

  // Directory URLs.
  get keyChangeUrl()      { return this.directory.keyChange  }
  get newAccountUrl()     { return this.directory.newAccount }
  get newNonceUrl()       { return this.directory.newNonce   }
  get newOrderUrl()       { return this.directory.newOrder   }
  get revokeCertUrl()     { return this.directory.revokeCert }
  get termsOfServiceUrl() { return this.directory.meta.termsOfService }
  get websiteUrl()        { return this.directory.meta.website        }

  // Endpoint type.
  get isStaging()         { return this.staging }
  set isStaging(value)    { throw new Error('isStaging is a read-only property') }
  get isProduction()      { return !this.staging }
  set isProduction(value) { throw new Error('isProduction is a read-only property') }

  //
  // Private.
  //

  constructor() {
    // Ensure singleton access.
    if (Directory.isBeingInstantiatedViaSingletonFactoryMethod === false) {
      throw new Error('Directory is a singleton. Please instantiate using the async Directory.getSharedInstance() method.')
    }
    Directory.isBeingInstantiatedViaSingletonFactoryMethod = false

    this.staging = Configuration.staging
    this.acmeEndpoint = this.staging ? Directory.STAGING_ENDPOINT : Directory.PRODUCTION_ENDPOINT
    this.directoryRequest = prepareRequest('GET', 'json', this.acmeEndpoint)

    console.log(` 📕 Directory is using the Let’s Encrypt ${this.staging ? 'staging' : 'PRODUCTION'} server.`)
  }

  // (Async) Fetches the latest Urls from the Let’s Encrypt ACME endpoint being used.
  // This will throw if the request fails. Ensure that you catch the error when
  // using it.
  async getUrls() { this.directory = await this.directoryRequest() }

  // Custom object description for console output (for debugging).
  [util.inspect.custom] () {
    return `
      # Directory (URLs for the Let’s Encrypt ${this.isStaging ? 'staging' : 'PRODUCTION'} endpoint)

      ## URLs:

      - keyChangeUrl     : ${this.keyChangeUrl}
      - newAccountUrl    : ${this.newAccountUrl}
      - newNonceUrl      : ${this.newNonceUrl}
      - newOrderUrl      : ${this.newOrderUrl}
      - revokeCertUrl    : ${this.revokeCertUrl}
      - termsOfServiceUrl: ${this.termsOfServiceUrl}
      - websiteUrl       : ${this.websiteUrl}
    `
  }
}

module.exports = Directory
