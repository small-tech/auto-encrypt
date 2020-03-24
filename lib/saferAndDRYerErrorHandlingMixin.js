////////////////////////////////////////////////////////////////////////////////
//
// Safer and DRYer error handling mixin.
//
// Mixes in global errors as well as basic error creation and throwing methods
// that use symbols and predefined yet configurable lists of errors to make
// working with errors safer (fewer magic strings) and DRYer (Don’t Repeat
// Yourself).
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

// Define common global errors. These are mixed into a local ERRORS object
// if it exists on the object the mixin() method is called with a reference to.
const ERRORS = {
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

function newError (symbol, ...args) {
  const errorMessage = this.ERRORS[symbol](...args)
  const error = new SymbolicError(errorMessage)
  Error.captureStackTrace(error, this.throwError)
  error.name = symbol.description
  error.symbol = symbol
  return error
}

function required (parameterName) {
  throw this.newError(Symbol.for('UndefinedOrNullError'), parameterName)
}

function ensureNotUndefinedOrNull (object, objectName) {
  if (object == undefined) {
    this.throwError(Symbol.for('UndefinedOrNullError'), objectName)
  }
}

function ensureNotUndefined (object, objectName) {
  if (object === undefined) {
    this.throwError(Symbol.for('UndefinedError'), objectName)
  }
}

function throwError (symbol, ...args) {
  throw this.newError(symbol, ...args)
}

function mixin(targetObject) {
  // Copy over the global errors.
  if (targetObject.ERRORS == undefined) {
    targetObject.ERRORS = {}
  }
  Object.assign(targetObject.ERRORS, ERRORS)

  // Mix in the methods.
  targetObject.newError = newError
  targetObject.throwError = throwError
  targetObject.required = required
  targetObject.ensureNotUndefined = ensureNotUndefined
  targetObject.ensureNotUndefinedOrNull = ensureNotUndefinedOrNull
}

module.exports = mixin
