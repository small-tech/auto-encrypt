const os                    = require('os')
const fs                    = require('fs-extra')
const path                  = require('path')
const test                  = require('tape')
const { throwsErrorOfType } = require('../../lib/test-helpers')
const Configuration         = require('../../lib/Configuration')
const Account               = require('../../lib/Account')
const Directory             = require('../../lib/Directory')
const AccountIdentity       = require('../../lib/AccountIdentity')
const AcmeRequest           = require('../../lib/AcmeRequest')

async function setup() {
  const customSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.removeSync(customSettingsPath)

  const configuration = new Configuration({ domains: ['dev.ar.al'], staging: true, settingsPath: customSettingsPath })
  const accountIdentity = new AccountIdentity(configuration)
  const directory = await Directory.getInstanceAsync(configuration)

  AcmeRequest.initialise(directory, accountIdentity)

  return configuration
}

test('Account', async t => {
  t.plan(5)

  const configuration = await setup()

  // Test singleton creation.
  t.ok(throwsErrorOfType(
    () => { new Account() },
    Symbol.for('MustBeInstantiatedViaAsyncFactoryMethodError')
  ), 'Account class cannot be directly instantiated')

  const account = await Account.getInstanceAsync(configuration  )

  // Ensure that the account file exists.
  t.true(fs.existsSync(configuration.accountPath), 'account file exists')

  // Ensure that the contents of the account file are as we expect.
  const accountDataString = fs.readFileSync(configuration.accountPath, 'utf-8')

  // The account file should be valid JSON.
  let data
  t.doesNotThrow(() => data = JSON.parse(accountDataString), 'account data file should be valid json')
  t.strictEquals(account.kid, data.kid, 'the persisted kid matches the in-memory kid')

  t.ok(throwsErrorOfType(
    () => { account.kid = 'this is not allowed' },
    Symbol.for('ReadOnlyAccessorError')
  ),'account.kid is a read-only property as expected')

  t.end()
})
