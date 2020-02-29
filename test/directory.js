const test = require('tape')

const Directory = require('../lib/Directory')

test('directory', async t => {
  t.plan = 13

  t.strictEquals(Directory.instance, null, 'directory singleton instance is null to begin with')

  const directory = await Directory.getSharedInstance() // the default is to use the staging server

  t.strictEquals(directory.isStaging, true, 'directory singleton instance defaults to using LE staging server')
  t.strictEquals(directory.isProduction, false, 'directory singleton instance does not default to use LE production server')
  t.strictEquals(directory.acmeEndpoint, Directory.STAGING_ENDPOINT, 'the staging endpoint is correctly set')
  t.strictEquals(directory.isReady, true, 'directory is ready')

  // Also test the actual Urls returned just so we’re notified if anything chances on their end
  // (the returned URLs are subject to change but it is unlikely).
  const stagingBaseUrl = 'https://acme-staging-v02.api.letsencrypt.org/acme'
  const stagingWebsiteUrl = 'https://letsencrypt.org/docs/staging-environment/'
  const termsOfServiceUrl = 'https://letsencrypt.org/documents/LE-SA-v1.2-November-15-2017.pdf'

  const url = p => `${stagingBaseUrl}/${p}`

  t.strictEquals(directory.keyChangeUrl, url('key-change'), 'staging key change url is as expected')
  t.strictEquals(directory.newAccountUrl, url('new-acct'), 'staging new account url is as expected')
  t.strictEquals(directory.newNonceUrl, url('new-nonce'), 'staging new nonce url is as expected')
  t.strictEquals(directory.newOrderUrl, url('new-order'), 'staging new order url is as expected')
  t.strictEquals(directory.revokeCertUrl, url('revoke-cert'), 'staging revoke cert url is as expected')
  t.strictEquals(directory.websiteUrl, stagingWebsiteUrl, 'staging web site url is as expected')
  t.strictEquals(directory.termsOfServiceUrl, termsOfServiceUrl, 'terms of service url is as expected')

  // Ensure Directory is a singleton.
  const directory2 = await Directory.getSharedInstance()

  t.strictEquals(directory, directory2, 'directory single instance is actually a singleton')

  t.end()
})

