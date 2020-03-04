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

const Authorisation = require('./Authorisation')
const acmeCsr = require('./acmeCsr')
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

  get numberOfAuthorisationsValidated ()      { return this._numberOfAuthorisationsValidated }
  set numberOfAuthorisationsValidated (value) {
    this._numberOfAuthorisationsValidated = value

    console.log(` 📝 An authorisation was validated for the order! (${this._numberOfAuthorisationsValidated}/${this._numberOfAuthorisationsToValidate})`)

    if (this._numberOfAuthorisationsValidated === this._numberOfAuthorisationsToValidate) {
      // All authorisations have been validated. Now, finalise the order and send the CSR.
      // “Once the client believes it has fulfilled the server's requirements,
      // it should send a POST request to the order resource's finalize URL.
      // The POST body MUST include a CSR.” – RFC 8555 § 7.4 (Applying for Certificate Issuance).

      console.log(` 🎊 All authorisations validated.`)
      this.finaliseOrder()
    }
  }


  async finaliseOrder ()  {
    console.log(` 💃 Finalising order…`)

    // Generate a Certificate Signing Request in the unique format that ACME expects.
    const csr = await acmeCsr(this.domains)

    try {
      this.data = await (new FinaliseOrderRequest()).execute(this.finaliseUrl, csr)
    } catch (error) {
      // TODO: Handle error.
      throw new Error(error)
    }

    if (this.status === 'valid') {
      console.log(' ✔ Order is valid')

      // Download and save the certificate.
      let certificate
      try {
        certificate = await ((new CertificateRequest)).execute(this.certificateUrl)
      } catch (error) {
        throw new Error(error)
      }

      console.log(' 💅 Got the certificate: ')
      console.log(certificate)

      // TODO: save the certificate, etc. and refactor.

    } else {
      console.log(`Order is not valid! (${this.status})`)
      // TODO: Handle this.
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
    this._numberOfAuthorisationsToValidate = this.domains.length
    console.log(`Number of authorisations to validate: ${this._numberOfAuthorisationsToValidate}`)
    this.numberOfAuthorisationsValidated = 0

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
          this.numberOfAuthorisationsValidated++
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
const CertificateRequest = require('./acme-requests/CertificateRequest')
