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

class SymbolicError extends Error {
  symbol = null
}

// Add the ability to supply a custom hint to global errors. Hints are displayed
// at the end of the error message, in parentheses.
const hinted = (str, hint) => hint ? `${str} (${hint}).` : `${str}.`


class Throws {
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

  createError (symbol, ...args) {
    const errorMessage = this.errors[symbol](...args)
    const error = new SymbolicError(errorMessage)
    Error.captureStackTrace(error, this.throwError)
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
    throw this.createError(Symbol.for('UndefinedOrNullError'), parameterName)
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

module.exports = Throws
