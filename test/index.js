  // // Check that the default (non-testing) settings path works.
  // Identity.instance = null
  // const nonTestingIdentity = Identity.getSharedInstance()
  // const nonTestingIdentityFilePath = path.join(os.homedir(), '.small-tech.org', 'acme-http-01', 'identity.pem')

  // t.strictEquals(nonTestingIdentity.filePath, nonTestingIdentityFilePath, 'the file path is as expected')
  // t.notStrictEquals(nonTestingIdentity.key.kid, identity.key.kid, 'key ids differ between testing and default identities as expected')
