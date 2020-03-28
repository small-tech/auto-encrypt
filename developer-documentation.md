# Developer Documentation

This documentation includes the implementation details of Auto Encrypt and is intended to aid you if you’re trying to improve, debug, or get a deeper understanding of Auto Encrypt.

If you just want to use Auto Encrypt, please see the public API, as documented in the [README](readme.md).

## Like this? Fund us!

[Small Technology Foundation](https://small-tech.org) is a tiny, independent not-for-profit.

We exist in part thanks to patronage by people like you. If you share [our vision](https://small-tech.org/about/#small-technology) and want to support our work, please [become a patron or donate to us](https://small-tech.org/fund-us) today and help us continue to exist.

## Modules

<dl>
<dt><a href="#module_@small-tech/auto-encrypt">@small-tech/auto-encrypt</a></dt>
<dd><p>Automatically provisions and renews Let’s Encrypt™ TLS certificates for
Node.js® https servers (including Express.js, etc.)</p>
<p>Implements the subset of RFC 8555 – Automatic Certificate Management
Environment (ACME) – necessary for a Node.js https server to provision TLS
certificates from Let’s Encrypt using the HTTP-01 challenge on first
hit of an HTTPS route via use of the Server Name Indication (SNI) callback.</p>
</dd>
<dt><a href="#module_lib/AcmeRequest">lib/AcmeRequest</a></dt>
<dd><p>Abstract base request class for carrying out signed ACME requests over HTTPS.</p>
</dd>
<dt><a href="#module_lib/Certificate">lib/Certificate</a></dt>
<dd><p>Represents a Let’s Encrypt TLS certificate.</p>
</dd>
<dt><a href="#module_lib/Configuration">lib/Configuration</a></dt>
<dd><p>Global configuration static class. Use initialise() method to populate.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#PreparedRequest">PreparedRequest</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#ProtectedHeader">ProtectedHeader</a></dt>
<dd></dd>
<dt><a href="#HttpsHeaders">HttpsHeaders</a> : <code>Object</code></dt>
<dd></dd>
<dt><a href="#ResponseObject">ResponseObject</a></dt>
<dd></dd>
</dl>

<a name="module_@small-tech/auto-encrypt"></a>

## @small-tech/auto-encrypt
Automatically provisions and renews Let’s Encrypt™ TLS certificates for
Node.js® https servers (including Express.js, etc.)

Implements the subset of RFC 8555 – Automatic Certificate Management
Environment (ACME) – necessary for a Node.js https server to provision TLS
certificates from Let’s Encrypt using the HTTP-01 challenge on first
hit of an HTTPS route via use of the Server Name Indication (SNI) callback.

**License**: AGPLv3 or later.  
**Copyright**: © 2020 Aral Balkan, Small Technology Foundation.  
<a name="module_@small-tech/auto-encrypt..autoEncrypt"></a>

### @small-tech/auto-encrypt~autoEncrypt(parameterObject) ⇒ <code>Object</code>
Automatically manages Let’s Encrypt certificate provisioning and renewal for Node.js
https servers using the HTTP-01 challenge on first hit of an HTTPS route via use of
the Server Name Indication (SNI) callback

**Kind**: inner method of [<code>@small-tech/auto-encrypt</code>](#module_@small-tech/auto-encrypt)  
**Returns**: <code>Object</code> - An options object to be passed to the https.createServer() method.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| parameterObject | <code>Object</code> |  |  |
| parameterObject.domains | <code>Array.&lt;String&gt;</code> |  | Domain names to provision TLS certificates for. |
| [parameterObject.options] | <code>Object</code> | <code>{}</code> | Standard https server options. |
| [parameterObject.staging] | <code>Boolean</code> | <code>false</code> | If true, the Let’s Encrypt staging servers will be used. |
| [parameterObject.settingsPath] | <code>String</code> | <code>~/.small-tech.org/auto-encrypt/</code> | Custom path to save certificates and keys to. |

<a name="module_lib/AcmeRequest"></a>

## lib/AcmeRequest
Abstract base request class for carrying out signed ACME requests over HTTPS.

**License**: AGPLv3 or later.  
**Copyright**: Copyright © 2020 Aral Balkan, Small Technology Foundation.  

* [lib/AcmeRequest](#module_lib/AcmeRequest)
    * [AcmeRequest](#exp_module_lib/AcmeRequest--AcmeRequest) ⏏
        * [.execute(command, payload, useKid, [successCodes], [url], [parseResponseBodyAsJSON])](#module_lib/AcmeRequest--AcmeRequest+execute) ⇒ <code>types.ResponseObject</code>
        * [._execute(preparedRequest, parseResponseBodyAsJSON)](#module_lib/AcmeRequest--AcmeRequest+_execute) ⇒ <code>types.ResponseObject</code>
        * [.getBuffer(stream)](#module_lib/AcmeRequest--AcmeRequest+getBuffer) ⇒ <code>Buffer</code>
        * [.prepare(command, payload, useKid, [successCodes], [url])](#module_lib/AcmeRequest--AcmeRequest+prepare) ⇒ <code>types.PreparedRequest</code>

<a name="exp_module_lib/AcmeRequest--AcmeRequest"></a>

### AcmeRequest ⏏
Abstract base request class for carrying out signed ACME requests over HTTPS.

**Kind**: Exported class  
<a name="module_lib/AcmeRequest--AcmeRequest+execute"></a>

#### acmeRequest.execute(command, payload, useKid, [successCodes], [url], [parseResponseBodyAsJSON]) ⇒ <code>types.ResponseObject</code>
Executes a remote Let’s Encrypt command and either returns the result or throws.

**Kind**: instance method of [<code>AcmeRequest</code>](#exp_module_lib/AcmeRequest--AcmeRequest)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| command | <code>String</code> |  | Name of Let’s Encrypt command to invoke as used by [Directory](Directory)                                                (sans 'Url' suffix). e.g. 'newAccount', 'newOrder', etc. |
| payload | <code>Object</code> \| <code>String</code> |  | Either an object to use as the payload or, if there is no payload,                                                an empty string. |
| useKid | <code>Boolean</code> | <code>true</code> | Should the request use a Key ID (true) or, a public JWK (false).                                                (See RFC 8555 § 6.2 Request Authentication) |
| [successCodes] | <code>Array.&lt;Number&gt;</code> | <code>[200]</code> | Optional array of codes that signals success. Any other code throws. |
| [url] | <code>String</code> | <code></code> | If specified, will use this URL directly, ignoring the value in                                                the command parameter. |
| [parseResponseBodyAsJSON] | <code>Boolean</code> | <code>true</code> | Should the request body be parsed as JSON (true) or should                                                       the native response object be returned (false). |

<a name="module_lib/AcmeRequest--AcmeRequest+_execute"></a>

#### acmeRequest.\_execute(preparedRequest, parseResponseBodyAsJSON) ⇒ <code>types.ResponseObject</code>
Executes a prepared request.

**Kind**: instance method of [<code>AcmeRequest</code>](#exp_module_lib/AcmeRequest--AcmeRequest)  

| Param | Type | Description |
| --- | --- | --- |
| preparedRequest | <code>types.PreparedRequest</code> | The prepared request, ready to be executed. |
| parseResponseBodyAsJSON | <code>Boolean</code> | Should the request body be parsed as JSON (true) or should                                                        the native response object be returned (false). |

<a name="module_lib/AcmeRequest--AcmeRequest+getBuffer"></a>

#### acmeRequest.getBuffer(stream) ⇒ <code>Buffer</code>
Concatenates the output of a stream and returns a buffer. Taken from the bent module.

**Kind**: instance method of [<code>AcmeRequest</code>](#exp_module_lib/AcmeRequest--AcmeRequest)  
**Returns**: <code>Buffer</code> - The concatenated output of the Node stream.  

| Param | Type | Description |
| --- | --- | --- |
| stream | <code>stream</code> | A Node stream. |

<a name="module_lib/AcmeRequest--AcmeRequest+prepare"></a>

#### acmeRequest.prepare(command, payload, useKid, [successCodes], [url]) ⇒ <code>types.PreparedRequest</code>
Separate the preparation of a request from the execution of it so we can easily test
that different request configurations conform to our expectations.

**Kind**: instance method of [<code>AcmeRequest</code>](#exp_module_lib/AcmeRequest--AcmeRequest)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| command | <code>String</code> |  | Name of Let’s Encrypt command to invoke as used by [Directory](Directory)                                             (sans 'Url' suffix). e.g. 'newAccount', 'newOrder', etc. |
| payload | <code>Object</code> \| <code>String</code> |  | Either an object to use as the payload or, if there is no payload,                                             an empty string. |
| useKid | <code>Boolean</code> |  | Should the request use a Key ID (true) or, a public JWK (false).                                             (See RFC 8555 § 6.2 Request Authentication) |
| [successCodes] | <code>Array.&lt;Number&gt;</code> | <code>[200]</code> | Optional array of codes that signals success. Any other code throws. |
| [url] | <code>String</code> | <code></code> | If specified, will use this URL directly, ignoring the value in                                             the command parameter. |

<a name="module_lib/Certificate"></a>

## lib/Certificate
Represents a Let’s Encrypt TLS certificate.

**License**: AGPLv3 or later.  
**Copyright**: Copyright © 2020 Aral Balkan, Small Technology Foundation.  

* [lib/Certificate](#module_lib/Certificate)
    * [Certificate](#exp_module_lib/Certificate--Certificate) ⏏
        * [new Certificate(domains)](#new_module_lib/Certificate--Certificate_new)
        * _async_
            * [.getSecureContext()](#module_lib/Certificate--Certificate+getSecureContext) ⇒ <code>Promise.&lt;tls.SecureContext&gt;</code>
            * [.createSecureContext(renewCertificate)](#module_lib/Certificate--Certificate+createSecureContext) ⇒ <code>Promise</code> ℗
            * [.provisionCertificate()](#module_lib/Certificate--Certificate+provisionCertificate) ⇒ <code>Promise</code> ℗
            * [.renewCertificate()](#module_lib/Certificate--Certificate+renewCertificate) ⇒ <code>Promise</code> ℗
            * [.checkForRenewal()](#module_lib/Certificate--Certificate+checkForRenewal) ⇒ <code>Promise</code> ℗
        * _sync_
            * [.init(domains)](#module_lib/Certificate--Certificate+init) ℗
            * [.startCheckingForRenewal([alsoCheckNow])](#module_lib/Certificate--Certificate+startCheckingForRenewal) ℗
            * [.stopCheckingForRenewal()](#module_lib/Certificate--Certificate+stopCheckingForRenewal) ℗

<a name="exp_module_lib/Certificate--Certificate"></a>

### Certificate ⏏
Represents a Let’s Encrypt TLS certificate.

**Kind**: Exported class  
<a name="new_module_lib/Certificate--Certificate_new"></a>

#### new Certificate(domains)

| Param | Type | Description |
| --- | --- | --- |
| domains | <code>Array.&lt;String&gt;</code> | List of domains this certificate covers. |

<a name="module_lib/Certificate--Certificate+getSecureContext"></a>

#### certificate.getSecureContext() ⇒ <code>Promise.&lt;tls.SecureContext&gt;</code>
Get a SecureContext that can be used in an SNICallback.

**Kind**: instance method of [<code>Certificate</code>](#exp_module_lib/Certificate--Certificate)  
**Returns**: <code>Promise.&lt;tls.SecureContext&gt;</code> - A promise for a SecureContext that can be used in creating https servers.  
**Category**: async  
<a name="module_lib/Certificate--Certificate+createSecureContext"></a>

#### certificate.createSecureContext(renewCertificate) ⇒ <code>Promise</code> ℗
Creates and caches a secure context, provisioning a TLS certificate in the process, if necessary.

**Kind**: instance method of [<code>Certificate</code>](#exp_module_lib/Certificate--Certificate)  
**Returns**: <code>Promise</code> - Fulfils immediately if certificate exists and does not need to be
                                  renewed. Otherwise, fulfils when certificate has been provisioned.  
**Category**: async  
**Access**: private  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| renewCertificate | <code>Boolean</code> | <code>false</code> | If true, will start the process of renewing the certificate                                   (but will continue to return the existing certificate until it is ready). |

<a name="module_lib/Certificate--Certificate+provisionCertificate"></a>

#### certificate.provisionCertificate() ⇒ <code>Promise</code> ℗
Provisions a new Let’s Encrypt TLS certificate, persists it, and starts checking for
renewals on it every day, starting with the next day.

**Kind**: instance method of [<code>Certificate</code>](#exp_module_lib/Certificate--Certificate)  
**Returns**: <code>Promise</code> - Fulfils once a certificate has been provisioned.  
**Category**: async  
**Access**: private  
<a name="module_lib/Certificate--Certificate+renewCertificate"></a>

#### certificate.renewCertificate() ⇒ <code>Promise</code> ℗
Starts the certificate renewal process by requesting the creation of a fresh secure context.

**Kind**: instance method of [<code>Certificate</code>](#exp_module_lib/Certificate--Certificate)  
**Returns**: <code>Promise</code> - Resolves once certificate is renewed and new secure context is
                              created and cached.  
**Category**: async  
**Access**: private  
<a name="module_lib/Certificate--Certificate+checkForRenewal"></a>

#### certificate.checkForRenewal() ⇒ <code>Promise</code> ℗
Checks if the certificate needs to be renewed (if it is within 30 days of its expiry date) and, if so,
renews it. While the method is async, the result is not awaited on usage. Instead, it is a fire-and-forget
method that’s called via a daily interval.

**Kind**: instance method of [<code>Certificate</code>](#exp_module_lib/Certificate--Certificate)  
**Returns**: <code>Promise</code> - Fulfils immediately if certificate doesn’t need renewal. Otherwise, fulfils once certificate
                   has been renewed.  
**Category**: async  
**Access**: private  
<a name="module_lib/Certificate--Certificate+init"></a>

#### certificate.init(domains) ℗
Implement initialisation details (called by the constructor).

**Kind**: instance method of [<code>Certificate</code>](#exp_module_lib/Certificate--Certificate)  
**Category**: sync  
**Access**: private  

| Param | Type | Description |
| --- | --- | --- |
| domains | <code>Array.&lt;String&gt;</code> | List of domains this certificate covers. |

<a name="module_lib/Certificate--Certificate+startCheckingForRenewal"></a>

#### certificate.startCheckingForRenewal([alsoCheckNow]) ℗
Starts checking for certificate renewals every 24 hours.

**Kind**: instance method of [<code>Certificate</code>](#exp_module_lib/Certificate--Certificate)  
**Category**: sync  
**Access**: private  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [alsoCheckNow] | <code>boolean</code> | <code>false</code> | If true, will also immediately check for renewal when the function is                                       called (use this when loading a previously-provisioned and persisted                                       certificate from disk). |

<a name="module_lib/Certificate--Certificate+stopCheckingForRenewal"></a>

#### certificate.stopCheckingForRenewal() ℗
Stops the timer that checks for renewal daily. Use this during housekeeping before destroying this object.

**Kind**: instance method of [<code>Certificate</code>](#exp_module_lib/Certificate--Certificate)  
**Category**: sync  
**Access**: private  
<a name="module_lib/Configuration"></a>

## lib/Configuration
Global configuration static class. Use initialise() method to populate.

**License**: AGPLv3 or later.  
**Copyright**: © 2020 Aral Balkan, Small Technology Foundation.  

* [lib/Configuration](#module_lib/Configuration)
    * [Configuration](#exp_module_lib/Configuration--Configuration) ⏏
        * [new Configuration()](#new_module_lib/Configuration--Configuration_new)
        * [.domains](#module_lib/Configuration--Configuration.domains) : <code>Array.&lt;String&gt;</code>
        * [.settingsPath](#module_lib/Configuration--Configuration.settingsPath) : <code>String</code>
        * [.accountPath](#module_lib/Configuration--Configuration.accountPath) : <code>String</code>
        * [.accountIdentityPath](#module_lib/Configuration--Configuration.accountIdentityPath) : <code>String</code>
        * [.certificatePath](#module_lib/Configuration--Configuration.certificatePath) : <code>String</code>
        * [.certificateDirectoryPath](#module_lib/Configuration--Configuration.certificateDirectoryPath) : <code>String</code>
        * [.certificateIdentityPath](#module_lib/Configuration--Configuration.certificateIdentityPath) : <code>String</code>
        * _initialiser_
            * [.initialise(settings)](#module_lib/Configuration--Configuration.initialise)

<a name="exp_module_lib/Configuration--Configuration"></a>

### Configuration ⏏
**Kind**: Exported class  
**Access**: private  
<a name="new_module_lib/Configuration--Configuration_new"></a>

#### new Configuration()
Do not use. Configuration is a static class.

<a name="module_lib/Configuration--Configuration.domains"></a>

#### Configuration.domains : <code>Array.&lt;String&gt;</code>
The list of domains supported by the current certificate.

**Kind**: static property of [<code>Configuration</code>](#exp_module_lib/Configuration--Configuration)  
**Read only**: true  
<a name="module_lib/Configuration--Configuration.settingsPath"></a>

#### Configuration.settingsPath : <code>String</code>
The root settings path. There is a different root settings path for staging and production modes.

**Kind**: static property of [<code>Configuration</code>](#exp_module_lib/Configuration--Configuration)  
**Read only**: true  
<a name="module_lib/Configuration--Configuration.accountPath"></a>

#### Configuration.accountPath : <code>String</code>
Path to the account.json file that contains the Key Id that uniquely identifies and authorises your account
in the absence of a JWT (see RFC 8555 § 6.2. Request Authentication).

**Kind**: static property of [<code>Configuration</code>](#exp_module_lib/Configuration--Configuration)  
**Read only**: true  
<a name="module_lib/Configuration--Configuration.accountIdentityPath"></a>

#### Configuration.accountIdentityPath : <code>String</code>
The path to the account-identity.pem file that contains the private key for the account.

**Kind**: static property of [<code>Configuration</code>](#exp_module_lib/Configuration--Configuration)  
**Read only**: true  
<a name="module_lib/Configuration--Configuration.certificatePath"></a>

#### Configuration.certificatePath : <code>String</code>
The path to the certificate.pem file that contains the certificate chain provisioned from Let’s Encrypt.

**Kind**: static property of [<code>Configuration</code>](#exp_module_lib/Configuration--Configuration)  
**Read only**: true  
<a name="module_lib/Configuration--Configuration.certificateDirectoryPath"></a>

#### Configuration.certificateDirectoryPath : <code>String</code>
The directory the certificate and certificate identity (private key) PEM files are stored in.

**Kind**: static property of [<code>Configuration</code>](#exp_module_lib/Configuration--Configuration)  
**Read only**: true  
<a name="module_lib/Configuration--Configuration.certificateIdentityPath"></a>

#### Configuration.certificateIdentityPath : <code>String</code>
The path to the certificate-identity.pem file that holds the private key for the TLS certificate.

**Kind**: static property of [<code>Configuration</code>](#exp_module_lib/Configuration--Configuration)  
**Read only**: true  
<a name="module_lib/Configuration--Configuration.initialise"></a>

#### Configuration.initialise(settings)
Initialise the configuration. Must be called before accessing settings. May be called more than once.

**Kind**: static method of [<code>Configuration</code>](#exp_module_lib/Configuration--Configuration)  
**Category**: initialiser  

| Param | Type | Description |
| --- | --- | --- |
| settings | <code>Object</code> | Parameter object of settings to initialise the configuration with. |
| settings.domains | <code>Array.&lt;String&gt;</code> | List of domains that Auto Encrypt will manage TLS certificates for. |
| settings.staging | <code>Boolean</code> | Should we use Let’s Encrypt’s staging (true) or production servers (false). |
| settings.settingsPath | <code>String</code> | The root settings paths to use. Uses default path if value is null. |

<a name="PreparedRequest"></a>

## PreparedRequest : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| protectedHeader | [<code>ProtectedHeader</code>](#ProtectedHeader) | JSON Web Signature (JWS) Protected Header                                                                      (See RFC 7515 § A.6.1) |
| signedRequest | <code>JWS.FlattenedJWS</code> | Flattened JWS |
| httpsRequest | <code>bent.RequestFunction.&lt;bent.ValidResponse&gt;</code> | Asynchronous HTTPs request,                                                                      ready to be executed. |
| httpsHeaders | [<code>HttpsHeaders</code>](#HttpsHeaders) | Hardcoded HTTPS headers. |

<a name="ProtectedHeader"></a>

## ProtectedHeader
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| alg | <code>String</code> | Hardcoded to 'RS256', currently the only algorithm supported by Let’s Encrypt (LE). |
| nonce | <code>String</code> | [Nonce](Nonce) (a value that’s used only once to thwart replay attacks). |
| url | <code>String</code> | URL of the command on Let’s Encrypt’s servers. |
| kid | <code>String</code> | Key ID returned by LE (per RFC 8555 § 6.2, set either this or jwk, not both). |
| jwk | <code>JWKRSAKey</code> | Public JWK (per RFC 8555 § 6.2, set either this or jwk, not both). |

<a name="HttpsHeaders"></a>

## HttpsHeaders : <code>Object</code>
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| 'Content-Type' | <code>String</code> | Hardcoded to 'application/jose+json' |
| 'User-Agent' | <code>String</code> | Hardcoded to 'small-tech.org-acme/1.0.0 node/12.16.0' |
| 'Accept-Language | <code>String</code> | Hardcoded to 'en-US' |

<a name="ResponseObject"></a>

## ResponseObject
**Kind**: global typedef  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| headers | <code>Object</code> | Native HTTPS response headers object. |
| body | <code>Object</code> \| <code>String</code> | The response body as a native object or as a string. |


## Like this? Fund us!

[Small Technology Foundation](https://small-tech.org) is a tiny, independent not-for-profit.

We exist in part thanks to patronage by people like you. If you share [our vision](https://small-tech.org/about/#small-technology) and want to support our work, please [become a patron or donate to us](https://small-tech.org/fund-us) today and help us continue to exist.

## Copyright

&copy; 2020 [Aral Balkan](https://ar.al), [Small Technology Foundation](https://small-tech.org).

Let’s Encrypt is a trademark of the Internet Security Research Group (ISRG). All rights reserved. Node.js is a trademark of Joyent, Inc. and is used with its permission. We are not endorsed by or affiliated with Joyent or ISRG.

## License

[AGPL version 3.0 or later.](https://www.gnu.org/licenses/agpl-3.0.en.html)