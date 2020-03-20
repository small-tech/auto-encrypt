const os = require('os')
const fs = require('fs-extra')
const path = require('path')
const util = require('util')

const test = require('tape')

const autoEncrypt = require('../index')
const Configuration = require('../lib/Configuration')

const Directory = require('../lib/Directory')
const AccountIdentity = require('../lib/AccountIdentity')
const Account = require('../lib/Account')
const Nonce = require('../lib/Nonce')

let testSettingsPath

function setup() {
  // Destroy all singleton instances, test paths, and app state so we start with a clean slate.
  Directory.destroySharedInstance()
  AccountIdentity.destroySharedInstance()
  Account.destroySharedInstance()
  Nonce.destroy()

  testSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.removeSync(testSettingsPath)
}


test('autoEncrypt', async t => {
  t.plan(5)

  setup()

  t.throws(() => { autoEncrypt() }, /^RequiredParameterError/,'throws if parameter object mising domains property')
  t.throws(() => { autoEncrypt({ domains: [] }) }, /^DomainsArrayIsEmptyError/, 'throws if domains array is empty')

  const options = autoEncrypt({domains: ['dev.ar.al'], settingsPath: testSettingsPath})

  t.strictEquals('{ SNICallback: [AsyncFunction] }', util.inspect(options), 'options object has the shape we expect')

  const expectedTestSettingsPath = path.join(testSettingsPath, 'production')
  const expectedCertificatePath = path.join(expectedTestSettingsPath, 'dev.ar.al')

  t.strictEquals(false, Configuration.staging, 'default value for staging is false')
  t.ok(fs.existsSync(expectedCertificatePath), 'certificate path should exist')

  // TODO: Move these to Configuration test.
  // t.strictEquals(expectedTestSettingsPath, Configuration.settingsPath, 'custom settings path is as expected')
  // t.strictEquals(expectedTestSettingsPath, Configuration.settingsPath, 'custom settings path is as expected')

  t.end()
})
