const test                           = require('tape')
const CheckOrderStatusRequest        = require('../../../lib/acme-requests/CheckOrderStatusRequest')
const { symbolOfErrorThrownByAsync } = require('../../../lib/test-helpers')

test('Check Order Status Request', async t => {
  t.strictEquals(
    await symbolOfErrorThrownByAsync(async () => { await (new CheckOrderStatusRequest()).execute() }),
    Symbol.for('UndefinedOrNullError'),
    'attempting to execute check order status request without order url argument throws as expected'
  )

  t.end()
})
