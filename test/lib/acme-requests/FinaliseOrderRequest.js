const test                           = require('tape')
const FinaliseOrderRequest           = require('../../../lib/acme-requests/FinaliseOrderRequest')
const { symbolOfErrorThrownByAsync } = require('../../../lib/test-helpers')

test('Finalise Order Request', async t => {
  t.strictEquals(
    await symbolOfErrorThrownByAsync(async () => { await (new FinaliseOrderRequest()).execute('mock') }),
    Symbol.for('UndefinedOrNullError'),
    'attempting to execute finalise order request without csr argument throws as expected'
  )

  t.strictEquals(
    await symbolOfErrorThrownByAsync(async () => { await (new FinaliseOrderRequest()).execute() }),
    Symbol.for('UndefinedOrNullError'),
    'attempting to execute finalise order request without finalise url and csr arguments throws as expected'
  )

  t.end()
})
