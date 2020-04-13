////////////////////////////////////////////////////////////////////////////////
//
// CheckOrderStatusRequest
//
// If the order was not valid at time of finalise call (this doesn’t happen
// as per the Let’s Encrypt implementation – Boulder – but could under RFC 8555),
// then we need to send a POST-as-GET request to the finalise url to wait until
// the order is valid.
//
// See RFC 8555 § 7.4 (Applying for Certificate Issuance).
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const AcmeRequest = require('../AcmeRequest')
const Throws      = require('../util/Throws')

const throws = new Throws()

class CheckOrderStatusRequest extends AcmeRequest {
  async execute (orderUrl = throws.ifMissing()) {

    const payload = '' // POST-as-GET

    const response = await super.execute(
        /* command =      */ '', // see URL, below.
        /* payload =      */ payload,
        /* useKid =       */ true,
        /* successCodes = */ [200],
        /* url =          */ orderUrl
    )

    return response
  }
}

module.exports = CheckOrderStatusRequest
