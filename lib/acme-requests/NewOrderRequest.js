////////////////////////////////////////////////////////////////////////////////
//
// NewOrderRequest
//
// Creates a new order request to start the process of obtaining
// Let’s Encrypt TLS certificates.
//
// See RFC 8555 § 7.1.3 (Order Objects), 7.4 (Applying for Certificate Issuance)
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

import AcmeRequest from '../AcmeRequest.js'
import Throws from '../util/Throws.js'
const throws = new Throws()

export default class NewOrderRequest extends AcmeRequest {
  async execute (configuration = throws.ifMissing()) {
    const identifiers = configuration.domains.map(domain => { return { type: 'dns', value: domain} })
    const payload = { identifiers }

    const response = await super.execute('newOrder', payload, /* useKid = */ true, /* successCodes = */ [201])
    return response
  }
}
