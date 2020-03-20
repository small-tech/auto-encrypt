const os = require('os')
const fs = require('fs-extra')
const path = require('path')

const test = require('tape')

const autoEncrypt = require('../index')
const Configuration = require('../lib/Configuration')

const Directory = require('../lib/Directory')
const AccountIdentity = require('../lib/AccountIdentity')
const Account = require('../lib/Account')
const Nonce = require('../lib/Nonce')

function setup() {
  // Destroy all singleton instances, test paths, and app state so we start with a clean slate.
  Directory.destroySharedInstance()
  AccountIdentity.destroySharedInstance()
  Account.destroySharedInstance()
  Nonce.destroy()

  const testSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.removeSync(testSettingsPath)
}


test('autoEncrypt', async t => {
  t.plan(2)

  setup()

  t.throws(() => { autoEncrypt() }, /^RequiredParameterError/,'throws if parameter object mising domains property')
  t.throws(() => { autoEncrypt({ domains: [] }) }, /^DomainsArrayIsEmptyError/, 'throws if domains array is empty')

  t.end()
})
