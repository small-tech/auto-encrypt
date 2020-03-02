const test = require('tape')
const http = require('http')
const AcmeRequest = require('../lib/AcmeRequest')
const Account = require('../lib/Account')

test('AcmeRequest', async t => {
  t.plan(3)

  const { protectedHeader, signedRequest, httpsRequest, httpsHeaders } = await (new AcmeRequest()).prepare('newOrder', {aPayload: true}, /* useKid = */ true)

  const expectedHttpsHeaders = {
    'Content-Type': 'application/jose+json',
    'User-Agent': 'small-tech.org-acme/1.0.0 node/12.16.0',
    'Accept-Language': 'en-US'
  }

  t.strictEquals(JSON.stringify(httpsHeaders), JSON.stringify(expectedHttpsHeaders), 'https headers should be as expected')

  t.strictEquals(protectedHeader.kid, (await Account.getSharedInstance()).kid, 'account kid should be in protected header by default')

  // Test call failure.
  const preparedRequest = await (new AcmeRequest()).prepare(
    /* command =      */ 'custom-command',
    /* payload =      */ {aPayload: true},
    /* useKid =       */ true,
    /* successCodes = */ [200],
    /* url =          */ 'http://localhost:3132'
  )

  const server = http.createServer((request, response) => {
    response.statusCode = 500
    response.end()
  })
  server.listen(3132)

  try {
    await (new AcmeRequest())._execute(preparedRequest)
    t.fail()
  } catch (error) {
    t.pass('unexpected server response code should throw')
  }

  server.close()

  t.end()
})
