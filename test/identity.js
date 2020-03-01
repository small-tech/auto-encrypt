////////////////////////////////////////////////////////////////////////////////
//
// Unit test: Identity class.
//
////////////////////////////////////////////////////////////////////////////////

const test = require('tape')

const util = require('util')
const os = require('os')
const path = require('path')
const fs = require('fs-extra')
const jose = require('jose')

const Configuration = require('../lib/Configuration')
const Identity = require('../lib/Identity')

test('Identity', t => {
  t.plan(16)

  //
  // Setup: Ensure we are starting from a fresh Identity instance, create testing paths,
  // and ensure that an identity does not already exist at those paths.
  //
  Identity.instance = null
  const testSettingsPath = path.join(os.homedir(), '.small-tech.org', 'acme-http-01', 'test')
  const testIdentityFilePath = path.join(testSettingsPath, 'identity.pem')
  fs.removeSync(testSettingsPath)

  Configuration.settingsPath = testSettingsPath

  // Test singleton identity creation.
  t.throws(() => { new Identity() }, /Identity is a singleton/, 'Identity class cannot be directly instantiated')

  const identity = Identity.getSharedInstance()
  t.strictEquals(Identity.instance, identity, 'there is only one copy of the identity singleton instance (1)')
  const identity2 = Identity.getSharedInstance()
  t.strictEquals(identity, identity2, 'there is only one copy of the identity singleton instance (2)')

  // Test identity creation and persistence.
  t.strictEquals(identity.filePath, testIdentityFilePath, 'the identity file path should be correct')
  t.true(fs.existsSync(identity.filePath), 'the identity PEM file exists')

  const identityPEMBuffer = fs.readFileSync(testIdentityFilePath)
  let key
  t.doesNotThrow(() => {
    key = jose.JWK.asKey(identityPEMBuffer)
  }, 'creating a JWK from the persisted PEM file does not throw')
  t.true(jose.JWK.isKey(key), 'the key is an instance of JWK.key')
  t.strictEquals(key.kty, 'RSA', 'the key type is RSA')
  t.strictEquals(key.type, 'private', 'the key is the private key')

  // Check that the key ID from the PEM we loaded matches the key ID from the key in memory.
  t.strictEquals(identity.key.kid, key.kid, 'key IDs should match')

  //
  // Check that JSON Web Keys (JWK) are as expected.
  //
  const expectedPrivateJWKProperties = JSON.stringify([
    'e',   'n',  'd',
    'p',   'q',  'dp',
    'dq',  'qi', 'kty',
    'kid'
  ])
  const expectedPublicJWKProperties = JSON.stringify([ 'e', 'n', 'kty', 'kid' ])

  const actualPrivateJWKProperties = JSON.stringify(Object.keys(identity.privateJWK))
  const actualPublicJWKProperties = JSON.stringify(Object.keys(identity.publicJWK))

  t.strictEquals(actualPrivateJWKProperties, expectedPrivateJWKProperties, 'private JWK properties are as expected')
  t.strictEquals(actualPublicJWKProperties, expectedPublicJWKProperties, 'public JWK properties are as expected')

  // Test that an existing PEM is loaded from file.
  Identity.instance = null
  const identityFromFile = Identity.getSharedInstance(testSettingsPath)

  t.strictEquals(identityFromFile.key.kid, identity.key.kid, 'identity is successfully loaded from file on subsequent instantiations')

  // Sanity check: the two different instantiations should be different objects
  t.notStrictEquals(identityFromFile, identity, 'instances are different after manually nulling out previous singleton property')

  // filePath should be read-only
  t.throws(() => {identity.filePath = 'this is not allowed'}, 'filePath property is read-only')

  // Check that custom inspection output matches what we expect.
  const dehydrate = h => h.replace(/\s/g, '')
  t.strictEquals(dehydrate(util.inspect(identity)), dehydrate(`
    # Identity

    Generates, stores, loads, and saves an identity (JWT OKP key using
    Ed25519 curve) from/to file storage.

    - Identity file path: ${identity.filePath}

    ## Properties

    - .key        : the jose.JWK.RSAKey instance
    - .privateJWK : JavaScript object representation of JWK (private key)
    - .publicJWK  : JavaScript object representation of JWK (public key)

    To see key details, please log() the .key property.
  `), 'custom inspection output should be as expected')

  t.end()
})
