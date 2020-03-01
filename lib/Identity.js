////////////////////////////////////////////////////////////////////////////////
//
// Identity
//
// (Singleton; please use Identity.getSharedInstance() to access.)
//
// Generates, stores, loads, and saves an identity from/to the file
// storage settings path. The default identity file path is:
// ~/.small-tech.org/acme-http-01/identity.pem
//
// The private key uses the RS256 algorithm with a 2048-bit key.
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const util = require('util')
const path = require('path')
const fs = require('fs-extra')

const jose = require('jose')

const Configuration = require('./Configuration')

class Identity {

  static instance = null
  static isBeingInstantiatedViaSingletonFactoryMethod = false

  // Singleton access.
  static getSharedInstance () {
    if (Identity.instance === null) {
      Identity.isBeingInstantiatedViaSingletonFactoryMethod = true
      Identity.instance = new Identity()
    }
    return Identity.instance
  }

  // Private constructor.
  constructor () {
    // Ensure singleton access.
    if (Identity.isBeingInstantiatedViaSingletonFactoryMethod === false) {
      throw new Error('Identity is a singleton. Please instantiate using the Identity.getSharedInstance() method.')
    }
    Identity.isBeingInstantiatedViaSingletonFactoryMethod = false

    this.identityFilePath = path.join(Configuration.settingsPath, 'identity.pem')

    if (!fs.existsSync(this.identityFilePath)) {
      // The identity file does not already exist, generate and save it.
      this._key = jose.JWK.generateSync('RSA')
      const keyAsPEM = (this._key.toPEM(/* private = */ true))
      fs.writeFileSync(this.identityFilePath, keyAsPEM, 'utf-8')
    } else {
      // Load the key from storage.
      const keyAsPEM = fs.readFileSync(this.identityFilePath, 'utf-8')
      this._key = jose.JWK.asKey(keyAsPEM)
    }
  }

  //
  // Accessors.
  //
  get key ()        { return this._key              }
  get privateJWK () { return this._key.toJWK(true)  }
  get publicJWK ()  { return this._key.toJWK()      }

  set filePath (value) { throw new Error('filePath property is read only')}
  get filePath ()      { return this.identityFilePath }

  // Custom object description for console output (for debugging).
  [util.inspect.custom] () {
    return `
      # Identity

      Generates, stores, loads, and saves an identity (JWT OKP key using
      Ed25519 curve) from/to file storage.

      - Identity file path: ${this.filePath}

      ## Properties

      - .key        : the jose.JWK.RSAKey instance
      - .privateJWK : JavaScript object representation of JWK (private key)
      - .publicJWK  : JavaScript object representation of JWK (public key)

      To see key details, please log() the .key property.
    `
  }
}

module.exports = Identity
