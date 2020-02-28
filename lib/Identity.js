//////////////////////////////////////////////////////////////////////
//
// Identity
//
// (Singleton; please use Identity.getSharedInstance() to access.)
//
// Generates, stores, loads, and saves an identity (JWT OKP key using
// Ed25519 curve) from/to the file storage settings path
// (default ~/.small-tech.org/acme-http-01/identity).
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
//////////////////////////////////////////////////////////////////////

const path = require('path')
const fs = require('fs-extra')

const jose = require('jose')

class Identity {

  static instance = null

  // Singleton access.
  static getSharedInstance (settingsPath) {
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
      this._key = jose.JWK.generateSync('OKP', 'Ed25519')
    } else {
      // Load the key from storage.
      console.log('Identity saved identity exists, loading it.')
      const keyJWT = fs.readFileSync(this.identityFilePath, 'utf-8')
      this._key = jose.JWK.asKey(keyJWT)
    }
  }

  // Accessors.
  get OKPKey ()     { return this._key      }
  get privateKey () { return this._key.d    }
  get publicKey ()  { return this._key.x    }
  get keyId ()      { return this._key.kid  }

  // Set the settings path, creating it in the file system if necessary.
  set settingsPath (value) {
    if (value === null) {
      value = path.join(os.homedir(), '.small-tech.org', 'acme-http-01')
    }
    fs.mkdirpSync(value)
    this._settingsPath = value

    this.identityFilePath = path.join(settingsPath, 'identity.json')
  }

  get settingsPath () { return this._settingsPath }

  // Custom object description for console output (for debugging).
  [util.inspect.custom] () {
    return `
      # Identity

      Generates, stores, loads, and saves an identity (JWT OKP key using
      Ed25519 curve) from/to file storage.

      - Identity file path: ${this.identityFilePath}
      - Public key (x)    : ${this.publicKey}
      - Private key (d)   : ${this.privateKey}
      - Key ID (kid)      : ${this.keyId}

      To see the full OKPKey, console.log() the .OKPKey property.
    `
  }
}

module.exports = Identity
