
////////////////////////////////////////////////////////////////////////////////
//
// ChallengeServer
//
// (Singleton; please use ChallengeServer.getSharedInstance() to access.)
//
// HTTP server that responds to http-01 challenges and forwards all other
// requests to an HTTPS server that it expects to be active at the same domain.
//
// See RFC 8555 § 8.3 (HTTP Challenge)
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const http = require('http')

class ChallengeServer {
  //
  // Singleton access (async).
  //
  static instance = null
  static isBeingInstantiatedViaSingletonFactoryMethod = false

  static async getSharedInstance () {
    if (ChallengeServer.instance === null) {
      ChallengeServer.isBeingInstantiatedViaSingletonFactoryMethod = true
      ChallengeServer.instance = new ChallengeServer()
      await ChallengeServer.instance.init()
    }
    return ChallengeServer.instance
  }

  addResponder (responder) {
    this.responders.push(responder)
  }

  //
  // Private.
  //

  constructor () {
    // Ensure singleton access.
    if (ChallengeServer.isBeingInstantiatedViaSingletonFactoryMethod === false) {
      throw new Error('ChallengeServer is a singleton. Please instantiate using the ChallengeServer.getSharedInstance() method.')
    }
    ChallengeServer.isBeingInstantiatedViaSingletonFactoryMethod = false

    this.responders = []

    // Create the HTTP server to loop through responses until one handles the request or,
    // if none of them do, forward any other insecure requests we receive to an HTTPS
    // server that we expect to be running at the same domain.
    this.server = http.createServer((request, response) => {
      let responded = false

      this.responders.forEach(responder => {
        responded = responder(request, response)
        if (responded) break
      })

      // If this is not an ACME authorisation request, as nothing else should be using insecure HTTP,
      // forward the request to HTTPS.
      if (!responded) {
        console.log(` 👉 Received non-ACME HTTP request for ${request.url}, redirecting to HTTPS.`)
        response.redirect(`https://${request.headers.host}${request.url}`)
      }
    })
  }

  async init () {
    // Note: the server is created on Port 80. On Linux, you must ensure that the Node.js process has
    // ===== the correct privileges for this to work. Looking forward to removing this notice once Linux
    // leaves the world of 1960s mainframe computers and catches up to other prominent operating systems
    // that don’t have this archaic restriction which is security theatre at best and a security
    // vulnerability at worst in the global digital network age.
    this.server.listen(80, () => {
      console.log(` 🔒 @small-tech/le-http01 HTTP server is listening for challenges`)
    })
  }
}

module.exports = ChallengeServer
