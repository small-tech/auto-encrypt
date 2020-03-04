const os = require('os')
const fs = require('fs-extra')
const path = require('path')

const test = require('tape')

const AcmeHttp01 = require('../index')
const Configuration = require('../lib/Configuration')

const Directory = require('../lib/Directory')
const AccountIdentity = require('../lib/AccountIdentity')
const Account = require('../lib/Account')
const Order = require('../lib/Order')
const Nonce = require('../lib/Nonce')

test('AcmeHttp01', async t => {
  t.plan(4)

  //
  // Setup: nullify all singleton instances to ensure we start with a clean state and
  // create testing paths and ensure that an identity does not already exist at those paths.
  //
  Directory.instance = null
  AccountIdentity.instance = null
  CertificateIdentity.instance = null
  Account.instance = null
  Order.instance = null
  Nonce.freshNonce = null

  const testSettingsPath = path.join(os.homedir(), '.small-tech.org', 'acme-http-01', 'test')
  fs.removeSync(testSettingsPath)

  // Test singleton creation.
  t.throws(() => { new AcmeHttp01() }, /AcmeHttp01 is a singleton/, 'AcmeHttp01 class cannot be directly instantiated')

  const acmeHttp01 = await AcmeHttp01.getSharedInstance(['dev.ar.al', 'dev2.ar.al'], testSettingsPath)

  t.strictEquals(AcmeHttp01.instance, acmeHttp01, 'there is only one copy of the AcmeHttp01 singleton instance (1)')

  t.strictEquals(Configuration.settingsPath, testSettingsPath, 'the settings path should be set correctly')

  const acmeHttp01_2 = await AcmeHttp01.getSharedInstance() // Not specifying the path should not affect subsequent calls.
  t.strictEquals(acmeHttp01, acmeHttp01_2, 'there is only one copy of the AcmeHttp01 singleton instance (2)')

  t.end()
})
