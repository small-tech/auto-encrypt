////////////////////////////////////////////////////////////////////////////////
//
// Throws
//
// Extensible basic error creation and throwing methods that use symbols
// and predefined yet configurable lists of errors to make working with errors
// safer (fewer magic strings) and DRYer (Don’t Repeat Yourself).
//
// Copyright © 2020 Aral Balkan, Small Technology Foundation.
// License: AGPLv3 or later.
//
////////////////////////////////////////////////////////////////////////////////

import fs from 'fs-extra'
import path from 'path'

const __dirname = new URL('.', import.meta.url).pathname

class SymbolicError extends Error {
  symbol = null
}

// Add the ability to supply a custom hint to global errors. Hints are displayed
// at the end of the error message, in parentheses.
const hinted = (str, hint) => hint ? `${str} (${hint}).` : `${str}.`

export default class Throws {
  // Define common global errors. These are mixed into a local ERRORS object
  // if it exists on the object the mixin() method is called with a reference to.
  static ERRORS = {
    [Symbol.for('UndefinedOrNullError')]:
      (object, hint) => hinted(`${object} must not be undefined or null`, hint),

    [Symbol.for('UndefinedError')]:
      (object, hint) => hinted(`${object} must not be undefined`, hint),

    [Symbol.for('NullError')]:
      (object, hint) => hinted(`${object} must not be null`, hint),

    [Symbol.for('ArgumentError')]:
      (object, hint) => hinted(`incorrect value for argument ${object}`, hint),

    [Symbol.for('MustBeInstantiatedViaAsyncFactoryMethodError')]:
      (object, hint) => hinted(`Use the static getInstanceAsync() method to initialise ${object}`),

    [Symbol.for('SingletonConstructorIsPrivateError')]:
      (object, hint) =>
        hinted(`{object} is a singleton; its constructor is private. Do not instantiate using new ${object}()`),

    [Symbol.for('StaticClassCannotBeInstantiatedError')]:
      (object, hint) => hinted(`${object} is a static class. You cannot instantiate it using new ${object}()`),

    [Symbol.for('ReadOnlyAccessorError')]:
      (object, hint) => hinted(`{object} is a read-only property`)
  }

  constructor (customErrors = {}) {
    this.errors = Object.assign(customErrors, Throws.ERRORS)
  }

  messageFor (symbol, ...args) {
    return this.errors[symbol](...args)
  }

  createError (symbol, ...args) {
    const errorMessage = this.messageFor(symbol, ...args)
    const error = new SymbolicError(errorMessage)
    Error.captureStackTrace(error, this.error)
    error.name = symbol.description
    error.symbol = symbol
    return error
  }

  if (condition, errorSymbol, ...args) {
    if (condition) {
      this.error(errorSymbol, ...args)
    }
  }

  ifMissing (parameterName) {
    // Attempt to automatically get the argument name even if parameterName was not
    // manually specified in the code.
    //
    // Thanks to Christian Bundy (https://social.coop/@christianbundy/) for the
    // technique (https://gist.github.com/christianbundy/4c3c29b9f1a52384d7e8a51a956227c2)
    // TODO: Generalise and use in the other parameter errors if it holds up to testing.
    const copy = Error.prepareStackTrace;
    Error.prepareStackTrace = (_, stack) => stack;
    const stack = new Error().stack;
    Error.prepareStackTrace = copy;

    const fileName = stack[1].getFileName().replace('file://', '');
    const lineNumber = stack[1].getLineNumber() - 1;
    const columnNumber = stack[1].getColumnNumber() - 1;
    const line = fs.readFileSync(fileName, "utf8").split("\n")[lineNumber];
    const partialLine = line.slice(0, columnNumber);
    const groups = partialLine.match(/(\)|,)\s*?(([a-z]|[A-Z]|[0-9])+?)\s?=\s?throws\.$/);
    let argumentName = null
    if (groups !== null) {
      argumentName = groups[2]
    }
    this.error(Symbol.for('UndefinedOrNullError'), parameterName || argumentName || '<unknown>')
  }

  ifUndefinedOrNull (object, objectName) {
    if (object == undefined) {
      this.error(Symbol.for('UndefinedOrNullError'), objectName)
    }
  }

  ifUndefined (object, objectName) {
    if (object === undefined) {
      this.error(Symbol.for('UndefinedError'), objectName)
    }
  }

  error (symbol, ...args) {
    throw this.createError(symbol, ...args)
  }
}
