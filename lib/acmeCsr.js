///////////////////////////////////////////////////////////////////////////////
//
// ACME CSR
//
// Given a regular Certification Request in PEM format, returns an
// ACME-formatted CSR (single-line PEM without the header or footer and encoded
// in base64Url instead of base64 format).
//
// See RFC 8555 § 7.4 (Applying for Certificate Issuance).
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////
const forge = require('node-forge')
const DNS = 2 // The ANS.1 type for DNS name.

// Returns a valid ACME-formatted (RFC 8555) CSR.

/**
 * Return an ACME-formatted (RFC 8555) CSR given a list of domains and a Jose JWK.rsaKey.
 *
 * @param {String[]}   domains
 * @param {JWK.rsaKey} key
 * @returns {String} An ACME-formatted CSR in PEM format.
 */
module.exports = function (domains, key) { return pemToAcmeCsr(csrAsPem(domains, key)) }

/**
 * Create a CSR given a list of domains and a Jose JWK.rsaKey.
 *
 * @param {String[]}   domains
 * @param {JWK.rsaKey} key
 * @returns {String} A CSR in PEM format.
 */
function csrAsPem (domains, key) {
  var csr = forge.pki.createCertificationRequest()

  const keys = {
    public: forge.pki.publicKeyFromPem(key.toPEM(/* private = */ false)),
    private: forge.pki.privateKeyFromPem(key.toPEM(/* private = */ true))
  }

  csr.publicKey = keys.public

  const altNames = domains.map(domain => {
    return {type: DNS, value: domain}
  })

  // According to RFC 8555, we *either* need to specify the subject or the subjectAltName so skip the subject.
  csr.setAttributes([{
    name: 'extensionRequest',
    extensions: [{
      name: 'subjectAltName',
      altNames
    }]
  }])

  csr.sign(keys.private)

  const pem = forge.pki.certificationRequestToPem(csr)
  return pem
}

function pemToAcmeCsr (csr) {
  csr = pemToHeaderlessSingleLinePem(csr)
  csr = base64ToBase64Url(csr)
  return csr
}

// Strip the PEM headers and covert to a non-newline delimited Base64Url-encoded
// string as required by RFC 8555 (would be nice if this was explicitly-mentioned in the spec).
function pemToHeaderlessSingleLinePem (str) {
  return str
            .replace('-----BEGIN CERTIFICATE REQUEST-----', '')
            .replace('-----END CERTIFICATE REQUEST-----', '')
            .replace(/\n/g, '')
}

// Convert a base64-encoded string into a base64Url-encoded string.
function base64ToBase64Url (str) {
  return str
           .replace(/\+/g, '-')
           .replace(/\//g, '_')
           .replace(/=/g, '')
}
