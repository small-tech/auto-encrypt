const test = require('tape')
const AcmeRequest = require('../lib/AcmeRequest')
const Account = require('../lib/Account')

test('AcmeRequest', async t => {
  t.plan = 1

  const { protectedHeader, signedRequest, httpsRequest, httpsHeaders } = await (new AcmeRequest()).prepare('newOrder', {aPayload: true}, /* useKid = */ true)

  const expectedHttpsHeaders = {
    'Content-Type': 'application/jose+json',
    'User-Agent': 'small-tech.org-acme/1.0.0 node/12.16.0',
    'Accept-Language': 'en-US'
  }

  t.strictEquals(JSON.stringify(httpsHeaders), JSON.stringify(expectedHttpsHeaders), 'https headers should be as expected')

  t.strictEquals(protectedHeader.kid, (await Account.getSharedInstance()).kid, 'account kid should be in protected header by default')

  // Test call failure.
  const payload = { termsOfServiceAgreed: false }
  t.throws(()=>{ await (new AcmeRequest().execute('newAccount', payload, /* useKid = */ false)) }, 'misconfigured request should throw')

  t.end()
})
