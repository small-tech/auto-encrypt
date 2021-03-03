////////////////////////////////////////////////////////////////////////////////
//
// Directory
//
// In order to help clients configure themselves with the right URLs for
// each ACME operation, ACME servers provide a directory object.  This
// should be the only URL needed to configure clients. (RFC §7.1.1)
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

import util from 'util'
import prepareRequest from 'bent'
import log from './util/log.js'
import Throws from './util/Throws.js'

const throws = new Throws()

export default class Directory {
  directory         = null
  letsEncryptServer = null
  directoryRequest  = null

  //
  // Factory method access (async).
  //
  static isBeingInstantiatedViaAsyncFactoryMethod = false

  static async getInstanceAsync (configuration = throws.ifMissing()) {
    Directory.isBeingInstantiatedViaAsyncFactoryMethod = true
    const directory = new Directory(configuration)
    await directory.getUrls()
    return directory
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

  //
  // Private.
  //

  constructor(configuration) {
    // Ensure async factory method instantiation.
    if (Directory.isBeingInstantiatedViaAsyncFactoryMethod === false) {
      throws.error(Symbol.for('MustBeInstantiatedViaAsyncFactoryMethodError'), 'Directory')
    }
    Directory.isBeingInstantiatedViaAsyncFactoryMethod = false

    this.letsEncryptServer = configuration.server
    this.directoryRequest = prepareRequest('GET', 'json', this.letsEncryptServer.endpoint)

    log(`   📕    ❨auto-encrypt❩ Directory is using endpoint ${this.letsEncryptServer.endpoint}`)
  }

  // (Async) Fetches the latest Urls from the Let’s Encrypt ACME endpoint being used.
  // This will throw if the request fails. Ensure that you catch the error when
  // using it.
  async getUrls() { this.directory = await this.directoryRequest() }

  // Custom object description for console output (for debugging).
  [util.inspect.custom] () {
    return `
      # Directory

      Endpoint: ${this.letsEncryptServer.endpoint}

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
