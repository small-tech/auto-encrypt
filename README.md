# Auto Encrypt

Adds automatic provisioning and renewal of [Let’s Encrypt](https://letsencrypt.org) TLS certificates with [OCSP Stapling](https://letsencrypt.org/docs/integration-guide/#implement-ocsp-stapling) to [Node.js](https://nodejs.org) [https](https://nodejs.org/dist/latest-v12.x/docs/api/https.html) servers (including [Express.js](https://expressjs.com/), etc.)

__Note:__ this is the CommonJS (CJS) branch of Auto Encrypt. Please see the main branch for the ECMAScript Modules (ESM) version. Security updates are backported to this branch.

## How it works

The first time your web site is hit, it will take a couple of seconds to load as your Let’s Encrypt TLS certificates are automatically provisioned for you. From there on, your certificates will be seamlessly renewed 30 days before their expiry date.

When not provisioning certificates, Auto Encrypt will also forward HTTP calls to HTTPS on your server.

## Installation

```sh
npm i @small-tech/auto-encrypt@cjs
```

## Usage

### Instructions

1. Import the module:

    ```js
    const AutoEncrypt = require('@small-tech/auto-encrypt')
    ```

2. Prefix your server creation code with a reference to the Auto Encrypt class:

    ```js
    // const server = https.createServer(…) becomes
    const server = AutoEncrypt.https.createServer(…)
    ```

3. When done, close your server as you would normally:

    ```js
    server.close(() => {
      console.log('The server is now closed.')
    })
    ```

### Example

The following code creates an HTTPS server running on port 443 with [OCSP Stapling](https://letsencrypt.org/docs/integration-guide/#implement-ocsp-stapling) that automatically provisions and renews TLS certificates from [Let’s Encrypt](https://letsencrypt.org) for the domains _&lt;hostname&gt;_ and _www.&lt;hostname&gt;_.


```js
const AutoEncrypt = require('@small-tech/auto-encrypt')

const server = AutoEncrypt.https.createServer((request, response) => {
  response.end('Hello, world')
})

server.listen(() => {
  console.log(`Auto-encrypted HTTPS server is running at ${os.hostname()} and www.${os.hostname()}.`)
})

// Later…

server.close(() => {
  console.log('The server is now closed.')
})
```

Note that on Linux, ports 80 and 443 require special privileges. Please see [A note on Linux and the security farce that is “privileged ports”](#a-note-on-linux-and-the-security-farce-that-is-priviliged-ports). If you just need a Node web server that handles all that and more for you (or to see how to implement privilege escalation seamlessly in your own servers, see [Site.js](https://sitejs.org)).

## Configuration

You can customise the default configuration by adding Auto Encrypt-specific options to the options object you pass to the Node `https` server.

You can specify the domains you want the certificate to support, whether the Let’s Encrypt staging server or a local [Pebble](https://github.com/letsencrypt/pebble) server should be used instead of the default production server (useful during development and testing), and to specify a custom settings path for your Let’s Encrypt account and certificate information to be stored in.

### Example

```js
const AutoEncrypt = require('@small-tech/auto-encrypt')

const options = {
  // Regular HTTPS server and TLS server options, if any, go here.

  // Optional Auto Encrypt options:
  domains: ['first.domain', 'second.domain', /* … */],
  server: AutoEncrypt.server.STAGING,
  settingsPath: '/custom/settings/path'
}

// Pass the options object to https.createServer()
const server = AutoEncrypt.https.createServer(options, listener)

// …
```

### Default options

Here is the full list of Auto Encrypt options (all optional) and their defaults:

  - `domains`: the hostname of the current computer and the www subdomain at that hostname.
  - `server`: it will use the production server (which has [rate limits](https://letsencrypt.org/docs/rate-limits/)). Valid values are `AutoEncrypt.server.(PEBBLE|STAGING|PRODUCTION)`.
  - `settingsPath`: _~/.small-tech.org/auto-encrypt/_

## Making a graceful exit

When you’re ready to exit your app, just call the `server.close()` method as you would normally. This will allow Auto Encrypt to perform housekeeping like shutting own the HTTP server that is used for answering Let’s Encrypt challenges as well as performing HTTP to HTTPS redirections and to destroy its certificate check update interval which, if not destroyed, will prevent your app from exiting.

## Developer documentation

If you want to help improve Auto Encrypt or better understand how it is structured and operates, please see the [developer documentation](https://github.com/small-tech/auto-encrypt/blob/master/developer-documentation.md).

## Examples

### Regular https

```js
const AutoEncrypt = require('@small-tech/auto-encrypt')

const server = AutoEncrypt.https.createServer({ domains: ['dev.ar.al'] }, (request, response) => {
    response.end('Hello, world!')
})

server.listen(() => {
  console.log('Auto-encrypted HTTPS server is running at https://dev.ar.al')
})

// Later…

server.close(() => {
  console.log('The server is now closed.')
})
```

### Express.js

```js
const express = require('express')
const AutoEncrypt = require('@small-tech/auto-encrypt')

const app = express()
app.get('/', (request, response) => {
  response.end('Hello, world!')
})

const server = AutoEncrypt.https.createServer(
  autoEncrypt({ domains: ['dev.ar.al'] }),
  app
)

server.listen(() => {
  console.log('Auto-encrypted Express server is running at https://dev.ar.al')
})


// Later…

server.close(() => {
  console.log('The server is now closed.')
})
```

## Like this? Fund us!

[Small Technology Foundation](https://small-tech.org) is a tiny, independent not-for-profit.

We exist in part thanks to patronage by people like you. If you share [our vision](https://small-tech.org/about/#small-technology) and want to support our work, please [become a patron or donate to us](https://small-tech.org/fund-us) today and help us continue to exist.

## Audience

This is [small technology](https://small-tech.org/about/#small-technology).

If you’re evaluating this for a “startup” or an enterprise, let us save you some time: this is not the right tool for you. This tool is for individual developers to build personal web sites and apps for themselves and for others in a non-colonial manner that respects the human rights of the people who use them.

## Client details

Auto Encrypt does one thing and one thing well: it automatically provisions a Let’s Encrypt TLS certificate for your Node.js https servers using the HTTP-01 challenge method when your server is first hit from its hostname, serves it using OCSP Stapling, and automatically renews your certificate thereafter. And, when not provisioning certificates, it forwards any HTTP requests that your machine gets to HTTPS.

Auto Encrypt __does not_ and __will not__:

  - Implement wildcard certificates. For most [small tech](https://small-tech.org/about/#small-technology) needs (personal web sites and web apps), you will likely need no more than two domains (the root domain and, due to historic and conventional reasons, the www subdomain). You will definitely not need more than the 100 domains that are supported per certificate. If you do, chances are you are looking to use Auto Encrypt in a startup or corporate setting, which is not what its for.

  - Implement DNS-01 or any other methods that cannot be fully automated.


## Staging and production server behaviour and rate limits

By default, Auto Encrypt will use the Let’s Encrypt production environment. This is most likely what you want as it means that your HTTPS server will Just Work™, provisioning its TLS certificate automatically the first time the server is hit via its hostname and from thereon automatically renewing the certificate a month ahead of its expiry date.

However, be aware that the production server has [rate limits](https://letsencrypt.org/docs/rate-limits/).

For testing, Auto Encrypt provides seamless support for using the included local Pebble server or the Let’s Encrypt staging server.

If you do use the staging environment, be aware that browsers will reject the staging certificates unless you trust the [Fake LE Root X1 certificate](https://letsencrypt.org/docs/staging-environment/#root-certificate). If testing with an external https client written in Node, you can add the fake root certificate to your trust store temporarily, using the [`NODE_EXTRA_CA_CERTS` environment variable](https://nodejs.org/api/cli.html#cli_node_extra_ca_certs_file) or setting the `ca` options property when creating your `https` server. (Note that if you’re testing with the staging or Pebble server from the same process that Auto Encrypt is running in, Auto Encrypt automatically does this for you by monkeypatching Node’s TLS module with the necessary CA certificates.)

Needless to say, do not add the fake certificate root to the same trust store you use for your everyday browsing.


## Related projects

From lower-level to higher-level:

### Auto Encrypt Localhost

  - Source: https://source.small-tech.org/site.js/lib/auto-encrypt-localhost
  - Package: [@small-tech/auto-encrypt-localhost](https://www.npmjs.com/package/@small-tech/auto-encrypt-localhost)

Automatically provisions and installs locally-trusted TLS certificates for Node.js https servers (including Express.js, etc.) using [mkcert](https://github.com/FiloSottile/mkcert/).

### HTTPS

  - Source: https://source.small-tech.org/site.js/lib/https
  - Package: [@small-tech/https](https://www.npmjs.com/package/@small-tech/https)

A drop-in [standard Node.js HTTPS module](https://nodejs.org/dist/latest-v12.x/docs/api/https.html) replacement with both automatic development-time (localhost) certificates via Auto Encrypt Localhost and automatic production certificates via Auto Encrypt.

### Site.js

  - Web site: https://sitejs.org
  - Source: https://source.small-tech.org/site.js/app

A complete [small technology](https://small-tech.org/about/#small-technology) tool for developing, testing, and deploying a secure static or dynamic personal web site or app with zero configuration.

## Tests and coverage

This project aims for > 80% coverage. At a recent check, coverage was at 95.29% (statements), 82.69% (branch), 95.19% (functions), 95.68% (lines).

To see the current state of code coverage, run `npm run coverage`.

For more details, please see the [developer documentation](https://github.com/small-tech/auto-encrypt/blob/master/developer-documentation.md#tests).

## A note on Linux and the security farce that is “privileged ports”

Linux has an outdated feature dating from the mainframe days that requires a process that wants to bind to ports < 1024 to have elevated privileges. While this was a security feature in the days of dumb terminals, today it is a security anti-feature. (macOS has dropped this requirement as of macOS Mojave.)

On modern Linux systems, you can disable privileged ports like this:

```sh
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=0
```

Or, if you want to cling to ancient historic relics like a conservative to a racist statue, ensure your Node process has the right to bind to so-called “privileged” ports by issuing the following command before use:

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

(Documenting these here as private class fields – ‘hashnames’ – are relatively new as of this writing and may not be familiar to some. The use of the underscore to differentiate direct property access from mediated access via an accessor is a project convention.)

## Like this? Fund us!

[Small Technology Foundation](https://small-tech.org) is a tiny, independent not-for-profit.

We exist in part thanks to patronage by people like you. If you share [our vision](https://small-tech.org/about/#small-technology) and want to support our work, please [become a patron or donate to us](https://small-tech.org/fund-us) today and help us continue to exist.

## Copyright

&copy; 2020 - present [Aral Balkan](https://ar.al), [Small Technology Foundation](https://small-tech.org).

Let’s Encrypt is a trademark of the Internet Security Research Group (ISRG). All rights reserved. Node.js is a trademark of Joyent, Inc. and is used with its permission. We are not endorsed by or affiliated with Joyent or ISRG.

## License

[AGPL version 3.0 or later.](https://www.gnu.org/licenses/agpl-3.0.en.html)
