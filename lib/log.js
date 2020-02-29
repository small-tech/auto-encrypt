// Conditionally log to console.
function log (...args) {
  if (process.env.VERBOSE) {
    console.log(...args)
  }
}

module.exports = log
