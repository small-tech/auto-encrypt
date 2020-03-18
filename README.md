# Auto Encrypt

Automatically provisions and renews [Let’s Encrypt](https://letsencrypt.org)™ TLS certificates for [Node.js](https://nodejs.org)® [https](https://nodejs.org/dist/latest-v12.x/docs/api/https.html) servers (including [Express.js](https://expressjs.com/), etc.)

## How it works

The first time your web site is hit, it will take a couple of seconds to load as your Let’s Encrypt TLS certificates are automatically provisioned for you. From there on, your certificates will be automatically renewed 30 days before their expiry date.

## Installation

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

## Like this? Fund us!

[Small Technology Foundation](https://small-tech.org) is a tiny, independent not-for-profit.

We exist in part thanks to patronage by people like you. If you share [our vision](https://small-tech.org/about/#small-technology) and want to support our work, please [become a patron or donate to us](https://small-tech.org/fund-us) today and help us continue to exist.

## Audience

This is [small technology](https://small-tech.org/about/#small-technology).

If you’re evaluating this for a “startup” or an enterprise, let us save you some time: this is not the right tool for you. This tool is for individual developers to build personal web sites and apps for themselves and for others in a non-colonial manner that respects the human rights of the people who use them.

## Client details

Auto Encrypt is does one thing and one thing well: it automatically provisions a Let’s Encrypt TLS certificate for your Node.js https servers using the HTTP-01 challenge method when your server is first hit from its hostname and it automatically renews your certificate from thereon.

Auto Encrypt __does not_ and __will not__:

  - Implement wildcard certificates. For most [small tech](https://small-tech.org/about/#small-technology) needs (personal web sites and web apps), you will likely need no more than two domains (the root domain and, due to historic and conventional reasons, the www subdomain). You will definitely not need more than the 100 domains that are supported per certificate. If you do, chances are you are looking to use Auto Encrypt in a startup or corporate setting, which is not what its for.

  - Implement DNS-01 or any other methods that cannot be fully automated.


## Staging and production server behaviour and rate limits

By default, Auto Encrypt will use the Let’s Encrypt production environment. This is most likely what you want as it means that your HTTPS server will Just Work™, provisioning its TLS certificate automatically the first time the server is hit via its hostname and from thereon automatically renewing the certificate a month ahead of its expiry date.

However, be aware that the production server has [rate limits](https://letsencrypt.org/docs/rate-limits/).

If your testing requires provisioning new certificates, use the staging environment instead. For example, the unit tests all use the staging environment.

If you do use the staging environment, be aware that browsers will reject the staging certificates unless you trust the [Fake LE Root X1 certificate](https://letsencrypt.org/docs/staging-environment/#root-certificate). If testing with an https client written in Node, you can add the fake root certificate to your trust store temporarily, using the [`NODE_EXTRA_CA_CERTS` environment variable](https://nodejs.org/api/cli.html#cli_node_extra_ca_certs_file) or setting the `ca` options property when creating your `https` server. Needless to say, do not add the fake certificate root to the same trust store you use for your everyday browsing.

## Related projects

From lower-level to higher-level:

### Auto Encrypt Localhost

  - Source: https://source.small-tech.org/site.js/lib/auto-encrypt-localhost
  - Package: [@small-tech/auto-encrypt-localhost](https://www.npmjs.com/package/@small-tech/auto-encrypt-localhost)

Automatically provision trusted development-time (localhost) certificates in Node.js without browser errors via [mkcert](https://github.com/FiloSottile/mkcert).  __TODO: add URL after migrating the project (previously called nodecert)__.

### HTTPS

  - Source: https://source.small-tech.org/site.js/lib/https
  - Package: [@small-tech/https](https://www.npmjs.com/package/@small-tech/https)

A drop-in [standard Node.js HTTPS module](https://nodejs.org/dist/latest-v12.x/docs/api/https.html) replacement with both automatic development-time (localhost) certificates via Auto Encrypt Localhost and automatic production certificates via Auto Encrypt.

### Site.js

  - Web site: https://sitejs.org

A complete [small technology](https://small-tech.org/about/#small-technology) tool for developing, testing, and deploying a secure static or dynamic personal web site or app with zero configuration.

## Coverage

File                            |  % Stmts | % Branch |  % Funcs |  % Lines | Uncovered Line #s |
--------------------------------|----------|----------|----------|----------|-------------------|
All files                       |     93.4 |     91.3 |    81.97 |     93.3 |                   |
  auto-encrypt                   |      100 |      100 |      100 |      100 |                   |
  index.js                      |      100 |      100 |      100 |      100 |                   |
  auto-encrypt/lib               |    92.61 |       90 |       80 |    92.53 |                   |
  Account.js                    |      100 |      100 |      100 |      100 |                   |
  AcmeRequest.js                |      100 |       80 |      100 |      100 |                25 |
  Configuration.js              |      100 |      100 |      100 |      100 |                   |
  Directory.js                  |      100 |      100 |      100 |      100 |                   |
  Identity.js                   |      100 |      100 |      100 |      100 |                   |
  Nonce.js                      |      100 |      100 |      100 |      100 |                   |
  Order.js                      |    56.67 |       50 |    21.43 |    56.67 |... 54,55,56,61,73 |
  auto-encrypt/lib/acme-requests |    93.75 |      100 |      100 |    93.33 |                   |
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

## A note on coding conventions

The code uses TC39 class fields with the following naming conventions for private fields:

```js
#property     // safe property access (either via accessor or where property is both safe to get and set)
#_property    // unsafe  property access (should only be used in accessors)
```

(Documenting these here as private class fields (hashnames) are relatively new as of this writing and may not be familiar to some. The use of the underscore to differentiate direct property access from mediated access via an accessor is also a project convention.)

## Like this? Fund us!

[Small Technology Foundation](https://small-tech.org) is a tiny, independent not-for-profit.

We exist in part thanks to patronage by people like you. If you share [our vision](https://small-tech.org/about/#small-technology) and want to support our work, please [become a patron or donate to us](https://small-tech.org/fund-us) today and help us continue to exist.

## Copyright

&copy; 2020 [Aral Balkan](https://ar.al), [Small Technology Foundation](https://small-tech.org).

## License

[AGPL version 3.0 or later.](https://www.gnu.org/licenses/agpl-3.0.en.html)
