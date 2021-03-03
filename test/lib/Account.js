import os from 'os'
import fs from 'fs-extra'
import path from 'path'
import test from 'tape'
import { throwsErrorOfType } from '../../lib/test-helpers/index.js'
import Account from '../../lib/Account.js'
import Configuration from '../../lib/Configuration.js'
import Directory from '../../lib/Directory.js'
import AccountIdentity from '../../lib/identities/AccountIdentity.js'
import AcmeRequest from '../../lib/AcmeRequest.js'
import LetsEncryptServer from '../../lib/LetsEncryptServer.js'
import Pebble from '@small-tech/node-pebble'

async function setup() {
  // Run the tests using either a local Pebble server (default) or the Let’s Encrypt Staging server
  // (which is subject to rate limits) if the STAGING environment variable is set.
  // Use npm test task for the former and npm run test-staging task for the latter.
  const letsEncryptServerType = process.env.STAGING ? LetsEncryptServer.type.STAGING : LetsEncryptServer.type.PEBBLE
  const server = new LetsEncryptServer(letsEncryptServerType)

  if (letsEncryptServerType === LetsEncryptServer.type.PEBBLE) {
    await Pebble.ready()
  }

  test.onFinish(async () => {
    await Pebble.shutdown()
  })

  const customSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.removeSync(customSettingsPath)

  const configuration = new Configuration({
    domains: process.env.STAGING ? [os.hostname()] : ['localhost'],
    server,
    settingsPath: customSettingsPath
  })
  const accountIdentity = new AccountIdentity(configuration)
  const directory = await Directory.getInstanceAsync(configuration)

  AcmeRequest.initialise(directory, accountIdentity)

  return configuration
}

test('Account', async t => {
  t.plan(6)

  const configuration = await setup()

  //
  // Test first access of account (account creation).
  //

  // Test factory method creation safeguard.
  t.ok(throwsErrorOfType(
    () => { new Account() },
    Symbol.for('MustBeInstantiatedViaAsyncFactoryMethodError')
  ), 'Account class cannot be directly instantiated')

  const account = await Account.getInstanceAsync(configuration)

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

  //
  // Test second access of account and onwards (return of account information from disk).
  //

  const accountFromDisk = await Account.getInstanceAsync(configuration)

  t.strictEquals(accountFromDisk.kid, account.kid, 'second access onwards, account is returned from disk')

  t.end()
})
