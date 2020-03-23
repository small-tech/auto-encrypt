# Auto Encrypt

__Under heavy development and not officially released yet. Play with it if you want to but please don’t use it in production yet.__

Automatically provisions and renews [Let’s Encrypt](https://letsencrypt.org) TLS certificates for [Node.js](https://nodejs.org) [https](https://nodejs.org/dist/latest-v12.x/docs/api/https.html) servers (including [Express.js](https://expressjs.com/), etc.)

## How it works

The first time your web site is hit, it will take a couple of seconds to load as your Let’s Encrypt TLS certificates are automatically provisioned for you. From there on, your certificates will be seamlessly renewed 30 days before their expiry date.

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

// …

// Then, when you’re ready to exit your app,
// give auto-encrypt the chance to perform housekeeping:
autoEncrypt.prepareForExit()
```

### Parameter object

The Auto Encrypt function takes a single parameter object as its only argument. This object can contain the following properties:

  - `domains` (array of strings): Names to provision Let’s Encrypt certificates for.
  - `options` (object; _optional_): Standard `https` server options.
  - `staging` (boolean; _optional_): If `true`, the [Let’s Encrypt staging environment](https://letsencrypt.org/docs/staging-environment/) will be used (default is `false`).
  - `settingsPath` (string; _optional_): a custom path to save the certificates and keys to (defaults to _~/.small-tech.org/auto-encrypt/_).

### Return value

The `autoEncrypt()` function returns an options object to be passed to the `https.createServer()` method.

For more details, please see the [API documentation](/docs).

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

__The tests are currently broken and in the process of being overhauled following some major development work.__

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

(Documenting these here as private class fields (hashnames) are relatively new as of this writing and may not be familiar to some. The use of the underscore to differentiate direct property access from mediated access via an accessor is a project convention.)

## API documentation

## Classes

<dl>
<dt><a href="#Certificate">Certificate</a></dt>
<dd></dd>
<dt><a href="#Configuration">Configuration</a></dt>
<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#autoEncrypt">autoEncrypt(parameterObject)</a> ⇒ <code>Object</code></dt>
<dd><p>Automatically manages Let’s Encrypt certificate provisioning and renewal for Node.js
https servers using the HTTP-01 challenge on first hit of an HTTPS route via use of
the Server Name Indication (SNI) callback</p>
</dd>
</dl>

<a name="Certificate"></a>

## Certificate
**Kind**: global class  

* [Certificate](#Certificate)
    * [new Certificate()](#new_Certificate_new)
    * _instance_
        * [.getSecureContext()](#Certificate+getSecureContext) ⇒ <code>tls.SecureContext</code>
        * [.createSecureContext()](#Certificate+createSecureContext)
        * [.provisionCertificate()](#Certificate+provisionCertificate)
        * [.checkForRenewal()](#Certificate+checkForRenewal)
        * [.startCheckingForRenewal([alsoCheckNow])](#Certificate+startCheckingForRenewal)
        * [.stopCheckingForRenewal()](#Certificate+stopCheckingForRenewal)
    * _static_
        * [.Certificate](#Certificate.Certificate)
            * [new Certificate(domains)](#new_Certificate.Certificate_new)

<a name="new_Certificate_new"></a>

### new Certificate()
Represents a Let’s Encrypt TLS certificate.

<a name="Certificate+getSecureContext"></a>

### certificate.getSecureContext() ⇒ <code>tls.SecureContext</code>
Get a SecureContext that can be used in an SNICallback.

**Kind**: instance method of [<code>Certificate</code>](#Certificate)  
<a name="Certificate+createSecureContext"></a>

### certificate.createSecureContext()
Creates and caches a secure context, provisioning a TLS certificate in the process, if necessary.

**Kind**: instance method of [<code>Certificate</code>](#Certificate)  
<a name="Certificate+provisionCertificate"></a>

### certificate.provisionCertificate()
Provisions a new Let’s Encrypt TLS certificate, persists it, and checks for
renewals on it every day, starting with the next day.

**Kind**: instance method of [<code>Certificate</code>](#Certificate)  
<a name="Certificate+checkForRenewal"></a>

### certificate.checkForRenewal()
Checks if the certificate needs to be renewed (if it is within 30 days of its expiry date) and, if so, renews it.

**Kind**: instance method of [<code>Certificate</code>](#Certificate)  
<a name="Certificate+startCheckingForRenewal"></a>

### certificate.startCheckingForRenewal([alsoCheckNow])
Starts checking for certificate renewals every 24 hours.

**Kind**: instance method of [<code>Certificate</code>](#Certificate)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [alsoCheckNow] | <code>boolean</code> | <code>false</code> | If true, will also immediately check for renewal when the function is called (use this when loading a previously-provisioned and persisted certificate from disk). |

<a name="Certificate+stopCheckingForRenewal"></a>

### certificate.stopCheckingForRenewal()
Stops the timer that checks for renewal daily. Use this during housekeeping before destroying this object.

**Kind**: instance method of [<code>Certificate</code>](#Certificate)  
<a name="Certificate.Certificate"></a>

### Certificate.Certificate
**Kind**: static class of [<code>Certificate</code>](#Certificate)  
<a name="new_Certificate.Certificate_new"></a>

#### new Certificate(domains)
Creates an instance of Certificate.


| Param | Type | Description |
| --- | --- | --- |
| domains | <code>Array.&lt;String&gt;</code> | The domains this certificate covers. |

<a name="Configuration"></a>

## Configuration
**Kind**: global class  

* [Configuration](#Configuration)
    * [.domains](#Configuration.domains) : <code>Array.&lt;String&gt;</code>
    * [.settingsPath](#Configuration.settingsPath) : <code>String</code>
    * [.accountPath](#Configuration.accountPath) : <code>String</code>
    * [.accountIdentityPath](#Configuration.accountIdentityPath) : <code>String</code>
    * [.certificatePath](#Configuration.certificatePath) : <code>String</code>
    * [.certificateDirectoryPath](#Configuration.certificateDirectoryPath) : <code>String</code>
    * [.certificateIdentityPath](#Configuration.certificateIdentityPath) : <code>String</code>
    * [.initialise(settings)](#Configuration.initialise)

<a name="Configuration.domains"></a>

### Configuration.domains : <code>Array.&lt;String&gt;</code>
The list of domains supported by the current certificate.

**Kind**: static property of [<code>Configuration</code>](#Configuration)  
**Read only**: true  
<a name="Configuration.settingsPath"></a>

### Configuration.settingsPath : <code>String</code>
The root settings path. There is a different root settings path for staging and production modes.

**Kind**: static property of [<code>Configuration</code>](#Configuration)  
**Read only**: true  
<a name="Configuration.accountPath"></a>

### Configuration.accountPath : <code>String</code>
Path to the account.json file that contains the Key Id that uniquely identifies and authorises your account
in the absence of a JWT (see RFC 8555 § 6.2. Request Authentication).

**Kind**: static property of [<code>Configuration</code>](#Configuration)  
**Read only**: true  
<a name="Configuration.accountIdentityPath"></a>

### Configuration.accountIdentityPath : <code>String</code>
The path to the account-identity.pem file that contains the private key for the account.

**Kind**: static property of [<code>Configuration</code>](#Configuration)  
**Read only**: true  
<a name="Configuration.certificatePath"></a>

### Configuration.certificatePath : <code>String</code>
The path to the certificate.pem file that contains the certificate chain provisioned from Let’s Encrypt.

**Kind**: static property of [<code>Configuration</code>](#Configuration)  
**Read only**: true  
<a name="Configuration.certificateDirectoryPath"></a>

### Configuration.certificateDirectoryPath : <code>String</code>
The directory the certificate and certificate identity (private key) PEM files are stored in.

**Kind**: static property of [<code>Configuration</code>](#Configuration)  
**Read only**: true  
<a name="Configuration.certificateIdentityPath"></a>

### Configuration.certificateIdentityPath : <code>String</code>
The path to the certificate-identity.pem file that holds the private key for the TLS certificate.

**Kind**: static property of [<code>Configuration</code>](#Configuration)  
**Read only**: true  
<a name="Configuration.initialise"></a>

### Configuration.initialise(settings)
Initialise the configuration. Must be called before accessing settings. May be called more than once.

**Kind**: static method of [<code>Configuration</code>](#Configuration)  

| Param | Type | Description |
| --- | --- | --- |
| settings | <code>Object</code> | Parameter object of settings to initialise the configuration with. |
| settings.domains | <code>Array.&lt;String&gt;</code> | List of domains that Auto Encrypt will manage TLS certificates for. |
| settings.staging | <code>Boolean</code> | Should we use Let’s Encrypt’s staging (true) or production servers (false). |
| settings.settingsPath | <code>String</code> | The root settings paths to use. Uses default path if value is null. |

<a name="autoEncrypt"></a>

## autoEncrypt(parameterObject) ⇒ <code>Object</code>
Automatically manages Let’s Encrypt certificate provisioning and renewal for Node.js
https servers using the HTTP-01 challenge on first hit of an HTTPS route via use of
the Server Name Indication (SNI) callback

**Kind**: global function  
**Returns**: <code>Object</code> - An options object to be passed to the https.createServer() method.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| parameterObject | <code>Object</code> |  |  |
| parameterObject.domains | <code>Array.&lt;String&gt;</code> |  | Domain names to provision TLS certificates for. |
| [parameterObject.options] | <code>Object</code> | <code>{}</code> | Standard https server options. |
| [parameterObject.staging] | <code>Boolean</code> | <code>false</code> | If true, the Let’s Encrypt staging servers will be used. |
| [parameterObject.settingsPath] | <code>String</code> | <code>~/.small-tech.org/auto-encrypt/</code> | Custom path to save certificates and keys to. |

<a name="autoEncrypt.prepareForAppExit"></a>

### autoEncrypt.prepareForAppExit()
Prepare autoEncrypt for app exit. Perform necessary clean-up and remove any
references that might cause the app to not exit.

**Kind**: static method of [<code>autoEncrypt</code>](#autoEncrypt)  

## Like this? Fund us!

[Small Technology Foundation](https://small-tech.org) is a tiny, independent not-for-profit.

We exist in part thanks to patronage by people like you. If you share [our vision](https://small-tech.org/about/#small-technology) and want to support our work, please [become a patron or donate to us](https://small-tech.org/fund-us) today and help us continue to exist.

## Copyright

&copy; 2020 [Aral Balkan](https://ar.al), [Small Technology Foundation](https://small-tech.org).

Let’s Encrypt is a trademark of the Internet Security Research Group (ISRG). All rights reserved. Node.js is a trademark of Joyent, Inc. and is used with its permission. We are not endorsed by or affiliated with Joyent or ISRG.

## License

[AGPL version 3.0 or later.](https://www.gnu.org/licenses/agpl-3.0.en.html)
