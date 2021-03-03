import test from 'tape'
import CertificateIdentity from '../../../lib/identities/CertificateIdentity.js'
import { symbolOfErrorThrownBy } from '../../../lib/test-helpers/index.js'

test('Certificate Identity', t => {
  t.strictEquals(
    symbolOfErrorThrownBy(() => new CertificateIdentity()),
    Symbol.for('UndefinedOrNullError'),
    'missing configuration during instantiation throws as expected'
  )

  // NB. Most of the common Identity superclass-related tests are in the AccountIdentity tests.

  t.end()
})
