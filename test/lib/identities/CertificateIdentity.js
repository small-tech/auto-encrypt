const test                      = require('tape')
const CertificateIdentity       = require('../../../lib/identities/CertificateIdentity')
const { symbolOfErrorThrownBy } = require('../../../lib/test-helpers')

test('Certificate Identity', t => {
  t.strictEquals(
    symbolOfErrorThrownBy(() => new CertificateIdentity()),
    Symbol.for('UndefinedOrNullError'),
    'missing configuration during instantiation throws as expected'
  )
  t.end()
})
