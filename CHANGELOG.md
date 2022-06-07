# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2022-06-07

Now with more SHA for the buck.

### Changed
 
  - Update certificate request (CSR) signing algorithm to SHA-256 from SHA-1 as SHA-1 will be rejected by Let’s Encrypt after September 15, 2022 (see https://community.letsencrypt.org/t/rejecting-sha-1-csrs-and-validation-using-tls-1-0-1-1-urls/175144).

## [2.2.0] - 2021-03-08

### Changed

  - Now includes the latest Let’s Encrypt certificate authority root certificate for the staging environment. (This is automatically injected into your Node.js environment when running the server in staging mode and is used during testing.)

### Fixed

  - No longer crashes when checking for certificate renewal. (#34)

### Improved

  - npm package size is now 199.7kb (down from 345kb previously).

## [2.0.6] - 2021-02-16

### Fixed

  - Assignment to constant. This would have caused a crash when a `Retry-After` header was received from Let’s Encrypt.

### Improved

  - Developer documentation. Now lists value to be added to hosts files to run local tests.

## [2.0.5] - 2020-10-29

### Improved

  - Update dependencies to remove npm vulnerability warnings.

## [2.0.4] - 2020-07-10

### Fixed

  - HTTP to HTTPS redirects now start up and work as they should (they weren’t previously).

## [2.0.3] - 2020-07-10

### Changed

  - Update source code repository in npm package to point to GitHub mirror. (The GitHub mirror is the public repository where we can accept issues and pull requests. [The canonical repository](https://source.small-tech.org/site.js/lib/auto-encrypt) is on our own server where we do not accept sign ups as we don’t want it to become yet another centralised host.)

## [2.0.2] - 2020-07-10

### Fixed

  - Links to developer documentation now work everywhere, not just on source code repository web interfaces.

### Changed

  - Replaced outdated coverage message in readme and linked to developer documentation for information on tests and coverage.

## [2.0.1] - 2020-07-03

### Added

  - HTTP to HTTPS redirects are now logged.

## [2.0.0] - 2020-07-03

### Changed

  - Breaking change: you no longer have to call AutoEncrypt.shutdown() manually. Closing your server will do it automatically (#33).

### Added

  - Automatic HTTP to HTTPS redirection. An HTTP server is now kept running for the lifetime of your HTTPS server and, when it is not responding to Let’s Encrypt challenges, it redirects HTTP calls on port 80 to your HTTPS server (#32).

## [1.0.3] - 2020-06-20

### Fixed

  - Carriage returns are now stripped from Certificate Signing Requests (CSRs) (#31).

## [1.0.2] - 2020-06-16

### Fixed

  - No longer crashes if OCSP request received before certificate created.
  - Cosmetic: format certificate details nicely in log message.
  - Minor: fix capitalisation in log message.

## [1.0.1] - 2020-06-15

### Changed

  - Update log format to match Site.js output.

### Fixed

  - Remove debug output.

## [1.0.0] - 2020-04-15

Initial release.
