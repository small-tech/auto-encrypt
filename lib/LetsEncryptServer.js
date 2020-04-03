class LetsEncryptServer {
  constructor (type) {
    this.type = type
  }

  get name     () { return this.#names[this.type]     }
  get endpoint () { return this.#endpoints[this.type] }

  //
  // Private.
  //

  #names = [ 'production', 'staging', 'pebble' ]

  #endpoints = [
    'https://acme-v02.api.letsencrypt.org/directory',
    'https://acme-staging-v02.api.letsencrypt.org/directory',
    'https://localhost:14000/dir'
  ]
}

module.exports = LetsEncryptServer
