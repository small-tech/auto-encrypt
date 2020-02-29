const test = require('tape')

const Directory = require('../lib/Directory')

test('directory', async t => {
  t.plan = 13

  t.strictEquals(Directory.instance, null, 'directory singleton instance is null to begin with')

  // Test singleton instantiation bypass attempt error.
  t.throws(() => { new Directory() }, /The Directory is a singleton/, 'Directory class cannot be directly instantiated')

  //
  // Staging.
  //

  const stagingDirectory = await Directory.getSharedInstance() // the default is to use the staging server

  t.strictEquals(stagingDirectory.isStaging, true, 'directory singleton instance defaults to using LE staging server')
  t.strictEquals(stagingDirectory.isProduction, false, 'directory singleton instance does not default to use LE production server')
  t.strictEquals(stagingDirectory.acmeEndpoint, Directory.STAGING_ENDPOINT, 'the staging endpoint is correctly set')

  // Also test the actual Urls returned just so we’re notified if anything chances on their end
  // (the returned URLs are subject to change but it is unlikely).
  const stagingBaseUrl = 'https://acme-staging-v02.api.letsencrypt.org/acme'
  const stagingWebsiteUrl = 'https://letsencrypt.org/docs/staging-environment/'
  const termsOfServiceUrl = 'https://letsencrypt.org/documents/LE-SA-v1.2-November-15-2017.pdf'

  const url = p => `${stagingBaseUrl}/${p}`

  t.strictEquals(stagingDirectory.keyChangeUrl, url('key-change'), 'staging key change url is as expected')
  t.strictEquals(stagingDirectory.newAccountUrl, url('new-acct'), 'staging new account url is as expected')
  t.strictEquals(stagingDirectory.newNonceUrl, url('new-nonce'), 'staging new nonce url is as expected')
  t.strictEquals(stagingDirectory.newOrderUrl, url('new-order'), 'staging new order url is as expected')
  t.strictEquals(stagingDirectory.revokeCertUrl, url('revoke-cert'), 'staging revoke cert url is as expected')
  t.strictEquals(stagingDirectory.websiteUrl, stagingWebsiteUrl, 'staging web site url is as expected')
  t.strictEquals(stagingDirectory.termsOfServiceUrl, termsOfServiceUrl, 'terms of service url is as expected')

  // Ensure Directory is a singleton.
  const stagingDirectory2 = await Directory.getSharedInstance()
  t.strictEquals(stagingDirectory, stagingDirectory2, 'directory single instance is actually a singleton')

  //
  // Production.
  //

  // Setup: null out the singleton instance so we can test the production setup.
  Directory.instance = null
  Directory.directory = undefined
  Directory.isReady = false

  const productionDirectory = await Directory.getSharedInstance(/* staging = */ false)

  t.end()
})

