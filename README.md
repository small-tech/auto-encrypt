# Auto Encrypt

Automatically provisions and renews [Let’s Encrypt](https://letsencrypt.org)™ TLS certificates for [Node.js](https://nodejs.org)® [https](https://nodejs.org/dist/latest-v12.x/docs/api/https.html) servers (including [Express.js](https://expressjs.com/), etc.)

## How it works

The first time your web site is hit, it will take a couple of seconds to load as your Let’s Encrypt TLS certificates are automatically provisioned for you. From there on, your certificates will be automatically renewed 30 days before their expiry date.

## Install

```sh
npm i @small-tech/auto-encrypt
```

## Usage

Instead of passing an `options` object directly to the `https.createServer([options][, listener])` method, pass the return value of a call to this module to it.

```js
const autoEncrypt = require('@small-tech/auto-encrypt')

const options = autoEncrypt({
  domains: [domain1, domain2, /* … */],
  options: { /* https server options */},
  settingsPath: '/custom/settings/path'
})

// Pass the options object to https.createServer()
```

### Parameter object

The Auto Encrypt function takes a single parameter object as its only argument. This object can contain the following properties:

  - `domains` (array of strings): Names to provision Let’s Encrypt certificates for.
  - `options` (object; _optional_): Standard `https` server options.
  - `staging` (boolean; _optional_): If `true`, the [Let’s Encrypt staging environment](https://letsencrypt.org/docs/staging-environment/) will be used (default is `false`).
  - `settingsPath` (string; _optional_): a custom path to save the certificates and keys to (defaults to _~/.small-tech.org/auto-encrypt/_).

### Return value

The `autoEncrypt()` function returns an options object to be passed to the `https.createServer()` method.

## Examples

### Regular https

```js
const https = require('https')
const autoEncrypt = require('@small-tech/auto-encrypt')

const options = { /* custom options, if any */ }

const server = https.createServer(
  autoEncrypt({
    options,
    domains: ['ar.al', 'www.ar.al']
  }),
  (request, response) => {
    response.end('Hello, world!')
  }
)
```

### Express.js

```js
const express = require('express')
const https = require('https')
const autoEncrypt = require('@small-tech/auto-encrypt')

const options = { /* custom options, if any */ }

const app = express()
app.get('/', (request, response) => {
  response.end('Hello, world!')
})

const server = https.createServer(
  autoEncrypt({ options, domains: ['ar.al', 'www.ar.al'] }),
  app
)
```

## Related projects

From lower-level to higher-level:

  - For automatic trusted development-time (localhost) certificates in Node.js without browser errors via [mkcert](https://github.com/FiloSottile/mkcert), see [@small-tech/auto-encrypt-local]() __TODO: add URL after migrating the project (previously called nodecert)__.

  - For a drop-in standard Node.js `https` module replacement with both automatic development-time (localhost) certificates via auto-encrypt-local and automatic production certificates via auto-encrypt, see [@small-tech/https](https://source.small-tech.org/site.js/lib/https).

  - For a complete [small technology](https://small-tech.org/about/#small-technology) solution to develop, test, and deploy a secure static or dynamic personal web site with zero configuration, see [Site.js](https://sitejs.org).

## Coverage

File                            |  % Stmts | % Branch |  % Funcs |  % Lines | Uncovered Line #s |
--------------------------------|----------|----------|----------|----------|-------------------|
All files                       |     93.4 |     91.3 |    81.97 |     93.3 |                   |
  acme-http-01                   |      100 |      100 |      100 |      100 |                   |
  index.js                      |      100 |      100 |      100 |      100 |                   |
  acme-http-01/lib               |    92.61 |       90 |       80 |    92.53 |                   |
  Account.js                    |      100 |      100 |      100 |      100 |                   |
  AcmeRequest.js                |      100 |       80 |      100 |      100 |                25 |
  Configuration.js              |      100 |      100 |      100 |      100 |                   |
  Directory.js                  |      100 |      100 |      100 |      100 |                   |
  Identity.js                   |      100 |      100 |      100 |      100 |                   |
  Nonce.js                      |      100 |      100 |      100 |      100 |                   |
  Order.js                      |    56.67 |       50 |    21.43 |    56.67 |... 54,55,56,61,73 |
  acme-http-01/lib/acme-requests |    93.75 |      100 |      100 |    93.33 |                   |
  NewAccountRequest.js          |      100 |      100 |      100 |      100 |                   |
  NewOrderRequest.js            |    88.89 |      100 |      100 |     87.5 |                27 |


(For the latest state, run `npm run coverage`)

## A note on Linux and the security farce that is “privileged ports”

Linux has an outdated feature dating from the mainframe days that requires a process that wants to bind to ports < 1024 to have elevated privileges. While this was a security feature in the days of dumb terminals, today it is a security anti-feature. (macOS has dropped this requirement as of macOS Mojave.)

On Linux, ensure your Node process has the right to bind to so-called “privileged” ports by issuing the following command before use:

```sh
sudo setcap cap_net_bind_service=+ep $(which node)
```

If you are wrapping your Node app into an executable binary using a module like [Nexe](https://github.com/nexe/nexe), you will have to ensure that every build of your app has that capability set. For an example of how we do this in [Site.js](https://sitejs.org), [see this listing](https://source.ind.ie/site.js/app/blob/master/bin/lib/ensure.js#L124).

## Technical definition

Implements the subset of [RFC 8555](https://tools.ietf.org/html/rfc8555) – Automatic Certificate Management Environment (ACME) – necessary for a [Node.js](https://nodejs.org) [https](https://nodejs.org/dist/latest-v12.x/docs/api/https.html) server to provision [TLS certificates](https://en.wikipedia.org/wiki/Transport_Layer_Security) from [Let’s Encrypt](https://letsencrypt.org) using the [HTTP-01 challenge](https://tools.ietf.org/html/rfc8555#section-8.3) on first hit of an HTTPS route via use of the [Server Name Indication](https://en.wikipedia.org/wiki/Server_Name_Indication) (SNI) callback.

## Copyright

&copy; 2020 [Aral Balkan](https://ar.al), [Small Technology Foundation](https://small-tech.org).

## License

[AGPL version 3.0 or later.](https://www.gnu.org/licenses/agpl-3.0.en.html)
