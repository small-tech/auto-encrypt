////////////////////////////////////////////////////////////////////////////////
//
// FinaliseOrderRequest
//
// Attempts to finalise an order by posting the passed CSR (see RFC 2986).
//
// See RFC 8555 § 7.4 (Applying for Certificate Issuance).
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const AcmeRequest = require('../AcmeRequest')
const Throws = require('../util/Throws')

const throws = new Throws()

class FinaliseOrderRequest extends AcmeRequest {
  async execute (finaliseUrl = throws.ifMissing(), csr = throws.ifMissing()) {

    const payload = { csr }

    const response = await super.execute(
        /* command =      */ '', // see URL, below.
        /* payload =      */ payload,
        /* useKid =       */ true,
        /* successCodes = */ [200],
        /* url =          */ finaliseUrl
    )

    return response
  }
}

module.exports = FinaliseOrderRequest
