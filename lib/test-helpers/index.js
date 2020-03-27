//////////////////////////////////////////////////////////////////////
//
// Unit test helpers.
//
//////////////////////////////////////////////////////////////////////

const fs              = require('fs-extra')
const os              = require('os')
const path            = require('path')
const Configuration   = require('../Configuration')
const Directory       = require('../Directory')
const AccountIdentity = require('../AccountIdentity')
const Account         = require('../Account')
const Nonce           = require('../Nonce')
const http            = require('http')

function throwsErrorOfType (func, errorSymbol) {
  try {
    func()
  } catch (error) {
    // Is the error of the type requested?
    return error.symbol === errorSymbol
  }
  // Did not throw when it was supposed to.
  return false
}

function dehydrate (string) {
  return string.replace(/\s/g, '')
}

function destroySingletons () {
  Configuration.reset()
  Directory.destroySharedInstance()
  AccountIdentity.destroySharedInstance()
  Account.destroySharedInstance()
  Nonce.destroy()
}

function createTestSettingsPath () {
  testSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.removeSync(testSettingsPath)
  return testSettingsPath
}

function initialiseStagingConfigurationWithOneDomainAtTestSettingsPath () {
  Configuration.reset()
  Configuration.initialise({ domains: ['dev.ar.al'], staging: true, settingsPath: createTestSettingsPath() })
}

function setupStagingConfigurationWithOneDomainAtTestSettingsPath () {
  destroySingletons()
  initialiseStagingConfigurationWithOneDomainAtTestSettingsPath()
}

async function httpServerWithResponse (mockResponse) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      response.statusCode = mockResponse.statusCode
      response.end(mockResponse.body)
    })
    server.listen(1234, () => {
      resolve(server)
    })
  })
}

module.exports = {
  throwsErrorOfType,
  dehydrate,
  destroySingletons,
  createTestSettingsPath,
  initialiseStagingConfigurationWithOneDomainAtTestSettingsPath,
  setupStagingConfigurationWithOneDomainAtTestSettingsPath,
  httpServerWithResponse
}
