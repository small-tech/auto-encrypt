///////////////////////////////////////////////////////////////////////////////
//
// Order
//
// (Singleton; please use Order.getSharedInstance() (async) to access.)
//
// Represents a Let’s Encrypt order.
// See RFC 8555 § 7.1.3 (Order Objects), 7.4 (Applying for Certificate Issuance)
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const path = require('path')
const fs = require('fs-extra')

const Configuration = require('./Configuration')

// Continue to end of file to see the rest of the dependencies. The ones at the
// end are there as they require a reference to this class.
// (This is a limitation of Node requires. See https://stackoverflow.com/a/21334734)

class Order {
  //
  // Singleton access (async).
  //
  static instance = null
  static isBeingInstantiatedViaSingletonFactoryMethod = false

  static async getSharedInstance (domains) {
    if (Order.instance === null) {
      Order.isBeingInstantiatedViaSingletonFactoryMethod = true
      Order.instance = new Order(domains)
      await Order.instance.init()
    }
    return Order.instance
  }

  get finaliseUrl ()    { return this.data.body.finalize       }
  get identifiers ()    { return this.data.body.identifiers    }
  get authorisations () { return this.data.body.authorizations }
  get status ()         { return this.data.body.status         }
  get expires ()        { return this.data.body.expires        }
    
  //
  // Private.
  //

  readOnlyError ()      { throw new Error(`this is a read-only property`) }

  set finaliseUrl (value)    { this.readOnlyError() }
  set identifiers (value)    { this.readOnlyError() }
  set authorisations (value) { this.readOnlyError() }
  set status (value)         { this.readOnlyError() }
  set expires (value)        { this.readOnlyError() }

  constructor (domains) {
    // Ensure singleton access.
    if (Order.isBeingInstantiatedViaSingletonFactoryMethod === false) {
      throw new Error('Order is a singleton. Please instantiate using the Order.getSharedInstance() method.')
    }
    Order.isBeingInstantiatedViaSingletonFactoryMethod = false

    this.domains = domains
  }

  async init () {
    try {
      this.data = await ((new NewOrderRequest()).execute(this.domains))
    } catch (error) {
      // TODO: Handle error.
      throw new Error(error)
    }
  }
}

module.exports = Order

// Classes with circular dependencies should be required here at the end, _after_ the module.exports
// line so that they do not crash due to accessing an empty placeholder object.
// (This is a limitation of Node requires. See https://stackoverflow.com/a/21334734)

const NewOrderRequest = require('./acme-requests/NewOrderRequest')
