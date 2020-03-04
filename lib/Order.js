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

const Identity = require('./Identity')
const Authorisation = require('./Authorisation')
const rsaCsr = require('@small-tech/rsa-csr')
const asyncForEach = require('./async-foreach')

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

  get authorisations () { return this._authorisations          }

  get finaliseUrl ()    { return this._order.finalize          }
  get identifiers ()    { return this._order.identifiers       }
  get status ()         { return this._order.status            }
  get expires ()        { return this._order.expires           }
  get certificateUrl () { return this._order.certificate       }
  get headers ()        { return this._headers                 }

  //
  // Private.
  //

  get data ()      { return this._data }
  set data (value) {
    this._data = value
    this._headers = this._data.headers
    this._order = this._data.body
  }

  set finaliseUrl    (value) { throw new Error(`finaliseUrl is a read-only property`)    }
  set identifiers    (value) { throw new Error(`identifiers is a read-only property`)    }
  set authorisations (value) { throw new Error(`authorisations is a read-only property`) }
  set status         (value) { throw new Error(`status is a read-only property`)         }
  set expires        (value) { throw new Error(`expires is a read-only property`)        }

  get authorisationsValidated ()      { return this._authorisationsValidated }
  set authorisationsValidated (value) {
    this._authorisationsValidated = value
    if (this._authorisationsValidated === 0 || this._authorisations.length === 0) {
      return
    }
    if (this._authorisationsValidated === this._authorisations.length) {
      // All authorisations have been validated. Now, finalise the order and send the CSR.
      // “Once the client believes it has fulfilled the server's requirements,
      // it should send a POST request to the order resource's finalize URL.
      // The POST body MUST include a CSR.” – RFC 8555 § 7.4 (Applying for Certificate Issuance).

      console.log(` 🎊 All authorisations validated. About to finalise order and download certificate.`)
      this.finaliseOrder()
    }
  }

  async finaliseOrder ()  {

    function base64ToBase64Url (str) {
      return str
               .replace(/\+/g, '-')
               .replace(/\//g, '_')
               .replace(/=/g, '')
    }

    // To finalise the order, we have to package up the information that Let’s Encrypt already has
    // from previous API calls into the archaic CSR format because that’s that the standard requires.
    // Specifically, we need to tell it, once again, but this time in CSR format:
    //
    //  - the domains we want to register
    //  - our public key
    let csrAsPem = await rsaCsr({
      key: (Identity.getSharedInstance()).privateJWK,
      domains: this.domains
    })

    console.log('CSR as PEM', csrAsPem)

    // Strip the PEM headers and covert to a non-newline delimited Base64Url-encoded
    // string as required by RFC 8555 (would be nice if this was explicitly-mentioned in the spec).
    csr = csr.replace('-----BEGIN CERTIFICATE REQUEST-----', '')
    csr = csr.replace('-----END CERTIFICATE REQUEST-----', '')
    csr = csr.replace(/\n/g, '')
    csr = base64ToBase64Url(csr)

    console.log('Final CSR', csr)

    try {
      this.data = await (new FinaliseOrderRequest()).execute(this.finaliseUrl, csr)
    } catch (error) {
      // TODO: Handle error.
      throw new Error(error)
    }

    console.log(`Finalise order response received.`)

    if (this.status === 'valid') {
      console.log('Order is valid')
      console.log('Certificate URL', this.certificateUrl)
    } else {
      console.log('Order is invalid! (This should not be reached as status code should result in error, above. TODO')
    }
  }

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
      console.log('Order', this.data)
    } catch (error) {
      // TODO: Handle error.
      throw new Error(error)
    }

    this._authorisations = []
    this.authorisationsValidated = 0

    // We’ve got the order back. Download all the authorisations and
    // create Authorisation instances from them. The Authorisation
    // instances will handle settings up to answer their challenges themselves.
    await asyncForEach(
      this.data.body.authorizations,
      async authorisationUrl => {
        const authorisation = await Authorisation.get(authorisationUrl)
        authorisation.once(Authorisation.VALIDATED, () => {
          // Update the counter of authorisations that have been validated so we now
          // when the order is complete.
          console.log(' 📝 An authorisation was validated for the order!')
          this.authorisationsValidated++
        })
        console.log(authorisation)
        this._authorisations.push(authorisation)
      }
    )
  }
}

module.exports = Order

// Classes with circular dependencies should be required here at the end, _after_ the module.exports
// line so that they do not crash due to accessing an empty placeholder object.
// (This is a limitation of Node requires. See https://stackoverflow.com/a/21334734)

const NewOrderRequest = require('./acme-requests/NewOrderRequest')
const FinaliseOrderRequest = require('./acme-requests/FinaliseOrderRequest')
