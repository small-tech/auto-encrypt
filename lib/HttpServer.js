
////////////////////////////////////////////////////////////////////////////////
//
// HttpServer
//
// (Singleton; please use HttpServer.getSharedInstance() to access.)
//
// A simple HTTP server that:
//
//   A. While provisioning Let’s Encrypt certificates:
//   =================================================
//
//   Acts as a challenge server. See RFC 8555 § 8.3 (HTTP Challenge)
//
//   Responds to http-01 challenges and forwards all other
//   requests to an HTTPS server that it expects to be active at the same domain.
//
//   B. At all other times:
//   ======================
//
//   Forwards http requests to https requests using a 302 redirect.
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const http          = require('http')
const encodeUrl     = require('encodeurl')
const enableDestroy = require('server-destroy')
const log           = require('./util/log')

class HttpServer {
  //
  // Singleton access (async).
  //
  static instance = null
  static isBeingInstantiatedViaSingletonFactoryMethod = false

  // Is the HTTP server acting as a Let’s Encrypt challenge server?
  #isChallengeServer = false

  static async getSharedInstance () {
    if (HttpServer.instance === null) {
      HttpServer.isBeingInstantiatedViaSingletonFactoryMethod = true
      HttpServer.instance = new HttpServer()
      await HttpServer.instance.init()
    }
    return HttpServer.instance
  }

  static async destroySharedInstance () {
    if (HttpServer.instance === null) {
      log('   🚮    ❨auto-encrypt❩ HTTP Server was never setup. Nothing to destroy.')
      return
    }
    log('   🚮    ❨auto-encrypt❩ Destroying HTTP Server…')
    await HttpServer.instance.destroy()
    HttpServer.instance = null
    log('   🚮    ❨auto-encrypt❩ HTTP Server is destroyed.')
  }

  addResponder (responder) {
    this.responders.push(responder)
  }

  //
  // Private.
  //

  constructor () {
    // Ensure singleton access.
    if (HttpServer.isBeingInstantiatedViaSingletonFactoryMethod === false) {
      throw new Error('HttpServer is a singleton. Please instantiate using the HttpServer.getSharedInstance() method.')
    }
    HttpServer.isBeingInstantiatedViaSingletonFactoryMethod = false

    this.responders = []

    // Create the HTTP server to loop through responses until one handles the request or,
    // if none of them do, forward any other insecure requests we receive to an HTTPS
    // server that we expect to be running at the same domain.
    this.server = http.createServer((request, response) => {

      if (this.#isChallengeServer) {
        // Act as a Let’s Encrypt challenge server.
        let responded = false

        for (let i = 0; i < this.responders.length; i++) {
          const responder = this.responders[i]
          responded = responder(request, response)
          if (responded) break
        }

        // If this is not an ACME authorisation request, as nothing else should be using insecure HTTP,
        // forward the request to HTTPS.
        if (!responded) {
          log(`   ⚠    ❨auto-encrypt❩ Received non-ACME HTTP request for ${request.url}, not responding.`)
          response.statusCode = 403
          response.end('403: forbidden')
        }
      } else {
        // Act as an HTTP to HTTPS forwarder.
        // (This means that servers using Auto Encrypt will get automatic HTTP to HTTPS forwarding
        // and will not fail if they are accessed over HTTP.)
        let httpsUrl = null
        try {
          httpsUrl = new URL(`https://${request.headers.host}${request.url}`)
        } catch (error) {
          log(`   ⚠    ❨auto-encrypt❩ Failed to redirect HTTP request: ${error}`)
          response.statusCode = 403
          response.end('403: forbidden')
          return
        }

        // Not using a 307 here
        response.statusCode = 307
        response.setHeader('Location', encodeUrl(httpsUrl))
        response.end()
      }
    })

    // Enable server to be destroyed without waiting for any existing connections to close.
    // (While there shouldn’t be any existing connections and while the likelihood of someone
    // trying to denial-of-service this very low, it’s still the right thing to do.)
    enableDestroy(this.server)
  }

  set challengeServer (state) {
    if (state) {
      log(`   🔒    ❨auto-encrypt❩ HTTP server is now only responding to Let’s Encrypt challenges.`)
    } else {
      log(`   🔒    ❨auto-encrypt❩ HTTP server is now forwarding HTTP requests to HTTPS (302).`)
    }
    this.#isChallengeServer = state
  }

  async init () {
    // Note: the server is created on Port 80. On Linux, you must ensure that the Node.js process has
    // ===== the correct privileges for this to work. Looking forward to removing this notice once Linux
    // leaves the world of 1960s mainframe computers and catches up to other prominent operating systems
    // that don’t have this archaic restriction which is security theatre at best and a security
    // vulnerability at worst in the global digital network age.
    await new Promise((resolve, reject) => {
      try {
        this.server.listen(80, () => {
          log(`   🔒    ❨auto-encrypt❩ HTTP server is listening on port 80.`)
          resolve()
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  async destroy () {
    // Starts killing all connections and closes the server.
    this.server.destroy()

    // Wait until the server is closed before returning.
    await new Promise((resolve, reject) => {
      this.server.on('close', () => {
        resolve()
      })
      this.server.on('error', (error) => {
        reject(error)
      })
    })
  }
}

module.exports = HttpServer
