// Require @panva’s fork of ASN1 that’s already included as part of the Jose library.
// https://github.com/panva/asn1.js/
import asn1 from '@panva/asn1.js';

/**
 * RFC5280 X509 and Extension Definitions
 * From: https://github.com/indutny/asn1.js
 *
 * (Including this directly as the Jose library we use in Auto Encrypt
 * already includes a fork of ASN1.js but with this RFC implementation
 * stripped. There’s no reason to include the whole library again.)
 */

// OIDs
const x509OIDs = {
  '2 5 29 9': 'subjectDirectoryAttributes',
  '2 5 29 14': 'subjectKeyIdentifier',
  '2 5 29 15': 'keyUsage',
  '2 5 29 17': 'subjectAlternativeName',
  '2 5 29 18': 'issuerAlternativeName',
  '2 5 29 19': 'basicConstraints',
  '2 5 29 20': 'cRLNumber',
  '2 5 29 21': 'reasonCode',
  '2 5 29 24': 'invalidityDate',
  '2 5 29 27': 'deltaCRLIndicator',
  '2 5 29 28': 'issuingDistributionPoint',
  '2 5 29 29': 'certificateIssuer',
  '2 5 29 30': 'nameConstraints',
  '2 5 29 31': 'cRLDistributionPoints',
  '2 5 29 32': 'certificatePolicies',
  '2 5 29 33': 'policyMappings',
  '2 5 29 35': 'authorityKeyIdentifier',
  '2 5 29 36': 'policyConstraints',
  '2 5 29 37': 'extendedKeyUsage',
  '2 5 29 46': 'freshestCRL',
  '2 5 29 54': 'inhibitAnyPolicy',
  '1 3 6 1 5 5 7 1 1': 'authorityInformationAccess',
  '1 3 6 1 5 5 7 11': 'subjectInformationAccess'
};

// CertificateList  ::=  SEQUENCE  {
//      tbsCertList          TBSCertList,
//      signatureAlgorithm   AlgorithmIdentifier,
//      signature            BIT STRING  }
export const CertificateList = asn1.define('CertificateList', function() {
  this.seq().obj(
    this.key('tbsCertList').use(TBSCertList),
    this.key('signatureAlgorithm').use(AlgorithmIdentifier),
    this.key('signature').bitstr()
  );
});

// AlgorithmIdentifier  ::=  SEQUENCE  {
//      algorithm               OBJECT IDENTIFIER,
//      parameters              ANY DEFINED BY algorithm OPTIONAL  }
export const AlgorithmIdentifier = asn1.define('AlgorithmIdentifier', function() {
  this.seq().obj(
    this.key('algorithm').objid(),
    this.key('parameters').optional().any()
  );
});

// Certificate  ::=  SEQUENCE  {
//      tbsCertificate       TBSCertificate,
//      signatureAlgorithm   AlgorithmIdentifier,
//      signature            BIT STRING  }
export const Certificate = asn1.define('Certificate', function() {
  this.seq().obj(
    this.key('tbsCertificate').use(TBSCertificate),
    this.key('signatureAlgorithm').use(AlgorithmIdentifier),
    this.key('signature').bitstr()
  );
});

// TBSCertificate  ::=  SEQUENCE  {
//      version         [0]  Version DEFAULT v1,
//      serialNumber         CertificateSerialNumber,
//      signature            AlgorithmIdentifier,
//      issuer               Name,
//      validity             Validity,
//      subject              Name,
//      subjectPublicKeyInfo SubjectPublicKeyInfo,
//      issuerUniqueID  [1]  IMPLICIT UniqueIdentifier OPTIONAL,
//      subjectUniqueID [2]  IMPLICIT UniqueIdentifier OPTIONAL,
//      extensions      [3]  Extensions OPTIONAL
export const TBSCertificate = asn1.define('TBSCertificate', function() {
  this.seq().obj(
    this.key('version').def('v1').explicit(0).use(Version),
    this.key('serialNumber').int(),
    this.key('signature').use(AlgorithmIdentifier),
    this.key('issuer').use(Name),
    this.key('validity').use(Validity),
    this.key('subject').use(Name),
    this.key('subjectPublicKeyInfo').use(SubjectPublicKeyInfo),
    this.key('issuerUniqueID').optional().implicit(1).bitstr(),
    this.key('subjectUniqueID').optional().implicit(2).bitstr(),
    this.key('extensions').optional().explicit(3).seqof(Extension)
  );
});

// Version  ::=  INTEGER  {  v1(0), v2(1), v3(2)  }
export const Version = asn1.define('Version', function() {
  this.int({
    0: 'v1',
    1: 'v2',
    2: 'v3'
  });
});

// Validity ::= SEQUENCE {
//      notBefore      Time,
//      notAfter       Time  }
export const Validity = asn1.define('Validity', function() {
  this.seq().obj(
    this.key('notBefore').use(Time),
    this.key('notAfter').use(Time)
  );
});

// Time ::= CHOICE {
//      utcTime        UTCTime,
//      generalTime    GeneralizedTime }
export const Time = asn1.define('Time', function() {
  this.choice({
    utcTime: this.utctime(),
    genTime: this.gentime()
  });
});

// SubjectPublicKeyInfo  ::=  SEQUENCE  {
//      algorithm            AlgorithmIdentifier,
//      subjectPublicKey     BIT STRING  }
export const SubjectPublicKeyInfo = asn1.define('SubjectPublicKeyInfo', function() {
  this.seq().obj(
    this.key('algorithm').use(AlgorithmIdentifier),
    this.key('subjectPublicKey').bitstr()
  );
});

// TBSCertList  ::=  SEQUENCE  {
//      version                 Version OPTIONAL,
//      signature               AlgorithmIdentifier,
//      issuer                  Name,
//      thisUpdate              Time,
//      nextUpdate              Time OPTIONAL,
//      revokedCertificates     SEQUENCE OF SEQUENCE  {
//           userCertificate         CertificateSerialNumber,
//           revocationDate          Time,
//           crlEntryExtensions      Extensions OPTIONAL
//      }  OPTIONAL,
//      crlExtensions           [0] Extensions OPTIONAL }
export const TBSCertList = asn1.define('TBSCertList', function() {
  this.seq().obj(
    this.key('version').optional().int(),
    this.key('signature').use(AlgorithmIdentifier),
    this.key('issuer').use(Name),
    this.key('thisUpdate').use(Time),
    this.key('nextUpdate').use(Time),
    this.key('revokedCertificates').optional().seqof(RevokedCertificate),
    this.key('crlExtensions').explicit(0).optional().seqof(Extension)
  );
});

const RevokedCertificate = asn1.define('RevokedCertificate', function() {
  this.seq().obj(
    this.key('userCertificate').use(CertificateSerialNumber),
    this.key('revocationDate').use(Time),
    this.key('crlEntryExtensions').optional().seqof(Extension)
  );
});

// Extension  ::=  SEQUENCE  {
//      extnID      OBJECT IDENTIFIER,
//      critical    BOOLEAN DEFAULT FALSE,
//      extnValue   OCTET STRING }
export const Extension = asn1.define('Extension', function() {
  this.seq().obj(
    this.key('extnID').objid(x509OIDs),
    this.key('critical').bool().def(false),
    this.key('extnValue').octstr().contains(function(obj) {
      const out = x509Extensions[obj.extnID];
      // Cope with unknown extensions
      return out ? out : asn1.define('OctString', function() { this.any(); });
    })
  );
});

// Name ::= CHOICE { -- only one possibility for now --
//      rdnSequence  RDNSequence }
export const Name = asn1.define('Name', function() {
  this.choice({
    rdnSequence: this.use(RDNSequence)
  });
});

// GeneralName ::= CHOICE {
//      otherName                 [0]  AnotherName,
//      rfc822Name                [1]  IA5String,
//      dNSName                   [2]  IA5String,
//      x400Address               [3]  ORAddress,
//      directoryName             [4]  Name,
//      ediPartyName              [5]  EDIPartyName,
//      uniformResourceIdentifier [6]  IA5String,
//      iPAddress                 [7]  OCTET STRING,
//      registeredID              [8]  OBJECT IDENTIFIER }
export const GeneralName = asn1.define('GeneralName', function() {
  this.choice({
    otherName: this.implicit(0).use(AnotherName),
    rfc822Name: this.implicit(1).ia5str(),
    dNSName: this.implicit(2).ia5str(),
    directoryName: this.explicit(4).use(Name),
    ediPartyName: this.implicit(5).use(EDIPartyName),
    uniformResourceIdentifier: this.implicit(6).ia5str(),
    iPAddress: this.implicit(7).octstr(),
    registeredID: this.implicit(8).objid()
  });
});

// GeneralNames ::= SEQUENCE SIZE (1..MAX) OF GeneralName
export const GeneralNames = asn1.define('GeneralNames', function() {
  this.seqof(GeneralName);
});

// AnotherName ::= SEQUENCE {
//      type-id    OBJECT IDENTIFIER,
//      value      [0] EXPLICIT ANY DEFINED BY type-id }
export const AnotherName = asn1.define('AnotherName', function() {
  this.seq().obj(
    this.key('type-id').objid(),
    this.key('value').explicit(0).any()
  );
});

// EDIPartyName ::= SEQUENCE {
//      nameAssigner              [0]  DirectoryString OPTIONAL,
//      partyName                 [1]  DirectoryString }
export const EDIPartyName = asn1.define('EDIPartyName', function() {
  this.seq().obj(
    this.key('nameAssigner').implicit(0).optional().use(DirectoryString),
    this.key('partyName').implicit(1).use(DirectoryString)
  );
});

// RDNSequence ::= SEQUENCE OF RelativeDistinguishedName
export const RDNSequence = asn1.define('RDNSequence', function() {
  this.seqof(RelativeDistinguishedName);
});

// RelativeDistinguishedName ::=
//      SET SIZE (1..MAX) OF AttributeTypeAndValue
export const RelativeDistinguishedName = asn1.define('RelativeDistinguishedName',
  function() {
    this.setof(AttributeTypeAndValue);
  });

// AttributeTypeAndValue ::= SEQUENCE {
//      type     AttributeType,
//      value    AttributeValue }
export const AttributeTypeAndValue = asn1.define('AttributeTypeAndValue', function() {
  this.seq().obj(
    this.key('type').use(AttributeType),
    this.key('value').use(AttributeValue)
  );
});

// Attribute               ::= SEQUENCE {
//       type             AttributeType,
//       values    SET OF AttributeValue }
export const Attribute = asn1.define('Attribute', function() {
  this.seq().obj(
    this.key('type').use(AttributeType),
    this.key('values').setof(AttributeValue)
  );
});

// AttributeType ::= OBJECT IDENTIFIER
export const AttributeType = asn1.define('AttributeType', function() {
  this.objid();
});

// AttributeValue ::= ANY -- DEFINED BY AttributeType
export const AttributeValue = asn1.define('AttributeValue', function() {
  this.any();
});

// DirectoryString ::= CHOICE {
//       teletexString           TeletexString (SIZE (1..MAX)),
//       printableString         PrintableString (SIZE (1..MAX)),
//       universalString         UniversalString (SIZE (1..MAX)),
//       utf8String              UTF8String (SIZE (1..MAX)),
//       bmpString               BMPString (SIZE (1..MAX)) }
export const DirectoryString = asn1.define('DirectoryString', function() {
  this.choice({
    teletexString: this.t61str(),
    printableString: this.printstr(),
    universalString: this.unistr(),
    utf8String: this.utf8str(),
    bmpString: this.bmpstr()
  });
});

// AuthorityKeyIdentifier ::= SEQUENCE {
//     keyIdentifier             [0] KeyIdentifier            OPTIONAL,
//     authorityCertIssuer       [1] GeneralNames             OPTIONAL,
//     authorityCertSerialNumber [2] CertificateSerialNumber  OPTIONAL }
export const AuthorityKeyIdentifier = asn1.define('AuthorityKeyIdentifier', function() {
  this.seq().obj(
    this.key('keyIdentifier').implicit(0).optional().use(KeyIdentifier),
    this.key('authorityCertIssuer').implicit(1).optional().use(GeneralNames),
    this.key('authorityCertSerialNumber').implicit(2).optional()
      .use(CertificateSerialNumber)
  );
});

// KeyIdentifier ::= OCTET STRING
export const KeyIdentifier = asn1.define('KeyIdentifier', function() {
  this.octstr();
});

// CertificateSerialNumber  ::=  INTEGER
export const CertificateSerialNumber = asn1.define('CertificateSerialNumber',
  function() {
    this.int();
  });

// ORAddress ::= SEQUENCE {
//    built-in-standard-attributes BuiltInStandardAttributes,
//    built-in-domain-defined-attributes    BuiltInDomainDefinedAttributes
//                                            OPTIONAL,
//    extension-attributes ExtensionAttributes OPTIONAL }
export const ORAddress = asn1.define('ORAddress', function() {
  this.seq().obj(
    this.key('builtInStandardAttributes').use(BuiltInStandardAttributes),
    this.key('builtInDomainDefinedAttributes').optional()
      .use(BuiltInDomainDefinedAttributes),
    this.key('extensionAttributes').optional().use(ExtensionAttributes)
  );
});

// BuiltInStandardAttributes ::= SEQUENCE {
//    country-name                  CountryName OPTIONAL,
//    administration-domain-name    AdministrationDomainName OPTIONAL,
//    network-address           [0] IMPLICIT NetworkAddress OPTIONAL,
//    terminal-identifier       [1] IMPLICIT TerminalIdentifier OPTIONAL,
//    private-domain-name       [2] PrivateDomainName OPTIONAL,
//    organization-name         [3] IMPLICIT OrganizationName OPTIONAL,
//    numeric-user-identifier   [4] IMPLICIT NumericUserIdentifier OPTIONAL,
//    personal-name             [5] IMPLICIT PersonalName OPTIONAL,
//    organizational-unit-names [6] IMPLICIT OrganizationalUnitNames OPTIONAL }
export const BuiltInStandardAttributes = asn1.define('BuiltInStandardAttributes',
  function() {
    this.seq().obj(
      this.key('countryName').optional().use(CountryName),
      this.key('administrationDomainName').optional()
        .use(AdministrationDomainName),
      this.key('networkAddress').implicit(0).optional().use(NetworkAddress),
      this.key('terminalIdentifier').implicit(1).optional()
        .use(TerminalIdentifier),
      this.key('privateDomainName').explicit(2).optional().use(PrivateDomainName),
      this.key('organizationName').implicit(3).optional().use(OrganizationName),
      this.key('numericUserIdentifier').implicit(4).optional()
        .use(NumericUserIdentifier),
      this.key('personalName').implicit(5).optional().use(PersonalName),
      this.key('organizationalUnitNames').implicit(6).optional()
        .use(OrganizationalUnitNames)
    );
  });

// CountryName ::= CHOICE {
//    x121-dcc-code         NumericString,
//    iso-3166-alpha2-code  PrintableString }
export const CountryName = asn1.define('CountryName', function() {
  this.choice({
    x121DccCode: this.numstr(),
    iso3166Alpha2Code: this.printstr()
  });
});

// AdministrationDomainName ::= CHOICE {
//    numeric   NumericString,
//    printable PrintableString }
export const AdministrationDomainName = asn1.define('AdministrationDomainName',
  function() {
    this.choice({
      numeric: this.numstr(),
      printable: this.printstr()
    });
  });

// NetworkAddress ::= X121Address
export const NetworkAddress = asn1.define('NetworkAddress', function() {
  this.use(X121Address);
});

// X121Address ::= NumericString
export const X121Address = asn1.define('X121Address', function() {
  this.numstr();
});

// TerminalIdentifier ::= PrintableString
export const TerminalIdentifier = asn1.define('TerminalIdentifier', function() {
  this.printstr();
});

// PrivateDomainName ::= CHOICE {
//    numeric   NumericString,
//    printable PrintableString }
export const PrivateDomainName = asn1.define('PrivateDomainName', function() {
  this.choice({
    numeric: this.numstr(),
    printable: this.printstr()
  });
});

// OrganizationName ::= PrintableString
export const OrganizationName = asn1.define('OrganizationName', function() {
  this.printstr();
});

// NumericUserIdentifier ::= NumericString
export const NumericUserIdentifier = asn1.define('NumericUserIdentifier', function() {
  this.numstr();
});

// PersonalName ::= SET {
//    surname     [0] IMPLICIT PrintableString,
//    given-name  [1] IMPLICIT PrintableString OPTIONAL,
//    initials    [2] IMPLICIT PrintableString OPTIONAL,
//    generation-qualifier [3] IMPLICIT PrintableString OPTIONAL }
export const PersonalName = asn1.define('PersonalName', function() {
  this.set().obj(
    this.key('surname').implicit(0).printstr(),
    this.key('givenName').implicit(1).printstr(),
    this.key('initials').implicit(2).printstr(),
    this.key('generationQualifier').implicit(3).printstr()
  );
});

// OrganizationalUnitNames ::= SEQUENCE SIZE (1..ub-organizational-units)
//                              OF OrganizationalUnitName
export const OrganizationalUnitNames = asn1.define('OrganizationalUnitNames',
  function() {
    this.seqof(OrganizationalUnitName);
  });

// OrganizationalUnitName ::= PrintableString (SIZE
//                     (1..ub-organizational-unit-name-length))
export const OrganizationalUnitName = asn1.define('OrganizationalUnitName', function() {
  this.printstr();
});

// uiltInDomainDefinedAttributes ::= SEQUENCE SIZE
//                     (1..ub-domain-defined-attributes)
//                       OF BuiltInDomainDefinedAttribute
export const BuiltInDomainDefinedAttributes = asn1.define(
  'BuiltInDomainDefinedAttributes', function() {
    this.seqof(BuiltInDomainDefinedAttribute);
  });

// BuiltInDomainDefinedAttribute ::= SEQUENCE {
//    type PrintableString (SIZE (1..ub-domain-defined-attribute-type-length)),
//    value PrintableString (SIZE (1..ub-domain-defined-attribute-value-length))
//}
export const BuiltInDomainDefinedAttribute = asn1.define('BuiltInDomainDefinedAttribute',
  function() {
    this.seq().obj(
      this.key('type').printstr(),
      this.key('value').printstr()
    );
  });

// ExtensionAttributes ::= SET SIZE (1..ub-extension-attributes) OF
//                ExtensionAttribute
export const ExtensionAttributes = asn1.define('ExtensionAttributes', function() {
  this.seqof(ExtensionAttribute);
});

// ExtensionAttribute ::=  SEQUENCE {
//    extension-attribute-type [0] IMPLICIT INTEGER,
//    extension-attribute-value [1] ANY DEFINED BY extension-attribute-type }
export const ExtensionAttribute = asn1.define('ExtensionAttribute', function() {
  this.seq().obj(
    this.key('extensionAttributeType').implicit(0).int(),
    this.key('extensionAttributeValue').any().explicit(1).int()
  );
});

// SubjectKeyIdentifier ::= KeyIdentifier
export const SubjectKeyIdentifier = asn1.define('SubjectKeyIdentifier', function() {
  this.use(KeyIdentifier);
});

// KeyUsage ::= BIT STRING {
//      digitalSignature        (0),
//      nonRepudiation          (1),  -- recent editions of X.509 have
//                                    -- renamed this bit to contentCommitment
//      keyEncipherment         (2),
//      dataEncipherment        (3),
//      keyAgreement            (4),
//      keyCertSign             (5),
//      cRLSign                 (6),
//      encipherOnly            (7),
//      decipherOnly            (8) }
export const KeyUsage = asn1.define('KeyUsage', function() {
  this.bitstr();
});

// CertificatePolicies ::= SEQUENCE SIZE (1..MAX) OF PolicyInformation
export const CertificatePolicies = asn1.define('CertificatePolicies', function() {
  this.seqof(PolicyInformation);
});

// PolicyInformation ::= SEQUENCE {
//      policyIdentifier   CertPolicyId,
//      policyQualifiers   SEQUENCE SIZE (1..MAX) OF PolicyQualifierInfo
//                           OPTIONAL }
export const PolicyInformation = asn1.define('PolicyInformation', function() {
  this.seq().obj(
    this.key('policyIdentifier').use(CertPolicyId),
    this.key('policyQualifiers').optional().use(PolicyQualifiers)
  );
});

// CertPolicyId ::= OBJECT IDENTIFIER
export const CertPolicyId = asn1.define('CertPolicyId', function() {
  this.objid();
});

export const PolicyQualifiers = asn1.define('PolicyQualifiers', function() {
  this.seqof(PolicyQualifierInfo);
});

// PolicyQualifierInfo ::= SEQUENCE {
//      policyQualifierId  PolicyQualifierId,
//      qualifier          ANY DEFINED BY policyQualifierId }
export const PolicyQualifierInfo = asn1.define('PolicyQualifierInfo', function() {
  this.seq().obj(
    this.key('policyQualifierId').use(PolicyQualifierId),
    this.key('qualifier').any()
  );
});

// PolicyQualifierId ::= OBJECT IDENTIFIER
export const PolicyQualifierId = asn1.define('PolicyQualifierId', function() {
  this.objid();
});

// PolicyMappings ::= SEQUENCE SIZE (1..MAX) OF SEQUENCE {
//      issuerDomainPolicy      CertPolicyId,
//      subjectDomainPolicy     CertPolicyId }
export const PolicyMappings = asn1.define('PolicyMappings', function() {
  this.seqof(PolicyMapping);
});

export const PolicyMapping = asn1.define('PolicyMapping', function() {
  this.seq().obj(
    this.key('issuerDomainPolicy').use(CertPolicyId),
    this.key('subjectDomainPolicy').use(CertPolicyId)
  );
});

// SubjectAltName ::= GeneralNames
export const SubjectAlternativeName = asn1.define('SubjectAlternativeName', function() {
  this.use(GeneralNames);
});

// IssuerAltName ::= GeneralNames
export const IssuerAlternativeName = asn1.define('IssuerAlternativeName', function() {
  this.use(GeneralNames);
});

// SubjectDirectoryAttributes ::= SEQUENCE SIZE (1..MAX) OF Attribute
export const SubjectDirectoryAttributes = asn1.define('SubjectDirectoryAttributes',
  function() {
    this.seqof(Attribute);
  });

// BasicConstraints ::= SEQUENCE {
//         cA                      BOOLEAN DEFAULT FALSE,
//         pathLenConstraint       INTEGER (0..MAX) OPTIONAL }
export const BasicConstraints = asn1.define('BasicConstraints', function() {
  this.seq().obj(
    this.key('cA').bool().def(false),
    this.key('pathLenConstraint').optional().int()
  );
});

// NameConstraints ::= SEQUENCE {
//            permittedSubtrees       [0]     GeneralSubtrees OPTIONAL,
//            excludedSubtrees        [1]     GeneralSubtrees OPTIONAL }
export const NameConstraints = asn1.define('NameConstraints', function() {
  this.seq().obj(
    this.key('permittedSubtrees').implicit(0).optional().use(GeneralSubtrees),
    this.key('excludedSubtrees').implicit(1).optional().use(GeneralSubtrees)
  );
});

// GeneralSubtrees ::= SEQUENCE SIZE (1..MAX) OF GeneralSubtree
export const GeneralSubtrees = asn1.define('GeneralSubtrees', function() {
  this.seqof(GeneralSubtree);
});

// GeneralSubtree ::= SEQUENCE {
//            base                    GeneralName,
//            minimum         [0]     BaseDistance DEFAULT 0,
//            maximum         [1]     BaseDistance OPTIONAL }
export const GeneralSubtree = asn1.define('GeneralSubtree', function() {
  this.seq().obj(
    this.key('base').use(GeneralName),
    this.key('minimum').implicit(0).def(0).use(BaseDistance),
    this.key('maximum').implicit(0).optional().use(BaseDistance)
  );
});

// BaseDistance ::= INTEGER
export const BaseDistance = asn1.define('BaseDistance', function() {
  this.int();
});

// PolicyConstraints ::= SEQUENCE {
//         requireExplicitPolicy           [0] SkipCerts OPTIONAL,
//         inhibitPolicyMapping            [1] SkipCerts OPTIONAL }
export const PolicyConstraints = asn1.define('PolicyConstraints', function() {
  this.seq().obj(
    this.key('requireExplicitPolicy').implicit(0).optional().use(SkipCerts),
    this.key('inhibitPolicyMapping').implicit(1).optional().use(SkipCerts)
  );
});

// SkipCerts ::= INTEGER
export const SkipCerts = asn1.define('SkipCerts', function() {
  this.int();
});

// ExtKeyUsageSyntax ::= SEQUENCE SIZE (1..MAX) OF KeyPurposeId
export const ExtendedKeyUsage = asn1.define('ExtendedKeyUsage', function() {
  this.seqof(KeyPurposeId);
});

// KeyPurposeId ::= OBJECT IDENTIFIER
export const KeyPurposeId = asn1.define('KeyPurposeId', function() {
  this.objid();
});

// RLDistributionPoints ::= SEQUENCE SIZE (1..MAX) OF DistributionPoint
export const CRLDistributionPoints = asn1.define('CRLDistributionPoints', function() {
  this.seqof(DistributionPoint);
});

// DistributionPoint ::= SEQUENCE {
//         distributionPoint       [0]     DistributionPointName OPTIONAL,
//         reasons                 [1]     ReasonFlags OPTIONAL,
//         cRLIssuer               [2]     GeneralNames OPTIONAL }
export const DistributionPoint = asn1.define('DistributionPoint', function() {
  this.seq().obj(
    this.key('distributionPoint').optional().explicit(0)
      .use(DistributionPointName),
    this.key('reasons').optional().implicit(1).use(ReasonFlags),
    this.key('cRLIssuer').optional().implicit(2).use(GeneralNames)
  );
});

// DistributionPointName ::= CHOICE {
//         fullName                [0]     GeneralNames,
//         nameRelativeToCRLIssuer [1]     RelativeDistinguishedName }
export const DistributionPointName = asn1.define('DistributionPointName', function() {
  this.choice({
    fullName: this.implicit(0).use(GeneralNames),
    nameRelativeToCRLIssuer: this.implicit(1).use(RelativeDistinguishedName)
  });
});

// ReasonFlags ::= BIT STRING {
//         unused                  (0),
//         keyCompromise           (1),
//         cACompromise            (2),
//         affiliationChanged      (3),
//         superseded              (4),
//         cessationOfOperation    (5),
//         certificateHold         (6),
//         privilegeWithdrawn      (7),
//         aACompromise            (8) }
export const ReasonFlags = asn1.define('ReasonFlags', function() {
  this.bitstr();
});

// InhibitAnyPolicy ::= SkipCerts
export const InhibitAnyPolicy = asn1.define('InhibitAnyPolicy', function() {
  this.use(SkipCerts);
});

// FreshestCRL ::= CRLDistributionPoints
export const FreshestCRL = asn1.define('FreshestCRL', function() {
  this.use(CRLDistributionPoints);
});

// AuthorityInfoAccessSyntax  ::=
//         SEQUENCE SIZE (1..MAX) OF AccessDescription
export const AuthorityInfoAccessSyntax = asn1.define('AuthorityInfoAccessSyntax', function() {
  this.seqof(AccessDescription);
});

// AccessDescription  ::=  SEQUENCE {
//         accessMethod          OBJECT IDENTIFIER,
//         accessLocation        GeneralName  }
export const AccessDescription = asn1.define('AccessDescription', function() {
  this.seq().obj(
    this.key('accessMethod').objid(),
    this.key('accessLocation').use(GeneralName)
  );
});

// SubjectInfoAccessSyntax  ::=
//            SEQUENCE SIZE (1..MAX) OF AccessDescription
export const SubjectInformationAccess = asn1.define('SubjectInformationAccess', function() {
  this.seqof(AccessDescription);
});

/**
 * CRL Extensions
 */

// CRLNumber ::= INTEGER
export const CRLNumber = asn1.define('CRLNumber', function() {
  this.int();
});

export const DeltaCRLIndicator = asn1.define('DeltaCRLIndicator', function() {
  this.use(CRLNumber);
});

// IssuingDistributionPoint ::= SEQUENCE {
//         distributionPoint          [0] DistributionPointName OPTIONAL,
//         onlyContainsUserCerts      [1] BOOLEAN DEFAULT FALSE,
//         onlyContainsCACerts        [2] BOOLEAN DEFAULT FALSE,
//         onlySomeReasons            [3] ReasonFlags OPTIONAL,
//         indirectCRL                [4] BOOLEAN DEFAULT FALSE,
//         onlyContainsAttributeCerts [5] BOOLEAN DEFAULT FALSE }
export const IssuingDistributionPoint = asn1.define('IssuingDistributionPoint',
  function() {
    this.seq().obj(
      this.key('distributionPoint').explicit(0).optional()
        .use(DistributionPointName),
      this.key('onlyContainsUserCerts').implicit(1).def(false).bool(),
      this.key('onlyContainsCACerts').implicit(2).def(false).bool(),
      this.key('onlySomeReasons').implicit(3).optional().use(ReasonFlags),
      this.key('indirectCRL').implicit(4).def(false).bool(),
      this.key('onlyContainsAttributeCerts').implicit(5).def(false).bool()
    );
  });

// CRLReason ::= ENUMERATED {
//         unspecified             (0),
//         keyCompromise           (1),
//         cACompromise            (2),
//         affiliationChanged      (3),
//         superseded              (4),
//         cessationOfOperation    (5),
//         certificateHold         (6),
//         -- value 7 is not used
//         removeFromCRL           (8),
//         privilegeWithdrawn      (9),
//         aACompromise           (10) }
export const ReasonCode = asn1.define('ReasonCode', function() {
  this.enum({
    0: 'unspecified',
    1: 'keyCompromise',
    2: 'cACompromise',
    3: 'affiliationChanged',
    4: 'superseded',
    5: 'cessationOfOperation',
    6: 'certificateHold',
    8: 'removeFromCRL',
    9: 'privilegeWithdrawn',
    10: 'aACompromise'
  });
});

// InvalidityDate ::=  GeneralizedTime
export const InvalidityDate = asn1.define('InvalidityDate', function() {
  this.gentime();
});

// CertificateIssuer ::=     GeneralNames
export const CertificateIssuer = asn1.define('CertificateIssuer', function() {
  this.use(GeneralNames);
});

// OID label to extension model mapping
const x509Extensions = {
  subjectDirectoryAttributes: SubjectDirectoryAttributes,
  subjectKeyIdentifier: SubjectKeyIdentifier,
  keyUsage: KeyUsage,
  subjectAlternativeName: SubjectAlternativeName,
  issuerAlternativeName: IssuerAlternativeName,
  basicConstraints: BasicConstraints,
  cRLNumber: CRLNumber,
  reasonCode: ReasonCode,
  invalidityDate: InvalidityDate,
  deltaCRLIndicator: DeltaCRLIndicator,
  issuingDistributionPoint: IssuingDistributionPoint,
  certificateIssuer: CertificateIssuer,
  nameConstraints: NameConstraints,
  cRLDistributionPoints: CRLDistributionPoints,
  certificatePolicies: CertificatePolicies,
  policyMappings: PolicyMappings,
  authorityKeyIdentifier: AuthorityKeyIdentifier,
  policyConstraints: PolicyConstraints,
  extendedKeyUsage: ExtendedKeyUsage,
  freshestCRL: FreshestCRL,
  inhibitAnyPolicy: InhibitAnyPolicy,
  authorityInformationAccess: AuthorityInfoAccessSyntax,
  subjectInformationAccess: SubjectInformationAccess
};
