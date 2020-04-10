const test                      = require('tape')
const CertificateIdentity       = require('../../../lib/identities/CertificateIdentity')
const { symbolOfErrorThrownBy } = require('../../../lib/test-helpers')

test('Certificate Identity', t => {
  t.strictEquals(
    symbolOfErrorThrownBy(() => new CertificateIdentity()),
    Symbol.for('UndefinedOrNullError'),
    'missing configuration during instantiation throws as expected'
  )

  // NB. Most of the common Identity superclass-related tests are in the AccountIdentity tests.

  t.end()
})
