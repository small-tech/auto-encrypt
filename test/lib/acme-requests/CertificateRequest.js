const test                           = require('tape')
const CertificateRequest             = require('../../../lib/acme-requests/CertificateRequest')
const { symbolOfErrorThrownByAsync } = require('../../../lib/test-helpers')

test('Authorisation Request', async t => {
  t.strictEquals(
    await symbolOfErrorThrownByAsync(async () => { await (new CertificateRequest()).execute() }),
    Symbol.for('UndefinedOrNullError'),
    'attempting to execute certificate request without certificate url argument throws as expected'
  )

  t.end()
})
