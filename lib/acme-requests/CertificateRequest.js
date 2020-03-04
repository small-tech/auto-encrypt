////////////////////////////////////////////////////////////////////////////////
//
// CertificateRequest
//
// Requests download of the TLS certificate for a validated order.
//
// See RFC 8555 § 7.4.2 (Downloading the Certificate).
// The certificate type is application/pem-certificate-chain (RFC 8555 § 9.1).
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const AcmeRequest = require('../AcmeRequest')

class CertificateRequest extends AcmeRequest {
  async execute (certificateUrl) {
    // This is a POST-as-GET request so it doesn’t have a payload.
    // See RFC 8555 § 6.3 (GET and POST-as-GET requests).
    const noPayload = ""

    let response
    try {
      // Note: a 201 (Created) is returned if the account is new, a 200 (Success) is returned
      // ===== if an existing account is found. (RFC 8555 § 7.3 & 7.3.1).
      response = await super.execute(
        /* command =                 */ '', // see URL, below.
        /* payload =                 */ noPayload,
        /* useKid =                  */ true,
        /* successCodes =            */ [200],
        /* url =                     */ certificateUrl,
        /* parseResponseBodyAsJSON = */ false
      )
    } catch (error) {
      throw new Error(error)
    }

    return response
  }
}

module.exports = CertificateRequest
