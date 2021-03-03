// These are types that are not explicitly defined in JavaScript but used in the AcmeRequest class.

/**
 * @typedef {Object} PreparedRequest
 *
 * @property {ProtectedHeader}                          protectedHeader JSON Web Signature (JWS) Protected Header
 *                                                                      (See RFC 7515 § A.6.1)
 * @property {JWS.FlattenedJWS}                         signedRequest   Flattened JWS
 * @property {bent.RequestFunction<bent.ValidResponse>} httpsRequest    Asynchronous HTTPs request,
 *                                                                      ready to be executed.
 * @property {HttpsHeaders}                             httpsHeaders    Hardcoded HTTPS headers.
*/

/**
 * @typedef ProtectedHeader
 * @property {String}    alg   Hardcoded to 'RS256', currently the only algorithm supported by Let’s Encrypt (LE).
 * @property {String}    nonce {@link Nonce} (a value that’s used only once to thwart replay attacks).
 * @property {String}    url   URL of the command on Let’s Encrypt’s servers.
 * @property {String}    kid   Key ID returned by LE (per RFC 8555 § 6.2, set either this or jwk, not both).
 * @property {JWKRSAKey} jwk   Public JWK (per RFC 8555 § 6.2, set either this or jwk, not both).
 */

/**
 * @typedef {Object} HttpsHeaders
 *
 * @property {String} 'Content-Type'   Hardcoded to 'application/jose+json'
 * @property {String} 'User-Agent'     Hardcoded to 'small-tech.org-acme/1.0.0 node/12.16.0'
 * @property {String} 'Accept-Language Hardcoded to 'en-US'
 */

/**
 * @typedef ResponseObject
 * @property {Object}        headers  Native HTTPS response headers object.
 * @property {Object|String} body The response body as a native object or as a string.
 */

export default {}
