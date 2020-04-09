const test                      = require('tape')
const { symbolOfErrorThrownBy } = require('../../lib/test-helpers')
const AccountIdentity           = require('../../lib/AccountIdentity')

test('Account Identity', t => {

  t.strictEquals(
    symbolOfErrorThrownBy(() => { new AccountIdentity() }),
    Symbol.for('UndefinedOrNullError'),
    'missing configuration throws the expected error type'
  )

  t.end()
})
