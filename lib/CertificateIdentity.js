////////////////////////////////////////////////////////////////////////////////
//
// CertificateIdentity
//
// (Please use CertificateIdentity.getInstance() static factory method
// to instantiate.)
//
// Generates, stores, loads, and saves the certificate identity. The default
// certificate identity file path is:
//
// ~/.small-tech.org/auto-encrypt/certificate-identity.pem
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const Identity = require('./Identity')
const Configuration = require('./Configuration')

class CertificateIdentity {

  // Factory method (returns a configured Identity instance).
  static getInstance () {
    Identity.isBeingInstantiatedViaSubclassFactoryMethod = true
    return new Identity(Configuration.certificateIdentityPath)
  }
}

module.exports = CertificateIdentity
