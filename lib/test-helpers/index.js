//////////////////////////////////////////////////////////////////////
//
// Unit test helpers.
//
//////////////////////////////////////////////////////////////////////

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

module.exports = {
  throwsErrorOfType,
  dehydrate
}
