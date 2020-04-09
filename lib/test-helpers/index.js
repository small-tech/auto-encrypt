//////////////////////////////////////////////////////////////////////
//
// Unit test helpers.
//
//////////////////////////////////////////////////////////////////////

const fs                = require('fs-extra')
const os                = require('os')
const path              = require('path')
const Configuration     = require('../Configuration')
const http              = require('http')
const LetsEncryptServer = require('../LetsEncryptServer')

function timeIt(func) {
  const startTime = new Date()
  const returnValue = func()
  const endTime = new Date()
  return { returnValue, duration: endTime - startTime }
}

async function timeItAsync(func) {
  const startTime = new Date()
  const returnValue = await func()
  const endTime = new Date()
  return { returnValue, duration: endTime - startTime }
}

function symbolOfErrorThrownBy(func) {
  try {
    func()
    return false
  } catch (error) {
    if (error.symbol) {
      return error.symbol
    }
    throw new Error(error)
  }
}

async function symbolOfErrorThrownByAsync(func) {
  try {
    await func()
    return false
  } catch (error) {
    if (error.symbol) {
      return error.symbol
    }
    throw new Error(error)
  }
}

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

async function throwsErrorOfTypeAsync (asyncFunc, errorSymbol) {
  try {
    await asyncFunc()
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

function createTestSettingsPath () {
  testSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.removeSync(testSettingsPath)
  return testSettingsPath
}

function initialiseStagingConfigurationWithOneDomainAtTestSettingsPath () {
  Configuration.reset()
  Configuration.initialise({
    domains: ['dev.ar.al'],
    server: new LetsEncryptServer(LetsEncryptServer.type.STAGING),
    settingsPath: createTestSettingsPath()
  })
}

function setupStagingConfigurationWithOneDomainAtTestSettingsPath () {
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
  timeIt,
  timeItAsync,
  symbolOfErrorThrownByAsync,
  symbolOfErrorThrownBy,
  throwsErrorOfType,
  throwsErrorOfTypeAsync,
  dehydrate,
  createTestSettingsPath,
  initialiseStagingConfigurationWithOneDomainAtTestSettingsPath,
  setupStagingConfigurationWithOneDomainAtTestSettingsPath,
  httpServerWithResponse
}
