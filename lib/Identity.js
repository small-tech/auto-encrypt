////////////////////////////////////////////////////////////////////////////////
//
// Identity (abstract base class; do not use directly).
//
// Generates, stores, loads, and saves an identity from/to the file
// storage settings path. Meant to be subclassed and instantiated by different
// singletons for different types of Identity (e.g., AccountIdentity and
// DomainIdentity).
//
// The private key uses the RS256 algorithm with a 2048-bit key.
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const util          = require('util')
const fs            = require('fs-extra')
const jose          = require('jose')
const Throws        = require('./util/Throws')
const log           = require('./util/log')

const throws = new Throws()

class Identity {

  constructor (configuration = throws.ifMissing(), identityFilePathKey = throws.ifMissing()) {
    const identityFilePath = configuration[identityFilePathKey]
    const uniqueIdentifier = identityFilePath.slice(identityFilePath.indexOf(`/${configuration.staging ? 'staging' : 'production'}/`),)
    log(` 👤 Creating identity for ${uniqueIdentifier}`)

    this.identityFilePath = identityFilePath

    if (!fs.existsSync(this.identityFilePath)) {
      // The identity file does not already exist, generate and save it.
      this._key = jose.JWK.generateSync('RSA')
      fs.writeFileSync(this.identityFilePath, this.privatePEM, 'utf-8')
    } else {
      // Load the key from storage.
      const _privatePEM = fs.readFileSync(this.identityFilePath, 'utf-8')
      this._key = jose.JWK.asKey(_privatePEM)
    }
  }

  //
  // Accessors.
  //

  // The JSON Web Key (JWK) instance.
  // https://github.com/panva/jose/blob/master/docs/README.md#jwk-json-web-key.
  get key        () { return this._key                                         }

  // Returns the private key in PEM format.s
  get privatePEM () { return this._key.toPEM(/* private = */ true)             }

  // The JWK thumbprint as calculated according to
  // RFC 7638 (https://tools.ietf.org/html/rfc7638).
  get thumbprint () { return this._key.thumbprint                              }

  // Returns JWK-formatted objects.
  // https://github.com/panva/jose/blob/master/docs/README.md#keytojwkprivate.
  get privateJWK () { return this._key.toJWK(/* private = */ true)             }
  get publicJWK  () { return this._key.toJWK()                                 }

  // The file path of the private key (saved in PEM format).
  get filePath   () { return this.identityFilePath                             }

  //
  // Control access to read-only properties.
  //
  set key        (value) { throw new Error('key property is read only')        }
  set privatePEM (value) { throw new Error('privatePEM property is read only') }
  set thumbprint (value) { throw new Error('thumbprint property is read only') }
  set privateJWK (value) { throw new Error('privateJWK property is read only') }
  set publicJWK  (value) { throw new Error('publicJWK property is read only')  }
  set filePath   (value) { throw new Error('filePath property is read only')   }

  // Custom object description for console output (for debugging).
  [util.inspect.custom] () {
    return `
      # Identity

      Generates, stores, loads, and saves an identity (JWT OKP key using
      Ed25519 curve) from/to file storage.

      - Identity file path: ${this.filePath}

      ## Properties

      - .key        : the jose.JWK.RSAKey instance
      - .privatePEM : PEM representation of the private key
      - .thumbprint : JWK thumbprint calculated according to RFC 7638
      - .privateJWK : JavaScript object representation of JWK (private key)
      - .publicJWK  : JavaScript object representation of JWK (public key)
      - .filePath   : The file path of the private key (saved in PEM format)

      To see key details, please log() the .key property.
    `
  }
}

module.exports = Identity
