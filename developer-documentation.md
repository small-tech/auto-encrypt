# Developer Documentation

This documentation includes the implementation details of Auto Encrypt and is intended to aid you if you’re trying to improve, debug, or get a deeper understanding of Auto Encrypt.

If you just want to use Auto Encrypt, please see the public API, as documented in the [README](readme.md).

## Like this? Fund us!

[Small Technology Foundation](https://small-tech.org) is a tiny, independent not-for-profit.

We exist in part thanks to patronage by people like you. If you share [our vision](https://small-tech.org/about/#small-technology) and want to support our work, please [become a patron or donate to us](https://small-tech.org/fund-us) today and help us continue to exist.

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
    * [new Certificate(domains)](#new_Certificate_new)
    * _async_
        * [.getSecureContext()](#Certificate+getSecureContext) ⇒ <code>Promise</code>
        * [.createSecureContext(renewCertificate)](#Certificate+createSecureContext) ⇒ <code>Promise</code> ℗
        * [.provisionCertificate()](#Certificate+provisionCertificate) ⇒ <code>Promise</code> ℗
        * [.renewCertificate()](#Certificate+renewCertificate) ⇒ <code>Promise</code> ℗
        * [.checkForRenewal()](#Certificate+checkForRenewal) ⇒ <code>Promise</code> ℗
    * _sync_
        * [.init(domains)](#Certificate+init) ℗
        * [.startCheckingForRenewal([alsoCheckNow])](#Certificate+startCheckingForRenewal) ℗
        * [.stopCheckingForRenewal()](#Certificate+stopCheckingForRenewal) ℗

<a name="new_Certificate_new"></a>

### new Certificate(domains)
Represents a Let’s Encrypt TLS certificate.


| Param | Type | Description |
| --- | --- | --- |
| domains | <code>Array.&lt;String&gt;</code> | List of domains this certificate covers. |

<a name="Certificate+getSecureContext"></a>

### certificate.getSecureContext() ⇒ <code>Promise</code>
Get a SecureContext that can be used in an SNICallback.

**Kind**: instance method of [<code>Certificate</code>](#Certificate)  
**Category**: async  
**Fulfil**: <code>tls.SecureContext</code>  
<a name="Certificate+createSecureContext"></a>

### certificate.createSecureContext(renewCertificate) ⇒ <code>Promise</code> ℗
Creates and caches a secure context, provisioning a TLS certificate in the process, if necessary.

**Kind**: instance method of [<code>Certificate</code>](#Certificate)  
**Category**: async  
**Access**: private  
**Fulfil**: <code>(no value)</code> Fulfils immediately if certificate exists and does not need to be renewed; otherwise fulfils when certificate has been provisioned.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| renewCertificate | <code>Boolean</code> | <code>false</code> | If true, will start the process of renewing the certificate                                   (but will continue to return the existing certificate until it is ready). |

<a name="Certificate+provisionCertificate"></a>

### certificate.provisionCertificate() ⇒ <code>Promise</code> ℗
Provisions a new Let’s Encrypt TLS certificate, persists it, and starts checking for
renewals on it every day, starting with the next day.

**Kind**: instance method of [<code>Certificate</code>](#Certificate)  
**Category**: async  
**Access**: private  
**Fulfil**: <code>(no value)</code> Fulfils once a certificate has been provisioned.  
<a name="Certificate+renewCertificate"></a>

### certificate.renewCertificate() ⇒ <code>Promise</code> ℗
Starts the certificate renewal process by requesting the creation of a fresh secure context.

**Kind**: instance method of [<code>Certificate</code>](#Certificate)  
**Category**: async  
**Access**: private  
**Fulfil**: <code>(no value)</code> Resolves once certificate is renewed and new secure context created and cached.  
<a name="Certificate+checkForRenewal"></a>

### certificate.checkForRenewal() ⇒ <code>Promise</code> ℗
Checks if the certificate needs to be renewed (if it is within 30 days of its expiry date) and, if so, renews it. While the method is async, the result is not awaited on usage. Instead, it is a fire-and-forget method that’s called via a daily interval.

**Kind**: instance method of [<code>Certificate</code>](#Certificate)  
**Category**: async  
**Access**: private  
**Fulfil**: <code>(no value)</code> Either immediately if certificate doesn’t need renewal or once certificate has been renewed.  
<a name="Certificate+init"></a>

### certificate.init(domains) ℗
Implement initialisation details (called by the constructor).

**Kind**: instance method of [<code>Certificate</code>](#Certificate)  
**Category**: sync  
**Access**: private  

| Param | Type |
| --- | --- |
| domains | <code>Array.&lt;String&gt;</code> | 

<a name="Certificate+startCheckingForRenewal"></a>

### certificate.startCheckingForRenewal([alsoCheckNow]) ℗
Starts checking for certificate renewals every 24 hours.

**Kind**: instance method of [<code>Certificate</code>](#Certificate)  
**Category**: sync  
**Access**: private  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [alsoCheckNow] | <code>boolean</code> | <code>false</code> | If true, will also immediately check for renewal when the function is                                       called (use this when loading a previously-provisioned and persisted                                       certificate from disk). |

<a name="Certificate+stopCheckingForRenewal"></a>

### certificate.stopCheckingForRenewal() ℗
Stops the timer that checks for renewal daily. Use this during housekeeping before destroying this object.

**Kind**: instance method of [<code>Certificate</code>](#Certificate)  
**Category**: sync  
**Access**: private  
<a name="Configuration"></a>

## Configuration
**Kind**: global class  

* [Configuration](#Configuration)
    * [.Configuration](#Configuration.Configuration) ℗
        * [new Configuration()](#new_Configuration.Configuration_new)
    * [.domains](#Configuration.domains) : <code>Array.&lt;String&gt;</code>
    * [.settingsPath](#Configuration.settingsPath) : <code>String</code>
    * [.accountPath](#Configuration.accountPath) : <code>String</code>
    * [.accountIdentityPath](#Configuration.accountIdentityPath) : <code>String</code>
    * [.certificatePath](#Configuration.certificatePath) : <code>String</code>
    * [.certificateDirectoryPath](#Configuration.certificateDirectoryPath) : <code>String</code>
    * [.certificateIdentityPath](#Configuration.certificateIdentityPath) : <code>String</code>
    * [.initialise(settings)](#Configuration.initialise)

<a name="Configuration.Configuration"></a>

### Configuration.Configuration ℗
**Kind**: static class of [<code>Configuration</code>](#Configuration)  
**Access**: private  
<a name="new_Configuration.Configuration_new"></a>

#### new Configuration()
Do not use. Configuration is a static class.

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
