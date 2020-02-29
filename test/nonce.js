const test = require('tape')
const Nonce = require('../lib/Nonce')

test('Nonce', async t => {
  t.plan(8)

  // Asking for a nonce when no nonce has been manually set should result
  // in a fresh nonce being retrieved from the ACME server.
  t.strictEquals(Nonce.freshNonce, null, 'the initial value of the manually-set fresh nonce should be null')

  const freshNonce = await Nonce.get()

  t.false(freshNonce === null, 'the manually-set fresh nonce should not be null')
  t.strictEquals(typeof freshNonce, 'string', 'the fresh nonce should be a string')
  t.true(freshNonce.match(/^[A-Za-z0-9_-]+$/) !== null, 'the fresh nonce should be base64url encoded')
  t.true(Nonce.freshNonce === null, 'the manually-set fresh nonce should still be null after remote fetch')

  // You can also manually set a nonce.
  const mockFreshNonce = '0001RSJOhQ1YDab8qCt8ts0Y-UCqOxvcFVNp2tD8DKVHClo'
  Nonce.set(mockFreshNonce)

  t.strictEquals(Nonce.freshNonce, mockFreshNonce, 'the manually-set fresh nonce is correct')

  const freshNonce2 = await Nonce.get()

  t.strictEquals(freshNonce2, mockFreshNonce, 'the fresh nonce returned should match the manully-set fresh nonce')
  t.strictEquals(Nonce.freshNonce, null, 'the manually-set fresh nonce should be null since the nonce has now been used')

  t.end()
})
