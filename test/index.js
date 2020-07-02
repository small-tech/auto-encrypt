const os                                                       = require('os')
const https                                                    = require('https')
const util                                                     = require('util')
const AutoEncrypt                                              = require('..')
const Configuration                                            = require('../lib/Configuration')
const Certificate                                              = require('../lib/Certificate')
const LetsEncryptServer                                        = require('../lib/LetsEncryptServer')
const ocsp                                                     = require('ocsp')
const bent                                                     = require('bent')
const test                                                     = require('tape')
const Pebble                                                   = require('@small-tech/node-pebble')
const { createTestSettingsPath, dehydrate, throwsErrorOfType } = require('../lib/test-helpers')
const HttpServer = require('../lib/HttpServer')

const httpsGetString = bent('GET', 'string')

test('Auto Encrypt', async t => {
  // Run the tests using either a local Pebble server (default) or the Let’s Encrypt Staging server
  // (which is subject to rate limits) if the STAGING environment variable is set.
  // Use npm test task for the former and npm run test-staging task for the latter.
  const isStaging = process.env.STAGING
  const isPebble = !isStaging
  const letsEncryptServerType = isStaging ? AutoEncrypt.serverType.STAGING : AutoEncrypt.serverType.PEBBLE

  if (isPebble) {
    //
    // If we’re testing with Pebble, fire up a local Pebble server and shut it down when all tests are done.
    //
    // Note: due to the way Node Pebble and tape are designed, we can get away with only including a call to
    // ===== Pebble.ready() here instead of in every test file (doing so is also legitimate and would work too) as:
    //
    //         - tape will always run this index test first.
    //         - test.onFinish() is only fired when all tests (not just the ones in this file) are finished running.
    //
    await Pebble.ready()

    test.onFinish(async () => {

      // As some of the unit tests result in the HTTP Server being created, ensure that it is
      // shut down at the end so we can exit.
      await HttpServer.destroySharedInstance()

      if (letsEncryptServerType === AutoEncrypt.serverType.PEBBLE) {
        // If we’re testing with Pebble, shut down the Pebble server.
        await Pebble.shutdown()
      }
    })
  }

  // Test that AutoEncrypt.https is an alias for AutoEncrypt (syntactic sugar).
  t.strictEquals(AutoEncrypt.https, AutoEncrypt, 'AutoEncrypt.https is an alias for AutoEncrypt')

  //
  // Test that server creation with listener as only argument works.
  //
  const server0 = AutoEncrypt.createServer(() => {})

  const expectedProductionServerDetails = dehydrate(`
    # AutoEncrypt (static class)

    - Using Let’s Encrypt production server.
    - Managing TLS for dev.ar.al, www.dev.ar.al (default domains).
    - Settings stored at default settings path.
    - Listener is set.
  `)

  const productionServerDetails = dehydrate(util.inspect(AutoEncrypt))

  t.strictEquals(productionServerDetails, expectedProductionServerDetails, 'creating server with listener as only argument works as expected')

  AutoEncrypt.shutdown()

  // Attempt to instantiate static AutoEncrypt class should throw.
  t.ok(throwsErrorOfType(
    () => { new AutoEncrypt() },
    Symbol.for('StaticClassCannotBeInstantiatedError')
  ), 'attempt to instantiate AutoEncrypt static class throws as expected')

  const testSettingsPath = createTestSettingsPath()

  const hostname = os.hostname()
  let options = {
    domains: [hostname],
    serverType: letsEncryptServerType,
    settingsPath: testSettingsPath
  }
  const server1 = AutoEncrypt.https.createServer(options, (request, response) => {
    response.end('ok')
  })

  t.ok(server1 instanceof https.Server, 'https.Server instance returned as expected')

  // Test inspection string.
  const expectedInspectionString = dehydrate(`
  # AutoEncrypt (static class)
    - Using Let’s Encrypt ${isPebble ? 'pebble' : 'staging'} server.
    - Managing TLS for ${isPebble ? 'localhost, pebble (default domains)' : `${hostname}`}.
    - Settings stored at /home/aral/.small-tech.org/auto-encrypt/test.
    - Listener is set.
  `)
  t.strictEquals(dehydrate(util.inspect(AutoEncrypt)), expectedInspectionString, 'inspection string is as expected')

  await new Promise ((resolve, reject) => {
    server1.listen(443, () => {
      resolve()
    })
  })

  const urlToHit = `https://${ process.env.STAGING ? hostname : 'localhost' }`

  let response = httpsGetString(urlToHit)

  // Test server is busy response while attempting to provision the initial certificate.
  try {
    await httpsGetString(urlToHit)
    t.fail('call to server should not succeed when server is busy provisioning initial certificate')
  } catch (error) {
    t.strictEquals(error.code, 'ECONNRESET', 'correct error returned during connection attempt when server is busy provisioning initial certificate')
  }

  // Confirm that the first request returns successfully as expected.
  try {
    response = await response
  } catch (error) {
    t.fail(`the first response should not throw but it does. ${error}`)
  }
  t.strictEquals(response, 'ok', 'response is as expected')

  //
  // Test SNICallback.
  //
  const symbols = Object.getOwnPropertySymbols(server1)
  sniCallbackSymbol = symbols.filter(symbol => symbol.toString() === 'Symbol(snicallback)')[0]

  // Test SNI success.
  await new Promise ((resolve, reject) => {
    const sniCallback = server1[sniCallbackSymbol]

    const domainToHit = isPebble ? 'localhost' : hostname
    sniCallback(domainToHit, (error, secureContext) => {
      if (error) {
        t.fail('SNI Callback should not error, but it did: ${error}')
        reject()
        return
      }
      t.pass('SNI Callback returned secure context')
      resolve()
    })
  })

  // Test SNI failure.
  await new Promise ((resolve, reject) => {
    const sniCallback = server1[sniCallbackSymbol]

    const unsupportedDomain = 'unsupported.domain'
    sniCallback(unsupportedDomain, (error, secureContext) => {
      if (error) {
        t.strictEquals(error.symbol, Symbol.for('SNIIgnoreUnsupportedDomainError'), 'call to unsupported domain fails SNI check as expected')
        resolve()
        return
      }
      t.fail('call to unsupported domain should fail SNI check but it succeeded')
      reject()
    })
  })


  // Wait for server shutdown.
  await new Promise((resolve, reject) => {
    server1.close(() => {
      resolve()
    })
  })


  // Create a second server. This time, it should get the certificate from disk.
  // Note: recreating options object as original one was passed by reference and
  // ===== no longer contains the initial settings.
  options = {
    domains: [hostname],
    serverType: letsEncryptServerType,
    settingsPath: testSettingsPath
  }
  const server2 = AutoEncrypt.https.createServer(options, (request, response) => {
    response.end('ok')
  })

  t.ok(server2 instanceof https.Server, 'second https.Server instance returned as expected')

  await new Promise ((resolve, reject) => {
    server2.listen(443, () => {
      resolve()
    })
  })

  const response2 = await httpsGetString(urlToHit)
  t.strictEquals(response, 'ok', 'second response is as expected')

  // Wait for server shutdown.
  await new Promise((resolve, reject) => {
    server2.close(() => {
      resolve()
    })
  })


  //
  // Depending on which server type we’re testing, test server creation with the other one also.
  //
  if (isPebble) {
    const hostname = os.hostname()
    let options = {
      domains: [hostname],
      serverType: AutoEncrypt.serverType.STAGING,
      settingsPath: testSettingsPath
    }
    const server = AutoEncrypt.https.createServer(options)
    t.pass('testing with Pebble server but verified that staging server is created correctly also')
  } else {
    let options = {
      serverType: AutoEncrypt.serverType.PEBBLE,
      settingsPath: testSettingsPath
    }
    const server = AutoEncrypt.https.createServer(options)
    t.pass('testing with staging server but verified that pebble server is created correctly also')
  }

  AutoEncrypt.shutdown()

  //
  // Test OCSPStapling. (We can only test this fully using the Pebble server.)
  //

  if (isPebble) {
    const configuration = new Configuration({
      settingsPath: testSettingsPath,
      domains: ['localhost', 'pebble'],
      server: new LetsEncryptServer(AutoEncrypt.serverType.PEBBLE)
    })

    const certificate = new Certificate(configuration)
    certificate.stopCheckingForRenewal()
    const certificatePem = certificate.pem
    const certificateDetails = certificate.parseDetails(certificatePem)

    const certificateDer = ocsp.utils.toDER(certificatePem)
    const issuerDer = ocsp.utils.toDER(await httpsGetString('https://localhost:15000/intermediates/0'))

    // Start a mock OCSP server at the port specified in the Pebble configuration file.
    let mockOcspServer
    await new Promise(async (resolve, reject) => {
      const ocspServerCert = await httpsGetString('https://localhost:15000/intermediates/0')
      const ocspServerKey  = await httpsGetString('https://localhost:15000/intermediate-keys/0')

      // Create the mock OCSP server.
      mockOcspServer = ocsp.Server.create({
        cert: ocspServerCert, // Pebble Root CA cert.
        key : ocspServerKey   // Pebble Root CA private key.
      })

      // Add the cert.
      mockOcspServer.addCert(certificateDetails.serialNumber, 'good')

      mockOcspServer.listen(8888, () => {
        resolve()
      })
    })

    let mockHttpsServer
    await new Promise(async (resolve, reject) => {
      mockHttpsServer = {
        on: (eventName, eventCallback) => {
          t.strictEquals(eventName, 'OCSPRequest', 'OSCPRequest event listener is added as expected')

          // First time: should get it result from the server.
          eventCallback(certificateDer, issuerDer, async (error, response) => {
            if (error) {
              t.fail(`OCSPRequest event handler should not error but it did. ${error}`)
            }
            t.pass(`OSCPRequest event handler returned non-error response.`)

            // Close the mock OCSP server so that if the second call doesn’t hit the cache, the call will fail.
            mockOcspServer.close()

            // Wait until the server is closed.
            await new Promise((resolve, reject) => {
              mockOcspServer.on('close', () => {
                resolve()
              })
              mockOcspServer.on('error', (error) => {
                reject(error)
              })
            })

            // Second time: should get the result from cache without hitting the server or the call will fail.
            eventCallback(certificateDer, issuerDer, (error, response) => {
              if (error) {
                t.fail(`OCSPRequest event handler should not error but it did. ${error}`)
                reject()
              }
              t.pass(`OSCPRequest event handler returned non-error response.`)
              resolve()
            })
          })
        }
      }
      AutoEncrypt.addOcspStapling(mockHttpsServer)
    })
    AutoEncrypt.clearOcspCacheTimers()
  }

  t.end()
})
