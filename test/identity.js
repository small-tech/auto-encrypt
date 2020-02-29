////////////////////////////////////////////////////////////////////////////////
//
// Unit test: Identity class.
//
////////////////////////////////////////////////////////////////////////////////

const test = require('tape')

const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const jose = require('jose')
const Identity = require('../lib/Identity')

test('identity', t => {
  t.plan = 9

  //
  // Setup: create testing paths and ensure that an identity does not already exist at those paths.
  //
  const testSettingsPath = path.join(os.homedir(), '.small-tech.org', 'acme-http-01', 'test')
  const testIdentityFilePath = path.join(testSettingsPath, 'identity.pem')
  fs.removeSync(testSettingsPath)

  //
  // Test singleton identity creation.
  //
  t.throws(() => { new Identity() }, /Identity is a singleton/, 'Identity class cannot be directly instantiated')

  const identity = Identity.getSharedInstance(testSettingsPath)

  t.strictEquals(identity.settingsPath, testSettingsPath, 'custom settings path should be used')
  t.true(fs.existsSync(testSettingsPath), 'the test settings path should be created')
  t.strictEquals(identity.identityFilePath, testIdentityFilePath, 'the identity file path should be correct')
  t.strictEquals(Identity.instance, identity, 'there should only be one copy of the identity instance (singleton)')

  const identityPEMBuffer = fs.readFileSync(testIdentityFilePath)

  let key
  t.doesNotThrow(() => {
    key = jose.JWK.asKey(identityPEMBuffer)
  }, 'creating a JWK from the persisted PEM file does not throw')

  t.true(jose.JWK.isKey(key), 'the key is an instance of JWK.key')
  t.strictEquals(key.kty, 'RSA', 'the key type is RSA')
  t.strictEquals(key.type, 'private', 'the key is the private key')

  t.end()
})
