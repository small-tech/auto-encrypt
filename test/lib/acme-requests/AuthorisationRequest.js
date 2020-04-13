const test                           = require('tape')
const AuthorisationRequest           = require('../../../lib/acme-requests/AuthorisationRequest')
const { symbolOfErrorThrownByAsync } = require('../../../lib/test-helpers')

test('Authorisation Request', async t => {
  t.strictEquals(
    await symbolOfErrorThrownByAsync(async () => { await (new AuthorisationRequest()).execute() }),
    Symbol.for('UndefinedOrNullError'),
    'attempting to execute authorisation request without configuration argument throws as expected'
  )

  t.end()
})
