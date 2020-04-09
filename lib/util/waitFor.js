function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = waitFor
