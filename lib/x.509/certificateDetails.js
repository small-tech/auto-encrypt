
const x509 = require('./rfc5280')

module.exports = function (certificatePEM) {
  const certificate = (x509.Certificate.decode(certificatePEM, 'pem', {label: 'CERTIFICATE'})).tbsCertificate

  const issuer = certificate.issuer.value[0][0].value.toString('utf-8').trim()
  const issuedAt = new Date(certificate.validity.notBefore.value)
  const expiresAt = new Date(certificate.validity.notAfter.value)

  console.log(`Issuer           : `, issuer)
  console.log('Issued at        : ', new Date(issuedAt))
  console.log('Expires at       : ', new Date(expiresAt))

  const subject = certificate.subject.value[0][0].value.toString('utf-8').slice(2).trim()
  console.log('Subject          : ', subject)

  const alternativeNames = ((certificate.extensions.filter(extension => {
    return extension.extnID === 'subjectAlternativeName'
  }))[0].extnValue).map(name => name.value)

  console.log('Alternative names: ', alternativeNames)

  return {
    issuer,
    subject,
    alternativeNames,
    issuedAt,
    expiresAt
  }
}
