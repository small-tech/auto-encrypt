////////////////////////////////////////////////////////////////////////////////
//
// @small-tech/auto-encrypt
//
// Automatically provisions and renews Let’s Encrypt™ TLS certificates for
// Node.js® https servers (including Express.js, etc.)
//
// Implements the subset of RFC 8555 – Automatic Certificate Management
// Environment (ACME) – necessary for a Node.js https server to provision TLS
// certificates from Let’s Encrypt using the HTTP-01 challenge on first
// hit of an HTTPS route via use of the Server Name Indication (SNI) callback.
//
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

const Configuration = require('./lib/Configuration')
const Certificate = require('./lib/Certificate')

/**
 * Automatically manages Let’s Encrypt certificate provisioning and renewal for Node.js
 * https servers using the HTTP-01 challenge on first hit of an HTTPS route via use of
 * the Server Name Indication (SNI) callback
 * @function autoEncrypt
 *
 * @param {Object}   parameterObject
 * @param {String[]} parameterObject.domains        Domain names to provision TLS certificates for.
 * @param {Object}   [parameterObject.options]      Standard https server options.
 * @param {Boolean}     [parameterObject.staging]      If true, the Let’s Encrypt staging servers will be used (default is false).
 * @param {String}   [parameterObject.settingsPath=~/.small-tech.org/auto-encrypt/] Custom path to save certificates and keys to.
 * @returns {Object} An options object to be passed to the https.createServer() method.
 */
function autoEncrypt(parameterObject) {

  function throwRequiredParameterError () { throw new Error('parameter object must have a domains property')}

  const staging = parameterObject.staging || false
  const domains = parameterObject.domains || throwRequiredParameterError()
  const options = parameterObject.options || {}
  const settingsPath = parameterObject.settingsPath || null

  // Save the settings path in the Configuration static class. Any other classes that need access
  // to the settings path can acquire an instance of it instead of having to maintain either circular
  // references to this main class or to keep injecting references to it between each other.
  Configuration.settingsPath = settingsPath

  // Set the staging setting.
  Configuration.staging = staging

  const certificate = Certificate.getSharedInstance()

  options.SNICallback = async (serverName, callback) => {
    if (domains.includes(serverName)) {
      const secureContext = await certificate.getSecureContext(domains)
      if (secureContext === null) {
        console.log(' ⏳ We’re busy provisioning certificates and rejecting calls at the moment. ')
        callback()
        return
      }
      callback(null, secureContext)
    } else {
      console.log(` 🤨 [@small-tech/auto-connect] SNI: Not responding to request for domain ${serverName} (valid domain${domains.length > 1 ? 's are' : ' is'} ${domains}).`)
      callback()
    }
  }

  // TODO: also add OCSP stapling
  // https://source.ind.ie/site.js/spikes/acme-http-01/issues/1

  return options

}

module.exports = autoEncrypt
