const test                                                         = require('tape')
const http                                                         = require('http')
const jose                                                         = require('jose')
const AcmeRequest                                                  = require('../../lib/AcmeRequest')
const Account                                                      = require('../../lib/Account')
const AccountIdentity                                              = require('../../lib/AccountIdentity')
const { setupStagingConfigurationWithOneDomainAtTestSettingsPath,
        httpServerWithResponse }                                   = require('../../lib/test-helpers')

test('AcmeRequest', async t => {
  // t.plan(4)

  // Configuration is set up to manage certificates for to dev.ar.al, use the staging server
  // and store its configuration at the test settings path.
  setupStagingConfigurationWithOneDomainAtTestSettingsPath()

  const { protectedHeader, signedRequest, httpsRequest, httpsHeaders } = await (new AcmeRequest()).prepare('newOrder', {aPayload: true}, /* useKid = */ true)

  const expectedHttpsHeaders = {
    'Content-Type': 'application/jose+json',
    'User-Agent': 'small-tech.org-acme/1.0.0 node/12.16.0',
    'Accept-Language': 'en-US'
  }

  t.strictEquals(JSON.stringify(httpsHeaders), JSON.stringify(expectedHttpsHeaders), 'https headers should be as expected')

  t.strictEquals(protectedHeader.kid, (await Account.getSharedInstance()).kid, 'account kid should be in protected header by default')

  //
  // Test JSON Web Signature.
  //
  const accountIdentity = AccountIdentity.getSharedInstance()
  const { aPayload } = jose.JWS.verify(signedRequest, accountIdentity.key)
  t.strictEquals(aPayload, true, 'Payload verifies from the JSON Web Signature')

  //
  // Test call failure.
  //
  const preparedRequest = await (new AcmeRequest()).prepare(
    /* command =      */ 'custom-command',
    /* payload =      */ {aPayload: true},
    /* useKid =       */ true,
    /* successCodes = */ [200],
    /* url =          */ 'http://localhost:1234'
  )

  let server
  server = await httpServerWithResponse({statusCode: 500, body: ''})

  try {
    await (new AcmeRequest())._execute(preparedRequest, /* parseResponseBodyAsJSON */ true)
    t.fail()
  } catch (error) {
    t.strictEquals(error.symbol, Symbol.for('AcmeRequest.requestError'), 'unexpected server response code should throw')
  }

  server.close()

  //
  // Test: parseBodyAsJSON = false
  //
  server = await httpServerWithResponse({statusCode: 200, body: 'not json'})

  let response
  response = await (new AcmeRequest()).execute('custom-command', {aPayload: true}, true, [200], 'http://localhost:1234', false)
  t.strictEquals(response.body, 'not json', 'body is not JSON as expected')

  server.close()

  t.end()
})
