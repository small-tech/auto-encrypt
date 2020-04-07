const os                                                       = require('os')
const https                                                    = require('https')
const util                                                     = require('util')
const AutoEncrypt                                              = require('..')
const bent                                                     = require('bent')
const test                                                     = require('tape')
const Pebble                                                   = require('@small-tech/node-pebble')
const { createTestSettingsPath, dehydrate, throwsErrorOfType } = require('../lib/test-helpers')

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
      if (letsEncryptServerType === AutoEncrypt.serverType.PEBBLE) {
        // If we’re testing with Pebble, shut down the Pebble server.
        await Pebble.shutdown()
      }
    })
  }

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
  const server = AutoEncrypt.https.createServer(options, (request, response) => {
    response.end('ok')
  })

  t.ok(server instanceof https.Server, 'https.Server instance returned as expected')

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
    server.listen(443, () => {
      resolve()
    })
  })

  const urlToHit = `https://${ process.env.STAGING ? hostname : 'localhost' }`

  const response = await httpsGetString(urlToHit)

  t.strictEquals(response, 'ok', 'response is as expected')

  //
  // Test SNICallback.
  //
  const symbols = Object.getOwnPropertySymbols(server)
  sniCallbackSymbol = symbols.filter(symbol => symbol.toString() === 'Symbol(snicallback)')[0]

  await new Promise ((resolve, reject) => {
    const sniCallback = server[sniCallbackSymbol]

    sniCallback('localhost', (error, secureContext) => {
      if (error) {
        t.fail('SNI Callback should not error, but it did: ${error}')
        return
      }
      t.pass('SNI Callback returned secure context')
      resolve()
    })
  })

  server.close()
  AutoEncrypt.shutdown()

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

  server2.close()
  AutoEncrypt.shutdown()

  t.end()
})
