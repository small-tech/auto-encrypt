///////////////////////////////////////////////////////////////////////////////
//
// csr (async function)
//
// Returns an ACME-formatted CSR (single-line PEM without the header or footer
// and encoded in base64Url instead of base64 format).
// See RFC 8555 § 7.4 (Applying for Certificate Issuance).
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////
const rsaCsaAsPem = require('@small-tech/rsa-csr')

function pemToAcmeCSR (csr) {
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

// TODO: Update acmeCsr to accept certificateIdentity as the second argument.
// Returns a valid ACME-formatted (RFC 8555) CSR.
async function csr (domains, key /* privateJWK */) {
  let csrAsPem = await rsaCsaAsPem({key, domains})
  acmeCsr = pemToAcmeCSR(csrAsPem)
  return acmeCsr
}

module.exports = csr
