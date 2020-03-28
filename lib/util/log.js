// Conditionally log to console.
function log (...args) {
  if (process.env.QUIET) {
    return
  }
  console.log(...args)
}

module.exports = log
