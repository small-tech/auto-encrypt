import os from 'os'
import fs from 'fs'
import path from 'path'
import test from 'tape'
import Nonce from '../../lib/Nonce.js'
import Directory from '../../lib/Directory.js'
import Configuration from '../../lib/Configuration.js'
import LetsEncryptServer from '../../lib/LetsEncryptServer.js'
import { symbolOfErrorThrownBy } from '../../lib/test-helpers/index.js'
import Pebble from '@small-tech/node-pebble'

async function setup() {
  // Run the tests using either a local Pebble server (default) or the Let’s Encrypt Staging server
  // (which is subject to rate limits) if the STAGING environment variable is set.
  // Use npm test task for the former and npm run test-staging task for the latter.
  const letsEncryptServerType = process.env.STAGING ? LetsEncryptServer.type.STAGING : LetsEncryptServer.type.PEBBLE

  if (letsEncryptServerType === LetsEncryptServer.type.PEBBLE) {
    await Pebble.ready()
  }

  const domains = {
    [LetsEncryptServer.type.PEBBLE]: ['localhost', 'pebble'],
    [LetsEncryptServer.type.STAGING]: [os.hostname(), `www.${os.hostname()}`]
  }

  const customSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.rmSync(customSettingsPath, { recursive: true, force: true })
  return new Configuration({
    domains: domains[letsEncryptServerType],
    server: new LetsEncryptServer(letsEncryptServerType),
    settingsPath: customSettingsPath
  })
}

test('Nonce', async t => {

  const configuration = await setup()

  // Teardown
  t.teardown(async () => {
    await Pebble.shutdown()
  })

  const directory = await Directory.getInstanceAsync(configuration)

  // Missing directory argument should throw.
  t.strictEquals(
    symbolOfErrorThrownBy(() => new Nonce()),
    Symbol.for('UndefinedOrNullError'),
    'throws when directory argument is missing'
  )

  const nonce = new Nonce(directory)

  const freshNonce = await nonce.get()

  t.false(freshNonce === null, 'the fresh nonce should not be null')
  t.strictEquals(typeof freshNonce, 'string', 'the fresh nonce should be a string')
  t.true(freshNonce.match(/^[A-Za-z0-9_-]+$/) !== null, 'the fresh nonce should be base64url encoded')

  //
  // You can also manually set a nonce.
  //

  // Manually set nonce.
  const mockFreshNonce = '0001RSJOhQ1YDab8qCt8ts0Y-UCqOxvcFVNp2tD8DKVHClo'
  nonce.set(mockFreshNonce)

  // Expect to get the manually set nonce back.
  const freshNonce2 = await nonce.get()
  t.strictEquals(freshNonce2, mockFreshNonce, 'the fresh nonce returned should match the manually-set fresh nonce')

  // Expect to get a fresh nonce back (not the manually set one).
  const freshNonce3 = await nonce.get()
  t.notStrictEquals(freshNonce2, freshNonce3, 'the fresh nonce returned should not match the manually-set nonce')

  //
  // Test setting null and undefined and confirm they are ignored
  //

  nonce.set(undefined)
  const freshNonce4 = await nonce.get()
  t.notStrictEquals(freshNonce4, undefined, 'manual set of undefined is ignored as expected')

  nonce.set(null)
  const freshNonce5 = await nonce.get()
  t.notStrictEquals(freshNonce5, null, 'manual set of null is ignored as expected')

  // Also confirm that trying to manually set a non-base-64-encoded nonce is ignored.
  const nonBase64EncodedNonce = '%%%$$$%%%'
  nonce.set(nonBase64EncodedNonce)
  const freshNonce6 = await nonce.get()
  t.notStrictEquals(freshNonce6, nonBase64EncodedNonce, 'manual set of non-base-64-encoded nonce is ignored as expected')

  t.end()
})
