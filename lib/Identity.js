////////////////////////////////////////////////////////////////////////////////
//
// Identity
//
// (Singleton; please use Identity.getSharedInstance() to access.)
//
// Generates, stores, loads, and saves an identity from/to the file
// storage settings path. The default identiy file path is:
// ~/.small-tech.org/acme-http-01/identity.pem
//
// The private key uses the RS256 algorithm with a 2048-bit key.
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const os = require('os')
const util = require('util')
const path = require('path')
const fs = require('fs-extra')

const jose = require('jose')

class Identity {

  static instance = null

  // Singleton access.
  static getSharedInstance (settingsPath = null) {
    if (Identity.instance === null) {
      Identity.instance = new Identity(settingsPath)
    }
    return Identity.instance
  }

  // Private constructor.
  constructor (settingsPath = null) {
    // Store the settings path and generate any necessary related working paths.
    this.settingsPath = settingsPath

    if (!fs.existsSync(this.identityFilePath)) {
      // The identity file does not already exist, generate and save it.
      console.log('Identity: saved identity does not exist, generating it.')
      this._key = jose.JWK.generateSync('RSA')
      const keyAsPEM = (this._key.toPEM(/* private = */ true))
      fs.writeFileSync(this.identityFilePath, keyAsPEM, 'utf-8')
    } else {
      // Load the key from storage.
      console.log('Identity saved identity exists, loading it.')
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

  // Set the settings path, creating it in the file system if necessary.
  set settingsPath (value) {
    if (value === null) {
      value = path.join(os.homedir(), '.small-tech.org', 'acme-http-01')
    }
    fs.mkdirpSync(value)
    this._settingsPath = value
    this._identityFilePath = path.join(value, 'identity.pem')
  }

  get settingsPath () { return this._settingsPath }

  set identityFilePath (value) { throw new Error('identityFilePath property is read only')}
  get identityFilePath ()      { return this._identityFilePath }

  // Custom object description for console output (for debugging).
  [util.inspect.custom] () {
    return `
      # Identity

      Generates, stores, loads, and saves an identity (JWT OKP key using
      Ed25519 curve) from/to file storage.

      - Identity file path: ${this.identityFilePath}

      ## Properties

      - .key        : the jose.JWK.RSAKey instance
      - .privateJWK : JavaScript object representation of JWK (private key)
      - .publicJWK  : JavaScript object representation of JWK (public key)

      To see key details, console.log() the .key property.
    `
  }
}

module.exports = Identity
