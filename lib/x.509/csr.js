const forge = require('node-forge')

const DNS = 2 // The ANS.1 type for DNS name.

/**
 * Create a CSR given a list of domains and a Jose JWK.rsaKey.
 *
 * @param {String[]}   domains
 * @param {JWK.rsaKey} key
 * @returns String a CSR in PEM format.
 */
module.exports = function (domains, key) {

  var csr = forge.pki.createCertificationRequest()

  const keys = {
    public: forge.pki.publicKeyFromPem(key.toPEM(/* private = */ false)),
    private: forge.pki.privateKeyFromPem(key.toPEM(/* private = */ true))
  }

  csr.publicKey = keys.public

  const altNames = domains.map(domain => {
    return {type: DNS, value: domain}
  })

  // According to RFC 8555, we *either* need to specify the subject or the subjectAltName so skip the subject.
  csr.setAttributes([{
    name: 'extensionRequest',
    extensions: [{
      name: 'subjectAltName',
      altNames
    }]
  }])

  csr.sign(keys.private)

  const csrAsPem = forge.pki.certificationRequestToPem(csr)
  return csrAsPem
}
