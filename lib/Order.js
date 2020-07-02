///////////////////////////////////////////////////////////////////////////////
//
// Order
//
// (Please use async factory method Order.getInstanceAsync() to instantiate.)
//
// Represents a Let’s Encrypt order.
// See RFC 8555 § 7.1.3 (Order Objects), 7.4 (Applying for Certificate Issuance)
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const fs                      = require('fs-extra')
const Authorisation           = require('./Authorisation')
const HttpServer              = require('./HttpServer')
const CertificateIdentity     = require('./identities/CertificateIdentity')
const acmeCsr                 = require('./acmeCsr')
const asyncForEach            = require('./util/async-foreach')
const log                     = require('./util/log')
const NewOrderRequest         = require('./acme-requests/NewOrderRequest')
const FinaliseOrderRequest    = require('./acme-requests/FinaliseOrderRequest')
const CheckOrderStatusRequest = require('./acme-requests/CheckOrderStatusRequest')
const CertificateRequest      = require('./acme-requests/CertificateRequest')
const Throws                  = require('./util/Throws')
const waitFor                 = require('./util/waitFor')

const throws = new Throws()

class Order {
  #data                = null
  #headers             = null
  #order               = null
  #certificate         = null
  #certificateIdentity = null
  #authorisations      = []

  //
  // Factory method (async).
  //
  static isBeingInstantiatedViaFactoryMethod = false

  static async getInstanceAsync (configuration = throws.ifMissing(), accountIdentity = throws.ifMissing()) {
    Order.isBeingInstantiatedViaFactoryMethod = true
    const instance = Order.instance = new Order(configuration, accountIdentity)
    await Order.instance.init()
    return instance
  }

  get certificate         () { return this.#certificate                             }
  get certificateIdentity () { return this.#certificateIdentity                     }
  get authorisations      () { return this.#authorisations                          }
  get finaliseUrl         () { return this.#order ? this.#order.finalize : null     }
  get identifiers         () { return this.#order ? this.#order.identifiers : null  }
  get status              () { return this.#order ? this.#order.status : null       }
  get expires             () { return this.#order ? this.#order.expires : null      }
  get certificateUrl      () { return this.#order ? this.#order.certificate : null  }
  get headers             () { return this.#headers                                 }

  //
  // Private.
  //

  get data () { return this.#data }
  set data (value) {
    this.#data = value
    this.#headers = this.#data.headers
    this.#order = this.#data.body
  }

  set certificate         (value) { throws.error(Symbol.for('ReadOnlyAccessorError', 'certificate'))         }
  set certificateIdentity (value) { throws.error(Symbol.for('ReadOnlyAccessorError', 'certificateIdentity')) }
  set authorisations      (value) { throws.error(Symbol.for('ReadOnlyAccessorError', 'authorisations'))      }
  set finaliseUrl         (value) { throws.error(Symbol.for('ReadOnlyAccessorError', 'finaliseUrl'))         }
  set identifiers         (value) { throws.error(Symbol.for('ReadOnlyAccessorError', 'identifiers'))         }
  set authorisations      (value) { throws.error(Symbol.for('ReadOnlyAccessorError', 'authorisations'))      }
  set status              (value) { throws.error(Symbol.for('ReadOnlyAccessorError', 'status'))              }
  set expires             (value) { throws.error(Symbol.for('ReadOnlyAccessorError', 'expires'))             }
  set certificateUrl      (value) { throws.error(Symbol.for('ReadOnlyAccessorError', 'certificateUrl'))      }
  set headers             (value) { throws.error(Symbol.for('ReadOnlyAccessorError', 'headers'))             }

  //
  // Private.
  //

  /**
   * Creates an instance of Order.
   *
   * @param {Configuration} configuration (Required) Configuration instance.
   */
  constructor (configuration = throws.ifMissing(), accountIdentity = throws.ifMissing()) {
    // Ensure singleton access.
    if (Order.isBeingInstantiatedViaFactoryMethod === false) {
      throw new Error('Order constructor is private. Please instantiate using :await Order.getInstanceAsync().')
    }

    this.configuration   = configuration
    this.domains         = configuration.domains
    this.accountIdentity = accountIdentity

    Order.isBeingInstantiatedViaFactoryMethod = false
  }


  async init () {
    try {
      this.data = await ((new NewOrderRequest()).execute(this.configuration))
    } catch (error) {
      // TODO: Handle error.
      throw new Error(error)
    }

    this.#authorisations = []

    let numberOfAuthorisationsValidated = 0
    let numberOfAuthorisationsToValidate = this.domains.length

    log(`   📈    ❨auto-encrypt❩ Number of authorisations to validate: ${numberOfAuthorisationsToValidate}`)

    // We’ve got the order back. Download all the authorisations and
    // create Authorisation instances from them. The Authorisation
    // instances will handle settings up to answer their challenges themselves.
    await asyncForEach(
      this.data.body.authorizations,
      async authorisationUrl => {
        // An authorisation only returns when it is validated.
        // TODO: handle errors.
        const authorisation = await Authorisation.getInstanceAsync(authorisationUrl, this.accountIdentity)

        numberOfAuthorisationsValidated++

        log(`   📝    ❨auto-encrypt❩ An authorisation was validated for the order! (${numberOfAuthorisationsValidated}/${numberOfAuthorisationsToValidate})`)

        this.#authorisations.push(authorisation)
      }
    )

    // At this point, all authorisations have been validated. Now, finalise the order and send the CSR.
    // “Once the client believes it has fulfilled the server's requirements,
    // it should send a POST request to the order resource's finalize URL.
    // The POST body MUST include a CSR.” – RFC 8555 § 7.4 (Applying for Certificate Issuance).

    log(`   🎊    ❨auto-encrypt❩ All authorisations validated.`)

    // We no longer need the HTTP server in Challenge Server mode (as place in by the authorisations).
    // When we turn Challenge Server off, it will start redirecting any HTTP calls its receives to HTTPS.
    const httpServer = await HttpServer.getSharedInstance()
    httpServer.challengeServer = false

    log(`   💃    ❨auto-encrypt❩ Finalising order…`)

    // Generate and save certificate’s identity (private key).
    this.#certificateIdentity = new CertificateIdentity(this.configuration)

    // Generate a Certificate Signing Request in the unique format that ACME expects.
    const csr = await acmeCsr(this.domains, this.certificateIdentity.key)

    let numAttempts = 0
    while (this.status !== 'valid' && this.status !== 'invalid') {
      numAttempts++

      if (numAttempts > 5) {
        log(`   ❌    ❨auto-encrypt❩ Timed out waiting for order validity. `)
        break;
      }

      try {
        if (numAttempts === 1) {
          // Finalise using CSR.
          this.data = await (new FinaliseOrderRequest()).execute(this.finaliseUrl, csr)
        } else {
          // Check for order status.
          this.data = await (new CheckOrderStatusRequest()).execute(this.#headers.location)
        }
      } catch (error) {
        // TODO: Handle error.
        throw new Error(error)
      }

      if (this.status === 'valid') {
        log('   🎁    ❨auto-encrypt❩ Order is valid.')

        // Download and cache the certificate.
        try {
          const certificateResponse = await ((new CertificateRequest)).execute(this.certificateUrl)
          this.#certificate = certificateResponse.body
        } catch (error) {
          throw new Error(error)
        }

        log('   💅    ❨auto-encrypt❩ Got the certificate.')

        // Save the certificate.
        try {
          await fs.writeFile(this.configuration.certificatePath, this.certificate, 'utf-8')
        } catch (error) {
          throw new Error(error)
        }

        log('   💾    ❨auto-encrypt❩ Saved the certificate.')
      } else {
        log(` ℹ️ Order is not valid. Current status: (${this.status})`)

        if (this.status === 'invalid')
        {
          // To let renewal attempts naturally retry every day, we let this pass.
          log(`   ❌    ❨auto-encrypt❩ Order is invalid. `)
        } else {
          log(`   ⏳    ❨auto-encrypt❩ Waiting a second before checking again…`)
          await waitFor(1000)
        }
      }
    }
  }
}

module.exports = Order
