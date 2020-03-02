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

const AcmeRequest = require('../AcmeRequest')

class NewOrderRequest extends AcmeRequest {
  async execute (domains) {

    const identifiers = domains.map(domain => { return { type: 'dns', value: domain} })
    const payload = { identifiers }

    let response
    try {
      response = await super.execute('newOrder', payload, /* useKid = */ true, /* successCodes = */ [201])
    } catch (error) {
      throw new Error(error)
    }

    return response
  }
}

module.exports = NewOrderRequest
