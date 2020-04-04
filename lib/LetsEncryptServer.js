class LetsEncryptServer {
  /**
   * Enumeration.
   *
   * @property PRODUCTION Use the production server.
   * @property STAGING Use the staging server.
   * @property PEBBLE Use a local pebble testing server.
   * @readonly
   * @static
   */
  static type = {
    PRODUCTION: 0,
    STAGING: 1,
    PEBBLE: 2,
  }

  /**
   *Creates an instance of LetsEncryptServer.
   * @param {LetsEncryptServer.type} type
   * @memberof LetsEncryptServer
   */
  constructor (type) {
    this.#type = type
  }

  get type     () { return this.#type                  }
  get name     () { return this.#names[this.#type]     }
  get endpoint () { return this.#endpoints[this.#type] }

  //
  // Private.
  //
  #type = null

  #names = [ 'production', 'staging', 'pebble' ]

  #endpoints = [
    'https://acme-v02.api.letsencrypt.org/directory',
    'https://acme-staging-v02.api.letsencrypt.org/directory',
    'https://localhost:14000/dir'
  ]
}

module.exports = LetsEncryptServer
