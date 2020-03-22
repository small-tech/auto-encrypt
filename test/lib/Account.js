const os                               = require('os')
const fs                               = require('fs-extra')
const path                             = require('path')
const test                             = require('tape')
const { throwsErrorOfType, dehydrate } = require('../../lib/test-helpers')
const Configuration                    = require('../../lib/Configuration')
const Account                          = require('../../lib/Account')

test('Account', async t => {
  t.plan(6)
  //
  // Setup: use a fresh test settings path.
  //
  const customSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.removeSync(customSettingsPath)

  Configuration.reset()
  Configuration.initialise({ domains: ['dev.ar.al'], staging: true, settingsPath: customSettingsPath })

  const customStagingSettingsPath = path.join(customSettingsPath, 'staging')

  // Test singleton creation.
  t.ok(throwsErrorOfType(
    () => { new Account() },
    Symbol.for('SingletonConstructorIsPrivateError')
  ), 'Account class cannot be directly instantiated')

  // Set up a fresh account
  Account.destroySharedInstance()
  const account = await Account.getSharedInstance()

  // Ensure that the account file exists.
  const accountFilePath = path.join(customStagingSettingsPath, 'account.json')
  t.true(fs.existsSync(accountFilePath), 'account file exists')

  // Ensure that the contents of the account file are as we expect.
  const accountDataString = fs.readFileSync(accountFilePath, 'utf-8')

  // The account file should be valid JSON.
  let data
  t.doesNotThrow(() => data = JSON.parse(accountDataString), 'account data file should be valid json')
  t.strictEquals(account.kid, data.kid, 'the persisted kid matches the in-memory kid')

  t.ok(throwsErrorOfType(
    () => { account.kid = 'this is not allowed' },
    Symbol.for('ReadOnlyAccessorError')
  ),'account.kid is a read-only property as expected')

  const originalAccountKid = account.kid

  // Null out the singleton instance and create a new instance to test account
  // information being loaded from disk on subsequent instantiations.
  Account.destroySharedInstance()

  const account2 = await Account.getSharedInstance()
  t.strictEquals(account2.kid, originalAccountKid, 'the account information is loaded from disk next time around')

  t.end()
})
