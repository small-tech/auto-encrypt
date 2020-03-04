////////////////////////////////////////////////////////////////////////////////
//
// CertificateIdentity
//
// (Singleton; please use CertificateIdentity.getSharedInstance() to access.)
//
// Generates, stores, loads, and saves the certificate identity. The default
// account identity file path is:
//
// ~/.small-tech.org/acme-http-01/certificate.pem
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const Identity = require('./Identity')

class CertificateIdentity {
  static instance = null

  // Singleton access (returns a configured Identity instance).
  static getSharedInstance () {
    if (CertificateIdentity.instance === null) {
      Identity.isBeingInstantiatedViaSubclassSingletonFactoryMethod = true
      CertificateIdentity.instance = new Identity('certificate')
    }
    return CertificateIdentity.instance
  }
}

module.exports = CertificateIdentity