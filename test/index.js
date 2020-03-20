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
  t.plan(7)

  setup()

  t.throws(() => { autoEncrypt() }, /^RequiredParameterError/,'throws if parameter object mising domains property')
  t.throws(() => { autoEncrypt({ domains: [] }) }, /^DomainsArrayIsEmptyError/, 'throws if domains array is empty')

  const hostname = os.hostname()
  const options = autoEncrypt({domains: [hostname], settingsPath: testSettingsPath})

  t.strictEquals('{ SNICallback: [AsyncFunction] }', util.inspect(options), 'options object has the shape we expect')

  const expectedTestSettingsPath = path.join(testSettingsPath, 'production')
  const expectedCertificatePath = path.join(expectedTestSettingsPath, hostname)

  t.strictEquals(false, Configuration.staging, 'default value for staging is false')
  t.ok(fs.existsSync(expectedCertificatePath), 'certificate path should exist')

  //
  // Call the SNICallback and test the results. Each call to SNICallback simulates a hit on the server.
  //

  await new Promise((resolve, reject) => {
    try {
      options.SNICallback('invalid-server.name', (error, secureContext) => {
        t.ok(util.inspect(error).startsWith('Error [SNIIgnoreUnknownDomainError]'), 'unknown domains are ignored by SNI')
        t.notOk(secureContext, 'secure context is not truthy when SNI ignores unknown domain')
        resolve()
      })
    } catch (error) {
      reject(error)
    }
  })

  // TODO: Move these to Configuration test.
  // t.strictEquals(expectedTestSettingsPath, Configuration.settingsPath, 'custom settings path is as expected')
  // t.strictEquals(expectedTestSettingsPath, Configuration.settingsPath, 'custom settings path is as expected')

  t.end()
})
