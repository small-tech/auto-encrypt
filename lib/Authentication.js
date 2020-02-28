// All ACME requests with a non-empty body MUST encapsulate their
// payload in a JSON Web Signature (JWS) [RFC7515] object, signed using
// the account's private key unless otherwise specified. The server
// MUST verify the JWS before processing the request. Encapsulating
// request bodies in JWS provides authentication of requests. – RFC 8555 § 6.2.
//
class Authentication {
  constructor () {

  }
}