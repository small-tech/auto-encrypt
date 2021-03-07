//////////////////////////////////////////////////////////////////////
//
// Unit test helpers.
//
//////////////////////////////////////////////////////////////////////

import fs from 'fs'
import os from 'os'
import path from 'path'
import http from 'http'
import enableServerDestroy from 'server-destroy'
import Configuration from '../Configuration.js'
import LetsEncryptServer from '../LetsEncryptServer.js'
import Throws from '../util/Throws.js'
import log from '../util/log.js'

//
// Server mocks.
//

const throws = new Throws({
  [Symbol.for('MockServerCouldNotBeStartedError')]: details => `Mock server could not be started (${error})`
})

export class MockServer {
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
          log('   🎭    ❨auto-encrypt❩ Mock server started.')
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

export async function httpServerWithResponse (mockResponse) {
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
// Pebble setup and teardown.
//

export class TestContext {

}

//
// Timing.
//

export function timeIt(func) {
  const startTime = new Date()
  const returnValue = func()
  const endTime = new Date()
  return { returnValue, duration: endTime - startTime }
}

export async function timeItAsync(func) {
  const startTime = new Date()
  const returnValue = await func()
  const endTime = new Date()
  return { returnValue, duration: endTime - startTime }
}

//
// Error validation.
//

export function symbolOfErrorThrownBy(func) {
  try {
    func()
    return false
  } catch (error) {
    if (error.symbol === undefined) return 'no symbol found for error. Are you sure this is a SymbolicError and you’re using the Throws module?\n${error}'
    return error.symbol
  }
}

export async function symbolOfErrorThrownByAsync(func) {
  try {
    await func()
    return false
  } catch (error) {
    if (error.symbol === undefined) return 'no symbol found for error. Are you sure this is a SymbolicError and you’re using the Throws module?\n${error}'
    return error.symbol
  }
}

export function throwsErrorOfType (func, errorSymbol) {
  try {
    func()
  } catch (error) {
    // Is the error of the type requested?
    return error.symbol === errorSymbol
  }
  // Did not throw when it was supposed to.
  return false
}

export async function throwsErrorOfTypeAsync (asyncFunc, errorSymbol) {
  try {
    await asyncFunc()
  } catch (error) {
    // Is the error of the type requested?
    return error.symbol === errorSymbol
  }
  // Did not throw when it was supposed to.
  return false
}

export function dehydrate (string) {
  return string.replace(/\s/g, '')
}

export function createTestSettingsPath () {
  const testSettingsPath = path.join(os.homedir(), '.small-tech.org', 'auto-encrypt', 'test')
  fs.rmSync(testSettingsPath, { recursive: true, force: true })
  return testSettingsPath
}

export function initialiseStagingConfigurationWithOneDomainAtTestSettingsPath () {
  Configuration.reset()
  Configuration.initialise({
    domains: ['dev.ar.al'],
    server: new LetsEncryptServer(LetsEncryptServer.type.STAGING),
    settingsPath: createTestSettingsPath()
  })
}

export function setupStagingConfigurationWithOneDomainAtTestSettingsPath () {
  initialiseStagingConfigurationWithOneDomainAtTestSettingsPath()
}
