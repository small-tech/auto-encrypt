const test = require('tape')
const util = require('util')
const Directory = require('../lib/Directory')

test('Directory' /*, {skip: true} */, async t => {
  t.plan = 23

  //
  // Null out the Directory singleton instance so we know we’re starting with a fresh instance.
  //
  Directory.instance = null

  // Test singleton instantiation bypass attempt error.
  t.throws(() => { new Directory() }, /Directory is a singleton/, 'Directory class cannot be directly instantiated')

  //
  // Staging.
  //

  const stagingDirectory = await Directory.getSharedInstance() // the default is to use the staging server

  t.strictEquals(stagingDirectory.isStaging, true, 'directory singleton instance defaults to using LE staging server')
  t.strictEquals(stagingDirectory.isProduction, false, 'directory singleton instance does not default to use LE production server')
  t.strictEquals(stagingDirectory.acmeEndpoint, Directory.STAGING_ENDPOINT, 'the staging endpoint is correctly set')

  // isStaging and isProduction should be read-only
  t.throws(() => { stagingDirectory.isStaging = true }, 'isStaging is read-only')
  t.throws(() => { stagingDirectory.isProduction = true }, 'isProduction is read-only')

  // Also test the actual Urls returned just so we’re notified if anything chances on their end
  // (the returned URLs are subject to change but it is unlikely).
  const stagingBaseUrl = 'https://acme-staging-v02.api.letsencrypt.org/acme'
  const stagingWebsiteUrl = 'https://letsencrypt.org/docs/staging-environment/'
  const termsOfServiceUrl = 'https://letsencrypt.org/documents/LE-SA-v1.2-November-15-2017.pdf'

  const stagingUrl = p => `${stagingBaseUrl}/${p}`

  t.strictEquals(stagingDirectory.keyChangeUrl, stagingUrl('key-change'), 'staging key change url is as expected')
  t.strictEquals(stagingDirectory.newAccountUrl, stagingUrl('new-acct'), 'staging new account url is as expected')
  t.strictEquals(stagingDirectory.newNonceUrl, stagingUrl('new-nonce'), 'staging new nonce url is as expected')
  t.strictEquals(stagingDirectory.newOrderUrl, stagingUrl('new-order'), 'staging new order url is as expected')
  t.strictEquals(stagingDirectory.revokeCertUrl, stagingUrl('revoke-cert'), 'staging revoke cert url is as expected')
  t.strictEquals(stagingDirectory.websiteUrl, stagingWebsiteUrl, 'staging web site url is as expected')
  t.strictEquals(stagingDirectory.termsOfServiceUrl, termsOfServiceUrl, 'terms of service url is as expected')

  // Ensure Directory is a singleton.
  const stagingDirectory2 = await Directory.getSharedInstance()
  t.strictEquals(stagingDirectory, stagingDirectory2, 'directory single instance is actually a singleton')

  // Check that custom inspection output matches what we expect.
  const dehydrate = h => h.replace(/\s/g, '')
  t.strictEquals(dehydrate(util.inspect(stagingDirectory)), dehydrate(`
    # Directory (URLs for the Let’s Encrypt ${stagingDirectory.isStaging ? 'staging' : 'PRODUCTION'} endpoint)

    ## URLs:

    - keyChangeUrl     : ${stagingDirectory.keyChangeUrl}
    - newAccountUrl    : ${stagingDirectory.newAccountUrl}
    - newNonceUrl      : ${stagingDirectory.newNonceUrl}
    - newOrderUrl      : ${stagingDirectory.newOrderUrl}
    - revokeCertUrl    : ${stagingDirectory.revokeCertUrl}
    - termsOfServiceUrl: ${stagingDirectory.termsOfServiceUrl}
    - websiteUrl       : ${stagingDirectory.websiteUrl}
  `), 'custom inspection output should be as expected')

  //
  // Production.
  //

  // Setup: null out the singleton instance so we can test the production setup.
  Directory.instance = null
  Directory.directory = undefined
  Directory.isReady = false

  const productionDirectory = await Directory.getSharedInstance(/* staging = */ false)

  t.strictEquals(productionDirectory.isProduction, true, 'directory singleton instance manually set to LE production server')
  t.strictEquals(productionDirectory.isStaging, false, 'directory singleton instance is not LE staging server')
  t.strictEquals(productionDirectory.acmeEndpoint, Directory.PRODUCTION_ENDPOINT, 'the production endpoint is correctly set')

  // Also test the actual Urls returned just so we’re notified if anything chances on their end
  // (the returned URLs are subject to change but it is unlikely).
  const productionBaseUrl = 'https://acme-v02.api.letsencrypt.org/acme'
  const productionWebsiteUrl = 'https://letsencrypt.org'

  const productionUrl = p => `${productionBaseUrl}/${p}`

  t.strictEquals(productionDirectory.keyChangeUrl, productionUrl('key-change'), 'production key change url is as expected')
  t.strictEquals(productionDirectory.newAccountUrl, productionUrl('new-acct'), 'production new account url is as expected')
  t.strictEquals(productionDirectory.newNonceUrl, productionUrl('new-nonce'), 'production new nonce url is as expected')
  t.strictEquals(productionDirectory.newOrderUrl, productionUrl('new-order'), 'production new order url is as expected')
  t.strictEquals(productionDirectory.revokeCertUrl, productionUrl('revoke-cert'), 'production revoke cert url is as expected')
  t.strictEquals(productionDirectory.websiteUrl, productionWebsiteUrl, 'production web site url is as expected')

  // Check that the custom inspection output matches what we expect.
  t.strictEquals(dehydrate(util.inspect(productionDirectory)), dehydrate(`
    # Directory (URLs for the Let’s Encrypt ${productionDirectory.isStaging ? 'staging' : 'PRODUCTION'} endpoint)

    ## URLs:

    - keyChangeUrl     : ${productionDirectory.keyChangeUrl}
    - newAccountUrl    : ${productionDirectory.newAccountUrl}
    - newNonceUrl      : ${productionDirectory.newNonceUrl}
    - newOrderUrl      : ${productionDirectory.newOrderUrl}
    - revokeCertUrl    : ${productionDirectory.revokeCertUrl}
    - termsOfServiceUrl: ${productionDirectory.termsOfServiceUrl}
    - websiteUrl       : ${productionDirectory.websiteUrl}
  `), 'custom inspection output should be as expected')

  t.end()
})
