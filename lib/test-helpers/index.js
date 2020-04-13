//////////////////////////////////////////////////////////////////////
//
// Unit test helpers.
//
//////////////////////////////////////////////////////////////////////

const fs                  = require('fs-extra')
const os                  = require('os')
const path                = require('path')
const http                = require('http')
const enableServerDestroy = require('server-destroy')
const Configuration       = require('../Configuration')
const LetsEncryptServer   = require('../LetsEncryptServer')
const Throws              = require('../util/Throws')
const log                 = require('../util/log')

//
// Server mocks.
//

const throws = new Throws({
  [Symbol.for('MockServerCouldNotBeStartedError')]: details => `Mock server could not be started (${error})`
})

class MockServer {
  static #isBeingInstantiatedViaAsyncFactoryMethod = false

  static async getInstanceAsync (responseHandler = throws.ifMissing()) {
    this.#isBeingInstantiatedViaAsyncFactoryMethod = true
    const instance = new MockServer(responseHandler)
    await instance.create(responseHandler)
    this.#isBeingInstantiatedViaAsyncFactoryMethod = false
    return instance
  }

  #server          = null
  #responseHandler = null

  constructor(responseHandler) {
    if (!MockServer.#isBeingInstantiatedViaAsyncFactoryMethod) {
      throws.error(Symbol.for('MustBeInstantiatedViaAsyncFactoryMethodError'))
    }
    this.#responseHandler = responseHandler
  }

  async create () {
    const server = http.createServer(this.#responseHandler)
    enableServerDestroy(server)
    this.#server = server
    await new Promise((resolve, reject) => {
      try {
        server.listen(9829, () => {
          log(' 🎭 [Auto Encrypt] Mock server started.')
          resolve()
        })
      } catch (error) {
        reject(throws.createError(Symbol.for('MockServerCouldNotBeStartedError')))
      }
    })
  }

  async destroy () {
    this.#server.destroy()
  }
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

//
// Timing.
//

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

//
// Error validation.
//

function symbolOfErrorThrownBy(func) {
  try {
    func()
    return false
  } catch (error) {
    if (error.symbol === undefined) return 'no symbol found for error. Are you sure this is a SymbolicError and you’re using the Throws module?\n${error}'
    return error.symbol
  }
}

async function symbolOfErrorThrownByAsync(func) {
  try {
    await func()
    return false
  } catch (error) {
    if (error.symbol === undefined) return 'no symbol found for error. Are you sure this is a SymbolicError and you’re using the Throws module?\n${error}'
    return error.symbol
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

module.exports = {
  MockServer,
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
