const test                               = require('tape')
const ReadyForChallengeValidationRequest = require('../../../lib/acme-requests/ReadyForChallengeValidationRequest')
const { symbolOfErrorThrownByAsync }     = require('../../../lib/test-helpers')

test('Ready For Challenge Validation Request', async t => {
  t.strictEquals(
    await symbolOfErrorThrownByAsync(async () => { await (new ReadyForChallengeValidationRequest()).execute() }),
    Symbol.for('UndefinedOrNullError'),
    'attempting to execute ready for challenge validation request without challenge url argument throws as expected'
  )

  t.end()
})
