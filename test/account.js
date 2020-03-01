const os = require('os')
const fs = require('fs-extra')
const path = require('path')
const test = require('tape')

const Configuration = require('../lib/Configuration')
const Account = require('../lib/Account')

test('Account', async t => {
  t.plan(6)
  //
  // Setup: use a fresh test settings path.
  //
  const testSettingsPath = path.join(os.homedir(), '.small-tech.org', 'acme-http-01', 'test')
  fs.removeSync(testSettingsPath)

  Configuration.settingsPath = testSettingsPath

  // Test singleton creation.
  t.throws(() => { new Account() }, /Account is a singleton/, 'Account class cannot be directly instantiated')

  // Set up a fresh account
  const account = await Account.getSharedInstance()

  // Ensure that the account file exists.
  const accountFilePath = path.join(testSettingsPath, 'account.json')
  t.true(fs.existsSync(accountFilePath), 'account file exists')

  // Ensure that the contents of the account file are as we expect.
  const accountDataString = fs.readFileSync(accountFilePath, 'utf-8')

  // The account file should be valid JSON.
  let data
  t.doesNotThrow(() => data = JSON.parse(accountDataString), 'account data file should be valid json')
  t.strictEquals(account.kid, data.kid, 'the persisted kid matches the in-memory kid')
  t.throws(() => {account.kid = 'this is not allowed'}, 'account.kid is a read-only property')

  // Null out the singleton instance and create a new instance to test account
  // information being loaded from disk on subsequent instantiations.
  Account.instance = null

  const account2 = await Account.getSharedInstance(testSettingsPath)
  t.strictEquals(account2.kid, account.kid, 'the account information is loaded from disk next time around')

  t.end()
})
