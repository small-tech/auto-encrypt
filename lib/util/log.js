// Conditionally log to console.
export default function log (...args) {
  if (process.env.QUIET) {
    return
  }
  console.log(...args)
}
